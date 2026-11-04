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
      if (error.status) {
        res.status(error.status).json({ error: error.message || 'تعذر تنفيذ الطلب' });
      } else if (/[\u0600-\u06FF]/.test(String(error.message || ''))) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('catalog', error);
        res.status(500).json({ error: 'تعذر تنفيذ الطلب' });
      }
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
    record(req, { action: 'catalog', detail: `إزالة صنف ${id} من الكتالوج`, ref: `product:${id}` });
    if (removed) {
      try {
        removed.images.forEach((imageId) => deleteImage(imageId, mediaDir));
      } catch (error) {
        console.error('catalog media cleanup', error);
      }
    }
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
    record(req, { action: 'catalog', detail: `حذف صورة من كتالوج صنف ${id}`, ref: `product:${id}` });
    try {
      deleteImage(imageId, mediaDir);
    } catch (error) {
      console.error('catalog media cleanup', error);
    }
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
    let company;
    try {
      company = store.update((catalog) => {
        previous = catalog.company.logoId;
        catalog.company.logoId = imageId;
        return catalog.company;
      });
    } catch (error) {
      deleteImage(imageId, mediaDir);
      throw error;
    }
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
