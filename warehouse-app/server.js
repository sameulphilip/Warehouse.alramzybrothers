const express = require('express');
const session = require('express-session');
const sql = require('mssql');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3015);
const APP_USER = process.env.APP_USER || 'manager';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-session-secret';

const poolPromise = sql.connect({
  server: process.env.SQL_HOST,
  port: Number(process.env.SQL_PORT || 1433),
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE || 'RamixDB',
  connectionTimeout: 20000,
  requestTimeout: 45000,
  pool: { max: 10, min: 1, idleTimeoutMillis: 30000 },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
});

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: 'auto',
    maxAge: 12 * 60 * 60 * 1000
  }
}));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.set('Cache-Control', 'no-store');
  }
}));

const usersFile = path.join(__dirname, 'data', 'users.json');
const activityFile = path.join(__dirname, 'data', 'activity.json');
let activityChain = Promise.resolve();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

function passwordMatches(password, user) {
  try {
    const hash = crypto.scryptSync(password, user.salt, 32);
    const saved = Buffer.from(user.hash, 'hex');
    return saved.length === hash.length && crypto.timingSafeEqual(saved, hash);
  } catch (error) {
    return false;
  }
}

function loadUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

function saveUsers(users) {
  fs.mkdirSync(path.dirname(usersFile), { recursive: true });
  const temp = `${usersFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(users, null, 2));
  fs.renameSync(temp, usersFile);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: Boolean(user.active)
  };
}

function currentUser(req) {
  const user = req.session && req.session.user;
  if (!user || typeof user !== 'object' || !user.username || !user.role) return null;
  return user;
}

function requireAuth(req, res, next) {
  if (currentUser(req)) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

function actorName(req) {
  const user = currentUser(req);
  const name = String((user && (user.name || user.username)) || '').trim();
  return clip(name || 'الموقع', 50);
}

function loadActivity() {
  try {
    const rows = JSON.parse(fs.readFileSync(activityFile, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    return [];
  }
}

function recordActivity(req, entry) {
  const user = currentUser(req);
  const row = {
    at: new Date().toISOString(),
    userId: user ? user.id : '',
    username: user ? user.username : '',
    name: actorName(req),
    action: String(entry.action || ''),
    detail: clip(entry.detail, 180),
    ref: String(entry.ref || '')
  };
  const write = () => {
    const rows = loadActivity();
    rows.unshift(row);
    if (rows.length > 1000) rows.length = 1000;
    fs.mkdirSync(path.dirname(activityFile), { recursive: true });
    const temp = `${activityFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(rows));
    fs.renameSync(temp, activityFile);
  };
  const job = activityChain.then(write, write);
  activityChain = job.then(() => {}, () => {});
  return job;
}

function requireSuper(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (user.role !== 'superadmin') return res.status(403).json({ error: 'إدارة الحسابات للسوبر أدمن فقط' });
  return next();
}

function cleanAccount(body, { creating }) {
  const username = String(body.username || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const role = body.role === 'superadmin' ? 'superadmin' : 'manager';
  const password = String(body.password || '');
  const active = body.active !== false;
  if (creating && !/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { error: 'اسم الدخول من 3 إلى 32 حرفاً إنجليزياً أو رقماً' };
  }
  if (name.length < 2 || name.length > 60) return { error: 'اكتب اسم الحساب' };
  if (creating && password.length < 8) return { error: 'كلمة السر لازم تكون 8 أحرف على الأقل' };
  if (!creating && password && password.length < 8) return { error: 'كلمة السر لازم تكون 8 أحرف على الأقل' };
  return { value: { username, name, role, password, active } };
}

function paging(req) {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(80, Math.max(10, Number(req.query.pageSize || 30)));
  return { page, pageSize, start: (page - 1) * pageSize + 1, end: page * pageSize };
}

function likeOf(q) {
  return `%${String(q || '').trim().slice(0, 80).replace(/[%_\[\]]/g, '')}%`;
}

async function runQuery(sqlText, inputs = []) {
  const pool = await poolPromise;
  const request = pool.request();
  for (const item of inputs) request.input(item.name, item.type, item.value);
  const result = await request.query(sqlText);
  return result.recordset;
}

const memoryCache = new Map();
async function cached(key, ttl, loader) {
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await loader();
  memoryCache.set(key, { at: Date.now(), value });
  return value;
}

async function queryPage(sqlText, inputs) {
  const rows = await runQuery(sqlText, inputs);
  const total = rows[0] ? Number(rows[0].total || 0) : 0;
  return { total, rows };
}

app.get('/api/me', (req, res) => {
  res.json({ user: currentUser(req) });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.user || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const found = loadUsers().find((user) => user.username === username && user.active);
  if (!found || !passwordMatches(password, found)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const user = publicUser(found);
  req.session.user = user;
  recordActivity(req, { action: 'login', detail: 'دخول إلى النظام' });
  res.json({ ok: true, user });
});

app.get('/api/users', requireSuper, (req, res) => {
  const users = loadUsers().map(publicUser).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  res.json({ users });
});

app.post('/api/users', requireSuper, (req, res) => {
  const parsed = cleanAccount(req.body || {}, { creating: true });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const item = parsed.value;
  const users = loadUsers();
  if (users.some((user) => user.username === item.username)) {
    return res.status(400).json({ error: 'اسم الدخول مستخدم' });
  }
  const created = {
    id: item.username,
    username: item.username,
    name: item.name,
    role: item.role,
    active: true,
    ...hashPassword(item.password)
  };
  users.push(created);
  saveUsers(users);
  recordActivity(req, { action: 'account', detail: `إضافة حساب ${created.name} (${created.username})`, ref: `user:${created.id}` });
  res.json({ ok: true, user: publicUser(created) });
});

app.put('/api/users/:id', requireSuper, (req, res) => {
  const parsed = cleanAccount({ ...req.body, username: 'keep' }, { creating: false });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const item = parsed.value;
  const users = loadUsers();
  const index = users.findIndex((user) => user.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'الحساب غير موجود' });
  const next = { ...users[index], name: item.name, role: item.role, active: item.active };
  const supers = users.map((user, i) => (i === index ? next : user)).filter((user) => user.role === 'superadmin' && user.active);
  if (!supers.length) return res.status(400).json({ error: 'لازم يفضل سوبر أدمن واحد نشط على الأقل' });
  if (item.password) Object.assign(next, hashPassword(item.password));
  users[index] = next;
  saveUsers(users);
  const sessionUser = currentUser(req);
  if (sessionUser && sessionUser.id === next.id) req.session.user = publicUser(next);
  recordActivity(req, { action: 'account', detail: `تعديل حساب ${next.name} (${next.username})`, ref: `user:${next.id}` });
  res.json({ ok: true, user: publicUser(next) });
});

app.post('/api/logout', (req, res) => {
  recordActivity(req, { action: 'logout', detail: 'خروج من النظام' }).finally(() => {
    req.session.destroy(() => res.json({ ok: true }));
  });
});

app.get('/api/activity', requireAuth, (req, res) => {
  const { page, pageSize, start, end } = paging(req);
  const q = String(req.query.q || '').trim().toLowerCase();
  const ref = String(req.query.ref || '');
  const action = String(req.query.action || '');
  let rows = loadActivity();
  if (ref) rows = rows.filter((row) => row.ref === ref);
  if (action) rows = rows.filter((row) => row.action === action);
  if (q) {
    rows = rows.filter((row) => `${row.name} ${row.username} ${row.detail}`.toLowerCase().includes(q));
  }
  res.json({ page, pageSize, total: rows.length, rows: rows.slice(start - 1, end) });
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const payload = await cached('dashboard', 20000, async () => {
    const pool = await poolPromise;
    const counts = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM tblProducts) AS products,
        (SELECT COUNT(*) FROM tblClients) AS clients,
        (SELECT COUNT(*) FROM tblSuppliers) AS suppliers,
        (SELECT COUNT(*) FROM tblSellingInvoice) AS sales,
        (SELECT COUNT(*) FROM tblPurchaseInvoice) AS purchases,
        (SELECT COUNT(*) FROM tblStores) AS stores,
        (SELECT COUNT(*) FROM tblJournalEntry) AS journals,
        (SELECT ISNULL(SUM(NotCollectedAmount), 0) FROM tblSellingInvoice) AS salesDue,
        (SELECT ISNULL(SUM(NotPaiedAmount), 0) FROM tblPurchaseInvoice) AS purchaseDue
    `);
    const recent = await pool.request().query(`
      SELECT TOP 8
        si.SellingInvoiceID AS id,
        si.SellingInvoiceNo AS no,
        si.SellingInvoiceDate AS date,
        ISNULL(c.ClientName, N'') AS name,
        ISNULL(si.SellingInvoiceTotalAmount, 0) AS total,
        ISNULL(si.NotCollectedAmount, 0) AS due,
        ISNULL(si.InsertedBy, N'') AS byName
      FROM tblSellingInvoice si
      LEFT JOIN tblClients c ON c.ClientId = si.ClientID
      ORDER BY si.SellingInvoiceID DESC
    `);
    return { counts: counts.recordset[0], recentSales: recent.recordset };
    });
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل لوحة التحكم' });
  }
});

app.get('/api/stores', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT StoreID, ISNULL(StoreName, N'') AS StoreName,
             ISNULL(Address, N'') AS Address,
             ISNULL(PhoneNo, N'') AS PhoneNo,
             ISNULL(MobilNo, N'') AS MobilNo
      FROM tblStores
      WHERE StoreName IS NOT NULL AND LTRIM(RTRIM(StoreName)) <> N''
      ORDER BY StoreName
    `);
    const seen = new Set();
    const stores = [];
    for (const row of result.recordset) {
      const name = String(row.StoreName).trim();
      if (seen.has(name)) continue;
      seen.add(name);
      stores.push({
        id: row.StoreID,
        name,
        address: row.Address,
        phone: row.PhoneNo,
        mobile: row.MobilNo
      });
    }
    res.json({ stores });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل المخازن' });
  }
});

async function tableCols(table) {
  return cached(`cols:${table}`, 60 * 60 * 1000, async () => {
    const rows = await runQuery(
      `SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(@table)`,
      [{ name: 'table', type: sql.NVarChar(128), value: table }]
    );
    return rows.map((row) => row.name);
  });
}

function hasCol(cols, name) {
  return cols.some((col) => col.toLowerCase() === name.toLowerCase());
}

function priceLookup(table, cols, productExpr, priceType, ownerCol) {
  if (!hasCol(cols, 'Price') || !hasCol(cols, 'ProductID') || !hasCol(cols, 'PriceType')) return '0';
  const ranks = ['WHEN pr.Price > 0 THEN 1', 'ELSE 2'];
  if (hasCol(cols, ownerCol)) ranks.unshift(`WHEN pr.Price > 0 AND pr.${ownerCol} = 0 THEN 0`);
  return `ISNULL((
    SELECT TOP 1 pr.Price
    FROM ${table} pr
    WHERE pr.ProductID = ${productExpr} AND pr.PriceType = ${Number(priceType)}
    ORDER BY CASE ${ranks.join(' ')} END, pr.Price DESC
  ), 0)`;
}

async function saveBasePrice(tx, table, ownerCol, id, unitId, compCode, price, priceType) {
  const cols = await tableCols(table);
  if (!hasCol(cols, 'Price') || !hasCol(cols, 'ProductID') || !hasCol(cols, 'PriceType') || !hasCol(cols, ownerCol)) return;
  const key = [`${ownerCol} = 0`, 'ProductID = @id'];
  if (hasCol(cols, 'CurrencyID')) key.push('CurrencyID = 0');
  if (hasCol(cols, 'UnitId')) key.push('UnitId = @unitId');
  if (hasCol(cols, 'CompCode')) key.push('CompCode = @compCode');
  if (hasCol(cols, 'PriceID')) key.push('PriceID = 0');
  const insertCols = [ownerCol, 'ProductID', 'Price', 'PriceType'];
  const insertVals = ['0', '@id', '@price', '@priceType'];
  if (hasCol(cols, 'CurrencyID')) { insertCols.push('CurrencyID'); insertVals.push('0'); }
  if (hasCol(cols, 'UnitId')) { insertCols.push('UnitId'); insertVals.push('@unitId'); }
  if (hasCol(cols, 'CompCode')) { insertCols.push('CompCode'); insertVals.push('@compCode'); }
  if (hasCol(cols, 'PriceID')) { insertCols.push('PriceID'); insertVals.push('0'); }
  const keySql = key.join(' AND ');
  await txQuery(tx, `
    IF EXISTS (SELECT 1 FROM ${table} WITH (UPDLOCK, HOLDLOCK) WHERE ${keySql} AND PriceType = @priceType)
      UPDATE ${table} SET Price = @price WHERE ${keySql} AND PriceType = @priceType
    ELSE
      INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${insertVals.join(', ')})
  `, [
    { name: 'id', type: sql.Numeric(28, 0), value: id },
    { name: 'unitId', type: sql.Int, value: unitId },
    { name: 'compCode', type: sql.Int, value: compCode },
    { name: 'price', type: sql.Numeric(28, 4), value: price },
    { name: 'priceType', type: sql.TinyInt, value: priceType }
  ]);
}

app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const { page, pageSize, start, end } = paging(req);
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (q && page === 1) recordActivity(req, { action: 'search', detail: `بحث عن منتج: ${q}` });
    const filters = [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) }
    ];
    const where = `FROM tblProducts WHERE @q = N'' OR ProductCode LIKE @like OR ProductName LIKE @like`;
    const [clientCols, supplierCols] = await Promise.all([
      tableCols('tblClients_Products'),
      tableCols('tblSuppliers_Products')
    ]);
    const saleSql = priceLookup('tblClients_Products', clientCols, 'n.id', 2, 'ClientID');
    const buySql = priceLookup('tblSuppliers_Products', supplierCols, 'n.id', 1, 'SupplierID');
    const [rows, total] = await Promise.all([
      runQuery(`
        WITH numbered AS (
          SELECT
            ProductId AS id,
            ISNULL(ProductCode, '') AS code,
            ISNULL(ProductName, N'') AS name,
            ISNULL(UnitName, N'') AS unitName,
            ISNULL(ProductStock, 0) AS stock,
            ISNULL(ReOrderLevel, 0) AS reorderLevel,
            ROW_NUMBER() OVER (
              ORDER BY CASE WHEN ProductCode IS NULL OR LTRIM(RTRIM(ProductCode)) = '' THEN 1 ELSE 0 END,
                       ProductCode
            ) AS rn
          ${where}
        )
        SELECT
          n.id, n.code, n.name, n.unitName, n.stock, n.reorderLevel,
          ${saleSql} AS salePrice,
          ${buySql} AS buyPrice
        FROM numbered n WHERE n.rn BETWEEN @start AND @end ORDER BY n.rn
      `, filters.concat([
        { name: 'start', type: sql.Int, value: start },
        { name: 'end', type: sql.Int, value: end }
      ])),
      cached(`products:${q}`, 20000, async () => Number((await runQuery(`SELECT COUNT(*) AS total ${where}`, filters))[0].total))
    ]);
    res.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل المنتجات' });
  }
});

function roundTo(value, digits) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function readProductBody(body) {
  const name = String(body.name || '').trim();
  const code = String(body.code || '').trim();
  if (!name) return { error: 'اسم المنتج مطلوب' };
  if (name.length > 100) return { error: 'اسم المنتج أطول من 100 حرف' };
  if (code.length > 50) return { error: 'كود المنتج أطول من 50 حرف' };
  const productType = Number(body.productType ?? 0);
  const phaseId = Number(body.phaseId ?? 5);
  if (![0, 1, 2].includes(productType)) return { error: 'نوع المنتج غير معروف' };
  if (![0, 1, 2, 3, 4, 5].includes(phaseId)) return { error: 'مرحلة المنتج غير معروفة' };
  const salePrice = roundTo(body.salePrice, 4);
  const buyPrice = roundTo(body.buyPrice ?? 0, 4);
  const salesTax = roundTo(body.salesTax ?? 0, 4);
  const openingCost = roundTo(body.openingCost ?? 0, 4);
  const reorderLevel = roundTo(body.reorderLevel ?? 0, 5);
  const weight = roundTo(body.weight ?? 0, 4);
  const warrantyMonths = Math.round(Number(body.warrantyMonths ?? 0));
  if ([salePrice, buyPrice, salesTax, openingCost, reorderLevel, weight].some((n) => n == null || n < 0)) {
    return { error: 'راجع السعر والتكلفة والأرقام' };
  }
  if (!Number.isFinite(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 600) {
    return { error: 'مدة الضمان غير صحيحة' };
  }
  return {
    value: {
      name,
      code,
      productType,
      phaseId,
      salePrice,
      buyPrice,
      salesTax,
      openingCost,
      reorderLevel,
      weight,
      warrantyMonths,
      priceIncludesTax: body.priceIncludesTax ? 1 : 0,
      requireSerial: body.requireSerial ? 1 : 0,
      requireExpiry: body.requireExpiry ? 1 : 0
    }
  };
}

function productInputs(item, id) {
  return [
    { name: 'id', type: sql.Numeric(28, 0), value: id },
    { name: 'code', type: sql.NVarChar(50), value: item.code || null },
    { name: 'name', type: sql.NVarChar(100), value: item.name },
    { name: 'productType', type: sql.TinyInt, value: item.productType },
    { name: 'phaseId', type: sql.Int, value: item.phaseId },
    { name: 'salesTax', type: sql.Numeric(28, 4), value: item.salesTax },
    { name: 'priceIncludesTax', type: sql.Bit, value: item.priceIncludesTax },
    { name: 'openingCost', type: sql.Numeric(28, 4), value: item.openingCost },
    { name: 'reorderLevel', type: sql.Numeric(20, 5), value: item.reorderLevel },
    { name: 'weight', type: sql.Numeric(28, 4), value: item.weight },
    { name: 'warrantyMonths', type: sql.Int, value: item.warrantyMonths },
    { name: 'requireSerial', type: sql.Bit, value: item.requireSerial },
    { name: 'requireExpiry', type: sql.Bit, value: item.requireExpiry },
    { name: 'salePrice', type: sql.Numeric(28, 4), value: item.salePrice }
  ];
}

function invalidateProducts() {
  for (const key of [...memoryCache.keys()]) {
    if (key === 'dashboard' || key.startsWith('products:')) memoryCache.delete(key);
  }
}

app.get('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'المنتج غير موجود' });
    const [clientCols, supplierCols] = await Promise.all([
      tableCols('tblClients_Products'),
      tableCols('tblSuppliers_Products')
    ]);
    const rows = await runQuery(`
      SELECT
        p.ProductId AS id,
        ISNULL(p.ProductCode, '') AS code,
        ISNULL(p.ProductName, N'') AS name,
        ISNULL(p.ProductType, 0) AS productType,
        ISNULL(p.PhaseID, 5) AS phaseId,
        ISNULL(p.UnitName, N'') AS unitName,
        ISNULL(p.SalesTax, 0) AS salesTax,
        ISNULL(p.PriceIncludesSalesTax, 0) AS priceIncludesTax,
        ISNULL(p.OpeningUnitCost, 0) AS openingCost,
        ISNULL(p.ReOrderLevel, 0) AS reorderLevel,
        ISNULL(p.WarrantyByMonth, 0) AS warrantyMonths,
        ISNULL(p.RequireSerialNumber, 0) AS requireSerial,
        ISNULL(p.RequireExpiryDate, 0) AS requireExpiry,
        ISNULL(p.Weight, 0) AS weight,
        ISNULL(p.ProductStock, 0) AS stock,
        ${priceLookup('tblClients_Products', clientCols, 'p.ProductId', 2, 'ClientID')} AS salePrice,
        ${priceLookup('tblSuppliers_Products', supplierCols, 'p.ProductId', 1, 'SupplierID')} AS buyPrice
      FROM tblProducts p
      WHERE p.ProductId = @id
    `, [{ name: 'id', type: sql.Numeric(28, 0), value: id }]);
    if (!rows[0]) return res.status(404).json({ error: 'المنتج غير موجود' });
    const product = rows[0];
    await recordActivity(req, {
      action: 'price',
      detail: `استعلام عن سعر ${product.code} — ${product.name} — بيع ${product.salePrice} / شراء ${product.buyPrice}`,
      ref: `product:${id}`
    });
    const inquiries = loadActivity().filter((row) => row.ref === `product:${id}` && row.action === 'price').slice(0, 8);
    res.json({ product, inquiries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل المنتج' });
  }
});

app.get('/api/products/:id/sales', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'المنتج غير موجود' });
    const { page, pageSize, start, end } = paging(req);
    const filters = [{ name: 'id', type: sql.Numeric(28, 0), value: id }];
    const where = `
      FROM tblSellingInvoicesDetails d
      INNER JOIN tblSellingInvoice si ON si.SellingInvoiceID = d.SellingInvoiceID
      LEFT JOIN tblClients c ON c.ClientId = si.ClientID
      LEFT JOIN tblStores s ON s.StoreID = d.StoreID
      WHERE d.ProductID = @id`;
    const [rows, total] = await Promise.all([
      runQuery(`
        WITH numbered AS (
          SELECT
            si.SellingInvoiceID AS id,
            si.SellingInvoiceNo AS no,
            si.SellingInvoiceDate AS date,
            ISNULL(NULLIF(LTRIM(RTRIM(c.ClientName)), N''), N'عميل نقدي') AS name,
            ISNULL(s.StoreName, N'') AS storeName,
            ISNULL(d.OutQuantity, 0) AS qty,
            ISNULL(NULLIF(d.SellingPricePerUnit, 0), ISNULL(d.LotPricePerUnit, 0)) AS price,
            ISNULL(d.TotalPricePerProduct, 0) AS lineTotal,
            ISNULL(si.InsertedBy, N'') AS byName,
            ROW_NUMBER() OVER (ORDER BY si.SellingInvoiceDate DESC, si.SellingInvoiceID DESC, d.id DESC) AS rn
          ${where}
        )
        SELECT id, no, date, name, storeName, qty, price, lineTotal, byName
        FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
      `, filters.concat([
        { name: 'start', type: sql.Int, value: start },
        { name: 'end', type: sql.Int, value: end }
      ])),
      runQuery(`SELECT COUNT(*) AS total ${where}`, filters)
    ]);
    res.json({ page, pageSize, total: Number(total[0].total), rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل تاريخ البيع' });
  }
});

app.get('/api/products/:id/purchases', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'المنتج غير موجود' });
    const { page, pageSize, start, end } = paging(req);
    const filters = [{ name: 'id', type: sql.Numeric(28, 0), value: id }];
    const where = `
      FROM tblPurchaseInvoicesDetails d
      INNER JOIN tblPurchaseInvoice pi ON pi.PurchaseInvoiceID = d.PurchaseInvoiceID
      LEFT JOIN tblSuppliers s ON s.SupplierID = pi.SupplierID
      LEFT JOIN tblStores st ON st.StoreID = d.StoreID
      WHERE d.ProductID = @id`;
    const [rows, total] = await Promise.all([
      runQuery(`
        WITH numbered AS (
          SELECT
            pi.PurchaseInvoiceID AS id,
            pi.PurchaseInvoiceNo AS no,
            pi.PurchaseInvoiceDate AS date,
            ISNULL(NULLIF(LTRIM(RTRIM(s.SupplierName)), N''), N'بدون مورد') AS name,
            ISNULL(st.StoreName, N'') AS storeName,
            ISNULL(d.InQuantity, 0) AS qty,
            ISNULL(d.PurchasePrice, 0) AS price,
            ISNULL(d.TotalPricePerProduct, 0) AS lineTotal,
            ISNULL(pi.InsertedBy, N'') AS byName,
            ROW_NUMBER() OVER (ORDER BY pi.PurchaseInvoiceDate DESC, pi.PurchaseInvoiceID DESC, d.Id DESC) AS rn
          ${where}
        )
        SELECT id, no, date, name, storeName, qty, price, lineTotal, byName
        FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
      `, filters.concat([
        { name: 'start', type: sql.Int, value: start },
        { name: 'end', type: sql.Int, value: end }
      ])),
      runQuery(`SELECT COUNT(*) AS total ${where}`, filters)
    ]);
    res.json({ page, pageSize, total: Number(total[0].total), rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل تاريخ الشراء' });
  }
});

app.post('/api/products', requireAuth, async (req, res) => {
  const parsed = readProductBody(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const item = parsed.value;
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    if (item.code) {
      const taken = await txQuery(
        tx,
        `SELECT TOP 1 ProductId FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE LTRIM(RTRIM(ProductCode)) = @code`,
        [{ name: 'code', type: sql.NVarChar(50), value: item.code }]
      );
      if (taken.recordset[0]) throw new Error('كود المنتج مستخدم');
    }
    const id = await nextNumber(tx, 'tblProducts', 'ProductId');
    const code = item.code || String(id);
    await txQuery(tx, `
      INSERT INTO tblProducts (
        ProductId, ProductCode, ProductName, ProductType, SalesTax, PriceIncludesSalesTax,
        OpeningUnitCost, OpeningPurchasedStock, OpeningBonusStock, OpeningStock,
        PurchasedStock, BonusStock, ProductStock, ReOrderLevel,
        PhaseID, UnitID, UnitName, CountryID,
        RequireSerialNumber, RequireExpiryDate, WarrantyByMonth,
        DefaultSalesUnitId, DefaultPurchaseUnitId, Weight,
        Categ3, Categ4, Categ5, Categ6, Categ7, Categ8, Categ9, Categ10, Categ11, Categ12, CompCode
      )
      SELECT
        @id, @code, @name, @productType, @salesTax, @priceIncludesTax,
        @openingCost, 0, 0, 0,
        0, 0, 0, @reorderLevel,
        @phaseId, 0, ISNULL((SELECT TOP 1 UnitName FROM tblUnits WHERE UnitID = 0), N''), 0,
        @requireSerial, @requireExpiry, @warrantyMonths,
        0, 0, @weight,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    `, productInputs(item, id).map((input) => input.name === 'code' ? { ...input, value: code } : input));
    await saveBasePrice(tx, 'tblClients_Products', 'ClientID', id, 0, 0, item.salePrice, 2);
    await saveBasePrice(tx, 'tblSuppliers_Products', 'SupplierID', id, 0, 0, item.buyPrice, 1);
    await tx.commit();
    invalidateProducts();
    recordActivity(req, { action: 'product', detail: `إضافة منتج ${code} — ${item.name} — بيع ${item.salePrice} / شراء ${item.buyPrice}`, ref: `product:${id}` });
    res.json({ ok: true, id, code });
  } catch (error) {
    await tx.rollback().catch(() => {});
    console.error(error);
    const message = error.message === 'كود المنتج مستخدم' ? error.message : 'تعذر إضافة المنتج';
    res.status(error.message === 'كود المنتج مستخدم' ? 400 : 500).json({ error: message });
  }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'المنتج غير موجود' });
  const parsed = readProductBody(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const item = parsed.value;
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const existing = await txQuery(
      tx,
      `SELECT ProductId, ISNULL(UnitID, 0) AS unitId, ISNULL(CompCode, 0) AS compCode FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE ProductId = @id`,
      [{ name: 'id', type: sql.Numeric(28, 0), value: id }]
    );
    if (!existing.recordset[0]) throw new Error('المنتج غير موجود');
    if (item.code) {
      const taken = await txQuery(
        tx,
        `SELECT TOP 1 ProductId FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE LTRIM(RTRIM(ProductCode)) = @code AND ProductId <> @id`,
        [
          { name: 'code', type: sql.NVarChar(50), value: item.code },
          { name: 'id', type: sql.Numeric(28, 0), value: id }
        ]
      );
      if (taken.recordset[0]) throw new Error('كود المنتج مستخدم');
    }
    const updated = await txQuery(tx, `
      UPDATE tblProducts SET
        ProductCode = @code,
        ProductName = @name,
        ProductType = @productType,
        PhaseID = @phaseId,
        SalesTax = @salesTax,
        PriceIncludesSalesTax = @priceIncludesTax,
        OpeningUnitCost = @openingCost,
        ReOrderLevel = @reorderLevel,
        Weight = @weight,
        WarrantyByMonth = @warrantyMonths,
        RequireSerialNumber = @requireSerial,
        RequireExpiryDate = @requireExpiry
      WHERE ProductId = @id
    `, productInputs(item, id));
    if (!updated.rowsAffected[0]) throw new Error('المنتج غير موجود');
    const unitId = Number(existing.recordset[0].unitId);
    const compCode = Number(existing.recordset[0].compCode);
    await saveBasePrice(tx, 'tblClients_Products', 'ClientID', id, unitId, compCode, item.salePrice, 2);
    await saveBasePrice(tx, 'tblSuppliers_Products', 'SupplierID', id, unitId, compCode, item.buyPrice, 1);
    await tx.commit();
    invalidateProducts();
    recordActivity(req, { action: 'product', detail: `تعديل منتج ${item.code || id} — ${item.name} — بيع ${item.salePrice} / شراء ${item.buyPrice}`, ref: `product:${id}` });
    res.json({ ok: true, id });
  } catch (error) {
    await tx.rollback().catch(() => {});
    console.error(error);
    const known = error.message === 'كود المنتج مستخدم' || error.message === 'المنتج غير موجود';
    res.status(known ? 400 : 500).json({ error: known ? error.message : 'تعذر حفظ المنتج' });
  }
});

app.get('/api/clients', requireAuth, async (req, res) => {
  try {
    const { page, pageSize, start, end } = paging(req);
    const q = String(req.query.q || '').trim().slice(0, 80);
    const data = await queryPage(`
      WITH numbered AS (
        SELECT
          ClientId AS id,
          ISNULL(ClientName, N'') AS name,
          ISNULL(PhoneNo, N'') AS phone,
          ISNULL(MobilNo, N'') AS mobile,
          ISNULL(Address, N'') AS address,
          ISNULL(AccCode, N'') AS accCode,
          ISNULL(CreditLimit, 0) AS creditLimit,
          ROW_NUMBER() OVER (ORDER BY ClientName) AS rn,
          COUNT(*) OVER () AS total
        FROM tblClients
        WHERE @q = N'' OR ClientName LIKE @like OR PhoneNo LIKE @like OR MobilNo LIKE @like
      )
      SELECT * FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
    `, [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) },
      { name: 'start', type: sql.Int, value: start },
      { name: 'end', type: sql.Int, value: end }
    ]);
    res.json({ page, pageSize, total: data.total, rows: data.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل العملاء' });
  }
});

app.get('/api/suppliers', requireAuth, async (req, res) => {
  try {
    const { page, pageSize, start, end } = paging(req);
    const q = String(req.query.q || '').trim().slice(0, 80);
    const data = await queryPage(`
      WITH numbered AS (
        SELECT
          SupplierID AS id,
          ISNULL(SupplierName, N'') AS name,
          ISNULL(PhoneNo, N'') AS phone,
          ISNULL(MobilNo, N'') AS mobile,
          ISNULL(Address, N'') AS address,
          ISNULL(AccCode, N'') AS accCode,
          ROW_NUMBER() OVER (ORDER BY SupplierName) AS rn,
          COUNT(*) OVER () AS total
        FROM tblSuppliers
        WHERE @q = N'' OR SupplierName LIKE @like OR PhoneNo LIKE @like OR MobilNo LIKE @like
      )
      SELECT * FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
    `, [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) },
      { name: 'start', type: sql.Int, value: start },
      { name: 'end', type: sql.Int, value: end }
    ]);
    res.json({ page, pageSize, total: data.total, rows: data.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل الموردين' });
  }
});

app.get('/api/suppliers/:id/purchases', requireAuth, async (req, res) => {
  try {
    const supplierId = Number(req.params.id);
    if (!Number.isFinite(supplierId) || supplierId < 0) return res.status(400).json({ error: 'المورد غير موجود' });
    const { page, pageSize, start, end } = paging(req);
    const pool = await poolPromise;
    const supplier = await pool.request().input('id', sql.Numeric(18, 0), supplierId).query(`
      SELECT SupplierID AS id, ISNULL(SupplierName, N'') AS name, ISNULL(AccCode, N'') AS accCode
      FROM tblSuppliers WHERE SupplierID = @id
    `);
    if (!supplier.recordset[0]) return res.status(404).json({ error: 'المورد غير موجود' });
    const data = await queryPage(`
      WITH numbered AS (
        SELECT
          pi.PurchaseInvoiceID AS id,
          pi.PurchaseInvoiceNo AS no,
          pi.PurchaseInvoiceDate AS date,
          ISNULL(pi.PurchaseInvoiceTotalAmount, 0) AS amount,
          ISNULL(pi.TotalPaiedAmount, 0) AS paid,
          ISNULL(pi.NotPaiedAmount, 0) AS due,
          ISNULL(pi.InsertedBy, N'') AS byName,
          ROW_NUMBER() OVER (ORDER BY pi.PurchaseInvoiceDate DESC, pi.PurchaseInvoiceID DESC) AS rn,
          COUNT(*) OVER () AS total
        FROM tblPurchaseInvoice pi
        WHERE pi.SupplierID = @supplierId
      )
      SELECT id, no, date, amount, paid, due, byName, total
      FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
    `, [
      { name: 'supplierId', type: sql.Numeric(18, 0), value: supplierId },
      { name: 'start', type: sql.Int, value: start },
      { name: 'end', type: sql.Int, value: end }
    ]);
    res.json({ page, pageSize, total: data.total, supplier: supplier.recordset[0], rows: data.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل فواتير المورد' });
  }
});

app.get('/api/sales', requireAuth, async (req, res) => {
  try {
    const { page, pageSize, start, end } = paging(req);
    const q = String(req.query.q || '').trim().slice(0, 80);
    const filters = [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) }
    ];
    const where = `
      FROM tblSellingInvoice si
      LEFT JOIN tblClients c ON c.ClientId = si.ClientID
      WHERE @q = N''
        OR CAST(si.SellingInvoiceNo AS nvarchar(40)) LIKE @like
        OR c.ClientName LIKE @like`;
    const [rows, total] = await Promise.all([
      runQuery(`
        WITH numbered AS (
          SELECT
            si.SellingInvoiceID AS id,
            si.SellingInvoiceNo AS no,
            si.SellingInvoiceDate AS date,
            ISNULL(c.ClientName, N'') AS name,
            ISNULL(si.SellingInvoiceTotalAmount, 0) AS amount,
            ISNULL(si.TotalCollectedAmount, 0) AS paid,
            ISNULL(si.NotCollectedAmount, 0) AS due,
            ISNULL(si.InsertedBy, N'') AS byName,
            ROW_NUMBER() OVER (ORDER BY si.SellingInvoiceID DESC) AS rn
          ${where}
        )
        SELECT id, no, date, name, amount, paid, due, byName
        FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
      `, filters.concat([
        { name: 'start', type: sql.Int, value: start },
        { name: 'end', type: sql.Int, value: end }
      ])),
      cached(`sales:${q}`, 15000, async () => Number((await runQuery(`SELECT COUNT(*) AS total ${where}`, filters))[0].total))
    ]);
    res.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل فواتير البيع' });
  }
});

app.get('/api/sales/:id', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const id = Number(req.params.id);
    const header = await pool.request().input('id', sql.Numeric(18, 0), id).query(`
      SELECT
        si.SellingInvoiceID AS id,
        si.SellingInvoiceNo AS no,
        si.ClientID AS clientId,
        si.SellingInvoiceDate AS date,
        ISNULL(c.ClientName, N'') AS name,
        ISNULL(si.SellingInvoiceTotalAmount, 0) AS total,
        ISNULL(si.TotalCollectedAmount, 0) AS paid,
        ISNULL(si.NotCollectedAmount, 0) AS due,
        ISNULL(si.Notes, N'') AS notes,
        ISNULL(si.ReturnedAmount, 0) AS returnedAmount,
        ISNULL(si.InsertedBy, N'') AS byName
      FROM tblSellingInvoice si
      LEFT JOIN tblClients c ON c.ClientId = si.ClientID
      WHERE si.SellingInvoiceID = @id
    `);
    if (!header.recordset[0]) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    const lines = await pool.request().input('id', sql.Numeric(18, 0), id).query(`
      SELECT
        d.id AS lineId,
        d.ProductID AS productId,
        d.StoreID AS storeId,
        ISNULL(p.ProductCode, '') AS code,
        ISNULL(p.ProductName, N'') AS name,
        ISNULL(s.StoreName, N'') AS storeName,
        ISNULL(d.OutQuantity, 0) AS qty,
        ISNULL(d.ReturnedQuantity, 0) AS returned,
        ISNULL(NULLIF(d.SellingPricePerUnit, 0), ISNULL(d.LotPricePerUnit, 0)) AS price,
        ISNULL(d.TotalPricePerProduct, 0) AS lineTotal
      FROM tblSellingInvoicesDetails d
      LEFT JOIN tblProducts p ON p.ProductId = d.ProductID
      LEFT JOIN tblStores s ON s.StoreID = d.StoreID
      WHERE d.SellingInvoiceID = @id
      ORDER BY d.id
    `);
    res.json({ invoice: header.recordset[0], lines: lines.recordset });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر فتح الفاتورة' });
  }
});

app.get('/api/purchases', requireAuth, async (req, res) => {
  try {
    const { page, pageSize, start, end } = paging(req);
    const q = String(req.query.q || '').trim().slice(0, 80);
    const data = await queryPage(`
      WITH numbered AS (
        SELECT
          pi.PurchaseInvoiceID AS id,
          pi.PurchaseInvoiceNo AS no,
          pi.PurchaseInvoiceDate AS date,
          ISNULL(s.SupplierName, N'') AS name,
          ISNULL(pi.PurchaseInvoiceTotalAmount, 0) AS amount,
          ISNULL(pi.TotalPaiedAmount, 0) AS paid,
          ISNULL(pi.NotPaiedAmount, 0) AS due,
          ISNULL(pi.InsertedBy, N'') AS byName,
          ROW_NUMBER() OVER (ORDER BY pi.PurchaseInvoiceID DESC) AS rn,
          COUNT(*) OVER () AS total
        FROM tblPurchaseInvoice pi
        LEFT JOIN tblSuppliers s ON s.SupplierID = pi.SupplierID
        WHERE @q = N''
          OR CAST(pi.PurchaseInvoiceNo AS nvarchar(40)) LIKE @like
          OR s.SupplierName LIKE @like
      )
      SELECT id, no, date, name, amount, paid, due, byName, total
      FROM numbered WHERE rn BETWEEN @start AND @end ORDER BY rn
    `, [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) },
      { name: 'start', type: sql.Int, value: start },
      { name: 'end', type: sql.Int, value: end }
    ]);
    res.json({ page, pageSize, total: data.total, rows: data.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل فواتير الشراء' });
  }
});

app.get('/api/purchases/:id', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const id = Number(req.params.id);
    const header = await pool.request().input('id', sql.Numeric(18, 0), id).query(`
      SELECT
        pi.PurchaseInvoiceID AS id,
        pi.PurchaseInvoiceNo AS no,
        pi.SupplierID AS supplierId,
        pi.PurchaseInvoiceDate AS date,
        ISNULL(s.SupplierName, N'') AS name,
        ISNULL(pi.PurchaseInvoiceTotalAmount, 0) AS total,
        ISNULL(pi.TotalPaiedAmount, 0) AS paid,
        ISNULL(pi.NotPaiedAmount, 0) AS due,
        ISNULL(pi.Notes, N'') AS notes,
        ISNULL(pi.ReturnedAmount, 0) AS returnedAmount,
        ISNULL(pi.InsertedBy, N'') AS byName
      FROM tblPurchaseInvoice pi
      LEFT JOIN tblSuppliers s ON s.SupplierID = pi.SupplierID
      WHERE pi.PurchaseInvoiceID = @id
    `);
    if (!header.recordset[0]) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    const lines = await pool.request().input('id', sql.Numeric(18, 0), id).query(`
      SELECT
        d.Id AS lineId,
        d.ProductID AS productId,
        d.StoreID AS storeId,
        ISNULL(p.ProductCode, '') AS code,
        ISNULL(p.ProductName, N'') AS name,
        ISNULL(st.StoreName, N'') AS storeName,
        ISNULL(d.InQuantity, 0) AS qty,
        ISNULL(d.ReturnedQuantity, 0) AS returned,
        ISNULL(d.PurchasePrice, 0) AS price,
        ISNULL(d.TotalPricePerProduct, 0) AS lineTotal
      FROM tblPurchaseInvoicesDetails d
      LEFT JOIN tblProducts p ON p.ProductId = d.ProductID
      LEFT JOIN tblStores st ON st.StoreID = d.StoreID
      WHERE d.PurchaseInvoiceID = @id
      ORDER BY d.Id
    `);
    res.json({ invoice: header.recordset[0], lines: lines.recordset });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر فتح الفاتورة' });
  }
});

app.get('/api/stock', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const storeId = Number(req.query.storeId || 0);
    const { page, pageSize, start, end } = paging(req);
    if (q && page === 1) recordActivity(req, { action: 'search', detail: `استعلام مخزون: ${q}` });
    const safeStoreId = Number.isFinite(storeId) ? storeId : 0;
    const filters = [
      { name: 'q', type: sql.NVarChar(80), value: q },
      { name: 'like', type: sql.NVarChar(90), value: likeOf(q) },
      { name: 'storeId', type: sql.Int, value: safeStoreId }
    ];
    const where = `
      FROM tblProductsStores ps
      INNER JOIN tblProducts p ON p.ProductId = ps.ProductID
      INNER JOIN tblStores s ON s.StoreID = ps.StoreID
      WHERE ps.ProductStock <> 0
        AND (@storeId = 0 OR ps.StoreID = @storeId)
        AND (@q = N'' OR p.ProductCode LIKE @like OR p.ProductName LIKE @like)`;
    const pageSql = start === 1
      ? `SELECT TOP (@pageSize)
            ps.StoreID AS storeId,
            ISNULL(s.StoreName, N'') AS storeName,
            ISNULL(p.ProductCode, '') AS code,
            ISNULL(p.ProductName, N'') AS name,
            ISNULL(ps.ProductStock, 0) AS qty
          ${where}
          ORDER BY p.ProductCode, s.StoreName`
      : `WITH numbered AS (
          SELECT
            ps.StoreID AS storeId,
            ISNULL(s.StoreName, N'') AS storeName,
            ISNULL(p.ProductCode, '') AS code,
            ISNULL(p.ProductName, N'') AS name,
            ISNULL(ps.ProductStock, 0) AS qty,
            ROW_NUMBER() OVER (ORDER BY p.ProductCode, s.StoreName) AS rn
          ${where}
        )
        SELECT storeId, storeName, code, name, qty
        FROM numbered
        WHERE rn BETWEEN @start AND @end
        ORDER BY rn`;
    const [rows, total] = await Promise.all([
      runQuery(pageSql, filters.concat([
        { name: 'pageSize', type: sql.Int, value: pageSize },
        { name: 'start', type: sql.Int, value: start },
        { name: 'end', type: sql.Int, value: end }
      ])),
      cached(`stock:${safeStoreId}:${q}`, 20000, async () => {
        const count = await runQuery(`SELECT COUNT(*) AS total ${where}`, filters);
        return Number(count[0].total);
      })
    ]);
    res.json({ page, pageSize, total, rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'تعذر تحميل المخزون' });
  }
});

async function txQuery(tx, text, inputs = []) {
  const request = new sql.Request(tx);
  const all = tx.actor && !inputs.some((item) => item.name === 'actor')
    ? inputs.concat([{ name: 'actor', type: sql.NVarChar(50), value: tx.actor }])
    : inputs;
  for (const item of all) request.input(item.name, item.type, item.value);
  return request.query(text);
}

function businessDay() {
  const cairo = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const month = String(cairo.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cairo.getUTCDate()).padStart(2, '0');
  return `${cairo.getUTCFullYear()}-${month}-${day}`;
}

function invoiceTypeId(partyId) {
  return Number(partyId) ? 2 : 1;
}

function clip(value, max) {
  const text = String(value || '');
  return text.length > max ? text.slice(0, max) : text;
}

async function nextNumber(tx, table, column) {
  const result = await txQuery(
    tx,
    `SELECT ISNULL(MAX(${column}), 0) + 1 AS n FROM ${table} WITH (UPDLOCK, HOLDLOCK)`
  );
  return Number(result.recordset[0].n);
}

async function accountByCode(tx, code) {
  const result = await txQuery(
    tx,
    `SELECT TOP 1 AccountId, AccCode FROM tblAccTree WHERE AccCode = @code`,
    [{ name: 'code', type: sql.NVarChar(50), value: code }]
  );
  if (!result.recordset[0]) throw new Error(`الحساب ${code} غير موجود`);
  return result.recordset[0];
}

app.post('/api/sales', requireAuth, async (req, res) => {
  const clientId = Number(req.body.clientId);
  const storeId = Number(req.body.storeId);
  const paid = Boolean(req.body.paid);
  const notes = String(req.body.notes || '').slice(0, 250);
  const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
  if (!storeId || !lines.length) return res.status(400).json({ error: 'اختر المخزن وأضف صنفاً واحداً على الأقل' });
  if (!paid && !clientId) return res.status(400).json({ error: 'فاتورة الآجل تحتاج عميلاً' });

  const cleanLines = [];
  for (const line of lines) {
    const productId = Number(line.productId);
    const qty = Number(line.qty);
    const price = Number(line.price);
    if (!productId || !(qty > 0) || !(price >= 0)) {
      return res.status(400).json({ error: 'راجع الكمية والسعر لكل صنف' });
    }
    cleanLines.push({ productId, qty, price, total: Math.round(qty * price * 10000) / 10000 });
  }
  const invoiceTotal = Math.round(cleanLines.reduce((sum, line) => sum + line.total, 0) * 10000) / 10000;
  if (!(invoiceTotal > 0)) return res.status(400).json({ error: 'إجمالي الفاتورة لازم يكون أكبر من صفر' });
  const collected = paid ? invoiceTotal : 0;
  const due = invoiceTotal - collected;

  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const client = clientId
      ? (await txQuery(tx, `SELECT ClientId, ISNULL(ClientName, N'') AS name, ISNULL(AccCode, N'') AS accCode FROM tblClients WHERE ClientId = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: clientId }])).recordset[0]
      : { ClientId: 0, name: 'عميل نقدي', accCode: '' };
    if (clientId && !client) throw new Error('العميل غير موجود');
    const store = (await txQuery(tx, `SELECT StoreID FROM tblStores WHERE StoreID = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: storeId }])).recordset[0];
    if (!store) throw new Error('المخزن غير موجود');

    const salesAccount = await accountByCode(tx, '12210301');
    const cashClearing = await accountByCode(tx, '1221010001');
    const safeAccount = await accountByCode(tx, '12601');
    let clientAccount = null;
    if (due > 0) {
      if (!client.accCode) throw new Error('العميل ليس له كود حساب');
      clientAccount = await accountByCode(tx, client.accCode);
    }

    const invoiceNo = await nextNumber(tx, 'tblSellingInvoice', 'SellingInvoiceNo');
    const journalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
    const description = clip(`فاتورة بيع رقم (${invoiceNo}) - (${client.name})`, 200);
    const journal = await txQuery(tx, `
      INSERT INTO tblJournalEntry
        (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
         LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
      VALUES
        (@no, @dis, @date, @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: journalNo },
      { name: 'dis', type: sql.NVarChar(250), value: description },
      { name: 'date', type: sql.DateTime, value: new Date() },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal }
    ]);
    const journalId = journal.recordset[0].id;

    const journalLines = [];
    if (collected > 0) journalLines.push({ account: cashClearing, debit: collected, credit: 0, text: `فاتورة بيع رقم (${invoiceNo})` });
    if (due > 0) journalLines.push({ account: clientAccount, debit: due, credit: 0, text: `فاتورة بيع رقم (${invoiceNo})` });
    journalLines.push({ account: salesAccount, debit: 0, credit: invoiceTotal, text: `مبيعات - (${client.name})` });
    for (let index = 0; index < journalLines.length; index += 1) {
      const line = journalLines[index];
      await txQuery(tx, `
        INSERT INTO tblJournalEntryDetails
          (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
           DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
        VALUES
          (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1,
           @doc, N'SA', 0, 1, GETDATE(), @actor)
      `, [
        { name: 'ser', type: sql.SmallInt, value: index + 1 },
        { name: 'jid', type: sql.Numeric(18, 0), value: journalId },
        { name: 'accountId', type: sql.Int, value: line.account.AccountId },
        { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
        { name: 'text', type: sql.NVarChar(200), value: clip(line.text, 200) },
        { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
        { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
        { name: 'doc', type: sql.Numeric(18, 0), value: invoiceNo }
      ]);
    }

    const invoice = await txQuery(tx, `
      INSERT INTO tblSellingInvoice
        (SellingInvoiceNo, ClientID, SellingInvoiceDate, TotalProductsPrice, ProductsDiscountAmount,
         DiscountType, DiscountRatio, DiscountAmount, TotalDiscountAmount, TaxbaseAmount,
         SalesTaxRatio, AddedItptRatio, ITPTRatio, SalesTaxTotalAmount, AddedItptTotalAmount, ITPTAmount,
         SellingInvoiceTotalAmount, CurrencyID, ExRate, TotalCollectedAmount, ReturnedAmount,
         TotalOnCollectDiscount, Notes, Posted, JournalEntryID, PeriodID, BranchId,
         SellingInvoiceTypeId, SalesRepId, InsertedDate, InsertedBy)
      VALUES
        (@no, @clientId, CAST(@date AS datetime), @total, 0, 0, 0, 0, 0, @total,
         0, 0, 0, 0, 0, 0, @total, 0, 1, @collected, 0, 0, @notes, 1, @journalId, 1, 0,
         @typeId, 0, GETDATE(), @actor);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: invoiceNo },
      { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
      { name: 'date', type: sql.NVarChar(10), value: businessDay() },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
      { name: 'collected', type: sql.Numeric(18, 4), value: collected },
      { name: 'notes', type: sql.NVarChar(250), value: notes },
      { name: 'journalId', type: sql.Numeric(18, 0), value: journalId },
      { name: 'typeId', type: sql.Int, value: invoiceTypeId(client.ClientId) }
    ]);
    const invoiceId = invoice.recordset[0].id;

    for (const line of cleanLines) {
      const costRow = await txQuery(tx, `
        SELECT TOP 1 ISNULL(Cost, 0) AS cost
        FROM tblInventory
        WHERE ProductID = @pid AND Cost IS NOT NULL
        ORDER BY ID DESC
      `, [{ name: 'pid', type: sql.Numeric(18, 0), value: line.productId }]);
      const cost = costRow.recordset[0] ? Number(costRow.recordset[0].cost) : 0;
      const guid = crypto.randomUUID();
      const product = await txQuery(tx, `
        SELECT ProductId FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE ProductId = @pid
      `, [{ name: 'pid', type: sql.Numeric(18, 0), value: line.productId }]);
      if (!product.recordset[0]) throw new Error('أحد الأصناف غير موجود');
      await txQuery(tx, `
        IF NOT EXISTS (
          SELECT 1 FROM tblProductsStores WITH (UPDLOCK, HOLDLOCK)
          WHERE ProductID = @pid AND StoreID = @store AND CompCode = 0
        )
        INSERT INTO tblProductsStores
          (ProductID, StoreID, CompCode, OpeningPurchasedStock, OpeningBonusStock, OpeningStock,
           PurchasedStock, BonusStock, ProductStock)
        VALUES (@pid, @store, 0, 0, 0, 0, 0, 0, 0)
      `, [
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId }
      ]);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, ClientID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, LotPricePerUnit, TotalLotPrice, Cost, TransactionID,
           CompCode, RowGUID)
        VALUES
          (@invoiceNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @clientId, @store, 0, 0,
           @qty, 0, @price, @lineTotal, @cost, 2, 0, @guid)
      `, [
        { name: 'invoiceNo', type: sql.Numeric(18, 0), value: invoiceNo },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblSellingInvoicesDetails
          (SellingInvoiceID, ProductID, OutQuantity, OutBonus, UnitId, StockQty, ReturnedQuantity,
           ReturnedStockQty, StoreID, LotPricePerUnit, SellingPricePerUnit, TotalPrice, DiscountType,
           DiscountRatio, DiscountAmount, TotalPriceAfterDiscount, SalesTaxRatio, SalesTaxAmount,
           ItptRatio, ItptAmount, AddedItptRatio, AddedItptAmount, TotalPricePerProduct, Cost,
           RowGUID, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@invoiceId, @pid, @qty, 0, 0, @qty, 0, 0, @store, @price, 0, @lineTotal, 0,
           0, 0, @lineTotal, 0, 0, 0, 0, 0, 0, @lineTotal, @cost, @guid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
    }

    if (collected > 0) {
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `تحصيل فاتورة بيع رقم (${invoiceNo})`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES
          (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: collected }
      ]);
      const safeJournalId = safeJournal.recordset[0].id;
      const safeLines = [
        { account: safeAccount, debit: collected, credit: 0 },
        { account: cashClearing, debit: 0, credit: collected }
      ];
      for (let index = 0; index < safeLines.length; index += 1) {
        const line = safeLines[index];
        await txQuery(tx, `
          INSERT INTO tblJournalEntryDetails
            (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
             DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
          VALUES
            (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1,
             @doc, N'SF', 0, 1, GETDATE(), @actor)
        `, [
          { name: 'ser', type: sql.SmallInt, value: index + 1 },
          { name: 'jid', type: sql.Numeric(18, 0), value: safeJournalId },
          { name: 'accountId', type: sql.Int, value: line.account.AccountId },
          { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
          { name: 'text', type: sql.NVarChar(200), value: clip(safeText, 200) },
          { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
          { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
          { name: 'doc', type: sql.Numeric(18, 0), value: safeNo }
        ]);
      }
      const safe = await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, ClientID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId,
           InsertedDate, InsertedBy)
        VALUES
          (1, @total, 0, 1, 0, GETDATE(), @doc, @text, @clientId, 1, 0,
           @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor);
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: collected },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournalId }
      ]);
      await txQuery(tx, `
        INSERT INTO tblSellingInvoicesCollectingDetails
          (SellingInvoiceID, ClientID, SellingInvoiceTotalAmount, Collected, TotalCollectedAmount,
           OnCollectDiscount, TotalOnCollectDiscount, SafeOperationID)
        VALUES
          (@invoiceId, @clientId, @total, @collected, @collected, 0, 0, @safeId)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
        { name: 'collected', type: sql.Numeric(18, 4), value: collected },
        { name: 'safeId', type: sql.Numeric(18, 0), value: safe.recordset[0].id }
      ]);
    }

    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'sale', detail: `فاتورة بيع رقم ${invoiceNo} بإجمالي ${invoiceTotal}`, ref: `sale:${invoiceId}` });
    res.json({ id: invoiceId, no: invoiceNo, total: invoiceTotal });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: error.message || 'تعذر حفظ الفاتورة' });
  }
});

app.post('/api/purchases', requireAuth, async (req, res) => {
  const supplierId = Number(req.body.supplierId);
  const storeId = Number(req.body.storeId);
  const paid = Boolean(req.body.paid);
  const notes = String(req.body.notes || '').slice(0, 250);
  const lines = Array.isArray(req.body.lines) ? req.body.lines : [];
  if (!storeId || !lines.length) return res.status(400).json({ error: 'اختر المخزن وأضف صنفاً واحداً على الأقل' });
  if (!paid && !supplierId) return res.status(400).json({ error: 'فاتورة الآجل تحتاج مورداً' });

  const cleanLines = [];
  for (const line of lines) {
    const productId = Number(line.productId);
    const qty = Number(line.qty);
    const price = Number(line.price);
    if (!productId || !(qty > 0) || !(price >= 0)) {
      return res.status(400).json({ error: 'راجع الكمية والسعر لكل صنف' });
    }
    cleanLines.push({ productId, qty, price, total: Math.round(qty * price * 10000) / 10000 });
  }
  const invoiceTotal = Math.round(cleanLines.reduce((sum, line) => sum + line.total, 0) * 10000) / 10000;
  if (!(invoiceTotal > 0)) return res.status(400).json({ error: 'إجمالي الفاتورة لازم يكون أكبر من صفر' });
  const collected = paid ? invoiceTotal : 0;

  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const supplier = supplierId
      ? (await txQuery(tx, `SELECT SupplierID, ISNULL(SupplierName, N'') AS name, ISNULL(AccCode, N'') AS accCode FROM tblSuppliers WHERE SupplierID = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: supplierId }])).recordset[0]
      : { SupplierID: 0, name: 'مشتريات نقدية', accCode: '2423' };
    if (supplierId && !supplier) throw new Error('المورد غير موجود');
    const store = (await txQuery(tx, `SELECT StoreID FROM tblStores WHERE StoreID = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: storeId }])).recordset[0];
    if (!store) throw new Error('المخزن غير موجود');

    const purchasesAccount = await accountByCode(tx, '2424');
    const safeAccount = await accountByCode(tx, '12601');
    const counterCode = supplier.SupplierID ? supplier.accCode : '2423';
    if (!counterCode) throw new Error('المورد ليس له كود حساب');
    const counterAccount = await accountByCode(tx, counterCode);

    const invoiceNo = await nextNumber(tx, 'tblPurchaseInvoice', 'PurchaseInvoiceNo');
    const journalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
    const description = clip(`فاتورة شراء رقم (${invoiceNo}) - (${supplier.name})`, 200);
    const journal = await txQuery(tx, `
      INSERT INTO tblJournalEntry
        (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
         LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
      VALUES
        (@no, @dis, @date, @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: journalNo },
      { name: 'dis', type: sql.NVarChar(250), value: description },
      { name: 'date', type: sql.DateTime, value: new Date() },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal }
    ]);
    const journalId = journal.recordset[0].id;
    const journalLines = [
      { account: purchasesAccount, debit: invoiceTotal, credit: 0, text: `فاتورة شراء رقم (${invoiceNo})` },
      { account: counterAccount, debit: 0, credit: invoiceTotal, text: `مشتريات - (${supplier.name})` }
    ];
    for (let index = 0; index < journalLines.length; index += 1) {
      const line = journalLines[index];
      await txQuery(tx, `
        INSERT INTO tblJournalEntryDetails
          (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
           DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
        VALUES
          (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1,
           @doc, N'PU', 0, 1, GETDATE(), @actor)
      `, [
        { name: 'ser', type: sql.SmallInt, value: index + 1 },
        { name: 'jid', type: sql.Numeric(18, 0), value: journalId },
        { name: 'accountId', type: sql.Int, value: line.account.AccountId },
        { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
        { name: 'text', type: sql.NVarChar(200), value: clip(line.text, 200) },
        { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
        { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
        { name: 'doc', type: sql.Numeric(18, 0), value: invoiceNo }
      ]);
    }

    const invoice = await txQuery(tx, `
      INSERT INTO tblPurchaseInvoice
        (PurchaseInvoiceNo, PurchaseInvoiceRef, PurchaseOrderNo, ProdRecPermNo, SupplierID, PurchaseInvoiceDate,
         TotalProductsPrice, ProductsDiscountAmount, DiscountType, DiscountRatio, DiscountAmount, TotalDiscountAmount,
         TaxbaseAmount, TotalAddedExpenses, SalesTaxRatio, AddedItptRatio, ITPTRatio, SalesTaxTotalAmount,
         AddedItptTotalAmount, ITPTAmount, PurchaseInvoiceTotalAmount, CurrencyID, ExRate, TotalPaiedAmount,
         ReturnedAmount, TotalOnPaiedDiscount, Notes, PurchaseRepId, Posted, JournalEntryID, PeriodID, BranchId,
         PurchaseInvoiceTypeId, InsertedDate, InsertedBy)
      VALUES
        (@no, @ref, 0, 0, @supplierId, CAST(@date AS datetime), @total, 0, 0, 0, 0, 0,
         @total, 0, 0, 0, 0, 0, 0, 0, @total, 0, 1, @collected,
         0, 0, @notes, 0, 1, @journalId, 1, 0, @typeId, GETDATE(), @actor);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: invoiceNo },
      { name: 'ref', type: sql.NVarChar(50), value: String(invoiceNo) },
      { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
      { name: 'date', type: sql.NVarChar(10), value: businessDay() },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
      { name: 'collected', type: sql.Numeric(18, 4), value: collected },
      { name: 'notes', type: sql.NVarChar(250), value: notes },
      { name: 'journalId', type: sql.Numeric(18, 0), value: journalId },
      { name: 'typeId', type: sql.Int, value: invoiceTypeId(supplier.SupplierID) }
    ]);
    const invoiceId = invoice.recordset[0].id;

    for (const line of cleanLines) {
      const product = await txQuery(tx, `
        SELECT ProductId FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE ProductId = @pid
      `, [{ name: 'pid', type: sql.Numeric(18, 0), value: line.productId }]);
      if (!product.recordset[0]) throw new Error('أحد الأصناف غير موجود');
      const guid = crypto.randomUUID();
      await txQuery(tx, `
        IF NOT EXISTS (
          SELECT 1 FROM tblProductsStores WITH (UPDLOCK, HOLDLOCK)
          WHERE ProductID = @pid AND StoreID = @store AND CompCode = 0
        )
        INSERT INTO tblProductsStores
          (ProductID, StoreID, CompCode, OpeningPurchasedStock, OpeningBonusStock, OpeningStock,
           PurchasedStock, BonusStock, ProductStock)
        VALUES (@pid, @store, 0, 0, 0, 0, 0, 0, 0)
      `, [
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId }
      ]);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, SupplierID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, PurchasePricePerUnit, Cost, TransactionID, CompCode, RowGUID)
        VALUES
          (@invoiceNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @supplierId, @store, @qty, 0,
           0, 0, @price, @price, 1, 0, @guid)
      `, [
        { name: 'invoiceNo', type: sql.Numeric(18, 0), value: invoiceNo },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblPurchaseInvoicesDetails
          (PurchaseInvoiceID, ProductID, InQuantity, InBonus, UnitId, StockQty, ReturnedQuantity,
           ReturnedStockQty, StoreID, PurchasePrice, TotalPrice, DiscountType, DiscountRatio, DiscountAmount,
           TotalPriceAfterDiscount, SalesTaxRatio, SalesTaxAmount, ItptRatio, ItptAmount, AddedItptRatio,
           AddedItptAmount, TotalPricePerProduct, Cost, RowGUID, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@invoiceId, @pid, @qty, 0, 0, @qty, 0, 0, @store, @price, @lineTotal, 0, 0, 0,
           @lineTotal, 0, 0, 0, 0, 0, 0, @lineTotal, @price, @guid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
    }

    if (collected > 0) {
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `سداد فاتورة شراء رقم (${invoiceNo})`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES
          (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: collected }
      ]);
      const safeJournalId = safeJournal.recordset[0].id;
      const safeLines = [
        { account: counterAccount, debit: collected, credit: 0 },
        { account: safeAccount, debit: 0, credit: collected }
      ];
      for (let index = 0; index < safeLines.length; index += 1) {
        const line = safeLines[index];
        await txQuery(tx, `
          INSERT INTO tblJournalEntryDetails
            (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
             DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
          VALUES
            (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1,
             @doc, N'SF', 0, 1, GETDATE(), @actor)
        `, [
          { name: 'ser', type: sql.SmallInt, value: index + 1 },
          { name: 'jid', type: sql.Numeric(18, 0), value: safeJournalId },
          { name: 'accountId', type: sql.Int, value: line.account.AccountId },
          { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
          { name: 'text', type: sql.NVarChar(200), value: clip(safeText, 200) },
          { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
          { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
          { name: 'doc', type: sql.Numeric(18, 0), value: safeNo }
        ]);
      }
      const safe = await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, SupplierID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId,
           InsertedDate, InsertedBy)
        VALUES
          (2, @total, 0, 1, 0, GETDATE(), @doc, @text, @supplierId, 1, 0,
           @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor);
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: collected },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournalId }
      ]);
      await txQuery(tx, `
        INSERT INTO tblPurchaseInvoicesPayingDetails
          (PurchaseInvoiceID, SupplierID, PurchaseInvoiceTotalAmount, Paied, TotalPaiedAmount,
           OnPaiedDiscount, TotalOnPaiedDiscount, SafeOperationID)
        VALUES
          (@invoiceId, @supplierId, @total, @collected, @collected, 0, 0, @safeId)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
        { name: 'collected', type: sql.Numeric(18, 4), value: collected },
        { name: 'safeId', type: sql.Numeric(18, 0), value: safe.recordset[0].id }
      ]);
    }

    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'purchase', detail: `فاتورة شراء رقم ${invoiceNo} بإجمالي ${invoiceTotal}`, ref: `purchase:${invoiceId}` });
    res.json({ id: invoiceId, no: invoiceNo, total: invoiceTotal });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: error.message || 'تعذر حفظ فاتورة الشراء' });
  }
});

function moneyClose(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.0001;
}

function editError(error) {
  const message = String(error.message || '');
  if (/CK_tblSellingInvoice|CK_tblPurchaseInvoice/.test(message)) return 'المبلغ المدفوع أكبر من إجمالي الفاتورة';
  if (/[\u0600-\u06FF]/.test(message)) return message;
  return 'تعذر تعديل الفاتورة';
}

function editLines(bodyLines) {
  if (!Array.isArray(bodyLines) || !bodyLines.length) return { error: 'أضف صنفاً واحداً على الأقل' };
  const lines = [];
  const seen = new Set();
  for (const line of bodyLines) {
    const productId = Number(line.productId);
    const storeId = Number(line.storeId);
    const qty = roundTo(line.qty, 5);
    const price = roundTo(line.price, 4);
    const lineId = Number(line.lineId) || 0;
    if (!productId || !Number.isFinite(storeId) || qty == null || !(qty > 0) || price == null || price < 0) {
      return { error: 'راجع الكمية والسعر والمخزن لكل صنف' };
    }
    if (lineId) {
      if (seen.has(lineId)) return { error: 'سطر مكرر في الفاتورة' };
      seen.add(lineId);
    }
    lines.push({ lineId, productId, storeId, qty, price, total: roundTo(qty * price, 4) });
  }
  const total = roundTo(lines.reduce((sum, line) => sum + line.total, 0), 4);
  if (!(total > 0)) return { error: 'إجمالي الفاتورة لازم يكون أكبر من صفر' };
  return { lines, total };
}

function nextPaid(oldPaid, oldTotal, newTotal, wantPaid) {
  const paid = Number(oldPaid) || 0;
  const previous = Number(oldTotal) || 0;
  const amount = wantPaid ? newTotal : (paid > 0.0001 && paid + 0.0001 < previous ? roundTo(paid, 4) : 0);
  if (newTotal + 0.0001 < amount) throw new Error('الإجمالي الجديد أقل من المبلغ المدفوع');
  return amount;
}

function planLines(existing, incoming) {
  const byId = new Map(existing.map((line) => [Number(line.lineId), line]));
  const keep = new Set();
  const updates = [];
  const inserts = [];
  for (const line of incoming) {
    const old = line.lineId ? byId.get(line.lineId) : null;
    if (line.lineId && !old) throw new Error('سطر غير موجود في الفاتورة');
    if (old && Number(old.productId) === line.productId) {
      keep.add(line.lineId);
      updates.push({ ...line, rowGuid: old.rowGuid, oldQty: Number(old.qty), oldStore: Number(old.storeId) });
    } else inserts.push(line);
  }
  return { updates, inserts, deletes: existing.filter((line) => !keep.has(Number(line.lineId))) };
}

function assertOne(result, message) {
  const counts = result.rowsAffected || [];
  if (!counts.includes(1)) throw new Error(message);
}

async function assertStores(tx, ids) {
  for (const id of [...new Set(ids)]) {
    const store = await txQuery(tx, `SELECT StoreID FROM tblStores WHERE StoreID = @id`, [
      { name: 'id', type: sql.Numeric(18, 0), value: id }
    ]);
    if (!store.recordset[0]) throw new Error('المخزن غير موجود');
  }
}

async function assertProduct(tx, productId) {
  const product = await txQuery(tx, `SELECT ProductId FROM tblProducts WITH (UPDLOCK, HOLDLOCK) WHERE ProductId = @pid`, [
    { name: 'pid', type: sql.Numeric(18, 0), value: productId }
  ]);
  if (!product.recordset[0]) throw new Error('أحد الأصناف غير موجود');
}

async function alignInventoryGuid(tx, detailTable, line, invoiceNo, transactionId, qtyColumn, partyColumn, partyId) {
  const tables = { tblSellingInvoicesDetails: true, tblPurchaseInvoicesDetails: true };
  const qtyColumns = { OutQuantity: true, InQuantity: true };
  const partyColumns = { ClientID: true, SupplierID: true };
  if (!tables[detailTable] || !qtyColumns[qtyColumn] || !partyColumns[partyColumn]) {
    throw new Error('تعذر ربط أحد الأصناف بحركة المخزون');
  }
  const linked = await txQuery(tx, `
    SELECT TOP 1 i.ID AS id
    FROM tblInventory i WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN ${detailTable} d ON d.RowGuid = i.RowGUID
    WHERE d.id = @lineId AND i.TransactionID = @trx
  `, [
    { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
    { name: 'trx', type: sql.Int, value: transactionId }
  ]);
  if (linked.recordset[0]) return Number(linked.recordset[0].id);

  const inputs = [
    { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
    { name: 'no', type: sql.Numeric(18, 0), value: invoiceNo },
    { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
    { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
    { name: 'trx', type: sql.Int, value: transactionId },
    { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
    { name: 'party', type: sql.Numeric(18, 0), value: Number(partyId) || 0 }
  ];
  const attempts = [
    { qty: true, party: true },
    { qty: true, party: false },
    { qty: false, party: true, single: true },
    { qty: false, party: false, single: true }
  ];
  for (const attempt of attempts) {
    const filters = [
      'i.InvoiceNo = @no',
      'i.ProductID = @pid',
      'i.StoreID = @store',
      'i.TransactionID = @trx',
      'NOT EXISTS (SELECT 1 FROM tblSellingInvoicesDetails s WHERE s.RowGuid = i.RowGUID AND s.id <> @lineId)',
      'NOT EXISTS (SELECT 1 FROM tblPurchaseInvoicesDetails p WHERE p.RowGuid = i.RowGUID AND p.Id <> @lineId)'
    ];
    if (attempt.qty) filters.push(`i.${qtyColumn} = @qty`);
    if (attempt.party) filters.push(`ISNULL(i.${partyColumn}, 0) = @party`);
    const found = await txQuery(tx, `
      SELECT TOP 5 i.ID AS id
      FROM tblInventory i WITH (UPDLOCK, HOLDLOCK)
      WHERE ${filters.join(' AND ')}
      ORDER BY i.ID
    `, inputs);
    if (!found.recordset.length) continue;
    if (attempt.single && found.recordset.length !== 1) continue;
    const inventoryId = Number(found.recordset[0].id);
    const updated = await txQuery(tx, `
      UPDATE d SET d.RowGuid = i.RowGUID
      FROM ${detailTable} d
      INNER JOIN tblInventory i ON i.ID = @invId
      WHERE d.id = @lineId
    `, [
      { name: 'invId', type: sql.Numeric(18, 0), value: inventoryId },
      { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId }
    ]);
    assertOne(updated, 'تعذر ربط أحد الأصناف بحركة المخزون');
    return inventoryId;
  }
  throw new Error('تعذر ربط أحد الأصناف بحركة المخزون');
}

async function writeJournalLines(tx, journalId, docNo, journalCode, rows) {
  for (let index = 0; index < rows.length; index += 1) {
    const line = rows[index];
    await txQuery(tx, `
      INSERT INTO tblJournalEntryDetails
        (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
         DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
      VALUES
        (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1, @doc, @journal, 0, 1, GETDATE(), @actor)
    `, [
      { name: 'ser', type: sql.SmallInt, value: index + 1 },
      { name: 'jid', type: sql.Numeric(18, 0), value: journalId },
      { name: 'accountId', type: sql.Int, value: line.account.AccountId },
      { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
      { name: 'text', type: sql.NVarChar(200), value: clip(line.text, 200) },
      { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
      { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
      { name: 'doc', type: sql.Numeric(18, 0), value: docNo },
      { name: 'journal', type: sql.NVarChar(10), value: journalCode }
    ]);
  }
}

async function rebuildJournal(tx, journalId, total, description, docNo, journalCode, rows) {
  await txQuery(tx, `DELETE FROM tblJournalEntryDetails WHERE JournalEntryID = @id`, [
    { name: 'id', type: sql.Numeric(18, 0), value: journalId }
  ]);
  await txQuery(tx, `
    UPDATE tblJournalEntry
    SET TotalDebit = @total, TotalCredit = @total, JournalEntryDis = @dis
    WHERE JournalEntryID = @id
  `, [
    { name: 'id', type: sql.Numeric(18, 0), value: journalId },
    { name: 'total', type: sql.Numeric(18, 4), value: total },
    { name: 'dis', type: sql.NVarChar(250), value: clip(description, 250) }
  ]);
  await writeJournalLines(tx, journalId, docNo, journalCode, rows);
}

function mergeDebits(parts) {
  const merged = [];
  for (const part of parts) {
    const found = merged.find((item) => item.account.AccCode === part.account.AccCode);
    if (found) found.amount = roundTo(found.amount + part.amount, 4);
    else merged.push({ account: part.account, amount: part.amount });
  }
  return merged;
}

async function latestCost(tx, productId) {
  const costRow = await txQuery(tx, `
    SELECT TOP 1 ISNULL(Cost, 0) AS cost
    FROM tblInventory
    WHERE ProductID = @pid AND Cost IS NOT NULL
    ORDER BY ID DESC
  `, [{ name: 'pid', type: sql.Numeric(18, 0), value: productId }]);
  return costRow.recordset[0] ? Number(costRow.recordset[0].cost) : 0;
}

function returnLines(body) {
  const lines = Array.isArray(body.lines) ? body.lines : [];
  return lines.map((line) => ({ lineId: Number(line.lineId), qty: Number(line.qty) })).filter((line) => line.qty > 0);
}

async function ensureStore(tx, productId, storeId) {
  await txQuery(tx, `
    IF NOT EXISTS (
      SELECT 1 FROM tblProductsStores WITH (UPDLOCK, HOLDLOCK)
      WHERE ProductID = @pid AND StoreID = @store AND CompCode = 0
    )
    INSERT INTO tblProductsStores
      (ProductID, StoreID, CompCode, OpeningPurchasedStock, OpeningBonusStock, OpeningStock,
       PurchasedStock, BonusStock, ProductStock)
    VALUES (@pid, @store, 0, 0, 0, 0, 0, 0, 0)
  `, [
    { name: 'pid', type: sql.Numeric(18, 0), value: productId },
    { name: 'store', type: sql.Numeric(18, 0), value: storeId }
  ]);
}

app.put('/api/sales/:id', requireAuth, async (req, res) => {
  const invoiceId = Number(req.params.id);
  const parsed = editLines(req.body && req.body.lines);
  if (!invoiceId) return res.status(400).json({ error: 'الفاتورة غير موجودة' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const clientId = Number(req.body.clientId) || 0;
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const headerRow = await txQuery(tx, `
      SELECT SellingInvoiceNo AS no, ClientID AS clientId, JournalEntryID AS journalId,
        ISNULL(SellingInvoiceTotalAmount, 0) AS total, ISNULL(TotalCollectedAmount, 0) AS paid,
        ISNULL(ReturnedAmount, 0) AS returnedAmount, ISNULL(TotalDiscountAmount, 0) AS discount,
        ISNULL(ProductsDiscountAmount, 0) AS productsDiscount, ISNULL(SalesTaxTotalAmount, 0) AS tax,
        ISNULL(AddedItptTotalAmount, 0) AS addedTax, ISNULL(ITPTAmount, 0) AS itpt,
        ISNULL(TotalOnCollectDiscount, 0) AS collectDiscount
      FROM tblSellingInvoice WITH (UPDLOCK, HOLDLOCK) WHERE SellingInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    const header = headerRow.recordset[0];
    if (!header) throw new Error('الفاتورة غير موجودة');
    const existingRows = await txQuery(tx, `
      SELECT id AS lineId, ProductID AS productId, StoreID AS storeId, OutQuantity AS qty,
        ISNULL(ReturnedQuantity, 0) AS returned, RowGuid AS rowGuid
      FROM tblSellingInvoicesDetails WITH (UPDLOCK, HOLDLOCK) WHERE SellingInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    const existing = existingRows.recordset;
    if (Number(header.returnedAmount) > 0.0001 || existing.some((line) => Number(line.returned) > 0.0001)) {
      throw new Error('الفاتورة فيها مرتجع، لا يمكن تعديلها من هنا');
    }
    if ([header.discount, header.productsDiscount, header.tax, header.addedTax, header.itpt, header.collectDiscount].some((value) => Number(value) > 0.0001)) {
      throw new Error('الفاتورة فيها خصم أو ضريبة، لا يمكن تعديلها من هنا');
    }
    if (!Number(header.journalId)) throw new Error('الفاتورة غير مربوطة بقيد محاسبي');
    const payments = await txQuery(tx, `
      SELECT c.SafeOperationID AS safeId, ISNULL(c.Collected, 0) AS collected, ISNULL(c.OnCollectDiscount, 0) AS discount,
        s.JournalEntryID AS safeJournalId, s.SafeOperationDocumentNo AS safeNo
      FROM tblSellingInvoicesCollectingDetails c
      LEFT JOIN tblSafeOperations s ON s.OperationID = c.SafeOperationID
      WHERE c.SellingInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    if (payments.recordset.length > 1) throw new Error('الفاتورة لها أكثر من حركة تحصيل');
    const payment = payments.recordset[0] || null;
    if (payment && Number(payment.discount) > 0.0001) throw new Error('الفاتورة فيها خصم على التحصيل');
    const paid = nextPaid(header.paid, header.total, parsed.total, Boolean(req.body.paid));
    if (!payment && Number(header.paid) > 0.0001 && !moneyClose(paid, header.paid)) {
      throw new Error('المبلغ المحصّل غير مربوط بحركة خزنة، لا يمكن تغيير حالة السداد');
    }
    const client = clientId
      ? (await txQuery(tx, `SELECT ClientId, ISNULL(ClientName, N'') AS name, ISNULL(AccCode, N'') AS accCode FROM tblClients WHERE ClientId = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: clientId }])).recordset[0]
      : { ClientId: 0, name: 'عميل نقدي', accCode: '' };
    if (clientId && !client) throw new Error('العميل غير موجود');
    const due = roundTo(parsed.total - paid, 4);
    if (due > 0.0001 && clientId && !client.accCode) throw new Error('العميل ليس له كود حساب');
    const salesAccount = await accountByCode(tx, '12210301');
    const cashClearing = await accountByCode(tx, '1221010001');
    const safeAccount = await accountByCode(tx, '12601');
    const dueAccount = due > 0.0001 && clientId ? await accountByCode(tx, client.accCode) : cashClearing;
    await assertStores(tx, parsed.lines.map((line) => line.storeId));
    const plan = planLines(existing, parsed.lines);
    for (const line of plan.deletes.concat(plan.updates)) await assertProduct(tx, line.productId);
    for (const line of plan.inserts) await assertProduct(tx, line.productId);
    for (const line of plan.deletes) {
      await alignInventoryGuid(tx, 'tblSellingInvoicesDetails', line, header.no, 2, 'OutQuantity', 'ClientID', header.clientId);
      const removed = await txQuery(tx, `DELETE FROM tblSellingInvoicesDetails WHERE id = @lineId AND SellingInvoiceID = @id`, [
        { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      assertOne(removed, 'تعذر حذف صنف من الفاتورة');
    }
    for (const line of plan.updates) {
      const inventoryId = await alignInventoryGuid(tx, 'tblSellingInvoicesDetails', {
        lineId: line.lineId, productId: line.productId, storeId: line.oldStore, qty: line.oldQty
      }, header.no, 2, 'OutQuantity', 'ClientID', header.clientId);
      await ensureStore(tx, line.productId, line.storeId);
      const stock = await txQuery(tx, `
        UPDATE tblInventory SET OutQuantity = @qty, LotPricePerUnit = @price, TotalLotPrice = @total,
          StoreID = @store, ClientID = @clientId
        WHERE ID = @invId AND TransactionID = 2
      `, [
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'total', type: sql.Numeric(18, 4), value: line.total },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'invId', type: sql.Numeric(18, 0), value: inventoryId }
      ]);
      assertOne(stock, 'تعذر تحديث حركة المخزون');
      const detail = await txQuery(tx, `
        UPDATE tblSellingInvoicesDetails SET OutQuantity = @qty, StockQty = @qty, StoreID = @store,
          LotPricePerUnit = @price, TotalPrice = @total, TotalPriceAfterDiscount = @total, TotalPricePerProduct = @total
        WHERE id = @lineId AND SellingInvoiceID = @id
      `, [
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'total', type: sql.Numeric(18, 4), value: line.total },
        { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      assertOne(detail, 'تعذر تحديث صنف الفاتورة');
    }
    for (const line of plan.inserts) {
      const cost = await latestCost(tx, line.productId);
      const guid = crypto.randomUUID();
      await ensureStore(tx, line.productId, line.storeId);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, ClientID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, LotPricePerUnit, TotalLotPrice, Cost, TransactionID, CompCode, RowGUID)
        VALUES
          (@invoiceNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @clientId, @store, 0, 0,
           @qty, 0, @price, @lineTotal, @cost, 2, 0, @guid)
      `, [
        { name: 'invoiceNo', type: sql.Numeric(18, 0), value: header.no },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblSellingInvoicesDetails
          (SellingInvoiceID, ProductID, OutQuantity, OutBonus, UnitId, StockQty, ReturnedQuantity,
           ReturnedStockQty, StoreID, LotPricePerUnit, SellingPricePerUnit, TotalPrice, DiscountType,
           DiscountRatio, DiscountAmount, TotalPriceAfterDiscount, SalesTaxRatio, SalesTaxAmount,
           ItptRatio, ItptAmount, AddedItptRatio, AddedItptAmount, TotalPricePerProduct, Cost,
           RowGUID, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@invoiceId, @pid, @qty, 0, 0, @qty, 0, 0, @store, @price, 0, @lineTotal, 0,
           0, 0, @lineTotal, 0, 0, 0, 0, 0, 0, @lineTotal, @cost, @guid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
    }
    if (payment && paid <= 0.0001) {
      await txQuery(tx, `DELETE FROM tblSellingInvoicesCollectingDetails WHERE SellingInvoiceID = @id`, [
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      if (payment.safeJournalId) {
        await txQuery(tx, `DELETE FROM tblJournalEntryDetails WHERE JournalEntryID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeJournalId }
        ]);
      }
      if (payment.safeId) {
        await txQuery(tx, `DELETE FROM tblSafeOperations WHERE OperationID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeId }
        ]);
      }
      if (payment.safeJournalId) {
        await txQuery(tx, `DELETE FROM tblJournalEntry WHERE JournalEntryID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeJournalId }
        ]);
      }
    }
    await txQuery(tx, `
      UPDATE tblSellingInvoice SET ClientID = @clientId, SellingInvoiceTypeId = @typeId, TotalProductsPrice = @total, TaxbaseAmount = @total,
        SellingInvoiceTotalAmount = @total, TotalCollectedAmount = @paid
      WHERE SellingInvoiceID = @id
    `, [
      { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
      { name: 'typeId', type: sql.Int, value: invoiceTypeId(client.ClientId) },
      { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
      { name: 'paid', type: sql.Numeric(18, 4), value: paid },
      { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
    ]);
    const saleText = `فاتورة بيع رقم (${header.no})`;
    if (payment && paid > 0.0001) {
      await txQuery(tx, `
        UPDATE tblSellingInvoicesCollectingDetails
        SET SellingInvoiceTotalAmount = @total, Collected = @paid, TotalCollectedAmount = @paid
        WHERE SellingInvoiceID = @id
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
        { name: 'paid', type: sql.Numeric(18, 4), value: paid },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      if (payment.safeId) {
        await txQuery(tx, `
          UPDATE tblSafeOperations SET SafeOperationTotalAmount = @paid, AdjustedAmount = @paid, ClientID = @clientId
          WHERE OperationID = @id
        `, [
          { name: 'paid', type: sql.Numeric(18, 4), value: paid },
          { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeId }
        ]);
      }
      if (!moneyClose(paid, payment.collected)) {
        if (!payment.safeJournalId) throw new Error('حركة الخزنة غير مربوطة بقيد');
        await rebuildJournal(tx, payment.safeJournalId, paid, `تحصيل ${saleText}`, payment.safeNo, 'SF', [
          { account: safeAccount, debit: paid, credit: 0, text: `تحصيل ${saleText}` },
          { account: cashClearing, debit: 0, credit: paid, text: `تحصيل ${saleText}` }
        ]);
      }
    } else if (!payment && paid > 0.0001) {
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `تحصيل ${saleText}`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: paid }
      ]);
      await writeJournalLines(tx, safeJournal.recordset[0].id, safeNo, 'SF', [
        { account: safeAccount, debit: paid, credit: 0, text: safeText },
        { account: cashClearing, debit: 0, credit: paid, text: safeText }
      ]);
      const safe = await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, ClientID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId, InsertedDate, InsertedBy)
        VALUES (1, @total, 0, 1, 0, GETDATE(), @doc, @text, @clientId, 1, 0, @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor);
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: paid },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournal.recordset[0].id }
      ]);
      await txQuery(tx, `
        INSERT INTO tblSellingInvoicesCollectingDetails
          (SellingInvoiceID, ClientID, SellingInvoiceTotalAmount, Collected, TotalCollectedAmount, OnCollectDiscount, TotalOnCollectDiscount, SafeOperationID)
        VALUES (@invoiceId, @clientId, @total, @paid, @paid, 0, 0, @safeId)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: client.ClientId || 0 },
        { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
        { name: 'paid', type: sql.Numeric(18, 4), value: paid },
        { name: 'safeId', type: sql.Numeric(18, 0), value: safe.recordset[0].id }
      ]);
    }
    const debitParts = [];
    if (paid > 0.0001) debitParts.push({ account: cashClearing, amount: paid });
    if (due > 0.0001) debitParts.push({ account: dueAccount, amount: due });
    await rebuildJournal(
      tx, header.journalId, parsed.total,
      clip(`${saleText} - (${client.name})`, 250),
      header.no, 'SA',
      mergeDebits(debitParts).map((part) => ({ account: part.account, debit: part.amount, credit: 0, text: saleText }))
        .concat([{ account: salesAccount, debit: 0, credit: parsed.total, text: `مبيعات - (${client.name})` }])
    );
    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'sale', detail: `تعديل فاتورة بيع رقم ${header.no} بإجمالي ${parsed.total}`, ref: `sale:${invoiceId}` });
    res.json({ id: invoiceId, no: header.no, total: parsed.total });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: editError(error) });
  }
});

app.put('/api/purchases/:id', requireAuth, async (req, res) => {
  const invoiceId = Number(req.params.id);
  const parsed = editLines(req.body && req.body.lines);
  if (!invoiceId) return res.status(400).json({ error: 'الفاتورة غير موجودة' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const supplierId = Number(req.body.supplierId) || 0;
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const headerRow = await txQuery(tx, `
      SELECT PurchaseInvoiceNo AS no, SupplierID AS supplierId, JournalEntryID AS journalId,
        ISNULL(PurchaseInvoiceTotalAmount, 0) AS total, ISNULL(TotalPaiedAmount, 0) AS paid,
        ISNULL(ReturnedAmount, 0) AS returnedAmount, ISNULL(TotalDiscountAmount, 0) AS discount,
        ISNULL(ProductsDiscountAmount, 0) AS productsDiscount, ISNULL(SalesTaxTotalAmount, 0) AS tax,
        ISNULL(AddedItptTotalAmount, 0) AS addedTax, ISNULL(ITPTAmount, 0) AS itpt,
        ISNULL(TotalOnPaiedDiscount, 0) AS collectDiscount
      FROM tblPurchaseInvoice WITH (UPDLOCK, HOLDLOCK) WHERE PurchaseInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    const header = headerRow.recordset[0];
    if (!header) throw new Error('الفاتورة غير موجودة');
    const existingRows = await txQuery(tx, `
      SELECT Id AS lineId, ProductID AS productId, StoreID AS storeId, InQuantity AS qty,
        ISNULL(ReturnedQuantity, 0) AS returned, RowGuid AS rowGuid
      FROM tblPurchaseInvoicesDetails WITH (UPDLOCK, HOLDLOCK) WHERE PurchaseInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    const existing = existingRows.recordset;
    if (Number(header.returnedAmount) > 0.0001 || existing.some((line) => Number(line.returned) > 0.0001)) {
      throw new Error('الفاتورة فيها مرتجع، لا يمكن تعديلها من هنا');
    }
    if ([header.discount, header.productsDiscount, header.tax, header.addedTax, header.itpt, header.collectDiscount].some((value) => Number(value) > 0.0001)) {
      throw new Error('الفاتورة فيها خصم أو ضريبة، لا يمكن تعديلها من هنا');
    }
    if (!Number(header.journalId)) throw new Error('الفاتورة غير مربوطة بقيد محاسبي');
    const payments = await txQuery(tx, `
      SELECT p.SafeOperationID AS safeId, ISNULL(p.Paied, 0) AS collected, ISNULL(p.OnPaiedDiscount, 0) AS discount,
        s.JournalEntryID AS safeJournalId, s.SafeOperationDocumentNo AS safeNo
      FROM tblPurchaseInvoicesPayingDetails p
      LEFT JOIN tblSafeOperations s ON s.OperationID = p.SafeOperationID
      WHERE p.PurchaseInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }]);
    if (payments.recordset.length > 1) throw new Error('الفاتورة لها أكثر من حركة سداد');
    const payment = payments.recordset[0] || null;
    if (payment && Number(payment.discount) > 0.0001) throw new Error('الفاتورة فيها خصم على السداد');
    const paid = nextPaid(header.paid, header.total, parsed.total, Boolean(req.body.paid));
    if (!payment && Number(header.paid) > 0.0001 && !moneyClose(paid, header.paid)) {
      throw new Error('المبلغ المدفوع غير مربوط بحركة خزنة، لا يمكن تغيير حالة السداد');
    }
    const supplier = supplierId
      ? (await txQuery(tx, `SELECT SupplierID, ISNULL(SupplierName, N'') AS name, ISNULL(AccCode, N'') AS accCode FROM tblSuppliers WHERE SupplierID = @id`, [{ name: 'id', type: sql.Numeric(18, 0), value: supplierId }])).recordset[0]
      : { SupplierID: 0, name: 'مشتريات نقدية', accCode: '2423' };
    if (supplierId && !supplier) throw new Error('المورد غير موجود');
    const counterCode = supplier.SupplierID ? supplier.accCode : '2423';
    if (!counterCode) throw new Error('المورد ليس له كود حساب');
    const purchasesAccount = await accountByCode(tx, '2424');
    const safeAccount = await accountByCode(tx, '12601');
    const counterAccount = await accountByCode(tx, counterCode);
    await assertStores(tx, parsed.lines.map((line) => line.storeId));
    const plan = planLines(existing, parsed.lines);
    for (const line of plan.deletes.concat(plan.updates, plan.inserts)) await assertProduct(tx, line.productId);
    for (const line of plan.deletes) {
      await alignInventoryGuid(tx, 'tblPurchaseInvoicesDetails', line, header.no, 1, 'InQuantity', 'SupplierID', header.supplierId);
      const removed = await txQuery(tx, `DELETE FROM tblPurchaseInvoicesDetails WHERE Id = @lineId AND PurchaseInvoiceID = @id`, [
        { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      assertOne(removed, 'تعذر حذف صنف من الفاتورة');
    }
    for (const line of plan.updates) {
      const inventoryId = await alignInventoryGuid(tx, 'tblPurchaseInvoicesDetails', {
        lineId: line.lineId, productId: line.productId, storeId: line.oldStore, qty: line.oldQty
      }, header.no, 1, 'InQuantity', 'SupplierID', header.supplierId);
      await ensureStore(tx, line.productId, line.storeId);
      const stock = await txQuery(tx, `
        UPDATE tblInventory SET InQuantity = @qty, PurchasePricePerUnit = @price, StoreID = @store, SupplierID = @supplierId
        WHERE ID = @invId AND TransactionID = 1
      `, [
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'invId', type: sql.Numeric(18, 0), value: inventoryId }
      ]);
      assertOne(stock, 'تعذر تحديث حركة المخزون');
      const detail = await txQuery(tx, `
        UPDATE tblPurchaseInvoicesDetails SET InQuantity = @qty, StockQty = @qty, StoreID = @store, PurchasePrice = @price,
          TotalPrice = @total, TotalPriceAfterDiscount = @total, TotalPricePerProduct = @total
        WHERE Id = @lineId AND PurchaseInvoiceID = @id
      `, [
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'total', type: sql.Numeric(18, 4), value: line.total },
        { name: 'lineId', type: sql.Numeric(18, 0), value: line.lineId },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      assertOne(detail, 'تعذر تحديث صنف الفاتورة');
    }
    for (const line of plan.inserts) {
      const guid = crypto.randomUUID();
      await ensureStore(tx, line.productId, line.storeId);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, SupplierID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, PurchasePricePerUnit, Cost, TransactionID, CompCode, RowGUID)
        VALUES
          (@invoiceNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @supplierId, @store, @qty, 0,
           0, 0, @price, @price, 1, 0, @guid)
      `, [
        { name: 'invoiceNo', type: sql.Numeric(18, 0), value: header.no },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblPurchaseInvoicesDetails
          (PurchaseInvoiceID, ProductID, InQuantity, InBonus, UnitId, StockQty, ReturnedQuantity,
           ReturnedStockQty, StoreID, PurchasePrice, TotalPrice, DiscountType, DiscountRatio, DiscountAmount,
           TotalPriceAfterDiscount, SalesTaxRatio, SalesTaxAmount, ItptRatio, ItptAmount, AddedItptRatio,
           AddedItptAmount, TotalPricePerProduct, Cost, RowGUID, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@invoiceId, @pid, @qty, 0, 0, @qty, 0, 0, @store, @price, @lineTotal, 0, 0, 0,
           @lineTotal, 0, 0, 0, 0, 0, 0, @lineTotal, @price, @guid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.qty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
    }
    if (payment && paid <= 0.0001) {
      await txQuery(tx, `DELETE FROM tblPurchaseInvoicesPayingDetails WHERE PurchaseInvoiceID = @id`, [
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      if (payment.safeJournalId) {
        await txQuery(tx, `DELETE FROM tblJournalEntryDetails WHERE JournalEntryID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeJournalId }
        ]);
      }
      if (payment.safeId) {
        await txQuery(tx, `DELETE FROM tblSafeOperations WHERE OperationID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeId }
        ]);
      }
      if (payment.safeJournalId) {
        await txQuery(tx, `DELETE FROM tblJournalEntry WHERE JournalEntryID = @id`, [
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeJournalId }
        ]);
      }
    }
    await txQuery(tx, `
      UPDATE tblPurchaseInvoice SET SupplierID = @supplierId, PurchaseInvoiceTypeId = @typeId, TotalProductsPrice = @total, TaxbaseAmount = @total,
        PurchaseInvoiceTotalAmount = @total, TotalPaiedAmount = @paid
      WHERE PurchaseInvoiceID = @id
    `, [
      { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
      { name: 'typeId', type: sql.Int, value: invoiceTypeId(supplier.SupplierID) },
      { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
      { name: 'paid', type: sql.Numeric(18, 4), value: paid },
      { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
    ]);
    const purchaseText = `فاتورة شراء رقم (${header.no})`;
    if (payment && paid > 0.0001) {
      await txQuery(tx, `
        UPDATE tblPurchaseInvoicesPayingDetails
        SET PurchaseInvoiceTotalAmount = @total, Paied = @paid, TotalPaiedAmount = @paid
        WHERE PurchaseInvoiceID = @id
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
        { name: 'paid', type: sql.Numeric(18, 4), value: paid },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
      if (payment.safeId) {
        await txQuery(tx, `
          UPDATE tblSafeOperations SET SafeOperationTotalAmount = @paid, AdjustedAmount = @paid, SupplierID = @supplierId
          WHERE OperationID = @id
        `, [
          { name: 'paid', type: sql.Numeric(18, 4), value: paid },
          { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
          { name: 'id', type: sql.Numeric(18, 0), value: payment.safeId }
        ]);
      }
      if (!moneyClose(paid, payment.collected)) {
        if (!payment.safeJournalId) throw new Error('حركة الخزنة غير مربوطة بقيد');
        await rebuildJournal(tx, payment.safeJournalId, paid, `سداد ${purchaseText}`, payment.safeNo, 'SF', [
          { account: counterAccount, debit: paid, credit: 0, text: `سداد ${purchaseText}` },
          { account: safeAccount, debit: 0, credit: paid, text: `سداد ${purchaseText}` }
        ]);
      }
    } else if (!payment && paid > 0.0001) {
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `سداد ${purchaseText}`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: paid }
      ]);
      await writeJournalLines(tx, safeJournal.recordset[0].id, safeNo, 'SF', [
        { account: counterAccount, debit: paid, credit: 0, text: safeText },
        { account: safeAccount, debit: 0, credit: paid, text: safeText }
      ]);
      const safe = await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, SupplierID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId, InsertedDate, InsertedBy)
        VALUES (2, @total, 0, 1, 0, GETDATE(), @doc, @text, @supplierId, 1, 0, @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor);
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: paid },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournal.recordset[0].id }
      ]);
      await txQuery(tx, `
        INSERT INTO tblPurchaseInvoicesPayingDetails
          (PurchaseInvoiceID, SupplierID, PurchaseInvoiceTotalAmount, Paied, TotalPaiedAmount, OnPaiedDiscount, TotalOnPaiedDiscount, SafeOperationID)
        VALUES (@invoiceId, @supplierId, @total, @paid, @paid, 0, 0, @safeId)
      `, [
        { name: 'invoiceId', type: sql.Numeric(18, 0), value: invoiceId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: supplier.SupplierID || 0 },
        { name: 'total', type: sql.Numeric(18, 4), value: parsed.total },
        { name: 'paid', type: sql.Numeric(18, 4), value: paid },
        { name: 'safeId', type: sql.Numeric(18, 0), value: safe.recordset[0].id }
      ]);
    }
    await rebuildJournal(
      tx, header.journalId, parsed.total,
      clip(`${purchaseText} - (${supplier.name})`, 250),
      header.no, 'PU',
      [
        { account: purchasesAccount, debit: parsed.total, credit: 0, text: purchaseText },
        { account: counterAccount, debit: 0, credit: parsed.total, text: `مشتريات - (${supplier.name})` }
      ]
    );
    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'purchase', detail: `تعديل فاتورة شراء رقم ${header.no} بإجمالي ${parsed.total}`, ref: `purchase:${invoiceId}` });
    res.json({ id: invoiceId, no: header.no, total: parsed.total });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: editError(error) });
  }
});

app.post('/api/sales/:id/return', requireAuth, async (req, res) => {
  const invoiceId = Number(req.params.id);
  const requested = returnLines(req.body || {});
  if (!invoiceId || !requested.length) return res.status(400).json({ error: 'حدد كمية مرتجع لصنف واحد على الأقل' });
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const header = (await txQuery(tx, `
      SELECT si.SellingInvoiceNo AS no, ISNULL(si.ClientID, 0) AS clientId,
             ISNULL(si.SellingInvoiceTotalAmount, 0) AS total, ISNULL(si.TotalCollectedAmount, 0) AS collected,
             ISNULL(si.TotalOnCollectDiscount, 0) AS discount, ISNULL(si.ReturnedAmount, 0) AS returnedAmount,
             ISNULL(NULLIF(LTRIM(RTRIM(c.ClientName)), N''), N'مبيعات نقدية') AS name,
             ISNULL(c.AccCode, N'') AS accCode
      FROM tblSellingInvoice si WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN tblClients c ON c.ClientId = si.ClientID
      WHERE si.SellingInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }])).recordset[0];
    if (!header) throw new Error('الفاتورة غير موجودة');
    const sources = (await txQuery(tx, `
      SELECT d.id AS lineId, d.ProductID AS productId, ISNULL(d.StoreID, 0) AS storeId,
             ISNULL(d.OutQuantity, 0) AS qty, ISNULL(d.ReturnedQuantity, 0) AS returned,
             ISNULL(NULLIF(d.SellingPricePerUnit, 0), ISNULL(d.LotPricePerUnit, 0)) AS price,
             ISNULL(d.Cost, 0) AS cost, d.RowGuid AS rowGuid
      FROM tblSellingInvoicesDetails d WITH (UPDLOCK, HOLDLOCK)
      WHERE d.SellingInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }])).recordset;
    const clean = [];
    for (const item of requested) {
      const source = sources.find((line) => Number(line.lineId) === item.lineId);
      if (!source) throw new Error('سطر الفاتورة غير موجود');
      const left = Number(source.qty) - Number(source.returned);
      if (item.qty > left + 0.00001) throw new Error('كمية المرتجع أكبر من المتبقي على الفاتورة');
      if (!source.storeId || !source.rowGuid) throw new Error('سطر الفاتورة لا يمكن إرجاعه');
      const total = Math.round(item.qty * Number(source.price) * 10000) / 10000;
      clean.push({ ...source, returnQty: item.qty, total });
    }
    const invoiceTotal = Math.round(clean.reduce((sum, line) => sum + line.total, 0) * 10000) / 10000;
    if (!(invoiceTotal > 0)) throw new Error('إجمالي المرتجع لازم يكون أكبر من صفر');
    const room = Number(header.total) - Number(header.collected) - Number(header.discount) - Number(header.returnedAmount);
    const refund = Math.max(0, Math.round((invoiceTotal - room) * 10000) / 10000);
    if (refund > Number(header.collected) + 0.00001) throw new Error('قيمة المرتجع أكبر من المتاح على الفاتورة');
    if (refund > 0) {
      await txQuery(tx, `
        UPDATE tblSellingInvoice SET TotalCollectedAmount = TotalCollectedAmount - @refund WHERE SellingInvoiceID = @id
      `, [
        { name: 'refund', type: sql.Numeric(18, 4), value: refund },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
    }
    const creditParts = [];
    const receivable = Math.round((invoiceTotal - refund) * 10000) / 10000;
    if (receivable > 0) creditParts.push({ code: Number(header.clientId) ? header.accCode : '1221010001', amount: receivable });
    if (refund > 0) creditParts.push({ code: '1221010001', amount: refund });
    if (creditParts.some((part) => !part.code)) throw new Error('العميل ليس له كود حساب');
    const salesAccount = await accountByCode(tx, '12210301');
    const creditAccounts = [];
    for (const part of creditParts) {
      const account = await accountByCode(tx, part.code);
      const existing = creditAccounts.find((item) => item.account.AccCode === account.AccCode);
      if (existing) existing.amount += part.amount;
      else creditAccounts.push({ account, amount: part.amount });
    }
    const returnNo = await nextNumber(tx, 'tblReturnSellPermission', 'ReturnSellPermissionNo');
    const journalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
    const description = clip(`اذن مردودات مبيعات رقم (${returnNo}) مرتجع فاتورة رقم (${header.no})`, 200);
    const journal = await txQuery(tx, `
      INSERT INTO tblJournalEntry
        (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
         LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
      VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: journalNo },
      { name: 'dis', type: sql.NVarChar(250), value: description },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal }
    ]);
    const journalId = journal.recordset[0].id;
    const journalLines = [
      { account: salesAccount, debit: invoiceTotal, credit: 0, text: `قيمه مردودات المبيعات - (${header.name})` },
      ...creditAccounts.map((part) => ({ account: part.account, debit: 0, credit: part.amount, text: description }))
    ];
    for (let index = 0; index < journalLines.length; index += 1) {
      const line = journalLines[index];
      await txQuery(tx, `
        INSERT INTO tblJournalEntryDetails
          (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
           DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
        VALUES (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1, @doc, N'SA', 0, 1, GETDATE(), @actor)
      `, [
        { name: 'ser', type: sql.SmallInt, value: index + 1 },
        { name: 'jid', type: sql.Numeric(18, 0), value: journalId },
        { name: 'accountId', type: sql.Int, value: line.account.AccountId },
        { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
        { name: 'text', type: sql.NVarChar(200), value: clip(line.text, 200) },
        { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
        { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
        { name: 'doc', type: sql.Numeric(18, 0), value: returnNo }
      ]);
    }
    const created = await txQuery(tx, `
      INSERT INTO tblReturnSellPermission
        (ReturnSellPermissionNo, ReturnSellPermissionRef, SellingInvoiceNo, ClientID, ReturnSellPermissionDate,
         TotalProductsPrice, ProductsDiscountAmount, DiscountType, DiscountRatio, DiscountAmount, TotalDiscountAmount,
         TaxbaseAmount, SalesTaxRatio, AddedItptRatio, ITPTRatio, SalesTaxTotalAmount, AddedItptTotalAmount, ITPTAmount,
         ReturnSellPermissionTotalAmount, CurrencyID, ExRate, Posted, JournalEntryID, PeriodID, BranchId, InsertedDate, InsertedBy)
      VALUES
        (@no, @ref, @invoiceNo, @clientId, GETDATE(), @total, 0, 0, 0, 0, 0,
         @total, 0, 0, 0, 0, 0, 0, @total, 0, 1, 1, @journalId, 1, 0, GETDATE(), @actor);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: returnNo },
      { name: 'ref', type: sql.NVarChar(50), value: String(returnNo) },
      { name: 'invoiceNo', type: sql.Numeric(18, 0), value: header.no },
      { name: 'clientId', type: sql.Numeric(18, 0), value: header.clientId },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
      { name: 'journalId', type: sql.Numeric(18, 0), value: journalId }
    ]);
    const returnId = created.recordset[0].id;
    for (const line of clean) {
      const guid = crypto.randomUUID();
      await ensureStore(tx, line.productId, line.storeId);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, ClientID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, LotPricePerUnit, Cost, TransactionID, CompCode, RowGUID)
        VALUES
          (@returnNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @clientId, @store, @qty, 0,
           0, 0, @price, @cost, 4, 0, @guid)
      `, [
        { name: 'returnNo', type: sql.Numeric(18, 0), value: returnNo },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'clientId', type: sql.Numeric(18, 0), value: header.clientId },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.returnQty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'cost', type: sql.Numeric(18, 4), value: line.cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblReturnSellPermissionDetails
          (ReturnSellPermissionID, ProductID, InQuantity, InBonus, StoreID, UnitId, StockQty, LotPricePerUnit,
           TotalPrice, DiscountType, DiscountRatio, DiscountAmount, TotalPriceAfterDiscount, SalesTaxRatio,
           SalesTaxAmount, ItptRatio, ItptAmount, AddedItptRatio, AddedItptAmount, TotalPricePerProduct, Cost,
           RowGUID, SidRowGuid, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@returnId, @pid, @qty, 0, @store, 0, @qty, @price, @lineTotal, 0, 0, 0, @lineTotal, 0,
           0, 0, 0, 0, 0, @lineTotal, @cost, @guid, @sourceGuid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'returnId', type: sql.Numeric(18, 0), value: returnId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.returnQty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: line.cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid },
        { name: 'sourceGuid', type: sql.UniqueIdentifier, value: line.rowGuid }
      ]);
    }
    if (refund > 0) {
      const safeAccount = await accountByCode(tx, '12601');
      const clearing = await accountByCode(tx, '1221010001');
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `رد مرتجع مبيعات رقم (${returnNo})`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: refund }
      ]);
      const safeJournalId = safeJournal.recordset[0].id;
      const safeLines = [
        { account: clearing, debit: refund, credit: 0 },
        { account: safeAccount, debit: 0, credit: refund }
      ];
      for (let index = 0; index < safeLines.length; index += 1) {
        const line = safeLines[index];
        await txQuery(tx, `
          INSERT INTO tblJournalEntryDetails
            (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
             DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
          VALUES (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1, @doc, N'SF', 0, 1, GETDATE(), @actor)
        `, [
          { name: 'ser', type: sql.SmallInt, value: index + 1 },
          { name: 'jid', type: sql.Numeric(18, 0), value: safeJournalId },
          { name: 'accountId', type: sql.Int, value: line.account.AccountId },
          { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
          { name: 'text', type: sql.NVarChar(200), value: clip(safeText, 200) },
          { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
          { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
          { name: 'doc', type: sql.Numeric(18, 0), value: safeNo }
        ]);
      }
      await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, ClientID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId, InsertedDate, InsertedBy)
        VALUES (2, @total, 0, 1, 0, GETDATE(), @doc, @text, @clientId, 1, 0, @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor)
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: refund },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'clientId', type: sql.Numeric(18, 0), value: header.clientId },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournalId }
      ]);
    }
    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'return', detail: `مرتجع بيع رقم ${returnNo} لفاتورة ${header.no} بإجمالي ${invoiceTotal}`, ref: `sale:${invoiceId}` });
    res.json({ id: returnId, no: returnNo, total: invoiceTotal });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: error.message || 'تعذر حفظ مرتجع البيع' });
  }
});

app.post('/api/purchases/:id/return', requireAuth, async (req, res) => {
  const invoiceId = Number(req.params.id);
  const requested = returnLines(req.body || {});
  if (!invoiceId || !requested.length) return res.status(400).json({ error: 'حدد كمية مرتجع لصنف واحد على الأقل' });
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();
  tx.actor = actorName(req);
  try {
    const header = (await txQuery(tx, `
      SELECT pi.PurchaseInvoiceNo AS no, ISNULL(pi.SupplierID, 0) AS supplierId,
             ISNULL(pi.PurchaseInvoiceTotalAmount, 0) AS total, ISNULL(pi.TotalPaiedAmount, 0) AS paid,
             ISNULL(pi.TotalOnPaiedDiscount, 0) AS discount, ISNULL(pi.ReturnedAmount, 0) AS returnedAmount,
             ISNULL(NULLIF(LTRIM(RTRIM(s.SupplierName)), N''), N'مشتريات نقدية') AS name,
             ISNULL(s.AccCode, N'') AS accCode
      FROM tblPurchaseInvoice pi WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN tblSuppliers s ON s.SupplierID = pi.SupplierID
      WHERE pi.PurchaseInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }])).recordset[0];
    if (!header) throw new Error('الفاتورة غير موجودة');
    const sources = (await txQuery(tx, `
      SELECT d.Id AS lineId, d.ProductID AS productId, ISNULL(d.StoreID, 0) AS storeId,
             ISNULL(d.InQuantity, 0) AS qty, ISNULL(d.ReturnedQuantity, 0) AS returned,
             ISNULL(d.PurchasePrice, 0) AS price, ISNULL(d.Cost, 0) AS cost, d.RowGuid AS rowGuid
      FROM tblPurchaseInvoicesDetails d WITH (UPDLOCK, HOLDLOCK)
      WHERE d.PurchaseInvoiceID = @id
    `, [{ name: 'id', type: sql.Numeric(18, 0), value: invoiceId }])).recordset;
    const clean = [];
    for (const item of requested) {
      const source = sources.find((line) => Number(line.lineId) === item.lineId);
      if (!source) throw new Error('سطر الفاتورة غير موجود');
      const left = Number(source.qty) - Number(source.returned);
      if (item.qty > left + 0.00001) throw new Error('كمية المرتجع أكبر من المتبقي على الفاتورة');
      if (!source.storeId || !source.rowGuid) throw new Error('سطر الفاتورة لا يمكن إرجاعه');
      const total = Math.round(item.qty * Number(source.price) * 10000) / 10000;
      clean.push({ ...source, returnQty: item.qty, total });
    }
    const invoiceTotal = Math.round(clean.reduce((sum, line) => sum + line.total, 0) * 10000) / 10000;
    if (!(invoiceTotal > 0)) throw new Error('إجمالي المرتجع لازم يكون أكبر من صفر');
    const room = Number(header.total) - Number(header.paid) - Number(header.discount) - Number(header.returnedAmount);
    const refund = Math.max(0, Math.round((invoiceTotal - room) * 10000) / 10000);
    if (refund > Number(header.paid) + 0.00001) throw new Error('قيمة المرتجع أكبر من المتاح على الفاتورة');
    if (refund > 0) {
      await txQuery(tx, `
        UPDATE tblPurchaseInvoice SET TotalPaiedAmount = TotalPaiedAmount - @refund WHERE PurchaseInvoiceID = @id
      `, [
        { name: 'refund', type: sql.Numeric(18, 4), value: refund },
        { name: 'id', type: sql.Numeric(18, 0), value: invoiceId }
      ]);
    }
    const debitParts = [];
    const payable = Math.round((invoiceTotal - refund) * 10000) / 10000;
    if (payable > 0) debitParts.push({ code: Number(header.supplierId) ? header.accCode : '2423', amount: payable });
    if (refund > 0) debitParts.push({ code: '2423', amount: refund });
    if (debitParts.some((part) => !part.code)) throw new Error('المورد ليس له كود حساب');
    const purchasesAccount = await accountByCode(tx, '2424');
    const debitAccounts = [];
    for (const part of debitParts) {
      const account = await accountByCode(tx, part.code);
      const existing = debitAccounts.find((item) => item.account.AccCode === account.AccCode);
      if (existing) existing.amount += part.amount;
      else debitAccounts.push({ account, amount: part.amount });
    }
    const returnNo = await nextNumber(tx, 'tblReturnPurchasePermission', 'ReturnPurchasePermissionNo');
    const journalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
    const description = clip(`اذن مردودات مشتريات رقم (${returnNo}) مرتجع فاتورة رقم (${header.no})`, 200);
    const journal = await txQuery(tx, `
      INSERT INTO tblJournalEntry
        (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
         LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
      VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: journalNo },
      { name: 'dis', type: sql.NVarChar(250), value: description },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal }
    ]);
    const journalId = journal.recordset[0].id;
    const journalLines = [
      ...debitAccounts.map((part) => ({ account: part.account, debit: part.amount, credit: 0, text: description })),
      { account: purchasesAccount, debit: 0, credit: invoiceTotal, text: `قيمه مردودات المشتريات - (${header.name})` }
    ];
    for (let index = 0; index < journalLines.length; index += 1) {
      const line = journalLines[index];
      await txQuery(tx, `
        INSERT INTO tblJournalEntryDetails
          (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
           DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
        VALUES (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1, @doc, N'PU', 0, 1, GETDATE(), @actor)
      `, [
        { name: 'ser', type: sql.SmallInt, value: index + 1 },
        { name: 'jid', type: sql.Numeric(18, 0), value: journalId },
        { name: 'accountId', type: sql.Int, value: line.account.AccountId },
        { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
        { name: 'text', type: sql.NVarChar(200), value: clip(line.text, 200) },
        { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
        { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
        { name: 'doc', type: sql.Numeric(18, 0), value: returnNo }
      ]);
    }
    const created = await txQuery(tx, `
      INSERT INTO tblReturnPurchasePermission
        (ReturnPurchasePermissionNo, ReturnPurchasePermissionRef, PurchaseInvoiceNo, SupplierID, ReturnPurchasePermissionDate,
         TotalProductsPrice, ProductsDiscountAmount, DiscountType, DiscountRatio, DiscountAmount, TotalDiscountAmount,
         TaxbaseAmount, SalesTaxRatio, ITPTRatio, AddedItptRatio, SalesTaxTotalAmount, AddedItptTotalAmount, ITPTAmount,
         ReturnPurchasePermissionTotalAmount, CurrencyID, ExRate, Posted, JournalEntryID, PeriodID, BranchId, InsertedDate, InsertedBy)
      VALUES
        (@no, @ref, @invoiceNo, @supplierId, GETDATE(), @total, 0, 0, 0, 0, 0,
         @total, 0, 0, 0, 0, 0, 0, @total, 0, 1, 1, @journalId, 1, 0, GETDATE(), @actor);
      SELECT SCOPE_IDENTITY() AS id;
    `, [
      { name: 'no', type: sql.Numeric(18, 0), value: returnNo },
      { name: 'ref', type: sql.NVarChar(50), value: String(returnNo) },
      { name: 'invoiceNo', type: sql.Numeric(18, 0), value: header.no },
      { name: 'supplierId', type: sql.Numeric(18, 0), value: header.supplierId },
      { name: 'total', type: sql.Numeric(18, 4), value: invoiceTotal },
      { name: 'journalId', type: sql.Numeric(18, 0), value: journalId }
    ]);
    const returnId = created.recordset[0].id;
    for (const line of clean) {
      const guid = crypto.randomUUID();
      await ensureStore(tx, line.productId, line.storeId);
      await txQuery(tx, `
        INSERT INTO tblInventory
          (InvoiceNo, InvoiceDate, DocumentDate, ProductID, SupplierID, StoreID, InQuantity, InBonus,
           OutQuantity, OutBonus, LotPricePerUnit, Cost, TransactionID, CompCode, RowGUID)
        VALUES
          (@returnNo, CAST(GETDATE() AS date), CAST(GETDATE() AS date), @pid, @supplierId, @store, 0, 0,
           @qty, 0, @price, @cost, 3, 0, @guid)
      `, [
        { name: 'returnNo', type: sql.Numeric(18, 0), value: returnNo },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: header.supplierId },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.returnQty },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'cost', type: sql.Numeric(18, 4), value: line.cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid }
      ]);
      await txQuery(tx, `
        INSERT INTO tblReturnPurchasePermissionDetails
          (ReturnPurchasePermissionID, ProductID, OutQuantity, OutBonus, StoreID, UnitId, StockQty, PurchasePrice,
           TotalPrice, DiscountType, DiscountRatio, DiscountAmount, TotalPriceAfterDiscount, SalesTaxRatio,
           SalesTaxAmount, ItptRatio, ItptAmount, AddedItptRatio, AddedItptAmount, TotalPricePerProduct, Cost,
           RowGUID, PidRowGuid, InventoryDate, InsertedDate, InsertedBy)
        VALUES
          (@returnId, @pid, @qty, 0, @store, 0, @qty, @price, @lineTotal, 0, 0, 0, @lineTotal, 0,
           0, 0, 0, 0, 0, @lineTotal, @cost, @guid, @sourceGuid, CAST(GETDATE() AS date), GETDATE(), @actor)
      `, [
        { name: 'returnId', type: sql.Numeric(18, 0), value: returnId },
        { name: 'pid', type: sql.Numeric(18, 0), value: line.productId },
        { name: 'qty', type: sql.Numeric(18, 5), value: line.returnQty },
        { name: 'store', type: sql.Numeric(18, 0), value: line.storeId },
        { name: 'price', type: sql.Numeric(18, 4), value: line.price },
        { name: 'lineTotal', type: sql.Numeric(18, 4), value: line.total },
        { name: 'cost', type: sql.Numeric(18, 4), value: line.cost },
        { name: 'guid', type: sql.UniqueIdentifier, value: guid },
        { name: 'sourceGuid', type: sql.UniqueIdentifier, value: line.rowGuid }
      ]);
    }
    if (refund > 0) {
      const safeAccount = await accountByCode(tx, '12601');
      const clearing = await accountByCode(tx, '2423');
      const safeNo = await nextNumber(tx, 'tblSafeOperations', 'SafeOperationDocumentNo');
      const safeJournalNo = await nextNumber(tx, 'tblJournalEntry', 'JournalEntryNo');
      const safeText = `رد مرتجع مشتريات رقم (${returnNo})`;
      const safeJournal = await txQuery(tx, `
        INSERT INTO tblJournalEntry
          (JournalEntryNo, JournalEntryDis, JournalEntryDate, TotalDebit, TotalCredit, PeriodCode, CompCode,
           LocalTotalDebit, LocalTotalCredit, IsSystem, Posted, BranchId, InsertedDate, InsertedBy, RowGuid)
        VALUES (@no, @dis, GETDATE(), @total, @total, 1, 0, 0, 0, 1, 0, 0, GETDATE(), @actor, NEWID());
        SELECT SCOPE_IDENTITY() AS id;
      `, [
        { name: 'no', type: sql.Numeric(18, 0), value: safeJournalNo },
        { name: 'dis', type: sql.NVarChar(250), value: safeText },
        { name: 'total', type: sql.Numeric(18, 4), value: refund }
      ]);
      const safeJournalId = safeJournal.recordset[0].id;
      const safeLines = [
        { account: safeAccount, debit: refund, credit: 0 },
        { account: clearing, debit: 0, credit: refund }
      ];
      for (let index = 0; index < safeLines.length; index += 1) {
        const line = safeLines[index];
        await txQuery(tx, `
          INSERT INTO tblJournalEntryDetails
            (Ser, JournalEntryID, AccountId, AccCode, JEPartyDis, Debit, Credit, CurrencyID, ExRate,
             DocNum, Journal, CompCode, PeriodCode, InsertedDate, InsertedBy)
          VALUES (@ser, @jid, @accountId, @accCode, @text, @debit, @credit, 0, 1, @doc, N'SF', 0, 1, GETDATE(), @actor)
        `, [
          { name: 'ser', type: sql.SmallInt, value: index + 1 },
          { name: 'jid', type: sql.Numeric(18, 0), value: safeJournalId },
          { name: 'accountId', type: sql.Int, value: line.account.AccountId },
          { name: 'accCode', type: sql.NVarChar(50), value: line.account.AccCode },
          { name: 'text', type: sql.NVarChar(200), value: clip(safeText, 200) },
          { name: 'debit', type: sql.Numeric(18, 4), value: line.debit },
          { name: 'credit', type: sql.Numeric(18, 4), value: line.credit },
          { name: 'doc', type: sql.Numeric(18, 0), value: safeNo }
        ]);
      }
      await txQuery(tx, `
        INSERT INTO tblSafeOperations
          (SafeOperationTypeID, SafeOperationTotalAmount, CurrencyID, ExRate, Discount,
           SafeOperationDate, SafeOperationDocumentNo, OperationDescription, SupplierID, Cash, Cheques,
           AdjustedAmount, Posted, JournalEntryID, PeriodID, SafeID, CompCode, BranchId, InsertedDate, InsertedBy)
        VALUES (1, @total, 0, 1, 0, GETDATE(), @doc, @text, @supplierId, 1, 0, @total, 1, @journalId, 1, 1, 0, 0, GETDATE(), @actor)
      `, [
        { name: 'total', type: sql.Numeric(18, 4), value: refund },
        { name: 'doc', type: sql.Numeric(18, 0), value: safeNo },
        { name: 'text', type: sql.NVarChar(250), value: safeText },
        { name: 'supplierId', type: sql.Numeric(18, 0), value: header.supplierId },
        { name: 'journalId', type: sql.Numeric(18, 0), value: safeJournalId }
      ]);
    }
    await tx.commit();
    memoryCache.clear();
    recordActivity(req, { action: 'return', detail: `مرتجع شراء رقم ${returnNo} لفاتورة ${header.no} بإجمالي ${invoiceTotal}`, ref: `purchase:${invoiceId}` });
    res.json({ id: returnId, no: returnNo, total: invoiceTotal });
  } catch (error) {
    try { await tx.rollback(); } catch (rollbackError) { console.error(rollbackError); }
    console.error(error);
    res.status(400).json({ error: error.message || 'تعذر حفظ مرتجع الشراء' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`warehouse listening on 127.0.0.1:${PORT}`);
});
