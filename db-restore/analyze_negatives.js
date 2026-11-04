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
  const started = Date.now();
  const pool = await new sql.ConnectionPool({
    server: env.SQL_HOST, port: Number(env.SQL_PORT || 1433), user: env.SQL_USER, password: env.SQL_PASSWORD,
    database: env.SQL_DATABASE || 'RamixDB', options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 600000
  }).connect();
  const q = async (text) => (await pool.request().query(text)).recordset;

  const products = new Set((await q(`SELECT DISTINCT ProductID AS pid FROM tblInventory WITH (NOLOCK) WHERE ID >= 214700`)).map((r) => Number(r.pid)));
  for (const file of ['stock-repair-backup-20261104.json', 'stock-undo-backup-20261104.json', 'stock-webdelta-backup-20261104.json']) {
    for (const pid of backupProducts(file)) products.add(pid);
  }
  const list = [...products];
  const ids = list.join(',');

  const anchors = await q(`
    SELECT s.ProductID AS pid, s.StoreID AS store, s.OpeningPurchasedStock AS op, s.OpeningBonusStock AS ob, a.sps, a.sbs, a.ID AS lastId
    FROM tblProductsStores s WITH (NOLOCK)
    LEFT JOIN (
      SELECT ProductID, StoreID, ID, StorePurchaseStock AS sps, StoreBonusStock AS sbs,
        ROW_NUMBER() OVER (PARTITION BY ProductID, StoreID ORDER BY InvoiceDate DESC, ID DESC) AS rn
      FROM tblInventory WITH (NOLOCK)
      WHERE ProductID IN (${ids}) AND InvoiceDate < '${FROM_DATE}'
    ) a ON a.ProductID = s.ProductID AND a.StoreID = s.StoreID AND a.rn = 1
    WHERE s.ProductID IN (${ids}) AND s.CompCode = 0`);
  const rows = await q(`
    SELECT i.ID AS id, i.ProductID AS pid, i.StoreID AS store, i.InvoiceDate AS d, i.TransactionID AS trx, i.InvoiceNo AS no,
      ISNULL(i.InQuantity, 0) - ISNULL(i.OutQuantity, 0) AS mv,
      CASE WHEN i.TransactionID = 1 AND i.ID > 200000 AND NOT EXISTS (
        SELECT 1 FROM tblPurchaseInvoicesDetails d WITH (NOLOCK) WHERE d.RowGuid = i.RowGUID) THEN 1 ELSE 0 END AS orphan
    FROM tblInventory i WITH (NOLOCK)
    WHERE i.ProductID IN (${ids}) AND i.InvoiceDate >= '${FROM_DATE}'
    ORDER BY i.ProductID, i.InvoiceDate, i.ID`);

  const bal = new Map();
  for (const a of anchors) bal.set(`${a.pid}:${a.store}`, a.lastId != null ? Number(a.sps) || 0 : Number(a.op) || 0);
  const firstNeg = new Map();
  for (const r of rows) {
    if (r.orphan) continue;
    const key = `${r.pid}:${r.store}`;
    const next = Math.round(((bal.get(key) || 0) + Number(r.mv)) * 100000) / 100000;
    bal.set(key, next);
    if (next < -0.00001 && !firstNeg.has(key)) {
      firstNeg.set(key, { pid: r.pid, store: r.store, date: new Date(r.d).toISOString().slice(0, 10), trx: r.trx, no: r.no, at: next });
    }
  }
  const negatives = [];
  for (const [key, n] of firstNeg) negatives.push({ ...n, final: bal.get(key) });
  const names = negatives.length ? await q(`
    SELECT p.ProductId AS pid, p.ProductName AS name FROM tblProducts p WITH (NOLOCK) WHERE p.ProductId IN (${[...new Set(negatives.map((n) => n.pid))].join(',')})`) : [];
  const stores = await q(`SELECT StoreID AS id, StoreName AS name FROM tblStores WITH (NOLOCK)`);
  const nameOf = new Map(names.map((n) => [Number(n.pid), n.name]));
  const storeOf = new Map(stores.map((s) => [Number(s.id), s.name]));
  const trxName = { 1: 'شراء', 2: 'بيع', 3: 'مرتجع بيع', 4: 'مرتجع شراء', 15: 'جرد', 16: 'تحويل' };
  const out = negatives.map((n) => ({
    product: n.pid, name: nameOf.get(Number(n.pid)) || '', store: storeOf.get(Number(n.store)) || n.store,
    firstNegativeOn: n.date, by: `${trxName[n.trx] || n.trx} ${n.no}`, lowest: n.at, finalBalance: n.final
  }));
  const report = path.join(base, 'data', 'negative-stock-report-20261104.json');
  fs.writeFileSync(report, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ seconds: Math.round((Date.now() - started) / 1000), products: list.length, movements: rows.length, negativePairs: out.length, stillNegativeAtEnd: out.filter((x) => x.finalBalance < -0.00001).length }));
  console.log('SAMPLE=' + JSON.stringify(out.slice(0, 40)));
  await pool.close();
})().catch((e) => { console.error('ERR ' + e.message); process.exit(1); });
