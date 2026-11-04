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
    specs: '',
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
    specs: text(body.specs, 2000),
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
