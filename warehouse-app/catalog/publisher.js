const fs = require('fs');
const path = require('path');
const { buildSite } = require('./build');

function publishedIds(catalog) {
  return Object.values(catalog.items).filter((item) => item.published).map((item) => Number(item.productId));
}

const AVAILABILITY_ERROR = 'تعذر تحديث التوفر من قاعدة البيانات';

function signature(map) {
  return JSON.stringify([...map.entries()].sort((a, b) => a[0] - b[0]));
}

function createPublisher({ store, snapshotFile, mediaDir, siteDir, baseUrl, logoFallback, loadProducts, loadAvailability, build = buildSite }) {
  let running = null;
  let runningIsPublish = false;
  let pendingPublish = null;
  let lastSignature = store.load().availabilitySignature || null;
  const nextFile = `${snapshotFile}.next`;

  function readSnapshot() {
    try {
      return JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data));
    fs.renameSync(temp, file);
  }

  function removeQuietly(file) {
    try {
      fs.unlinkSync(file);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('catalog snapshot cleanup', error.message);
    }
  }

  async function run(catalog, fromSnapshot) {
    if (!fromSnapshot) writeJson(nextFile, catalog);
    const ids = publishedIds(catalog);
    const [products, availability] = await Promise.all([loadProducts(ids), loadAvailability(ids)]);
    let result;
    try {
      result = await build({ catalog, products, availability, mediaDir, siteDir, baseUrl, logoFallback });
      if (!fromSnapshot) fs.renameSync(nextFile, snapshotFile);
    } catch (error) {
      if (!fromSnapshot) removeQuietly(nextFile);
      throw error;
    }
    const currentSignature = signature(availability);
    lastSignature = currentSignature;
    if (fromSnapshot) {
      store.update((data) => { data.availabilitySignature = currentSignature; });
      return { ...result, publishedAt: store.load().publishedAt };
    }
    const publishedAt = new Date().toISOString();
    store.update((data) => {
      data.publishedAt = publishedAt;
      data.lastError = '';
      data.availabilitySignature = currentSignature;
    });
    return { ...result, publishedAt };
  }

  function forgetIn(file, productId, imageId) {
    let snapshot;
    try {
      snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    const key = String(productId);
    if (!snapshot.items || !snapshot.items[key]) return;
    if (imageId === undefined) {
      delete snapshot.items[key];
    } else {
      const images = snapshot.items[key].images || [];
      if (!images.includes(imageId)) return;
      snapshot.items[key].images = images.filter((id) => id !== imageId);
    }
    writeJson(file, snapshot);
  }

  function forget(productId, imageId) {
    forgetIn(snapshotFile, productId, imageId);
    forgetIn(nextFile, productId, imageId);
  }
  function start(catalog, fromSnapshot) {
    runningIsPublish = !fromSnapshot;
    running = run(catalog, fromSnapshot)
      .catch((error) => {
        store.update((data) => { data.lastError = error.message || 'تعذر نشر الكتالوج'; });
        throw error;
      })
      .finally(() => { running = null; });
    return running;
  }

  function publish() {
    if (pendingPublish) return pendingPublish;
    if (!running) return start(store.load(), false);
    if (runningIsPublish) return running;
    const waiting = running;
    const next = (async () => {
      try { await waiting; } catch (error) { /* refresh failure must not block the publish */ }
      return start(store.load(), false);
    })();
    pendingPublish = next;
    const clear = () => { if (pendingPublish === next) pendingPublish = null; };
    next.then(clear, clear);
    return next;
  }

  async function refreshAvailability() {
    if (running || pendingPublish) return false;
    const snapshot = readSnapshot();
    if (!snapshot || !store.load().publishedAt) return false;
    let availability;
    try {
      availability = await loadAvailability(publishedIds(snapshot));
    } catch (error) {
      store.update((data) => { data.lastError = AVAILABILITY_ERROR; });
      throw error;
    }
    if (store.load().lastError === AVAILABILITY_ERROR) store.update((data) => { data.lastError = ''; });
    if (lastSignature !== null && signature(availability) === lastSignature) return false;
    if (running || pendingPublish) return false;
    await start(snapshot, true);
    return true;
  }

  return { publish, refreshAvailability, forget };
}

module.exports = { createPublisher };
