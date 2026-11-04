const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const base = '/var/www/warehouse.alramzybrothers.com';
const FROM_DATE = '2026-10-01';
const env = {};
for (const line of fs.readFileSync(path.join(base, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}
const round = (n) => Math.round(Number(n) * 100000) / 100000;
const lit = (n) => round(n).toFixed(5);

function backupProducts(file) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(base, 'data', file), 'utf8'));
    const rows = Array.isArray(data) ? data : (data.deltas || data.stores || []);
    return rows.map((r) => Number(r.pid ?? r.ProductID)).filter((n) => n > 0);
  } catch (error) {
    return [];
  }
}

(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const started = Date.now();
  const triggers = JSON.parse(fs.readFileSync(path.join(__dirname, 'triggers-20251018.json'), 'utf8'));
  const pool = await new sql.ConnectionPool({
    server: env.SQL_HOST, port: Number(env.SQL_PORT || 1433), user: env.SQL_USER, password: env.SQL_PASSWORD,
    database: env.SQL_DATABASE || 'RamixDB', options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 300000
  }).connect();
  const q = async (text) => (await pool.request().query(text)).recordset;

  if ((await q(`SELECT COUNT(*) AS n FROM sys.triggers WHERE parent_class = 1`))[0].n) throw new Error('triggers already exist');

  // Read phase, no locks held.
  const maxIdRead = Number((await q(`SELECT MAX(ID) AS id FROM tblInventory`))[0].id);
  const orphanWhere = `i.TransactionID = 1 AND i.ID > 200000
    AND NOT EXISTS (SELECT 1 FROM tblPurchaseInvoicesDetails d WHERE d.RowGuid = i.RowGUID)
    AND NOT EXISTS (SELECT 1 FROM tblPurchaseInvoice p WHERE p.PurchaseInvoiceNo = i.InvoiceNo AND ISNULL(p.SupplierID, 0) = ISNULL(i.SupplierID, 0))`;
  const orphans = await q(`SELECT i.* FROM tblInventory i WHERE ${orphanWhere} AND i.ID <= ${maxIdRead}`);
  const orphanIds = new Set(orphans.map((o) => Number(o.ID)));

  const products = new Set((await q(`SELECT DISTINCT ProductID AS pid FROM tblInventory WHERE ID >= 214700 AND ID <= ${maxIdRead}`)).map((r) => Number(r.pid)));
  for (const file of ['stock-repair-backup-20261104.json', 'stock-undo-backup-20261104.json', 'stock-webdelta-backup-20261104.json']) {
    for (const pid of backupProducts(file)) products.add(pid);
  }
  for (const o of orphans) products.add(Number(o.ProductID));
  const ids = [...products].join(',');

  const storeRows = await q(`SELECT * FROM tblProductsStores WHERE ProductID IN (${ids}) AND CompCode = 0`);
  const productRows = await q(`SELECT ProductId, ProductStock, PurchasedStock, BonusStock FROM tblProducts WHERE ProductId IN (${ids})`);
  const anchors = await q(`
    SELECT ProductID AS pid, StoreID AS store, ID, StorePurchaseStock AS sps, StoreBonusStock AS sbs FROM (
      SELECT ProductID, StoreID, ID, StorePurchaseStock, StoreBonusStock,
        ROW_NUMBER() OVER (PARTITION BY ProductID, StoreID ORDER BY InvoiceDate DESC, ID DESC) AS rn
      FROM tblInventory WHERE ProductID IN (${ids}) AND InvoiceDate < '${FROM_DATE}'
    ) a WHERE rn = 1`);
  const rows = await q(`
    SELECT ID AS id, ProductID AS pid, StoreID AS store,
      ISNULL(InQuantity, 0) - ISNULL(OutQuantity, 0) AS mv, ISNULL(InBonus, 0) - ISNULL(OutBonus, 0) AS bmv,
      StorePurchaseStock AS sps, StoreBonusStock AS sbs, StoreProductStock AS spr,
      TotalInventoryQuantity AS tq, TotalInventoryBonus AS tb, TotalInventory AS tt
    FROM tblInventory WHERE ProductID IN (${ids}) AND InvoiceDate >= '${FROM_DATE}' AND ID <= ${maxIdRead}
    ORDER BY ProductID, InvoiceDate, ID`);

  // Replay in memory.
  const stores = new Map();
  for (const s of storeRows) stores.set(`${s.ProductID}:${s.StoreID}`, { pid: Number(s.ProductID), store: Number(s.StoreID), qty: Number(s.OpeningPurchasedStock) || 0, bonus: Number(s.OpeningBonusStock) || 0, touched: false, exists: true });
  for (const a of anchors) {
    const key = `${a.pid}:${a.store}`;
    const s = stores.get(key) || { pid: Number(a.pid), store: Number(a.store), touched: false, exists: false };
    s.qty = Number(a.sps) || 0;
    s.bonus = Number(a.sbs) || 0;
    stores.set(key, s);
  }
  const rowUpdates = [];
  const clamped = [];
  for (const r of rows) {
    if (orphanIds.has(Number(r.id))) continue;
    const key = `${r.pid}:${r.store}`;
    if (!stores.has(key)) stores.set(key, { pid: Number(r.pid), store: Number(r.store), qty: 0, bonus: 0, touched: false, exists: false });
    const s = stores.get(key);
    s.qty = round(s.qty + Number(r.mv));
    s.bonus = round(s.bonus + Number(r.bmv));
    if (s.qty < 0 || s.bonus < 0) {
      clamped.push({ id: Number(r.id), pid: s.pid, store: s.store, qty: s.qty, bonus: s.bonus });
      s.qty = Math.max(s.qty, 0);
      s.bonus = Math.max(s.bonus, 0);
    }
    s.touched = true;
    let tq = 0;
    let tb = 0;
    for (const o of stores.values()) if (o.pid === s.pid) { tq += o.qty; tb += o.bonus; }
    const v = [s.qty, s.bonus, s.qty + s.bonus, round(tq), round(tb), round(tq + tb)];
    const old = [r.sps, r.sbs, r.spr, r.tq, r.tb, r.tt];
    if (old.some((x, i) => x == null || Math.abs(Number(x) - v[i]) > 0.00001)) {
      rowUpdates.push(`UPDATE tblInventory SET StorePurchaseStock = ${lit(v[0])}, StoreBonusStock = ${lit(v[1])}, StoreProductStock = ${lit(v[2])}, TotalInventoryQuantity = ${lit(v[3])}, TotalInventoryBonus = ${lit(v[4])}, TotalInventory = ${lit(v[5])} WHERE ID = ${Number(r.id)};`);
    }
  }
  const storeUpdates = [];
  for (const s of stores.values()) {
    if (!s.touched) continue;
    if (!s.exists) storeUpdates.push(`IF NOT EXISTS (SELECT 1 FROM tblProductsStores WHERE ProductID = ${s.pid} AND StoreID = ${s.store} AND CompCode = 0) INSERT INTO tblProductsStores (ProductID, StoreID, CompCode, OpeningPurchasedStock, OpeningBonusStock, OpeningStock, PurchasedStock, BonusStock, ProductStock) VALUES (${s.pid}, ${s.store}, 0, 0, 0, 0, 0, 0, 0);`);
    storeUpdates.push(`UPDATE tblProductsStores SET PurchasedStock = ${lit(s.qty)}, BonusStock = ${lit(s.bonus)}, ProductStock = ${lit(s.qty + s.bonus)} WHERE ProductID = ${s.pid} AND StoreID = ${s.store} AND CompCode = 0;`);
  }
  const readSeconds = Math.round((Date.now() - started) / 1000);

  const backupFile = path.join(base, 'data', 'trigger-restore-backup-20261104.json');
  if (!dryRun) {
    fs.writeFileSync(backupFile, JSON.stringify({ maxIdRead, orphans, storeRows, productRows, rows }));
    fs.chmodSync(backupFile, 0o600);
  }

  // Write phase: short exclusive transaction.
  const writeStart = Date.now();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const run = async (text) => (await new sql.Request(tx).batch(text));
  try {
    await run(`SELECT TOP 1 1 AS x FROM tblInventory WITH (TABLOCKX, HOLDLOCK); SELECT TOP 1 1 AS x FROM tblProductsStores WITH (TABLOCKX, HOLDLOCK); SELECT TOP 1 1 AS x FROM tblProducts WITH (TABLOCKX, HOLDLOCK);`);
    const nowMax = Number((await new sql.Request(tx).query(`SELECT MAX(ID) AS id FROM tblInventory`)).recordset[0].id);
    if (nowMax !== maxIdRead) throw new Error(`new movements arrived (${maxIdRead} -> ${nowMax}), run again`);
    if (orphanIds.size) await run(`DELETE FROM tblInventory WHERE ID IN (${[...orphanIds].join(',')})`);
    for (let i = 0; i < rowUpdates.length; i += 300) await run(rowUpdates.slice(i, i + 300).join('\n'));
    for (let i = 0; i < storeUpdates.length; i += 300) await run(storeUpdates.slice(i, i + 300).join('\n'));
    await run(`UPDATE p SET p.ProductStock = x.ps, p.PurchasedStock = x.pu, p.BonusStock = x.bo
      FROM tblProducts p JOIN (SELECT ProductID, SUM(ProductStock) ps, SUM(PurchasedStock) pu, SUM(BonusStock) bo FROM tblProductsStores WHERE CompCode = 0 GROUP BY ProductID) x ON x.ProductID = p.ProductId
      WHERE p.ProductId IN (${ids})`);
    let created = 0;
    const skipped = [];
    for (const t of triggers) {
      const parent = (await new sql.Request(tx).input('t', sql.NVarChar(200), t.tbl).query(`SELECT OBJECT_ID(@t) AS id`)).recordset[0].id;
      if (!parent) { skipped.push(`${t.tbl}.${t.name}`); continue; }
      await run(t.def);
      if (t.disabled) await run(`DISABLE TRIGGER [${t.name}] ON [${t.tbl}]`);
      created += 1;
    }
    const p7212 = (await new sql.Request(tx).query(`SELECT StoreID, ProductStock, PurchasedStock FROM tblProductsStores WHERE ProductID = 7212 AND (ProductStock <> 0 OR PurchasedStock <> 0)`)).recordset;
    const summary = {
      readSeconds, writeSeconds: Math.round((Date.now() - writeStart) / 1000), products: products.size,
      orphansDeleted: orphanIds.size, rowsRewritten: rowUpdates.length, storeBalances: storeUpdates.length,
      clampedRows: clamped.length, triggersCreated: created, skipped, p7212
    };
    if (dryRun) {
      await tx.rollback();
      console.log(JSON.stringify(summary));
      console.log('DRY_RUN_ROLLED_BACK');
    } else {
      await tx.commit();
      console.log(JSON.stringify(summary));
      console.log('COMMITTED');
    }
  } catch (error) {
    try { await tx.rollback(); } catch (e) { /* ignore */ }
    console.error('ROLLED_BACK ' + error.message);
    process.exitCode = 1;
  }
  await pool.close();
})().catch((e) => { console.error('ERR ' + e.message); process.exit(1); });
