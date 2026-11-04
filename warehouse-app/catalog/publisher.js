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
  let runningIsPublish = false;
  let pendingPublish = null;
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
    if (!fromSnapshot) writeSnapshot(catalog);
    const result = await build({ catalog, products, availability, mediaDir, siteDir, baseUrl, logoFallback });
    lastSignature = signature(availability);
    if (fromSnapshot) return { ...result, publishedAt: store.load().publishedAt };
    const publishedAt = new Date().toISOString();
    store.update((data) => {
      data.publishedAt = publishedAt;
      data.lastError = '';
    });
    return { ...result, publishedAt };
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
    const availability = await loadAvailability(publishedIds(snapshot));
    if (lastSignature !== null && signature(availability) === lastSignature) return false;
    if (running || pendingPublish) return false;
    await start(snapshot, true);
    return true;
  }

  return { publish, refreshAvailability };
}

module.exports = { createPublisher };
