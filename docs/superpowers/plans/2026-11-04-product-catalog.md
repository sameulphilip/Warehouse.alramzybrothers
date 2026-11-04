# Product Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff add descriptions and photos to products in the warehouse app and publish a professional bilingual public catalog at `https://catalog.alramzybrothers.com`.

**Architecture:** A new `warehouse-app/catalog/` module stores catalog data in JSON files on the VPS (never in SQL), processes uploaded images with `sharp`, and generates a static site (HTML/CSS/JS + images) into `/var/www/catalog.alramzybrothers.com/site`, swapped in atomically. nginx serves that folder directly. The warehouse app exposes `/api/catalog/*` endpoints behind a new `catalog` permission, and a new admin screen (`public/catalog-admin.js`).

**Tech Stack:** Node 20 (VPS) / 22 (local), Express 4, `sharp` 0.33, `node:test`, vanilla browser JS, nginx + certbot.

**Spec:** `docs/superpowers/specs/2026-11-04-product-catalog-design.md`

## Global Constraints

- No price, quantity, cost, or any field whose visibility switch is off may appear in any generated public file.
- Catalog data lives in `warehouse-app/data/catalog.json`, `warehouse-app/data/catalog-published.json`, and `warehouse-app/data/catalog-media/`. `deploy_app.py` must never upload these.
- The public site never queries SQL. Only the warehouse app reads SQL (product names/codes and stock).
- Max 5 images per product; accepted types JPG, PNG, WebP; max 8 MB per upload. Every image is re-encoded with `sharp` to `<id>-lg.webp` (width 1600) and `<id>-sm.webp` (width 480); metadata is dropped.
- Availability = sum of `ProductStock` across stores (`CompCode = 0`) > 0. Refreshed every 15 minutes from the last published snapshot.
- Editing requires role `superadmin` or `perms` containing `"catalog"`.
- Public URLs: `/ar/...` and `/en/...`; `/` redirects to `/ar/`. Product page `/<lang>/p/<productId>/`, brand `/<lang>/brand/<id>/`, section `/<lang>/section/<id>/`, all products `/<lang>/products/`.
- UI copy in the admin is Egyptian Arabic, matching the rest of the app.
- Run all `npm` / `node --test` commands from `warehouse-app/`.

## File Map

| File | Responsibility |
|---|---|
| `warehouse-app/catalog/store.js` | Load/save `catalog.json`; validate items, brands/sections, company |
| `warehouse-app/catalog/images.js` | Validate + re-encode uploads; delete images |
| `warehouse-app/catalog/assets/catalog.js` | Public browser script (search, gallery, request list, WhatsApp) + pure helpers |
| `warehouse-app/catalog/assets/catalog.css` | Public stylesheet |
| `warehouse-app/catalog/templates.js` | Public page HTML |
| `warehouse-app/catalog/build.js` | Generate the static site and swap it in |
| `warehouse-app/catalog/publisher.js` | Publish now / refresh availability; published snapshot |
| `warehouse-app/catalog/access.js` | Permission helpers |
| `warehouse-app/catalog/routes.js` | `/api/catalog/*` Express router |
| `warehouse-app/server.js` | Wire router, permission, SQL loaders, 15-minute refresh |
| `warehouse-app/public/catalog-admin.js` | Admin screens (catalog page + product catalog editor) |
| `warehouse-app/public/app.js`, `index.html`, `styles.css` | Hook admin screens into nav, product page, accounts |
| `warehouse-app/deploy_app.py` | Skip catalog data; run `npm install` on the VPS |
| `warehouse-app/deploy_catalog_nginx.py` | nginx site + SSL for the catalog domain |
| `warehouse-app/test/*.test.js` | Unit tests |

---

### Task 1: Test setup and catalog store

**Files:**
- Modify: `warehouse-app/package.json`
- Modify: `.gitignore`
- Create: `warehouse-app/catalog/store.js`
- Test: `warehouse-app/test/store.test.js`

**Interfaces:**
- Produces: `createStore(file) -> { load(), save(data), update(fn) }`, `emptyCatalog()`, `defaultItem(productId)`, `cleanItem(catalog, productId, input, actor, now?)`, `cleanTaxonomy(catalog, kind, list)`, `cleanCompany(previous, input)`, `normalizeWhatsapp(value)`, `MAX_IMAGES = 5`.
- Catalog shape: `{ version, company: { logoId, aboutAr, aboutEn, whatsapp, phone, addressAr, addressEn }, brands: [{ id, nameAr, nameEn, order }], sections: [same], items: { "<productId>": item }, publishedAt, lastError }`.
- Item shape: `{ productId, published, featured, nameAr, nameEn, descriptionAr, descriptionEn, images: [imageId], brandId, sectionId, partNumber, showPartNumber, originAr, originEn, showOrigin, fitsAr, fitsEn, showFits, showAvailability, updatedAt, updatedBy }`.

- [ ] **Step 1: Add the test script and ignore catalog data**

`warehouse-app/package.json`:

```json
{
  "name": "alramzy-warehouse",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "mssql": "^10.0.4"
  }
}
```

Append to `.gitignore`:

```
warehouse-app/data/catalog.json
warehouse-app/data/catalog-published.json
warehouse-app/data/catalog-media/
```

- [ ] **Step 2: Write the failing tests**

`warehouse-app/test/store.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createStore, emptyCatalog, defaultItem, cleanItem, cleanTaxonomy, cleanCompany, normalizeWhatsapp
} = require('../catalog/store');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cat-store-')), 'catalog.json');
}

test('load returns an empty catalog when the file is missing', () => {
  assert.deepEqual(createStore(tempFile()).load(), emptyCatalog());
});

test('update persists changes and leaves no temp file', () => {
  const file = tempFile();
  createStore(file).update((data) => { data.company.phone = '0100'; });
  assert.equal(createStore(file).load().company.phone, '0100');
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('cleanItem keeps known fields, trims text and records the editor', () => {
  const catalog = emptyCatalog();
  catalog.brands.push({ id: 'b1', nameAr: 'أكتروس', nameEn: 'Actros', order: 0 });
  const item = cleanItem(catalog, 7212, {
    nameAr: '  انبوبه  ', brandId: 'b1', published: true, price: 99, showAvailability: false
  }, 'سامح', new Date('2026-11-04T10:00:00Z'));
  assert.equal(item.productId, 7212);
  assert.equal(item.nameAr, 'انبوبه');
  assert.equal(item.brandId, 'b1');
  assert.equal(item.published, true);
  assert.equal(item.showAvailability, false);
  assert.equal('price' in item, false);
  assert.equal(item.updatedBy, 'سامح');
  assert.equal(item.updatedAt, '2026-11-04T10:00:00.000Z');
});

test('cleanItem rejects an unknown brand or section and a bad product id', () => {
  const catalog = emptyCatalog();
  assert.throws(() => cleanItem(catalog, 1, { brandId: 'x' }, 'a'), /الماركة/);
  assert.throws(() => cleanItem(catalog, 1, { sectionId: 'x' }, 'a'), /القسم/);
  assert.throws(() => cleanItem(catalog, 'abc', {}, 'a'), /رقم الصنف/);
});

test('cleanItem only accepts a reorder of the existing images', () => {
  const catalog = emptyCatalog();
  catalog.items['5'] = { ...defaultItem(5), images: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'] };
  const item = cleanItem(catalog, 5, { images: ['bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa'] }, 'a');
  assert.deepEqual(item.images, ['bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa']);
  assert.throws(() => cleanItem(catalog, 5, { images: ['cccccccccccccccc'] }, 'a'), /الصور/);
  assert.deepEqual(cleanItem(catalog, 5, {}, 'a').images, ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb']);
});

test('cleanTaxonomy assigns safe ids, keeps order and blocks removing a used entry', () => {
  const catalog = emptyCatalog();
  const list = cleanTaxonomy(catalog, 'brands', [{ nameAr: 'فولفو', nameEn: 'Volvo' }, { id: '../x', nameAr: 'مان' }]);
  assert.equal(list.length, 2);
  assert.match(list[0].id, /^[a-z0-9]{12}$/);
  assert.match(list[1].id, /^[a-z0-9]{12}$/);
  assert.deepEqual(list.map((x) => x.order), [0, 1]);
  catalog.brands = list;
  catalog.items['9'] = { ...defaultItem(9), brandId: list[0].id };
  assert.throws(() => cleanTaxonomy(catalog, 'brands', [list[1]]), /مستخدم/);
  assert.throws(() => cleanTaxonomy(catalog, 'brands', [{ nameAr: '' }]), /الاسم/);
  assert.throws(() => cleanTaxonomy(catalog, 'colors', []), /نوع/);
});

test('normalizeWhatsapp converts local Egyptian numbers to international digits', () => {
  assert.equal(normalizeWhatsapp('0100 123 4567'), '201001234567');
  assert.equal(normalizeWhatsapp('+20 100 123 4567'), '201001234567');
  assert.equal(normalizeWhatsapp('00201001234567'), '201001234567');
  assert.equal(normalizeWhatsapp(''), '');
  assert.throws(() => normalizeWhatsapp('123'), /الواتساب/);
});

test('cleanCompany keeps the logo id and normalizes the WhatsApp number', () => {
  const company = cleanCompany({ logoId: 'abcdabcdabcdabcd' }, { whatsapp: '01001234567', aboutAr: ' نبذة ', logoId: 'hack' });
  assert.equal(company.logoId, 'abcdabcdabcdabcd');
  assert.equal(company.whatsapp, '201001234567');
  assert.equal(company.aboutAr, 'نبذة');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/store'`.

- [ ] **Step 4: Implement the store**

`warehouse-app/catalog/store.js`:

```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_IMAGES = 5;
const SAFE_ID = /^[a-z0-9]{1,40}$/;

function emptyCatalog() {
  return {
    version: 1,
    company: { logoId: '', aboutAr: '', aboutEn: '', whatsapp: '', phone: '', addressAr: '', addressEn: '' },
    brands: [],
    sections: [],
    items: {},
    publishedAt: null,
    lastError: ''
  };
}

function text(value, max) {
  return String(value == null ? '' : value).replace(/\r\n/g, '\n').trim().slice(0, max);
}

function flag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function normalizeWhatsapp(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('01')) digits = `2${digits}`;
  if (digits && (digits.length < 8 || digits.length > 15)) throw new Error('رقم الواتساب غير صحيح');
  return digits;
}

function defaultItem(productId) {
  return {
    productId: Number(productId),
    published: false,
    featured: false,
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    images: [],
    brandId: '',
    sectionId: '',
    partNumber: '',
    showPartNumber: true,
    originAr: '',
    originEn: '',
    showOrigin: true,
    fitsAr: '',
    fitsEn: '',
    showFits: true,
    showAvailability: true,
    updatedAt: null,
    updatedBy: ''
  };
}

function cleanItem(catalog, productId, input, actor, now = new Date()) {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('رقم الصنف غير صحيح');
  const previous = catalog.items[String(id)] || defaultItem(id);
  const body = input || {};
  const brandId = text(body.brandId, 40);
  const sectionId = text(body.sectionId, 40);
  if (brandId && !catalog.brands.some((entry) => entry.id === brandId)) throw new Error('الماركة غير موجودة');
  if (sectionId && !catalog.sections.some((entry) => entry.id === sectionId)) throw new Error('القسم غير موجود');
  let images = previous.images.slice();
  if (Array.isArray(body.images)) {
    const next = body.images.map(String);
    const same = next.length === previous.images.length
      && new Set(next).size === next.length
      && next.every((imageId) => previous.images.includes(imageId));
    if (!same) throw new Error('ترتيب الصور غير صحيح');
    images = next;
  }
  return {
    productId: id,
    published: flag(body.published),
    featured: flag(body.featured),
    nameAr: text(body.nameAr, 120),
    nameEn: text(body.nameEn, 120),
    descriptionAr: text(body.descriptionAr, 4000),
    descriptionEn: text(body.descriptionEn, 4000),
    images,
    brandId,
    sectionId,
    partNumber: text(body.partNumber, 80),
    showPartNumber: flag(body.showPartNumber),
    originAr: text(body.originAr, 120),
    originEn: text(body.originEn, 120),
    showOrigin: flag(body.showOrigin),
    fitsAr: text(body.fitsAr, 300),
    fitsEn: text(body.fitsEn, 300),
    showFits: flag(body.showFits),
    showAvailability: flag(body.showAvailability),
    updatedAt: now.toISOString(),
    updatedBy: text(actor, 60)
  };
}

function cleanTaxonomy(catalog, kind, list) {
  if (kind !== 'brands' && kind !== 'sections') throw new Error('نوع القائمة غير صحيح');
  if (!Array.isArray(list)) throw new Error('القائمة غير صحيحة');
  const seen = new Set();
  const next = list.map((entry, index) => {
    const raw = entry && entry.id ? String(entry.id) : '';
    const id = SAFE_ID.test(raw) ? raw : newId();
    if (seen.has(id)) throw new Error('عنصر مكرر في القائمة');
    seen.add(id);
    const nameAr = text(entry && entry.nameAr, 80);
    if (!nameAr) throw new Error('الاسم العربي مطلوب');
    return { id, nameAr, nameEn: text(entry.nameEn, 80), order: index };
  });
  const key = kind === 'brands' ? 'brandId' : 'sectionId';
  for (const item of Object.values(catalog.items)) {
    if (item[key] && !seen.has(item[key])) throw new Error('لا يمكن حذف عنصر مستخدم في أصناف');
  }
  return next;
}

function cleanCompany(previous, input) {
  const body = input || {};
  return {
    logoId: (previous && previous.logoId) || '',
    aboutAr: text(body.aboutAr, 1500),
    aboutEn: text(body.aboutEn, 1500),
    whatsapp: normalizeWhatsapp(body.whatsapp),
    phone: text(body.phone, 40),
    addressAr: text(body.addressAr, 300),
    addressEn: text(body.addressEn, 300)
  };
}

function createStore(file) {
  function load() {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return emptyCatalog();
      throw error;
    }
    const base = emptyCatalog();
    return { ...base, ...data, company: { ...base.company, ...(data.company || {}) }, items: data.items || {} };
  }

  function save(data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 1));
    fs.renameSync(temp, file);
    return data;
  }

  function update(change) {
    const data = load();
    const result = change(data);
    save(data);
    return result;
  }

  return { load, save, update };
}

module.exports = {
  MAX_IMAGES, emptyCatalog, defaultItem, cleanItem, cleanTaxonomy, cleanCompany, normalizeWhatsapp, createStore
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add .gitignore warehouse-app/package.json warehouse-app/catalog/store.js warehouse-app/test/store.test.js
git commit -m "Add catalog data store with validation"
```

---

### Task 2: Image processing

**Files:**
- Modify: `warehouse-app/package.json` (via npm)
- Create: `warehouse-app/catalog/images.js`
- Test: `warehouse-app/test/images.test.js`

**Interfaces:**
- Produces: `saveImage(buffer, mediaDir) -> Promise<imageId>` (16 hex chars; writes `<id>-lg.webp` and `<id>-sm.webp`), `deleteImage(imageId, mediaDir)`, `isImageId(value) -> boolean`, `MAX_BYTES = 8 * 1024 * 1024`.

- [ ] **Step 1: Install sharp**

Run: `npm install sharp@0.33.5`
Expected: `package.json` gains `"sharp": "^0.33.5"` and `package-lock.json` is created.

- [ ] **Step 2: Write the failing tests**

`warehouse-app/test/images.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { saveImage, deleteImage, isImageId, MAX_BYTES } = require('../catalog/images');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cat-img-'));
}

function blank(width, height) {
  return sharp({ create: { width, height, channels: 3, background: '#1b2559' } });
}

test('saveImage writes a large and a small webp without metadata', async () => {
  const dir = tempDir();
  const png = await blank(2400, 1200).png().toBuffer();
  const id = await saveImage(png, dir);
  assert.equal(isImageId(id), true);
  const large = await sharp(path.join(dir, `${id}-lg.webp`)).metadata();
  const small = await sharp(path.join(dir, `${id}-sm.webp`)).metadata();
  assert.equal(large.format, 'webp');
  assert.equal(large.width, 1600);
  assert.equal(large.exif, undefined);
  assert.equal(small.width, 480);
});

test('saveImage does not enlarge small images', async () => {
  const dir = tempDir();
  const id = await saveImage(await blank(300, 300).jpeg().toBuffer(), dir);
  assert.equal((await sharp(path.join(dir, `${id}-lg.webp`)).metadata()).width, 300);
});

test('saveImage rejects empty, non-image, unsupported and oversized input', async () => {
  const dir = tempDir();
  await assert.rejects(saveImage(Buffer.alloc(0), dir), /فاضية/);
  await assert.rejects(saveImage({}, dir), /فاضية/);
  await assert.rejects(saveImage(Buffer.from('hello'), dir), /صورة/);
  await assert.rejects(saveImage(await blank(10, 10).gif().toBuffer(), dir), /JPG/);
  await assert.rejects(saveImage(Buffer.alloc(MAX_BYTES + 1), dir), /8/);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('deleteImage removes both sizes and ignores bad ids', async () => {
  const dir = tempDir();
  const id = await saveImage(await blank(50, 50).png().toBuffer(), dir);
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'x');
  deleteImage('../keep', dir);
  deleteImage(id, dir);
  assert.deepEqual(fs.readdirSync(dir), ['keep.txt']);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/images'`.

- [ ] **Step 4: Implement image processing**

`warehouse-app/catalog/images.js`:

```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['jpeg', 'png', 'webp']);
const SIZES = [['lg', 1600, 82], ['sm', 480, 78]];

function isImageId(value) {
  return /^[a-f0-9]{16}$/.test(String(value || ''));
}

async function saveImage(buffer, mediaDir) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('الصورة فاضية');
  if (buffer.length > MAX_BYTES) throw new Error('الصورة أكبر من 8 ميجا');
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch (error) {
    throw new Error('الملف مش صورة مقبولة');
  }
  if (!ALLOWED.has(meta.format)) throw new Error('المقبول JPG أو PNG أو WebP بس');
  const id = crypto.randomBytes(8).toString('hex');
  fs.mkdirSync(mediaDir, { recursive: true });
  try {
    for (const [size, width, quality] of SIZES) {
      await sharp(buffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(path.join(mediaDir, `${id}-${size}.webp`));
    }
  } catch (error) {
    deleteImage(id, mediaDir);
    throw new Error('تعذر معالجة الصورة');
  }
  return id;
}

function deleteImage(id, mediaDir) {
  if (!isImageId(id)) return;
  for (const [size] of SIZES) {
    try {
      fs.unlinkSync(path.join(mediaDir, `${id}-${size}.webp`));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = { saveImage, deleteImage, isImageId, MAX_BYTES };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (store + images tests).

- [ ] **Step 6: Commit**

```bash
git add warehouse-app/package.json warehouse-app/package-lock.json warehouse-app/catalog/images.js warehouse-app/test/images.test.js
git commit -m "Re-encode catalog images to webp with sharp"
```

---

### Task 3: Public browser script

**Files:**
- Create: `warehouse-app/catalog/assets/catalog.js`
- Test: `warehouse-app/test/catalog-client.test.js`

**Interfaces:**
- Produces (Node export, same functions used in the browser): `normalize(text)`, `matches({ name, part, brand, section }, { q, brand, section })`, `productMessage({ name, part }, lang, url)`, `requestMessage([{ name, part, qty }], lang)`, `waLink(number, message)`, `addItem(list, { id, name, part })`, `setQty(list, id, qty)`, `removeItem(list, id)`.
- Consumes DOM contract from Task 4 templates: `body[data-lang][data-wa]`, `#labels` JSON, `#request` with `[data-request-rows]`, `[data-request-send]`, `[data-request-count]`, `[data-open-request]`, `[data-close-request]`, `[data-add data-id data-name data-part]`, `[data-ask data-name data-part data-url]`, `[data-track]`, `[data-thumb]`, `[data-zoom]`, `dialog#zoom`, `[data-filters]` form with `q`/`brand`/`section`, `[data-results] [data-card data-name data-part data-brand data-section]`, `[data-no-results]`.

- [ ] **Step 1: Write the failing tests**

`warehouse-app/test/catalog-client.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../catalog/assets/catalog.js');

test('normalize folds Arabic letter variants and spacing', () => {
  assert.equal(client.normalize('  أنبوبة   إكتروس '), 'انبوبه اكتروس');
  assert.equal(client.normalize('ABC'), 'abc');
});

test('matches filters by text, part number, brand and section', () => {
  const entry = { name: 'مروحة أكتروس', part: '51.06630-0193', brand: 'b1', section: 's1' };
  assert.equal(client.matches(entry, { q: 'مروحه' }), true);
  assert.equal(client.matches(entry, { q: '5106630' }), true);
  assert.equal(client.matches(entry, { q: 'فولفو' }), false);
  assert.equal(client.matches(entry, { brand: 'b2' }), false);
  assert.equal(client.matches(entry, { section: 's1', q: '' }), true);
});

test('productMessage includes the part number only when present', () => {
  assert.equal(
    client.productMessage({ name: 'مروحة', part: 'X1' }, 'ar', 'https://c/ar/p/1/'),
    'السلام عليكم، عايز أسأل عن: مروحة (رقم القطعة: X1)\nhttps://c/ar/p/1/'
  );
  assert.equal(
    client.productMessage({ name: 'Fan', part: '' }, 'en', 'https://c/en/p/1/'),
    'Hello, I would like to ask about: Fan\nhttps://c/en/p/1/'
  );
});

test('requestMessage lists every item with quantity', () => {
  const text = client.requestMessage([{ name: 'أ', part: 'P1', qty: 2 }, { name: 'ب', part: '', qty: 1 }], 'ar');
  assert.equal(text, 'السلام عليكم، عايز أسأل عن الأصناف دي:\n1) أ — رقم القطعة: P1 — الكمية: 2\n2) ب — الكمية: 1');
});

test('waLink encodes the message', () => {
  assert.equal(client.waLink('201001234567', 'a b\nc'), 'https://wa.me/201001234567?text=a%20b%0Ac');
});

test('request list helpers add, change and remove items', () => {
  let list = client.addItem([], { id: '7', name: 'أ', part: 'P' });
  list = client.addItem(list, { id: '7', name: 'أ', part: 'P' });
  assert.deepEqual(list, [{ id: '7', name: 'أ', part: 'P', qty: 2 }]);
  assert.equal(client.setQty(list, '7', '0')[0].qty, 1);
  assert.equal(client.setQty(list, '7', '5000')[0].qty, 999);
  assert.deepEqual(client.removeItem(list, '7'), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/assets/catalog.js'`.

- [ ] **Step 3: Implement the script**

`warehouse-app/catalog/assets/catalog.js`:

```js
(function (root) {
  'use strict';

  const STORAGE_KEY = 'ramzy-request-v1';
  const WORDS = {
    ar: { hello: 'السلام عليكم، عايز أسأل عن', list: 'السلام عليكم، عايز أسأل عن الأصناف دي:', part: 'رقم القطعة', qty: 'الكمية' },
    en: { hello: 'Hello, I would like to ask about', list: 'Hello, I would like to ask about these items:', part: 'Part no', qty: 'Qty' }
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(value) {
    return normalize(value).replace(/[\s.\-_/]/g, '');
  }

  function matches(entry, filter) {
    if (filter.brand && entry.brand !== filter.brand) return false;
    if (filter.section && entry.section !== filter.section) return false;
    const q = normalize(filter.q);
    if (!q) return true;
    return normalize(entry.name).includes(q) || (Boolean(entry.part) && compact(entry.part).includes(compact(q)));
  }

  function productMessage(product, lang, url) {
    const w = WORDS[lang] || WORDS.ar;
    const part = product.part ? ` (${w.part}: ${product.part})` : '';
    return `${w.hello}: ${product.name}${part}\n${url}`;
  }

  function requestMessage(items, lang) {
    const w = WORDS[lang] || WORDS.ar;
    const lines = items.map((item, index) =>
      `${index + 1}) ${item.name}${item.part ? ` — ${w.part}: ${item.part}` : ''} — ${w.qty}: ${item.qty}`);
    return [w.list].concat(lines).join('\n');
  }

  function waLink(number, message) {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function addItem(list, item) {
    if (list.some((entry) => entry.id === item.id)) {
      return list.map((entry) => (entry.id === item.id ? { ...entry, qty: Math.min(999, entry.qty + 1) } : entry));
    }
    return list.concat([{ id: item.id, name: item.name, part: item.part || '', qty: 1 }]);
  }

  function setQty(list, id, qty) {
    const value = Math.max(1, Math.min(999, Math.floor(Number(qty) || 1)));
    return list.map((entry) => (entry.id === id ? { ...entry, qty: value } : entry));
  }

  function removeItem(list, id) {
    return list.filter((entry) => entry.id !== id);
  }

  const api = { normalize, matches, productMessage, requestMessage, waLink, addItem, setQty, removeItem };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  const doc = root.document;
  const lang = doc.body.dataset.lang === 'en' ? 'en' : 'ar';
  const wa = doc.body.dataset.wa || '';
  const labels = JSON.parse(doc.getElementById('labels').textContent);
  const panel = doc.getElementById('request');
  const zoom = doc.getElementById('zoom');

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function load() {
    try {
      const value = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function save() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      // Private browsing can block storage; the list still works for this page.
    }
  }

  let list = load();

  function draw() {
    const total = list.reduce((sum, entry) => sum + entry.qty, 0);
    doc.querySelectorAll('[data-request-count]').forEach((el) => {
      el.textContent = String(total);
      el.hidden = total === 0;
    });
    panel.querySelector('[data-request-rows]').innerHTML = list.length
      ? list.map((entry) => `<li><span><strong>${esc(entry.name)}</strong>${entry.part ? `<small>${esc(labels.partNumber)}: ${esc(entry.part)}</small>` : ''}</span><input type="number" min="1" max="999" value="${entry.qty}" data-qty="${esc(entry.id)}" aria-label="${esc(labels.qty)}"><button type="button" data-remove="${esc(entry.id)}" aria-label="${esc(labels.remove)}">×</button></li>`).join('')
      : `<li class="empty">${esc(labels.empty)}</li>`;
    const send = panel.querySelector('[data-request-send]');
    send.hidden = !list.length || !wa;
    send.href = list.length && wa ? waLink(wa, requestMessage(list, lang)) : '#';
  }

  function open() {
    panel.hidden = false;
    doc.documentElement.classList.add('locked');
  }

  function close() {
    panel.hidden = true;
    doc.documentElement.classList.remove('locked');
  }

  doc.querySelectorAll('[data-ask]').forEach((link) => {
    if (!wa) return;
    link.href = waLink(wa, productMessage({ name: link.dataset.name, part: link.dataset.part }, lang, link.dataset.url));
  });

  doc.addEventListener('click', (event) => {
    if (event.target === panel) return close();
    if (event.target === zoom) return zoom.close();
    const target = event.target.closest('[data-add],[data-open-request],[data-close-request],[data-remove],[data-thumb],[data-zoom]');
    if (!target) return;
    if (target.matches('[data-add]')) {
      list = addItem(list, { id: target.dataset.id, name: target.dataset.name, part: target.dataset.part });
      save();
      draw();
      target.textContent = labels.added;
      open();
    } else if (target.matches('[data-open-request]')) {
      open();
    } else if (target.matches('[data-close-request]')) {
      close();
    } else if (target.matches('[data-remove]')) {
      list = removeItem(list, target.dataset.remove);
      save();
      draw();
    } else if (target.matches('[data-thumb]')) {
      const track = doc.querySelector('[data-track]');
      const slide = track.children[Number(target.dataset.thumb)];
      if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (target.matches('[data-zoom]') && zoom && zoom.showModal) {
      zoom.querySelector('img').src = target.dataset.zoom;
      zoom.showModal();
    }
  });

  doc.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty]');
    if (!input) return;
    list = setQty(list, input.dataset.qty, input.value);
    save();
    draw();
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close();
  });

  const track = doc.querySelector('[data-track]');
  if (track) {
    const thumbs = doc.querySelectorAll('[data-thumb]');
    track.addEventListener('scroll', () => {
      const index = Math.round(Math.abs(track.scrollLeft) / Math.max(track.clientWidth, 1));
      thumbs.forEach((thumb) => thumb.classList.toggle('on', Number(thumb.dataset.thumb) === index));
    }, { passive: true });
  }

  const filters = doc.querySelector('[data-filters]');
  if (filters) {
    const cards = Array.from(doc.querySelectorAll('[data-results] [data-card]'));
    const none = doc.querySelector('[data-no-results]');
    const params = new URLSearchParams(root.location.search);
    ['q', 'brand', 'section'].forEach((name) => {
      const field = filters.elements[name];
      if (field && params.get(name)) field.value = params.get(name);
    });
    const value = (name) => (filters.elements[name] ? filters.elements[name].value : '');
    const apply = () => {
      const filter = { q: value('q'), brand: value('brand'), section: value('section') };
      let shown = 0;
      cards.forEach((card) => {
        const ok = matches({ name: card.dataset.name, part: card.dataset.part, brand: card.dataset.brand, section: card.dataset.section }, filter);
        card.hidden = !ok;
        if (ok) shown += 1;
      });
      none.hidden = shown > 0;
    };
    filters.addEventListener('input', apply);
    filters.addEventListener('change', apply);
    filters.addEventListener('submit', (event) => event.preventDefault());
    apply();
  }

  draw();
})(this);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add warehouse-app/catalog/assets/catalog.js warehouse-app/test/catalog-client.test.js
git commit -m "Add public catalog script for search, gallery and WhatsApp request list"
```

---

### Task 4: Page templates and stylesheet

**Files:**
- Create: `warehouse-app/catalog/templates.js`
- Create: `warehouse-app/catalog/assets/catalog.css`
- Test: `warehouse-app/test/templates.test.js`

**Interfaces:**
- Consumes: DOM contract listed in Task 3.
- Produces: `LABELS` (`ar`/`en` copy, including `company` and `tagline`), `esc(value)`, and page functions all returning full HTML strings:
  - `homePage(lang, site, { brands, sections, featured, total })`
  - `allPage(lang, site, { products, brands, sections })`
  - `listPage(lang, site, { title, path, products })`
  - `productPage(lang, site, product, similar)`
  - `notFoundPage(lang, site)`
- `site` shape: `{ baseUrl, buildId, year, whatsapp, phone, address: { ar, en }, about: { ar, en }, name: { ar, en }, logo }`.
- Product view shape (built in Task 5): `{ id, name, description, images, brandId, sectionId, brandName, sectionName, featured, updatedAt, partNumber?, origin?, fits?, available? }`. Optional keys are absent when hidden.
- Taxonomy view shape: `{ id, name, count, image }`.

- [ ] **Step 1: Write the failing tests**

`warehouse-app/test/templates.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../catalog/templates');

const site = {
  baseUrl: 'https://catalog.example', buildId: 'b1', year: 2026, whatsapp: '201001234567', phone: '0222',
  address: { ar: 'القاهرة', en: 'Cairo' }, about: { ar: 'نبذة', en: 'About' },
  name: { ar: 'الرمزي إخوان', en: 'Al Ramzy Brothers' }, logo: '/assets/logo.png'
};

const product = {
  id: 7212, name: 'مروحة <أكتروس>', description: 'سطر 1\n\nسطر 2', images: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'],
  brandId: 'b1', sectionId: 's1', brandName: 'أكتروس', sectionName: 'تبريد', featured: true, updatedAt: '',
  partNumber: 'PN-1', available: true
};

test('productPage escapes text and shows only present fields', () => {
  const html = T.productPage('ar', site, product, []);
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /مروحة &lt;أكتروس&gt;/);
  assert.doesNotMatch(html, /مروحة <أكتروس>/);
  assert.match(html, /PN-1/);
  assert.match(html, /متوفر/);
  assert.doesNotMatch(html, /المنشأ والماركة/);
  assert.match(html, /data-thumb="1"/);
  assert.match(html, /<p>سطر 1<\/p><p>سطر 2<\/p>/);
  assert.match(html, /href="\/en\/p\/7212\/"/);
});

test('productPage omits hidden part number and availability', () => {
  const { partNumber, available, ...hidden } = product;
  const html = T.productPage('en', site, hidden, []);
  assert.match(html, /dir="ltr"/);
  assert.doesNotMatch(html, /PN-1/);
  assert.doesNotMatch(html, /In stock|Out of stock/);
  assert.match(html, /data-part=""/);
});

test('allPage renders filter controls and one card per product', () => {
  const html = T.allPage('ar', site, { products: [product], brands: [{ id: 'b1', name: 'أكتروس', count: 1, image: '' }], sections: [] });
  assert.match(html, /data-filters/);
  assert.match(html, /<option value="b1">أكتروس<\/option>/);
  assert.equal((html.match(/data-card /g) || []).length, 1);
});

test('homePage hides WhatsApp buttons when no number is set', () => {
  const html = T.homePage('ar', { ...site, whatsapp: '' }, { brands: [], sections: [], featured: [], total: 0 });
  assert.doesNotMatch(html, /wa\.me/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/templates'`.

- [ ] **Step 3: Implement the templates**

`warehouse-app/catalog/templates.js`:

```js
const LABELS = {
  ar: {
    dir: 'rtl', otherLabel: 'English', home: 'الرئيسية', all: 'كل الأصناف', brands: 'الماركات', sections: 'الأقسام',
    featured: 'أصناف مميزة', contact: 'تواصل معنا', search: 'ابحث بالاسم أو رقم القطعة', allBrands: 'كل الماركات',
    allSections: 'كل الأقسام', partNumber: 'رقم القطعة', origin: 'المنشأ والماركة', fits: 'بيركب على',
    available: 'متوفر', unavailable: 'غير متوفر', ask: 'اسأل على واتساب', add: 'أضف لقائمة الطلب',
    added: 'اتضاف لقائمة الطلب', similar: 'أصناف من نفس القسم', request: 'قائمة الطلب',
    send: 'ابعت الطلب على واتساب', empty: 'القائمة فاضية', qty: 'الكمية', remove: 'حذف',
    noResults: 'مفيش أصناف مطابقة', products: 'صنف', call: 'اتصل بنا', address: 'العنوان',
    notFound: 'الصفحة مش موجودة', backHome: 'رجوع للرئيسية', company: 'الرمزي إخوان',
    tagline: 'تجارة واستيراد قطع غيار النقل الثقيل'
  },
  en: {
    dir: 'ltr', otherLabel: 'العربية', home: 'Home', all: 'All products', brands: 'Brands', sections: 'Categories',
    featured: 'Featured products', contact: 'Contact us', search: 'Search by name or part number', allBrands: 'All brands',
    allSections: 'All categories', partNumber: 'Part number', origin: 'Origin & make', fits: 'Fits',
    available: 'In stock', unavailable: 'Out of stock', ask: 'Ask on WhatsApp', add: 'Add to request list',
    added: 'Added to request list', similar: 'More from this category', request: 'Request list',
    send: 'Send request on WhatsApp', empty: 'Your list is empty', qty: 'Qty', remove: 'Remove',
    noResults: 'No matching products', products: 'products', call: 'Call us', address: 'Address',
    notFound: 'Page not found', backHome: 'Back to home', company: 'Al Ramzy Brothers',
    tagline: 'Heavy truck spare parts — trading and import'
  }
};

const ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5h.01M4 12h.01M4 19h.01"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function paragraphs(text) {
  return String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function noImage() {
  return '<span class="noimg"><img src="/assets/logo.png" alt=""></span>';
}

function badge(lang, p) {
  if (p.available === undefined) return '';
  const L = LABELS[lang];
  return `<span class="badge ${p.available ? 'in' : 'out'}">${p.available ? L.available : L.unavailable}</span>`;
}

function card(lang, p) {
  const image = p.images[0]
    ? `<img src="/media/${p.images[0]}-sm.webp" alt="${esc(p.name)}" loading="lazy" width="480" height="480">`
    : noImage();
  return `<a class="card" href="/${lang}/p/${p.id}/" data-card data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}" data-brand="${esc(p.brandId)}" data-section="${esc(p.sectionId)}"><span class="card-media">${image}</span><span class="card-body"><strong>${esc(p.name)}</strong>${p.brandName ? `<small>${esc(p.brandName)}</small>` : ''}${badge(lang, p)}</span></a>`;
}

function tiles(lang, list, kind) {
  const L = LABELS[lang];
  return list.map((t) => `<a class="tile" href="/${lang}/${kind}/${t.id}/"><span class="media">${t.image ? `<img src="/media/${t.image}-sm.webp" alt="" loading="lazy">` : noImage()}</span><strong>${esc(t.name)}</strong><small>${t.count} ${L.products}</small></a>`).join('');
}

function footer(lang, site) {
  const L = LABELS[lang];
  const items = [];
  if (site.whatsapp) items.push(`<a href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener"><small>WhatsApp</small><strong dir="ltr">+${esc(site.whatsapp)}</strong></a>`);
  if (site.phone) items.push(`<a href="tel:${esc(site.phone.replace(/[^\d+]/g, ''))}"><small>${L.call}</small><strong dir="ltr">${esc(site.phone)}</strong></a>`);
  if (site.address[lang]) items.push(`<div><small>${L.address}</small><strong>${esc(site.address[lang])}</strong></div>`);
  const contact = items.length ? `<div class="wrap section"><h2>${L.contact}</h2><div class="contact-grid">${items.join('')}</div></div>` : '';
  return `<footer class="contact">${contact}<div class="foot">© ${site.year} ${esc(site.name[lang])}</div></footer>`;
}

function layout(lang, site, page) {
  const L = LABELS[lang];
  const other = lang === 'ar' ? 'en' : 'ar';
  const url = `${site.baseUrl}/${lang}${page.path}`;
  const title = page.title ? `${page.title} | ${site.name[lang]}` : site.name[lang];
  const description = page.description || site.about[lang];
  const image = page.image ? `${site.baseUrl}/media/${page.image}-lg.webp` : `${site.baseUrl}/assets/logo.png`;
  const labels = JSON.stringify({ added: L.added, empty: L.empty, qty: L.qty, remove: L.remove, partNumber: L.partNumber }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ar" href="${site.baseUrl}/ar${page.path}">
<link rel="alternate" hreflang="en" href="${site.baseUrl}/en${page.path}">
<meta property="og:type" content="${page.type || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta name="theme-color" content="#1b2559">
<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/catalog.css?v=${site.buildId}">
</head>
<body data-lang="${lang}" data-wa="${esc(site.whatsapp)}">
<header class="top"><div class="wrap top-row">
<a class="brand" href="/${lang}/"><img src="${site.logo}" alt="${esc(site.name[lang])}" width="44" height="44"><span>${esc(site.name[lang])}</span></a>
<nav class="top-nav"><a href="/${lang}/products/">${L.all}</a><a href="/${other}${page.path}" hreflang="${other}" lang="${other}">${L.otherLabel}</a><button type="button" class="request-btn" data-open-request aria-label="${L.request}">${ICON_LIST}<span data-request-count hidden>0</span></button></nav>
</div></header>
<main>${page.body}</main>
${footer(lang, site)}
<aside id="request" class="request" hidden aria-label="${L.request}"><div class="request-card">
<header><h2>${L.request}</h2><button type="button" data-close-request aria-label="×">×</button></header>
<ul data-request-rows></ul>
<a class="btn wa" data-request-send target="_blank" rel="noopener" hidden>${ICON_WA}${L.send}</a>
</div></aside>
<dialog id="zoom"><img alt=""></dialog>
<script type="application/json" id="labels">${labels}</script>
<script src="/assets/catalog.js?v=${site.buildId}" defer></script>
</body>
</html>`;
}

function homePage(lang, site, model) {
  const L = LABELS[lang];
  const wa = site.whatsapp ? `<a class="btn wa" href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener">${ICON_WA}${L.contact}</a>` : '';
  const block = (title, inner, link) => `<section class="section"><div class="wrap"><div class="section-head"><h2>${title}</h2>${link || ''}</div>${inner}</div></section>`;
  const body = `<section class="hero"><div class="wrap"><h1>${esc(site.name[lang])}</h1><p>${esc(site.about[lang])}</p><div class="hero-actions"><a class="btn light" href="/${lang}/products/">${L.all}</a>${wa}</div></div></section>
${model.brands.length ? block(L.brands, `<div class="tiles">${tiles(lang, model.brands, 'brand')}</div>`) : ''}
${model.sections.length ? block(L.sections, `<div class="tiles">${tiles(lang, model.sections, 'section')}</div>`) : ''}
${model.featured.length ? block(L.featured, `<div class="grid">${model.featured.map((p) => card(lang, p)).join('')}</div>`, `<a href="/${lang}/products/">${L.all} (${model.total})</a>`) : ''}`;
  return layout(lang, site, { path: '/', body });
}

function allPage(lang, site, model) {
  const L = LABELS[lang];
  const options = (list, all) => `<option value="">${all}</option>${list.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}`;
  const body = `<div class="wrap"><header class="page-head"><nav class="crumbs"><a href="/${lang}/">${L.home}</a><span>›</span><span>${L.all}</span></nav><h1>${L.all}</h1><p>${model.products.length} ${L.products}</p></header>
<form class="filters" data-filters role="search"><input type="search" name="q" placeholder="${L.search}" aria-label="${L.search}">${model.brands.length ? `<select name="brand" aria-label="${L.brands}">${options(model.brands, L.allBrands)}</select>` : ''}${model.sections.length ? `<select name="section" aria-label="${L.sections}">${options(model.sections, L.allSections)}</select>` : ''}</form>
<div class="grid section" data-results>${model.products.map((p) => card(lang, p)).join('')}</div>
<p class="empty-note" data-no-results hidden>${L.noResults}</p></div>`;
  return layout(lang, site, { path: '/products/', title: L.all, body });
}

function listPage(lang, site, model) {
  const L = LABELS[lang];
  const body = `<div class="wrap"><header class="page-head"><nav class="crumbs"><a href="/${lang}/">${L.home}</a><span>›</span><span>${esc(model.title)}</span></nav><h1>${esc(model.title)}</h1><p>${model.products.length} ${L.products}</p></header>
<div class="grid section">${model.products.map((p) => card(lang, p)).join('')}</div></div>`;
  return layout(lang, site, { path: model.path, title: model.title, body });
}

function productPage(lang, site, p, similar) {
  const L = LABELS[lang];
  const url = `${site.baseUrl}/${lang}/p/${p.id}/`;
  const slides = p.images.length
    ? p.images.map((id, i) => `<button type="button" data-zoom="/media/${id}-lg.webp" aria-label="${esc(p.name)} ${i + 1}"><img src="/media/${id}-lg.webp" alt="${esc(p.name)}" width="1600" height="1600"${i ? ' loading="lazy"' : ''}></button>`).join('')
    : noImage();
  const thumbs = p.images.length > 1
    ? `<div class="thumbs">${p.images.map((id, i) => `<button type="button" data-thumb="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"><img src="/media/${id}-sm.webp" alt="" loading="lazy"></button>`).join('')}</div>`
    : '';
  const specs = [[L.partNumber, p.partNumber], [L.origin, p.origin], [L.fits, p.fits]].filter(([, value]) => value);
  const crumbs = [`<a href="/${lang}/">${L.home}</a>`, `<a href="/${lang}/products/">${L.all}</a>`];
  if (p.brandName) crumbs.push(`<a href="/${lang}/brand/${p.brandId}/">${esc(p.brandName)}</a>`);
  const ask = site.whatsapp
    ? `<a class="btn wa" data-ask data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}" data-url="${url}" href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener">${ICON_WA}${L.ask}</a>`
    : '';
  const body = `<div class="wrap"><nav class="crumbs page-crumbs">${crumbs.join('<span>›</span>')}</nav>
<div class="product"><div class="gallery"><div class="gallery-track" data-track>${slides}</div>${thumbs}</div>
<div class="info"><h1>${esc(p.name)}</h1>
<div class="chips">${p.brandName ? `<a href="/${lang}/brand/${p.brandId}/">${esc(p.brandName)}</a>` : ''}${p.sectionName ? `<a href="/${lang}/section/${p.sectionId}/">${esc(p.sectionName)}</a>` : ''}${badge(lang, p)}</div>
${specs.length ? `<dl class="specs">${specs.map(([key, value]) => `<dt>${key}</dt><dd>${esc(value)}</dd>`).join('')}</dl>` : ''}
${p.description ? `<div class="desc">${paragraphs(p.description)}</div>` : ''}
<div class="actions">${ask}<button type="button" class="btn outline" data-add data-id="${p.id}" data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}">${L.add}</button></div>
</div></div>
${similar.length ? `<section class="section"><h2>${L.similar}</h2><div class="grid">${similar.map((s) => card(lang, s)).join('')}</div></section>` : ''}</div>`;
  return layout(lang, site, {
    path: `/p/${p.id}/`, title: p.name, description: String(p.description || p.name).replace(/\s+/g, ' ').slice(0, 160),
    image: p.images[0], type: 'product', body
  });
}

function notFoundPage(lang, site) {
  const L = LABELS[lang];
  const body = `<div class="wrap empty-note"><h1>${L.notFound}</h1><p><a class="btn" href="/${lang}/">${L.backHome}</a></p></div>`;
  return layout(lang, site, { path: '/', title: L.notFound, body });
}

module.exports = { LABELS, esc, homePage, allPage, listPage, productPage, notFoundPage };
```

- [ ] **Step 4: Add the stylesheet**

`warehouse-app/catalog/assets/catalog.css`:

```css
:root { --navy: #1b2559; --navy-2: #11183d; --red: #c4161c; --ink: #1b2559; --muted: #6b7593; --line: #e3e8f3; --bg: #f4f7fe; --card: #fff; --radius: 16px; --shadow: 0 10px 30px rgba(27, 37, 89, .08); }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
html.locked { overflow: hidden; }
body { margin: 0; font-family: "IBM Plex Sans Arabic", system-ui, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.6; }
img { max-width: 100%; display: block; }
a { color: inherit; text-decoration: none; }
.wrap { width: min(1200px, 100% - 32px); margin-inline: auto; }
.top { position: sticky; top: 0; z-index: 20; background: rgba(255, 255, 255, .92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.top-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 68px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; }
.brand img { width: 44px; height: 44px; object-fit: contain; }
.top-nav { display: flex; align-items: center; gap: 6px; }
.top-nav a { padding: 8px 12px; border-radius: 10px; font-weight: 600; color: var(--muted); }
.top-nav a:hover { background: var(--bg); color: var(--ink); }
.request-btn { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: var(--navy); color: #fff; cursor: pointer; }
.request-btn svg { width: 22px; height: 22px; }
.request-btn span { position: absolute; top: -6px; inset-inline-end: -6px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--red); color: #fff; font-size: .75rem; font-weight: 700; display: grid; place-items: center; }
.request-btn span[hidden] { display: none; }
.hero { position: relative; overflow: hidden; padding: 56px 0 64px; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-2) 100%); color: #fff; }
.hero::after { content: ""; position: absolute; inset: auto -10% -40% auto; width: 60%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(196, 22, 28, .35), transparent 65%); }
.hero h1 { margin: 0 0 12px; font-size: clamp(1.8rem, 4vw, 2.8rem); line-height: 1.25; }
.hero p { margin: 0 0 24px; max-width: 640px; color: rgba(255, 255, 255, .82); font-size: 1.05rem; white-space: pre-line; }
.hero-actions { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 12px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border: 0; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; background: var(--navy); color: #fff; transition: transform .15s ease, box-shadow .15s ease; }
.btn:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
.btn.light { background: #fff; color: var(--navy); }
.btn.outline { background: transparent; color: var(--navy); border: 1.5px solid var(--navy); }
.btn.wa { background: #1fae54; color: #fff; }
.section { padding: 40px 0; }
.section h2 { margin: 0 0 18px; font-size: 1.4rem; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.section-head h2 { margin: 0; }
.section-head a { color: var(--red); font-weight: 700; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.tile, .card { display: flex; flex-direction: column; overflow: hidden; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); transition: box-shadow .2s, transform .2s; }
.tile:hover, .card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.tile .media { aspect-ratio: 4 / 3; background: #eef2fb; }
.tile .media img { width: 100%; height: 100%; object-fit: cover; }
.tile strong { padding: 12px 14px 0; }
.tile small { padding: 0 14px 12px; color: var(--muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card[hidden] { display: none; }
.card-media { display: block; aspect-ratio: 1; background: #eef2fb; }
.card-media img { width: 100%; height: 100%; object-fit: cover; }
.noimg { display: grid; place-items: center; width: 100%; height: 100%; min-height: 160px; }
.noimg img { width: 40%; height: auto; opacity: .25; object-fit: contain; }
.card-body { display: flex; flex-direction: column; gap: 4px; padding: 14px; }
.card-body strong { font-size: .98rem; line-height: 1.45; }
.card-body small { color: var(--muted); }
.badge { align-self: flex-start; margin-top: 6px; padding: 2px 10px; border-radius: 999px; font-size: .78rem; font-weight: 700; }
.badge.in { background: #e7f6ec; color: #0f7a3a; }
.badge.out { background: #fdecea; color: #a11218; }
.page-head { padding: 32px 0 0; }
.page-head h1 { margin: 0; font-size: clamp(1.5rem, 3vw, 2.1rem); }
.page-head p { margin: 6px 0 0; color: var(--muted); }
.crumbs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; color: var(--muted); font-size: .88rem; }
.crumbs a:hover { color: var(--ink); }
.page-crumbs { padding-top: 24px; }
.filters { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 0; }
.filters input, .filters select { flex: 1 1 200px; min-height: 48px; padding: 0 14px; border: 1px solid var(--line); border-radius: 12px; font: inherit; background: #fff; color: var(--ink); }
.filters input { flex-basis: 320px; }
.empty-note { padding: 40px 0; text-align: center; color: var(--muted); }
.product { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 32px; padding: 16px 0 32px; }
.gallery { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.gallery-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; scrollbar-width: none; }
.gallery-track::-webkit-scrollbar { display: none; }
.gallery-track button, .gallery-track .noimg { flex: 0 0 100%; aspect-ratio: 1; padding: 0; border: 0; background: #fff; scroll-snap-align: center; cursor: zoom-in; }
.gallery-track img { width: 100%; height: 100%; object-fit: contain; }
.thumbs { display: flex; gap: 8px; overflow-x: auto; }
.thumbs button { flex: 0 0 72px; height: 72px; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 10px; background: #fff; cursor: pointer; }
.thumbs button.on { border-color: var(--red); }
.thumbs img { width: 100%; height: 100%; object-fit: cover; }
.info h1 { margin: 0 0 10px; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.35; }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px; }
.chips a { padding: 4px 12px; border-radius: 999px; background: #e8eef8; font-size: .85rem; font-weight: 600; }
.chips .badge { margin: 0; }
.specs { display: grid; grid-template-columns: auto 1fr; gap: 8px 18px; margin: 0 0 18px; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
.specs dt { color: var(--muted); }
.specs dd { margin: 0; font-weight: 600; }
.desc { color: #33406b; }
.desc p { margin: 0 0 10px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.actions .btn { flex: 1 1 200px; }
.contact { margin-top: 24px; background: #fff; border-top: 1px solid var(--line); }
.contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.contact-grid a, .contact-grid div { display: flex; flex-direction: column; gap: 4px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; }
.contact-grid small { color: var(--muted); }
.foot { padding: 22px 0; color: var(--muted); font-size: .85rem; text-align: center; }
.request { position: fixed; inset: 0; z-index: 40; display: flex; justify-content: flex-end; background: rgba(17, 24, 61, .45); }
.request[hidden] { display: none; }
.request-card { display: flex; flex-direction: column; gap: 14px; width: min(420px, 100%); height: 100%; padding: 20px; background: #fff; box-shadow: var(--shadow); }
.request-card header { display: flex; align-items: center; justify-content: space-between; }
.request-card h2 { margin: 0; font-size: 1.2rem; }
.request-card header button { width: 40px; height: 40px; border: 0; border-radius: 10px; background: var(--bg); font-size: 1.4rem; cursor: pointer; }
.request ul { display: flex; flex: 1; flex-direction: column; gap: 10px; margin: 0; padding: 0; overflow: auto; list-style: none; }
.request li { display: grid; grid-template-columns: 1fr 72px 36px; gap: 8px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 12px; }
.request li span { display: flex; flex-direction: column; }
.request li small { color: var(--muted); }
.request li input { min-height: 40px; border: 1px solid var(--line); border-radius: 8px; text-align: center; font: inherit; }
.request li button { height: 36px; border: 0; border-radius: 8px; background: #fdecea; color: #a11218; font-size: 1.1rem; cursor: pointer; }
.request li.empty { display: block; color: var(--muted); text-align: center; border-style: dashed; }
.request .btn[hidden] { display: none; }
#zoom { max-width: min(96vw, 1400px); max-height: 94vh; padding: 0; border: 0; background: transparent; }
#zoom::backdrop { background: rgba(17, 24, 61, .85); }
#zoom img { width: auto; max-height: 94vh; margin: auto; border-radius: 12px; background: #fff; }
@media (max-width: 820px) {
  .product { grid-template-columns: 1fr; gap: 20px; }
  .top-row { min-height: 60px; }
  .brand span { display: none; }
  .hero { padding: 40px 0 48px; }
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .card-body { padding: 10px; }
  .card-body strong { font-size: .9rem; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add warehouse-app/catalog/templates.js warehouse-app/catalog/assets/catalog.css warehouse-app/test/templates.test.js
git commit -m "Add bilingual catalog page templates and stylesheet"
```

---

### Task 5: Static site builder

**Files:**
- Create: `warehouse-app/catalog/build.js`
- Test: `warehouse-app/test/build.test.js`

**Interfaces:**
- Consumes: `catalog` shape (Task 1), templates (Task 4), assets folder `warehouse-app/catalog/assets/`.
- Produces: `buildSite({ catalog, products: Map<productId, { name, code }>, availability: Map<productId, boolean>, mediaDir, siteDir, baseUrl, logoFallback, now? }) -> Promise<{ buildId, products, pages }>`, `viewModel(catalog, products, availability, lang)`.

- [ ] **Step 1: Write the failing tests**

`warehouse-app/test/build.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('../catalog/build');
const { emptyCatalog, defaultItem } = require('../catalog/store');

const LOGO = path.join(__dirname, '..', 'public', 'logo.png');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-build-'));
  const mediaDir = path.join(root, 'media');
  fs.mkdirSync(mediaDir);
  for (const id of ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc']) {
    fs.writeFileSync(path.join(mediaDir, `${id}-lg.webp`), 'lg');
    fs.writeFileSync(path.join(mediaDir, `${id}-sm.webp`), 'sm');
  }
  const catalog = emptyCatalog();
  catalog.company.whatsapp = '201001234567';
  catalog.brands = [{ id: 'b1', nameAr: 'أكتروس', nameEn: 'Actros', order: 0 }];
  catalog.sections = [{ id: 's1', nameAr: 'تبريد', nameEn: 'Cooling', order: 0 }];
  catalog.items['1'] = { ...defaultItem(1), published: true, nameAr: 'مروحة', images: ['aaaaaaaaaaaaaaaa'], brandId: 'b1', sectionId: 's1', partNumber: 'PN-VISIBLE' };
  catalog.items['2'] = { ...defaultItem(2), published: true, nameEn: 'Pump EN', images: ['bbbbbbbbbbbbbbbb'], sectionId: 's1', partNumber: 'SECRET-PN', showPartNumber: false, showAvailability: false, originAr: 'سري', showOrigin: false };
  catalog.items['3'] = { ...defaultItem(3), published: false, nameAr: 'مخفي', images: ['cccccccccccccccc'] };
  const products = new Map([[1, { name: 'اسم برنامج 1', code: 'C1', salePrice: 98765 }], [2, { name: 'طلمبة', code: 'C2' }], [3, { name: 'x', code: 'C3' }]]);
  const availability = new Map([[1, true], [2, false], [3, true]]);
  const siteDir = path.join(root, 'site');
  return { root, mediaDir, siteDir, catalog, products, availability };
}

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(full) : [full];
  });
}

test('buildSite writes pages for published products in both languages', async () => {
  const s = setup();
  const result = await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  assert.equal(result.products, 2);
  for (const rel of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'ar/index.html', 'en/index.html',
    'ar/products/index.html', 'ar/p/1/index.html', 'en/p/2/index.html', 'ar/brand/b1/index.html', 'en/section/s1/index.html',
    'assets/catalog.css', 'assets/catalog.js', 'assets/logo.png', 'media/aaaaaaaaaaaaaaaa-lg.webp', 'media/bbbbbbbbbbbbbbbb-sm.webp']) {
    assert.equal(fs.existsSync(path.join(s.siteDir, rel)), true, rel);
  }
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/3/index.html')), false);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'media/cccccccccccccccc-lg.webp')), false);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'en/p/2/index.html'), 'utf8'), /Pump EN/);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'en/p/1/index.html'), 'utf8'), /مروحة/);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'sitemap.xml'), 'utf8'), /https:\/\/c\.test\/en\/p\/2\//);
});

test('no generated file leaks hidden fields, unpublished products or prices', async () => {
  const s = setup();
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  const text = allFiles(s.siteDir).filter((f) => /\.(html|xml|txt|js|css)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(text, /SECRET-PN/);
  assert.doesNotMatch(text, /سري/);
  assert.doesNotMatch(text, /مخفي/);
  assert.doesNotMatch(text, /98765/);
  assert.match(text, /PN-VISIBLE/);
  const pump = fs.readFileSync(path.join(s.siteDir, 'ar/p/2/index.html'), 'utf8');
  assert.doesNotMatch(pump, /class="badge/);
});

test('rebuilding replaces the old site and leaves no temporary folders', async () => {
  const s = setup();
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO, now: new Date('2026-11-04T10:00:00Z') });
  fs.writeFileSync(path.join(s.siteDir, 'stale.txt'), 'old');
  s.catalog.items['1'].published = false;
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO, now: new Date('2026-11-04T10:05:00Z') });
  assert.equal(fs.existsSync(path.join(s.siteDir, 'stale.txt')), false);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/1/index.html')), false);
  assert.deepEqual(fs.readdirSync(s.root).sort(), ['media', 'site']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/build'`.

- [ ] **Step 3: Implement the builder**

`warehouse-app/catalog/build.js`:

```js
const fs = require('fs');
const path = require('path');
const T = require('./templates');

const ASSETS = path.join(__dirname, 'assets');
const LANGS = ['ar', 'en'];

function pick(entry, lang, ar, en) {
  return lang === 'en' ? (entry[en] || entry[ar] || '') : (entry[ar] || '');
}

function viewModel(catalog, products, availability, lang) {
  const brands = new Map(catalog.brands.map((entry) => [entry.id, entry]));
  const sections = new Map(catalog.sections.map((entry) => [entry.id, entry]));
  const list = [];
  for (const item of Object.values(catalog.items)) {
    if (!item.published) continue;
    const product = products.get(Number(item.productId));
    if (!product) continue;
    const nameAr = item.nameAr || product.name;
    const brand = brands.get(item.brandId);
    const section = sections.get(item.sectionId);
    const view = {
      id: Number(item.productId),
      name: lang === 'en' ? (item.nameEn || nameAr) : nameAr,
      description: pick(item, lang, 'descriptionAr', 'descriptionEn'),
      images: (item.images || []).slice(0, 5),
      brandId: brand ? brand.id : '',
      sectionId: section ? section.id : '',
      brandName: brand ? pick(brand, lang, 'nameAr', 'nameEn') : '',
      sectionName: section ? pick(section, lang, 'nameAr', 'nameEn') : '',
      featured: Boolean(item.featured),
      updatedAt: item.updatedAt || ''
    };
    if (item.showPartNumber) view.partNumber = item.partNumber || product.code || '';
    if (item.showOrigin) view.origin = pick(item, lang, 'originAr', 'originEn');
    if (item.showFits) view.fits = pick(item, lang, 'fitsAr', 'fitsEn');
    if (item.showAvailability) view.available = Boolean(availability.get(Number(item.productId)));
    list.push(view);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, lang));
}

function taxonomy(entries, list, key, lang) {
  return entries.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((entry) => {
      const members = list.filter((p) => p[key] === entry.id);
      const withImage = members.find((p) => p.images.length);
      return { id: entry.id, name: pick(entry, lang, 'nameAr', 'nameEn'), count: members.length, image: withImage ? withImage.images[0] : '' };
    })
    .filter((entry) => entry.count > 0);
}

function siteInfo(catalog, baseUrl, now) {
  const c = catalog.company;
  return {
    baseUrl,
    buildId: now.getTime().toString(36),
    year: now.getFullYear(),
    whatsapp: c.whatsapp || '',
    phone: c.phone || '',
    address: { ar: c.addressAr || '', en: c.addressEn || c.addressAr || '' },
    about: { ar: c.aboutAr || T.LABELS.ar.tagline, en: c.aboutEn || T.LABELS.en.tagline },
    name: { ar: T.LABELS.ar.company, en: T.LABELS.en.company },
    logo: c.logoId ? `/media/${c.logoId}-sm.webp` : '/assets/logo.png'
  };
}

function swapInto(temp, siteDir) {
  const old = `${siteDir}.old-${Date.now()}`;
  if (fs.existsSync(siteDir)) fs.renameSync(siteDir, old);
  fs.renameSync(temp, siteDir);
  fs.rmSync(old, { recursive: true, force: true });
}

async function buildSite({ catalog, products, availability, mediaDir, siteDir, baseUrl, logoFallback, now = new Date() }) {
  const site = siteInfo(catalog, baseUrl, now);
  const temp = `${siteDir}.building-${site.buildId}`;
  fs.rmSync(temp, { recursive: true, force: true });
  const write = (rel, content) => {
    const file = path.join(temp, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const urls = [];
  const media = new Set(catalog.company.logoId ? [catalog.company.logoId] : []);
  let total = 0;
  try {
    for (const lang of LANGS) {
      const list = viewModel(catalog, products, availability, lang);
      total = list.length;
      list.forEach((p) => p.images.forEach((id) => media.add(id)));
      const brands = taxonomy(catalog.brands, list, 'brandId', lang);
      const sections = taxonomy(catalog.sections, list, 'sectionId', lang);
      const featured = list.filter((p) => p.featured);
      const highlight = (featured.length ? featured : list.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))).slice(0, 8);
      write(`${lang}/index.html`, T.homePage(lang, site, { brands, sections, featured: highlight, total: list.length }));
      urls.push(`/${lang}/`);
      write(`${lang}/products/index.html`, T.allPage(lang, site, { products: list, brands, sections }));
      urls.push(`/${lang}/products/`);
      for (const brand of brands) {
        write(`${lang}/brand/${brand.id}/index.html`, T.listPage(lang, site, { title: brand.name, path: `/brand/${brand.id}/`, products: list.filter((p) => p.brandId === brand.id) }));
        urls.push(`/${lang}/brand/${brand.id}/`);
      }
      for (const section of sections) {
        write(`${lang}/section/${section.id}/index.html`, T.listPage(lang, site, { title: section.name, path: `/section/${section.id}/`, products: list.filter((p) => p.sectionId === section.id) }));
        urls.push(`/${lang}/section/${section.id}/`);
      }
      for (const p of list) {
        const similar = p.sectionId ? list.filter((x) => x.id !== p.id && x.sectionId === p.sectionId).slice(0, 8) : [];
        write(`${lang}/p/${p.id}/index.html`, T.productPage(lang, site, p, similar));
        urls.push(`/${lang}/p/${p.id}/`);
      }
    }
    write('index.html', `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/ar/"><link rel="canonical" href="${baseUrl}/ar/"><title>${T.esc(site.name.ar)}</title></head><body><a href="/ar/">${T.esc(site.name.ar)}</a></body></html>`);
    write('404.html', T.notFoundPage('ar', site));
    write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${baseUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
    fs.mkdirSync(path.join(temp, 'assets'), { recursive: true });
    for (const name of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, name), path.join(temp, 'assets', name));
    fs.copyFileSync(logoFallback, path.join(temp, 'assets', 'logo.png'));
    fs.mkdirSync(path.join(temp, 'media'), { recursive: true });
    for (const id of media) {
      for (const size of ['lg', 'sm']) {
        const from = path.join(mediaDir, `${id}-${size}.webp`);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(temp, 'media', `${id}-${size}.webp`));
      }
    }
    swapInto(temp, siteDir);
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }
  return { buildId: site.buildId, products: total, pages: urls.length };
}

module.exports = { buildSite, viewModel };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add warehouse-app/catalog/build.js warehouse-app/test/build.test.js
git commit -m "Generate the static catalog site and swap it in atomically"
```

---

### Task 6: Publisher

**Files:**
- Create: `warehouse-app/catalog/publisher.js`
- Test: `warehouse-app/test/publisher.test.js`

**Interfaces:**
- Consumes: `createStore` (Task 1), `buildSite` (Task 5).
- Produces: `createPublisher({ store, snapshotFile, mediaDir, siteDir, baseUrl, logoFallback, loadProducts(ids) -> Promise<Map>, loadAvailability(ids) -> Promise<Map>, build? }) -> { publish(), refreshAvailability() }`.
  - `publish()` builds from the current catalog, writes `snapshotFile`, sets `publishedAt` and clears `lastError`; on failure sets `lastError` and rethrows. Concurrent calls share one run.
  - `refreshAvailability()` returns `false` when nothing was published yet, a build is running, or availability is unchanged; otherwise rebuilds from the snapshot and returns `true`.

- [ ] **Step 1: Write the failing tests**

`warehouse-app/test/publisher.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStore, defaultItem } = require('../catalog/store');
const { createPublisher } = require('../catalog/publisher');

function setup(availability) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-pub-'));
  const store = createStore(path.join(dir, 'catalog.json'));
  store.update((data) => {
    data.items['1'] = { ...defaultItem(1), published: true, nameAr: 'منشور' };
    data.items['2'] = { ...defaultItem(2), published: false };
  });
  const builds = [];
  const state = { availability: new Map(availability) };
  const publisher = createPublisher({
    store,
    snapshotFile: path.join(dir, 'catalog-published.json'),
    mediaDir: dir, siteDir: path.join(dir, 'site'), baseUrl: 'https://c.test', logoFallback: 'logo.png',
    loadProducts: async (ids) => new Map(ids.map((id) => [id, { name: `p${id}`, code: '' }])),
    loadAvailability: async (ids) => new Map(ids.map((id) => [id, Boolean(state.availability.get(id))])),
    build: async (args) => { builds.push(args); return { buildId: 'x', products: 1, pages: 3 }; }
  });
  return { dir, store, builds, state, publisher };
}

test('publish builds only published ids and records the publish time', async () => {
  const s = setup([[1, true]]);
  const result = await s.publisher.publish();
  assert.equal(s.builds.length, 1);
  assert.deepEqual([...s.builds[0].products.keys()], [1]);
  assert.ok(result.publishedAt);
  assert.equal(s.store.load().publishedAt, result.publishedAt);
  assert.equal(JSON.parse(fs.readFileSync(path.join(s.dir, 'catalog-published.json'), 'utf8')).items['1'].nameAr, 'منشور');
});

test('concurrent publish calls share one build', async () => {
  const s = setup([[1, true]]);
  await Promise.all([s.publisher.publish(), s.publisher.publish()]);
  assert.equal(s.builds.length, 1);
});

test('refreshAvailability rebuilds from the snapshot only when stock changes', async () => {
  const s = setup([[1, true]]);
  assert.equal(await s.publisher.refreshAvailability(), false);
  await s.publisher.publish();
  s.store.update((data) => { data.items['1'].nameAr = 'تعديل غير منشور'; });
  assert.equal(await s.publisher.refreshAvailability(), false);
  s.state.availability.set(1, false);
  assert.equal(await s.publisher.refreshAvailability(), true);
  assert.equal(s.builds.length, 2);
  assert.equal(s.builds[1].catalog.items['1'].nameAr, 'منشور');
  assert.equal(s.builds[1].availability.get(1), false);
});

test('a failed publish stores the error and rethrows', async () => {
  const s = setup([[1, true]]);
  const failing = createPublisher({
    store: s.store, snapshotFile: path.join(s.dir, 'snap.json'), mediaDir: s.dir, siteDir: s.dir, baseUrl: '', logoFallback: '',
    loadProducts: async () => new Map(), loadAvailability: async () => new Map(),
    build: async () => { throw new Error('boom'); }
  });
  await assert.rejects(failing.publish(), /boom/);
  assert.equal(s.store.load().lastError, 'boom');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/publisher'`.

- [ ] **Step 3: Implement the publisher**

`warehouse-app/catalog/publisher.js`:

```js
const fs = require('fs');
const path = require('path');
const { buildSite } = require('./build');

function publishedIds(catalog) {
  return Object.values(catalog.items).filter((item) => item.published).map((item) => Number(item.productId));
}

function signature(map) {
  return JSON.stringify([...map.entries()].sort((a, b) => a[0] - b[0]));
}

function createPublisher({ store, snapshotFile, mediaDir, siteDir, baseUrl, logoFallback, loadProducts, loadAvailability, build = buildSite }) {
  let running = null;
  let lastSignature = null;

  function readSnapshot() {
    try {
      return JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  function writeSnapshot(catalog) {
    fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
    const temp = `${snapshotFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(catalog));
    fs.renameSync(temp, snapshotFile);
  }

  async function run(catalog, fromSnapshot) {
    const ids = publishedIds(catalog);
    const [products, availability] = await Promise.all([loadProducts(ids), loadAvailability(ids)]);
    const result = await build({ catalog, products, availability, mediaDir, siteDir, baseUrl, logoFallback });
    lastSignature = signature(availability);
    if (fromSnapshot) return { ...result, publishedAt: store.load().publishedAt };
    writeSnapshot(catalog);
    const publishedAt = new Date().toISOString();
    store.update((data) => {
      data.publishedAt = publishedAt;
      data.lastError = '';
    });
    return { ...result, publishedAt };
  }

  function start(catalog, fromSnapshot) {
    running = run(catalog, fromSnapshot)
      .catch((error) => {
        store.update((data) => { data.lastError = error.message || 'تعذر نشر الكتالوج'; });
        throw error;
      })
      .finally(() => { running = null; });
    return running;
  }

  function publish() {
    if (running) return running;
    return start(store.load(), false);
  }

  async function refreshAvailability() {
    if (running) return false;
    const snapshot = readSnapshot();
    if (!snapshot || !store.load().publishedAt) return false;
    const availability = await loadAvailability(publishedIds(snapshot));
    if (lastSignature !== null && signature(availability) === lastSignature) return false;
    if (running) return false;
    await start(snapshot, true);
    return true;
  }

  return { publish, refreshAvailability };
}

module.exports = { createPublisher };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add warehouse-app/catalog/publisher.js warehouse-app/test/publisher.test.js
git commit -m "Publish the catalog and refresh availability from the published snapshot"
```

---

### Task 7: Permission helpers and API router

**Files:**
- Create: `warehouse-app/catalog/access.js`
- Create: `warehouse-app/catalog/routes.js`
- Test: `warehouse-app/test/access.test.js`
- Test: `warehouse-app/test/routes.test.js`

**Interfaces:**
- Consumes: store (Task 1), images (Task 2), publisher (`publish()`, Task 6).
- Produces:
  - `cleanPerms(value) -> string[]` (only `'catalog'` survives), `canEditCatalog(user) -> boolean`.
  - `createCatalogRouter({ store, mediaDir, publisher, loadProducts, requireCatalog, actorName, record, siteUrl }) -> express.Router`.
  - Endpoints (all JSON, all behind `requireCatalog`):
    - `GET /api/catalog` → `{ items: [{ productId, name, code, exists, published, featured, image, updatedAt }], brands, sections, company, publishedAt, lastError, siteUrl, namesError }`
    - `GET /api/catalog/items/:productId` → `{ item, saved, product: { id, name, code, exists }, brands, sections }`
    - `PUT /api/catalog/items/:productId` (item fields) → `{ item }`
    - `DELETE /api/catalog/items/:productId` → `{ ok: true }`
    - `POST /api/catalog/items/:productId/images` (raw body, `Content-Type: image/jpeg|png|webp`) → `{ item }`
    - `DELETE /api/catalog/items/:productId/images/:imageId` → `{ item }`
    - `PUT /api/catalog/taxonomy/:kind` (`{ list }`, kind `brands|sections`) → `{ list }`
    - `PUT /api/catalog/company` → `{ company }`
    - `POST /api/catalog/company/logo` (raw image) → `{ company }`
    - `GET /api/catalog/media/:file` (`<16 hex>-(lg|sm).webp`) → image
    - `POST /api/catalog/publish` → `{ buildId, products, pages, publishedAt }`

- [ ] **Step 1: Write the failing access tests**

`warehouse-app/test/access.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanPerms, canEditCatalog } = require('../catalog/access');

test('cleanPerms keeps only known permissions', () => {
  assert.deepEqual(cleanPerms(['catalog', 'admin', 'catalog']), ['catalog']);
  assert.deepEqual(cleanPerms('catalog'), []);
  assert.deepEqual(cleanPerms(undefined), []);
});

test('canEditCatalog allows superadmins and users with the catalog permission', () => {
  assert.equal(canEditCatalog({ role: 'superadmin' }), true);
  assert.equal(canEditCatalog({ role: 'manager', perms: ['catalog'] }), true);
  assert.equal(canEditCatalog({ role: 'manager', perms: [] }), false);
  assert.equal(canEditCatalog(null), false);
});
```

- [ ] **Step 2: Write the failing router tests**

`warehouse-app/test/routes.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const sharp = require('sharp');
const { createStore } = require('../catalog/store');
const { createCatalogRouter } = require('../catalog/routes');

async function start() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-routes-'));
  const store = createStore(path.join(dir, 'catalog.json'));
  const mediaDir = path.join(dir, 'media');
  const records = [];
  const app = express();
  app.use(express.json());
  app.use(createCatalogRouter({
    store,
    mediaDir,
    publisher: { publish: async () => ({ buildId: 'b', products: 1, pages: 9, publishedAt: '2026-11-04T10:00:00.000Z' }) },
    loadProducts: async (ids) => new Map(ids.filter((id) => id === 7212).map((id) => [id, { name: 'انبوبه', code: '70.3' }])),
    requireCatalog: (req, res, next) => (req.get('x-deny') ? res.status(403).json({ error: 'ممنوع' }) : next()),
    actorName: () => 'سامح',
    record: (req, entry) => records.push(entry),
    siteUrl: 'https://catalog.test'
  }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body, headers = {}) => {
    const isJson = body !== undefined && !Buffer.isBuffer(body);
    const res = await fetch(base + url, {
      method,
      headers: { ...(isJson ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: isJson ? JSON.stringify(body) : body
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
  };
  return { dir, store, mediaDir, records, server, call };
}

const png = () => sharp({ create: { width: 64, height: 64, channels: 3, background: '#c4161c' } }).png().toBuffer();

test('catalog routes save items, images, lists, company and publish', async (t) => {
  const s = await start();
  t.after(() => s.server.close());

  let r = await s.call('GET', '/api/catalog/items/7212');
  assert.equal(r.status, 200);
  assert.equal(r.body.saved, false);
  assert.equal(r.body.product.name, 'انبوبه');

  r = await s.call('PUT', '/api/catalog/items/999', { nameAr: 'x' });
  assert.equal(r.status, 400);

  r = await s.call('PUT', '/api/catalog/taxonomy/brands', { list: [{ nameAr: 'أكتروس', nameEn: 'Actros' }] });
  assert.equal(r.status, 200);
  const brandId = r.body.list[0].id;

  r = await s.call('PUT', '/api/catalog/items/7212', { nameAr: 'انبوبه سليكون', brandId, published: true, showPartNumber: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.brandId, brandId);
  assert.equal(s.records.at(-1).action, 'catalog');

  r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  assert.equal(r.status, 200);
  const first = r.body.item.images[0];
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${first}-lg.webp`)), true);
  r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  const second = r.body.item.images[1];

  r = await s.call('PUT', '/api/catalog/items/7212', { ...r.body.item, images: [second, first] });
  assert.deepEqual(r.body.item.images, [second, first]);

  r = await s.call('GET', `/api/catalog/media/${first}-sm.webp`);
  assert.equal(r.status, 200);
  r = await s.call('GET', '/api/catalog/media/..%2Fcatalog.json');
  assert.equal(r.status, 404);

  r = await s.call('DELETE', `/api/catalog/items/7212/images/${first}`);
  assert.deepEqual(r.body.item.images, [second]);
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${first}-lg.webp`)), false);

  r = await s.call('PUT', '/api/catalog/company', { whatsapp: '01001234567', aboutAr: 'نبذة' });
  assert.equal(r.body.company.whatsapp, '201001234567');
  r = await s.call('POST', '/api/catalog/company/logo', await png(), { 'Content-Type': 'image/png' });
  assert.match(r.body.company.logoId, /^[a-f0-9]{16}$/);

  r = await s.call('GET', '/api/catalog');
  assert.equal(r.body.items.length, 1);
  assert.equal(r.body.items[0].name, 'انبوبه سليكون');
  assert.equal(r.body.siteUrl, 'https://catalog.test');

  r = await s.call('POST', '/api/catalog/publish');
  assert.equal(r.status, 200);
  assert.equal(r.body.pages, 9);

  r = await s.call('DELETE', '/api/catalog/items/7212');
  assert.equal(r.status, 200);
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${second}-lg.webp`)), false);
  assert.deepEqual(s.store.load().items, {});
});

test('catalog routes enforce the image limit, image type and permission', async (t) => {
  const s = await start();
  t.after(() => s.server.close());
  await s.call('PUT', '/api/catalog/items/7212', { nameAr: 'x' });
  for (let i = 0; i < 5; i += 1) {
    const ok = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
    assert.equal(ok.status, 200);
  }
  let r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /5/);
  r = await s.call('POST', '/api/catalog/items/7212/images', Buffer.from('GIF89a'), { 'Content-Type': 'image/gif' });
  assert.equal(r.status, 400);
  r = await s.call('GET', '/api/catalog', undefined, { 'x-deny': '1' });
  assert.equal(r.status, 403);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../catalog/access'` and `'../catalog/routes'`.

- [ ] **Step 4: Implement the permission helpers**

`warehouse-app/catalog/access.js`:

```js
const PERMS = ['catalog'];

function cleanPerms(value) {
  return Array.isArray(value) ? PERMS.filter((perm) => value.includes(perm)) : [];
}

function canEditCatalog(user) {
  return Boolean(user) && (user.role === 'superadmin' || cleanPerms(user.perms).includes('catalog'));
}

module.exports = { cleanPerms, canEditCatalog };
```

- [ ] **Step 5: Implement the router**

`warehouse-app/catalog/routes.js`:

```js
const path = require('path');
const express = require('express');
const { MAX_IMAGES, defaultItem, cleanItem, cleanTaxonomy, cleanCompany } = require('./store');
const { saveImage, deleteImage, isImageId, MAX_BYTES } = require('./images');

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createCatalogRouter({ store, mediaDir, publisher, loadProducts, requireCatalog, actorName, record, siteUrl }) {
  const router = express.Router();
  const raw = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_BYTES });
  const wrap = (handler) => async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message || 'تعذر تنفيذ الطلب' });
    }
  };
  const productIdOf = (req) => {
    const id = Number(req.params.productId);
    if (!Number.isInteger(id) || id <= 0) throw fail('رقم الصنف غير صحيح');
    return id;
  };
  async function productInfo(id) {
    const found = (await loadProducts([id])).get(id);
    return found ? { id, name: found.name, code: found.code, exists: true } : { id, name: '', code: '', exists: false };
  }
  async function requireProduct(id) {
    const product = await productInfo(id);
    if (!product.exists) throw fail('الصنف غير موجود في البرنامج');
    return product;
  }

  router.use('/api/catalog', requireCatalog);

  router.get('/api/catalog', wrap(async (req, res) => {
    const catalog = store.load();
    const ids = Object.keys(catalog.items).map(Number);
    let names = new Map();
    let namesError = '';
    try {
      names = await loadProducts(ids);
    } catch (error) {
      namesError = 'تعذر قراءة أسماء الأصناف من قاعدة البيانات';
    }
    const items = Object.values(catalog.items).map((item) => {
      const product = names.get(Number(item.productId));
      return {
        productId: item.productId,
        name: item.nameAr || (product ? product.name : ''),
        code: product ? product.code : '',
        exists: Boolean(product) || Boolean(namesError),
        published: item.published,
        featured: item.featured,
        image: item.images[0] || '',
        updatedAt: item.updatedAt
      };
    }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    res.json({
      items, brands: catalog.brands, sections: catalog.sections, company: catalog.company,
      publishedAt: catalog.publishedAt, lastError: catalog.lastError, siteUrl, namesError
    });
  }));

  router.get('/api/catalog/items/:productId', wrap(async (req, res) => {
    const id = productIdOf(req);
    const catalog = store.load();
    const saved = catalog.items[String(id)];
    res.json({ item: saved || defaultItem(id), saved: Boolean(saved), product: await productInfo(id), brands: catalog.brands, sections: catalog.sections });
  }));

  router.put('/api/catalog/items/:productId', wrap(async (req, res) => {
    const id = productIdOf(req);
    const product = await requireProduct(id);
    const item = store.update((catalog) => {
      const next = cleanItem(catalog, id, req.body, actorName(req));
      catalog.items[String(id)] = next;
      return next;
    });
    record(req, { action: 'catalog', detail: `تعديل كتالوج ${product.name}${item.published ? ' (منشور)' : ''}`, ref: `product:${id}` });
    res.json({ item });
  }));

  router.delete('/api/catalog/items/:productId', wrap(async (req, res) => {
    const id = productIdOf(req);
    const removed = store.update((catalog) => {
      const item = catalog.items[String(id)];
      delete catalog.items[String(id)];
      return item;
    });
    if (removed) removed.images.forEach((imageId) => deleteImage(imageId, mediaDir));
    record(req, { action: 'catalog', detail: `إزالة صنف ${id} من الكتالوج`, ref: `product:${id}` });
    res.json({ ok: true });
  }));

  router.post('/api/catalog/items/:productId/images', raw, wrap(async (req, res) => {
    const id = productIdOf(req);
    await requireProduct(id);
    const current = store.load().items[String(id)];
    if (current && current.images.length >= MAX_IMAGES) throw fail('الحد الأقصى 5 صور');
    const imageId = await saveImage(req.body, mediaDir);
    let item;
    try {
      item = store.update((catalog) => {
        const key = String(id);
        const entry = catalog.items[key] || defaultItem(id);
        if (entry.images.length >= MAX_IMAGES) throw fail('الحد الأقصى 5 صور');
        entry.images.push(imageId);
        catalog.items[key] = entry;
        return entry;
      });
    } catch (error) {
      deleteImage(imageId, mediaDir);
      throw error;
    }
    record(req, { action: 'catalog', detail: `إضافة صورة لكتالوج صنف ${id}`, ref: `product:${id}` });
    res.json({ item });
  }));

  router.delete('/api/catalog/items/:productId/images/:imageId', wrap(async (req, res) => {
    const id = productIdOf(req);
    const imageId = String(req.params.imageId);
    if (!isImageId(imageId)) throw fail('الصورة غير موجودة', 404);
    const item = store.update((catalog) => {
      const entry = catalog.items[String(id)];
      if (!entry || !entry.images.includes(imageId)) throw fail('الصورة غير موجودة', 404);
      entry.images = entry.images.filter((x) => x !== imageId);
      return entry;
    });
    deleteImage(imageId, mediaDir);
    record(req, { action: 'catalog', detail: `حذف صورة من كتالوج صنف ${id}`, ref: `product:${id}` });
    res.json({ item });
  }));

  router.put('/api/catalog/taxonomy/:kind', wrap(async (req, res) => {
    const kind = String(req.params.kind);
    const list = store.update((catalog) => {
      const next = cleanTaxonomy(catalog, kind, req.body && req.body.list);
      catalog[kind] = next;
      return next;
    });
    record(req, { action: 'catalog', detail: kind === 'brands' ? 'تعديل ماركات الكتالوج' : 'تعديل أقسام الكتالوج' });
    res.json({ list });
  }));

  router.put('/api/catalog/company', wrap(async (req, res) => {
    const company = store.update((catalog) => {
      catalog.company = cleanCompany(catalog.company, req.body);
      return catalog.company;
    });
    record(req, { action: 'catalog', detail: 'تعديل بيانات الشركة في الكتالوج' });
    res.json({ company });
  }));

  router.post('/api/catalog/company/logo', raw, wrap(async (req, res) => {
    const imageId = await saveImage(req.body, mediaDir);
    let previous = '';
    const company = store.update((catalog) => {
      previous = catalog.company.logoId;
      catalog.company.logoId = imageId;
      return catalog.company;
    });
    if (previous) deleteImage(previous, mediaDir);
    record(req, { action: 'catalog', detail: 'تغيير شعار الكتالوج' });
    res.json({ company });
  }));

  router.get('/api/catalog/media/:file', (req, res) => {
    const file = String(req.params.file);
    if (!/^[a-f0-9]{16}-(lg|sm)\.webp$/.test(file)) return res.status(404).json({ error: 'غير موجود' });
    res.set('Cache-Control', 'private, max-age=86400');
    return res.sendFile(path.join(mediaDir, file), (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'غير موجود' });
    });
  });

  router.post('/api/catalog/publish', wrap(async (req, res) => {
    const result = await publisher.publish();
    record(req, { action: 'catalog', detail: `نشر الكتالوج — ${result.products} صنف` });
    res.json(result);
  }));

  router.use('/api/catalog', (error, req, res, next) => {
    if (error && error.type === 'entity.too.large') return res.status(413).json({ error: 'الصورة أكبر من 8 ميجا' });
    return next(error);
  });

  return router;
}

module.exports = { createCatalogRouter };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add warehouse-app/catalog/access.js warehouse-app/catalog/routes.js warehouse-app/test/access.test.js warehouse-app/test/routes.test.js
git commit -m "Add catalog API and catalog permission"
```

---

### Task 8: Wire the catalog into the server

**Files:**
- Modify: `warehouse-app/server.js`

**Interfaces:**
- Consumes: `createStore`, `createPublisher`, `createCatalogRouter`, `cleanPerms`, `canEditCatalog`.
- Produces: user objects returned by `/api/me`, `/api/login`, `/api/users` now include `perms: string[]`. Env vars `CATALOG_SITE_DIR` (default `/var/www/catalog.alramzybrothers.com/site`) and `CATALOG_BASE_URL` (default `https://catalog.alramzybrothers.com`).

- [ ] **Step 1: Require the catalog modules**

In `warehouse-app/server.js`, after `const path = require('path');` add:

```js
const { createStore: createCatalogStore } = require('./catalog/store');
const { createPublisher: createCatalogPublisher } = require('./catalog/publisher');
const { createCatalogRouter } = require('./catalog/routes');
const { cleanPerms, canEditCatalog } = require('./catalog/access');
```

- [ ] **Step 2: Carry permissions on users**

Replace `publicUser`:

```js
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: Boolean(user.active),
    perms: cleanPerms(user.perms)
  };
}
```

In `cleanAccount`, after `const active = body.active !== false;` add:

```js
  const perms = cleanPerms(body.perms);
```

and change its final return to:

```js
  return { value: { username, name, role, password, active, perms } };
```

In `app.post('/api/users', ...)`, change the `created` object to:

```js
  const created = {
    id: item.username,
    username: item.username,
    name: item.name,
    role: item.role,
    active: true,
    perms: item.perms,
    ...hashPassword(item.password)
  };
```

In `app.put('/api/users/:id', ...)`, change the `next` line to:

```js
  const next = { ...users[index], name: item.name, role: item.role, active: item.active, perms: item.perms };
```

- [ ] **Step 3: Add the catalog permission guard**

After the `requireSuper` function add:

```js
function requireCatalog(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  if (!canEditCatalog(user)) return res.status(403).json({ error: 'الكتالوج محتاج صلاحية «كتالوج»' });
  return next();
}
```

- [ ] **Step 4: Add SQL loaders, publisher and router**

Immediately before `app.listen(PORT, '127.0.0.1', () => {` add:

```js
async function catalogProducts(ids) {
  const map = new Map();
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  for (let i = 0; i < clean.length; i += 500) {
    const rows = await runQuery(`
      SELECT ProductId AS id, ISNULL(ProductCode, '') AS code, ISNULL(ProductName, N'') AS name
      FROM tblProducts WHERE ProductId IN (${clean.slice(i, i + 500).join(',')})
    `);
    for (const row of rows) map.set(Number(row.id), { name: row.name, code: row.code });
  }
  return map;
}

async function catalogAvailability(ids) {
  const map = new Map();
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  for (let i = 0; i < clean.length; i += 500) {
    const rows = await runQuery(`
      SELECT ProductID AS id, SUM(ISNULL(ProductStock, 0)) AS qty
      FROM tblProductsStores WHERE CompCode = 0 AND ProductID IN (${clean.slice(i, i + 500).join(',')})
      GROUP BY ProductID
    `);
    for (const row of rows) map.set(Number(row.id), Number(row.qty) > 0);
  }
  return map;
}

const catalogStore = createCatalogStore(path.join(__dirname, 'data', 'catalog.json'));
const catalogMediaDir = path.join(__dirname, 'data', 'catalog-media');
const catalogPublisher = createCatalogPublisher({
  store: catalogStore,
  snapshotFile: path.join(__dirname, 'data', 'catalog-published.json'),
  mediaDir: catalogMediaDir,
  siteDir: process.env.CATALOG_SITE_DIR || '/var/www/catalog.alramzybrothers.com/site',
  baseUrl: process.env.CATALOG_BASE_URL || 'https://catalog.alramzybrothers.com',
  logoFallback: path.join(__dirname, 'public', 'logo.png'),
  loadProducts: catalogProducts,
  loadAvailability: catalogAvailability
});
app.use(createCatalogRouter({
  store: catalogStore,
  mediaDir: catalogMediaDir,
  publisher: catalogPublisher,
  loadProducts: catalogProducts,
  requireCatalog,
  actorName,
  record: recordActivity,
  siteUrl: process.env.CATALOG_BASE_URL || 'https://catalog.alramzybrothers.com'
}));
```

- [ ] **Step 5: Refresh availability every 15 minutes**

Inside the `app.listen(PORT, '127.0.0.1', () => { ... })` callback, after the existing `console.log(...)` line, add:

```js
  setInterval(() => {
    if (readTarget() === 'standby') return;
    catalogPublisher.refreshAvailability().catch((error) => console.error('catalog refresh', error.message));
  }, 15 * 60 * 1000);
```

- [ ] **Step 6: Verify the server loads and tests still pass**

Run: `node --check server.js && npm test`
Expected: no syntax error; all tests PASS.

Run: `node -e "console.log(typeof require('./catalog/routes').createCatalogRouter, typeof require('./catalog/publisher').createPublisher)"`
Expected: `function function`.

- [ ] **Step 7: Commit**

```bash
git add warehouse-app/server.js
git commit -m "Serve the catalog API and refresh catalog availability every 15 minutes"
```

---

### Task 9: Admin screens

**Files:**
- Create: `warehouse-app/public/catalog-admin.js`
- Modify: `warehouse-app/public/app.js`
- Modify: `warehouse-app/public/index.html`
- Modify: `warehouse-app/public/styles.css`

**Interfaces:**
- Consumes (globals from `app.js`): `state`, `content`, `api`, `esc`, `field`, `grid`, `whenText`, `productCode`, `showTab`, `closeTab`, `tabIsCurrent`, `abandonTab`, `setDocumentHeading`, `renderTabStrip`, `docPageActions`, `setPageActions`, `openSection`. API endpoints from Task 7.
- Produces (globals used by `app.js`): `canCatalog()`, `openCatalogItem(productId, options)`, `renderCatalog(data)`.

- [ ] **Step 1: Create the admin script**

`warehouse-app/public/catalog-admin.js`:

```js
function canCatalog() {
  const user = state.user;
  return Boolean(user) && (user.role === 'superadmin' || (user.perms || []).includes('catalog'));
}

function catalogMedia(id) {
  return `/api/catalog/media/${id}-sm.webp`;
}

async function catalogUploadImage(url, file) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'تعذر رفع الصورة');
  return data;
}

function catalogSay(el, text, ok) {
  el.textContent = text;
  el.className = ok ? 'meta' : 'error';
}

function catalogOptions(list, selected) {
  return `<option value="">—</option>${list.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === selected ? 'selected' : ''}>${esc(entry.nameAr)}</option>`).join('')}`;
}

function catalogCheck(id, checked, label) {
  return `<span class="checkline"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}> ${label}</span>`;
}

async function openCatalogItem(productId, options = {}) {
  const key = `catalog:${productId}`;
  const opened = showTab(key, 'كتالوج صنف', {
    force: Boolean(options.force),
    reload: () => openCatalogItem(productId, { force: true })
  });
  if (opened.mode !== 'fresh') return;
  const epoch = ++opened.tab.epoch;
  content.innerHTML = '<div class="skeleton"><span></span><span></span><span></span></div>';
  let data;
  try {
    data = await api(`/api/catalog/items/${productId}`);
  } catch (error) {
    if (!tabIsCurrent(key, epoch)) return abandonTab(key, epoch);
    content.innerHTML = `<div class="error">${esc(error.message)}</div>`;
    return;
  }
  if (!tabIsCurrent(key, epoch)) return abandonTab(key, epoch);
  opened.tab.title = `كتالوج · ${data.product.name || productId}`;
  setDocumentHeading(opened.tab);
  renderTabStrip();
  drawCatalogItem(key, productId, data);
}

function drawCatalogItem(key, productId, data) {
  const item = data.item;
  const p = data.product;
  let images = item.images.slice();
  content.innerHTML = `<article class="sheet">
    <header>
      <div><h2>كتالوج الصنف</h2><p>${esc(productCode(p.code, p.id))} · ${esc(p.name || 'صنف غير موجود')}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    ${p.exists ? '' : '<p class="error">الصنف مش موجود في البرنامج، ومش هيتنشر.</p>'}
    <form id="catalogForm" class="form-grid">
      ${field('النشر', catalogCheck('cPublished', item.published, 'منشور في الكتالوج'))}
      ${field('الصفحة الرئيسية', catalogCheck('cFeatured', item.featured, 'صنف مميز'))}
      ${field('الاسم بالعربي', `<input id="cNameAr" maxlength="120" value="${esc(item.nameAr)}" placeholder="${esc(p.name)}">`)}
      ${field('الاسم بالإنجليزي', `<input id="cNameEn" maxlength="120" dir="ltr" value="${esc(item.nameEn)}">`)}
      ${field('الماركة', `<select id="cBrand">${catalogOptions(data.brands, item.brandId)}</select>`)}
      ${field('القسم', `<select id="cSection">${catalogOptions(data.sections, item.sectionId)}</select>`)}
      ${field('الوصف بالعربي', `<textarea id="cDescAr" rows="5" maxlength="4000">${esc(item.descriptionAr)}</textarea>`, true)}
      ${field('الوصف بالإنجليزي', `<textarea id="cDescEn" rows="5" maxlength="4000" dir="ltr">${esc(item.descriptionEn)}</textarea>`, true)}
      ${field('رقم القطعة', `<input id="cPart" maxlength="80" value="${esc(item.partNumber)}" placeholder="${esc(p.code)}">`)}
      ${field('إظهار رقم القطعة', catalogCheck('cShowPart', item.showPartNumber, 'يظهر للعميل'))}
      ${field('المنشأ والماركة بالعربي', `<input id="cOriginAr" maxlength="120" value="${esc(item.originAr)}">`)}
      ${field('المنشأ والماركة بالإنجليزي', `<input id="cOriginEn" maxlength="120" dir="ltr" value="${esc(item.originEn)}">`)}
      ${field('إظهار المنشأ', catalogCheck('cShowOrigin', item.showOrigin, 'يظهر للعميل'))}
      ${field('بيركب على (عربي)', `<input id="cFitsAr" maxlength="300" value="${esc(item.fitsAr)}">`, true)}
      ${field('بيركب على (إنجليزي)', `<input id="cFitsEn" maxlength="300" dir="ltr" value="${esc(item.fitsEn)}">`, true)}
      ${field('إظهار بيركب على', catalogCheck('cShowFits', item.showFits, 'يظهر للعميل'))}
      ${field('التوفر', catalogCheck('cShowAvail', item.showAvailability, 'إظهار علامة متوفر / غير متوفر'))}
      <div class="wide"><strong>الصور</strong> <small>لحد 5 صور (JPG أو PNG أو WebP، لحد 8 ميجا). الأولى هي الرئيسية.</small>
        <div id="cImages" class="cat-images"></div>
        <label class="cat-upload">إضافة صور<input id="cUpload" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label>
      </div>
      <div class="wide actions">
        <button class="primary" type="submit">حفظ</button>
        ${data.saved ? '<button id="cRemove" class="ghost" type="button">إزالة من الكتالوج</button>' : ''}
      </div>
    </form>
    <p class="note">الحفظ مش بيغيّر الموقع على طول. التغييرات بتظهر بعد «نشر الكتالوج» من صفحة الكتالوج.</p>
    <p id="catalogMsg" class="meta"></p>
  </article>`;
  docPageActions();
  const msg = document.getElementById('catalogMsg');
  const drawImages = () => {
    document.getElementById('cImages').innerHTML = images.map((id, index) => `<figure class="cat-thumb${index === 0 ? ' main' : ''}"><img src="${catalogMedia(id)}" alt=""><figcaption>${index === 0 ? '<span>الرئيسية</span>' : `<button type="button" class="ghost" data-main="${id}">اجعلها الرئيسية</button>`}<button type="button" class="ghost" data-del="${id}">حذف</button></figcaption></figure>`).join('') || '<p class="note">لا توجد صور</p>';
  };
  drawImages();
  document.getElementById('closeDrawer').onclick = () => closeTab(key);
  document.getElementById('cImages').onclick = async (event) => {
    const main = event.target.closest('[data-main]');
    const del = event.target.closest('[data-del]');
    if (main) {
      images = [main.dataset.main].concat(images.filter((id) => id !== main.dataset.main));
      drawImages();
      catalogSay(msg, 'اضغط حفظ عشان ترتيب الصور يتسجّل', true);
      return;
    }
    if (!del || !window.confirm('حذف الصورة؟')) return;
    try {
      const result = await api(`/api/catalog/items/${productId}/images/${del.dataset.del}`, { method: 'DELETE' });
      images = images.filter((id) => result.item.images.includes(id));
      drawImages();
    } catch (error) {
      catalogSay(msg, error.message, false);
    }
  };
  document.getElementById('cUpload').onchange = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = '';
    for (const file of files) {
      catalogSay(msg, `جاري رفع ${file.name}...`, true);
      try {
        const result = await catalogUploadImage(`/api/catalog/items/${productId}/images`, file);
        images = images.concat(result.item.images.filter((id) => !images.includes(id)));
        drawImages();
        catalogSay(msg, 'اترفعت', true);
      } catch (error) {
        catalogSay(msg, `${file.name}: ${error.message}`, false);
        break;
      }
    }
  };
  const remove = document.getElementById('cRemove');
  if (remove) remove.onclick = async () => {
    if (!window.confirm('إزالة الصنف من الكتالوج وحذف صوره؟')) return;
    try {
      await api(`/api/catalog/items/${productId}`, { method: 'DELETE' });
      closeTab(key, { silent: true });
    } catch (error) {
      catalogSay(msg, error.message, false);
    }
  };
  document.getElementById('catalogForm').onsubmit = async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const value = (id) => document.getElementById(id).value;
    const checked = (id) => document.getElementById(id).checked;
    button.disabled = true;
    try {
      await api(`/api/catalog/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          published: checked('cPublished'), featured: checked('cFeatured'),
          nameAr: value('cNameAr'), nameEn: value('cNameEn'), brandId: value('cBrand'), sectionId: value('cSection'),
          descriptionAr: value('cDescAr'), descriptionEn: value('cDescEn'),
          partNumber: value('cPart'), showPartNumber: checked('cShowPart'),
          originAr: value('cOriginAr'), originEn: value('cOriginEn'), showOrigin: checked('cShowOrigin'),
          fitsAr: value('cFitsAr'), fitsEn: value('cFitsEn'), showFits: checked('cShowFits'),
          showAvailability: checked('cShowAvail'), images
        })
      });
      catalogSay(msg, 'اتحفظ. اضغط «نشر الكتالوج» من صفحة الكتالوج عشان يظهر على الموقع.', true);
    } catch (error) {
      catalogSay(msg, error.message, false);
    }
    button.disabled = false;
  };
}

function renderCatalog(data) {
  const lists = { brands: data.brands.map((x) => ({ ...x })), sections: data.sections.map((x) => ({ ...x })) };
  const company = data.company;
  content.innerHTML = `
    <section class="panel panel-pad cat-head">
      <div><strong>${data.publishedAt ? `آخر نشر: ${whenText(data.publishedAt)}` : 'لسه ماتنشرش'}</strong>
        ${data.lastError ? `<p class="error">${esc(data.lastError)}</p>` : ''}
        ${data.namesError ? `<p class="note">${esc(data.namesError)}</p>` : ''}</div>
      <div class="cat-head-actions"><a href="${esc(data.siteUrl)}" target="_blank" rel="noopener">فتح الكتالوج</a><button id="catPublish" class="primary" type="button">نشر الكتالوج</button></div>
    </section>
    <div class="toolbar"><input id="catQ" placeholder="بحث بالاسم أو رقم الصنف"><select id="catFilter"><option value="">الكل</option><option value="1">منشور</option><option value="0">غير منشور</option></select></div>
    <div id="catItems"></div>
    <p class="note">لإضافة صنف للكتالوج افتح الصنف من صفحة الأصناف واضغط «كتالوج»، أو اضغط إضافة واكتب رقم الصنف.</p>
    <div class="cat-columns">
      <section class="panel panel-pad"><h3>الماركات</h3><div id="catBrands"></div>
        <div class="actions"><button type="button" class="ghost" data-add-row="brands">إضافة ماركة</button><button type="button" class="primary" data-save-list="brands">حفظ الماركات</button></div><p id="catBrandsMsg" class="meta"></p></section>
      <section class="panel panel-pad"><h3>الأقسام</h3><div id="catSections"></div>
        <div class="actions"><button type="button" class="ghost" data-add-row="sections">إضافة قسم</button><button type="button" class="primary" data-save-list="sections">حفظ الأقسام</button></div><p id="catSectionsMsg" class="meta"></p></section>
    </div>
    <section class="panel panel-pad"><h3>بيانات الشركة</h3>
      <form id="catCompany" class="form-grid">
        ${field('الشعار', `<span class="cat-logo">${company.logoId ? `<img src="${catalogMedia(company.logoId)}" alt="">` : ''}<label class="cat-upload">رفع شعار<input id="catLogo" type="file" accept="image/jpeg,image/png,image/webp" hidden></label></span>`, true)}
        ${field('نبذة بالعربي', `<textarea id="coAboutAr" rows="3" maxlength="1500">${esc(company.aboutAr)}</textarea>`, true)}
        ${field('نبذة بالإنجليزي', `<textarea id="coAboutEn" rows="3" maxlength="1500" dir="ltr">${esc(company.aboutEn)}</textarea>`, true)}
        ${field('رقم الواتساب', `<input id="coWhatsapp" dir="ltr" value="${esc(company.whatsapp)}" placeholder="01xxxxxxxxx">`)}
        ${field('التليفون', `<input id="coPhone" dir="ltr" value="${esc(company.phone)}">`)}
        ${field('العنوان بالعربي', `<input id="coAddressAr" value="${esc(company.addressAr)}">`, true)}
        ${field('العنوان بالإنجليزي', `<input id="coAddressEn" dir="ltr" value="${esc(company.addressEn)}">`, true)}
        <div class="wide actions"><button class="primary" type="submit">حفظ بيانات الشركة</button></div>
      </form><p id="catCompanyMsg" class="meta"></p>
    </section>`;

  const drawItems = () => {
    const q = document.getElementById('catQ').value.trim().toLowerCase();
    const f = document.getElementById('catFilter').value;
    const rows = data.items.filter((it) => (!f || String(Number(it.published)) === f)
      && (!q || `${it.name} ${it.productId} ${it.code}`.toLowerCase().includes(q)));
    document.getElementById('catItems').innerHTML = rows.length ? grid(
      [
        { label: 'صورة', width: '64px' },
        { label: 'الصنف', width: '2fr' },
        { label: 'رقم الصنف', width: '0.7fr' },
        { label: 'الحالة', width: '0.8fr' },
        { label: 'آخر تعديل', width: '1fr' }
      ],
      rows.map((it) => ({
        clickable: true,
        attrs: `data-id="${it.productId}"`,
        cells: [
          it.image ? `<img class="cat-mini" src="${catalogMedia(it.image)}" alt="">` : '',
          esc(it.name) + (it.exists ? '' : ' <small class="due">مش موجود في البرنامج</small>'),
          esc(it.productId),
          it.published ? 'منشور' : 'غير منشور',
          whenText(it.updatedAt)
        ],
        classes: ['', '', '', it.published ? 'ok' : 'due', '']
      }))
    ) : '<div class="empty">لا توجد أصناف في الكتالوج</div>';
    document.querySelectorAll('#catItems .data-row').forEach((row) => {
      row.onclick = () => openCatalogItem(Number(row.dataset.id));
    });
  };
  document.getElementById('catQ').oninput = drawItems;
  document.getElementById('catFilter').onchange = drawItems;
  drawItems();

  const drawList = (kind) => {
    document.getElementById(kind === 'brands' ? 'catBrands' : 'catSections').innerHTML = lists[kind].map((entry, index) =>
      `<div class="cat-row"><input data-kind="${kind}" data-index="${index}" data-key="nameAr" value="${esc(entry.nameAr)}" placeholder="الاسم بالعربي"><input data-kind="${kind}" data-index="${index}" data-key="nameEn" dir="ltr" value="${esc(entry.nameEn || '')}" placeholder="English"><button type="button" class="ghost" data-drop="${kind}" data-index="${index}">حذف</button></div>`
    ).join('') || '<p class="note">لا يوجد</p>';
  };
  drawList('brands');
  drawList('sections');
  const columns = content.querySelector('.cat-columns');
  columns.oninput = (event) => {
    const input = event.target.closest('[data-kind]');
    if (input) lists[input.dataset.kind][Number(input.dataset.index)][input.dataset.key] = input.value;
  };
  columns.onclick = async (event) => {
    const add = event.target.closest('[data-add-row]');
    const drop = event.target.closest('[data-drop]');
    const saveBtn = event.target.closest('[data-save-list]');
    if (add) {
      lists[add.dataset.addRow].push({ id: '', nameAr: '', nameEn: '' });
      drawList(add.dataset.addRow);
    } else if (drop) {
      lists[drop.dataset.drop].splice(Number(drop.dataset.index), 1);
      drawList(drop.dataset.drop);
    } else if (saveBtn) {
      const kind = saveBtn.dataset.saveList;
      const out = document.getElementById(kind === 'brands' ? 'catBrandsMsg' : 'catSectionsMsg');
      try {
        const result = await api(`/api/catalog/taxonomy/${kind}`, { method: 'PUT', body: JSON.stringify({ list: lists[kind] }) });
        lists[kind] = result.list;
        data[kind] = result.list;
        drawList(kind);
        catalogSay(out, 'اتحفظ', true);
      } catch (error) {
        catalogSay(out, error.message, false);
      }
    }
  };

  const companyMsg = document.getElementById('catCompanyMsg');
  document.getElementById('catLogo').onchange = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      await catalogUploadImage('/api/catalog/company/logo', file);
      await openSection('catalog', { force: true });
    } catch (error) {
      catalogSay(companyMsg, error.message, false);
    }
  };
  document.getElementById('catCompany').onsubmit = async (event) => {
    event.preventDefault();
    const value = (id) => document.getElementById(id).value;
    try {
      await api('/api/catalog/company', {
        method: 'PUT',
        body: JSON.stringify({
          aboutAr: value('coAboutAr'), aboutEn: value('coAboutEn'), whatsapp: value('coWhatsapp'),
          phone: value('coPhone'), addressAr: value('coAddressAr'), addressEn: value('coAddressEn')
        })
      });
      catalogSay(companyMsg, 'اتحفظ', true);
    } catch (error) {
      catalogSay(companyMsg, error.message, false);
    }
  };

  document.getElementById('catPublish').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'جاري النشر...';
    try {
      await api('/api/catalog/publish', { method: 'POST' });
      await openSection('catalog', { force: true });
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      button.textContent = 'نشر الكتالوج';
    }
  };

  setPageActions({
    add: !state.readOnly,
    edit: false,
    delete: false,
    query: true,
    exit: true,
    onAdd: () => {
      const id = Number(window.prompt('رقم الصنف'));
      if (Number.isInteger(id) && id > 0) openCatalogItem(id);
    },
    onQuery: () => document.getElementById('catQ').focus()
  });
}
```

- [ ] **Step 2: Hook into `app.js` — icon, section and visibility**

In the `icons` object, after the `activity:` entry add:

```js
  catalog: svg('<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M16.5 13v7M13 16.5h7"/>'),
```

In `sections`, before the `activity` entry add:

```js
  { id: 'catalog', label: 'الكتالوج', title: 'كتالوج الأصناف', subtitle: 'الأصناف المنشورة على catalog.alramzybrothers.com', perm: 'catalog' },
```

Replace `visibleSections` and `canOpenSection`:

```js
function visibleSections() {
  return sections.filter((section) =>
    section.nav !== false
    && (!section.admin || state.user?.role === 'superadmin')
    && (!section.perm || canCatalog())
  );
}

function canOpenSection(id) {
  const section = sections.find((item) => item.id === id);
  if (!section) return false;
  if (section.admin && state.user?.role !== 'superadmin') return false;
  if (section.perm && !canCatalog()) return false;
  return true;
}
```

In `openSection`, inside the `try {`, directly after the `accounts` block (`if (id === 'accounts') { ... }`) add:

```js
    if (id === 'catalog') {
      const data = await api('/api/catalog');
      if (!ready()) return;
      return renderCatalog(data);
    }
```

- [ ] **Step 3: Hook into `app.js` — product page button**

In `openProductForm`, replace the `history-row` line:

```js
      ${id ? `<div class="wide history-row"><button id="saleHistory" class="history-btn" type="button">تاريخ البيع</button><button id="buyHistory" class="history-btn" type="button">تاريخ الشراء</button><button id="allMoves" class="history-btn" type="button">جميع الحركات</button>${canCatalog() ? '<button id="catalogBtn" class="history-btn" type="button">كتالوج</button>' : ''}</div>` : ''}
```

and after `document.getElementById('allMoves').onclick = () => openProductMoves(id, product);` add:

```js
    const catalogBtn = document.getElementById('catalogBtn');
    if (catalogBtn) catalogBtn.onclick = () => openCatalogItem(id);
```

- [ ] **Step 4: Hook into `app.js` — accounts permission**

In `openAccountForm`, after the `الصلاحية` field line add:

```js
      ${field('صلاحيات إضافية', `<span class="checkline"><input id="aCatalog" type="checkbox" ${(user?.perms || []).includes('catalog') ? 'checked' : ''}> الكتالوج</span>`)}
```

and change the payload to:

```js
    const payload = {
      name: document.getElementById('aName').value.trim(),
      role: document.getElementById('aRole').value,
      password: document.getElementById('aPassword').value,
      perms: document.getElementById('aCatalog').checked ? ['catalog'] : []
    };
```

- [ ] **Step 5: Load the script and bump cache versions**

In `warehouse-app/public/index.html` change the stylesheet and script tags to:

```html
  <link rel="stylesheet" href="/styles.css?v=20261104c">
```

```html
  <script src="/app.js?v=20261104c"></script>
  <script src="/catalog-admin.js?v=20261104c"></script>
```

- [ ] **Step 6: Admin styles**

Append to `warehouse-app/public/styles.css`:

```css
.history-row { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
.cat-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin: 10px 0; }
.cat-thumb { margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
.cat-thumb.main { border: 2px solid #c4161c; }
.cat-thumb img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.cat-thumb figcaption { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; font-size: 0.8rem; }
.cat-thumb figcaption button { flex: 1 1 auto; min-height: 32px; margin: 0; padding: 0 8px; font-size: 0.78rem; }
.cat-upload { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 16px; border: 1.5px solid #1b2559; border-radius: 12px; color: #1b2559; font-weight: 700; cursor: pointer; }
.cat-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.cat-head-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.cat-head-actions a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid var(--line); border-radius: 12px; font-weight: 600; }
.cat-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; margin: 12px 0; }
.cat-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin-bottom: 8px; }
.cat-row input, .cat-row button { margin: 0; }
.cat-logo { display: flex; align-items: center; gap: 12px; }
.cat-logo img { width: 64px; height: 64px; object-fit: contain; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
.cat-mini { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; }
```

- [ ] **Step 7: Verify locally**

Run: `node --check public/app.js && node --check public/catalog-admin.js && npm test`
Expected: no syntax errors; all tests PASS.

Manual check after deploy (Task 10): log in as super admin → sidebar shows «الكتالوج»; product page shows «كتالوج»; a manager without the permission sees neither.

- [ ] **Step 8: Commit**

```bash
git add warehouse-app/public/catalog-admin.js warehouse-app/public/app.js warehouse-app/public/index.html warehouse-app/public/styles.css
git commit -m "Add catalog admin screens, product catalog editor and catalog permission"
```

---

### Task 10: Deploy, nginx, SSL and first publish

**Files:**
- Modify: `warehouse-app/deploy_app.py`
- Create: `warehouse-app/deploy_catalog_nginx.py`

**Interfaces:**
- Consumes: everything above. `VPS_PASS` env var must be set in the shell running the scripts (never printed or committed).

- [ ] **Step 1: Make the app deploy skip catalog data and install dependencies**

In `warehouse-app/deploy_app.py`, replace the skip condition at the top of the upload loop:

```python
    if not file.is_file() or "node_modules" in file.parts or "__pycache__" in file.parts or "test" in file.parts or file.suffix == ".pyc" or file.name.endswith(".py"):
        continue
    if file.name in ("catalog.json", "catalog-published.json") or "catalog-media" in file.parts:
        continue
```

and in the final `exec_command` string insert `cd /var/www/warehouse.alramzybrothers.com && npm install --omit=dev --no-audit --no-fund && ` immediately before `pm2 restart warehouse --update-env`.

- [ ] **Step 2: Create the nginx setup script**

`warehouse-app/deploy_catalog_nginx.py`:

```python
import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

nginx = r"""server {
    listen 80;
    server_name catalog.alramzybrothers.com;
    root /var/www/catalog.alramzybrothers.com/site;
    index index.html;
    charset utf-8;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location = / { return 302 /ar/; }
    location /media/ {
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }
    location /assets/ {
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }
    location / {
        add_header Cache-Control "public, max-age=300";
        try_files $uri $uri/ =404;
    }
    error_page 404 /404.html;
}
"""

placeholder = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الرمزي إخوان</title></head><body style="font-family:sans-serif;text-align:center;padding:60px">الكتالوج قريباً</body></html>"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("147.93.40.224", username="root", password=os.environ["VPS_PASS"], timeout=20, allow_agent=False, look_for_keys=False)
sftp = client.open_sftp()
with sftp.file("/etc/nginx/sites-available/catalog.alramzybrothers.com", "w") as handle:
    handle.write(nginx)
sftp.close()

cmd = f"""
mkdir -p /var/www/catalog.alramzybrothers.com/site/ar
[ -f /var/www/catalog.alramzybrothers.com/site/ar/index.html ] || cat > /var/www/catalog.alramzybrothers.com/site/ar/index.html <<'EOF'
{placeholder}
EOF
ln -sfn /etc/nginx/sites-available/catalog.alramzybrothers.com /etc/nginx/sites-enabled/catalog.alramzybrothers.com
nginx -t && systemctl reload nginx
certbot --nginx -d catalog.alramzybrothers.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
nginx -t && systemctl reload nginx
curl -sI https://catalog.alramzybrothers.com/ar/ | head -n 1
"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=240)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
client.close()
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 4: Deploy the app**

Run (from `warehouse-app/`, with `VPS_PASS` set): `python deploy_app.py`
Expected: uploads include `catalog/` files and `public/catalog-admin.js`; no `catalog.json` or `catalog-media` upload lines; `npm install` completes; `pm2` shows `warehouse` online.

- [ ] **Step 5: Set up nginx and SSL**

Run (with `VPS_PASS` set): `python deploy_catalog_nginx.py`
Expected: `nginx -t` OK, certbot reports the certificate is deployed, last line `HTTP/1.1 200 OK`.

- [ ] **Step 6: First publish and verification**

In the warehouse app as super admin:
1. «الكتالوج» → add 2 brands and 2 sections → save.
2. Company data: logo, about (ar/en), WhatsApp number, phone, address → save.
3. Open 3 products → «كتالوج» → fill both languages, pick brand/section, upload 2+ images, publish switch on. On one product turn off «إظهار رقم القطعة» and «إظهار علامة متوفر».
4. Press «نشر الكتالوج».

Check on `https://catalog.alramzybrothers.com` (phone and desktop):
- `/` redirects to `/ar/`; EN switch keeps the same page.
- Home shows brand/section tiles and featured products.
- «كل الأصناف» search finds by name and by visible part number; brand/section filters work.
- Product page gallery swipes, thumbnails switch, tap opens zoom.
- «اسأل على واتساب» opens WhatsApp with name, part number and link.
- Add two products to «قائمة الطلب», change a quantity, send → one WhatsApp message with both.
- The product with hidden fields shows no part number and no availability badge, and `curl -s https://catalog.alramzybrothers.com/ar/p/<id>/ | findstr <part number>` returns nothing.
- Sell the last unit of a published product with availability shown; within 15 minutes the badge flips to «غير متوفر».
- A manager account without «الكتالوج» permission does not see the page or the product button, and `PUT /api/catalog/company` returns 403.

- [ ] **Step 7: Commit and push**

```bash
git add warehouse-app/deploy_app.py warehouse-app/deploy_catalog_nginx.py
git commit -m "Deploy the catalog site behind nginx with SSL"
git push origin main
```
