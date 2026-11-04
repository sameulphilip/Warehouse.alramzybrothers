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
  const hooks = { onBuild: null };
  const make = () => createPublisher({
    store,
    snapshotFile: path.join(dir, 'catalog-published.json'),
    mediaDir: dir, siteDir: path.join(dir, 'site'), baseUrl: 'https://c.test', logoFallback: 'logo.png',
    loadProducts: async (ids) => new Map(ids.map((id) => [id, { name: `p${id}`, code: '' }])),
    loadAvailability: async (ids) => new Map(ids.map((id) => [id, Boolean(state.availability.get(id))])),
    build: async (args) => {
      builds.push(args);
      if (hooks.onBuild) await hooks.onBuild(args);
      return { buildId: 'x', products: 1, pages: 3 };
    }
  });
  const publisher = make();
  return { dir, store, builds, state, hooks, publisher, make };
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

test('publish during a refresh waits and then publishes the latest catalog', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  s.state.availability.set(1, false);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let entered;
  const enteredBuild = new Promise((resolve) => { entered = resolve; });
  s.hooks.onBuild = async () => { entered(); await gate; };
  const refresh = s.publisher.refreshAvailability();
  await enteredBuild;
  s.hooks.onBuild = null;
  s.store.update((data) => { data.items['1'].nameAr = 'جديد'; });
  const p1 = s.publisher.publish();
  const p2 = s.publisher.publish();
  release();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(await refresh, true);
  assert.equal(r1, r2);
  assert.equal(s.builds.length, 3);
  assert.equal(s.builds[2].catalog.items['1'].nameAr, 'جديد');
  assert.equal(JSON.parse(fs.readFileSync(path.join(s.dir, 'catalog-published.json'), 'utf8')).items['1'].nameAr, 'جديد');
});

test('publish writes the snapshot before building', async () => {
  const s = setup([[1, true]]);
  let seen = null;
  s.hooks.onBuild = async () => {
    seen = JSON.parse(fs.readFileSync(path.join(s.dir, 'catalog-published.json.next'), 'utf8'));
  };
  await s.publisher.publish();
  assert.ok(seen);
  assert.equal(seen.items['1'].nameAr, 'منشور');
});

const snapshotPath = (s) => path.join(s.dir, 'catalog-published.json');
const readSnap = (s) => JSON.parse(fs.readFileSync(snapshotPath(s), 'utf8'));

test('a failed build leaves the previous snapshot unchanged and removes the temp file', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  s.store.update((data) => { data.items['1'].nameAr = 'تعديل جديد'; });
  s.hooks.onBuild = async () => { throw new Error('build failed'); };
  await assert.rejects(s.publisher.publish(), /build failed/);
  assert.equal(readSnap(s).items['1'].nameAr, 'منشور');
  assert.equal(fs.existsSync(`${snapshotPath(s)}.next`), false);
  assert.equal(fs.existsSync(`${snapshotPath(s)}.tmp`), false);
});

test('forget removes an item or one image from the snapshot', async () => {
  const s = setup([[1, true]]);
  s.store.update((data) => { data.items['1'].images = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb']; });
  s.store.update((data) => { data.items['3'] = { ...defaultItem(3), published: true }; });
  await s.publisher.publish();
  s.publisher.forget(1, 'aaaaaaaaaaaaaaaa');
  assert.deepEqual(readSnap(s).items['1'].images, ['bbbbbbbbbbbbbbbb']);
  s.publisher.forget(3);
  assert.equal(readSnap(s).items['3'], undefined);
  assert.ok(readSnap(s).items['1']);
  s.publisher.forget(99);
  s.publisher.forget(99, 'aaaaaaaaaaaaaaaa');
  assert.equal(fs.existsSync(`${snapshotPath(s)}.tmp`), false);
});

test('forget does nothing when there is no snapshot', () => {
  const s = setup([[1, true]]);
  assert.doesNotThrow(() => s.publisher.forget(1));
  assert.doesNotThrow(() => s.publisher.forget(1, 'aaaaaaaaaaaaaaaa'));
  assert.equal(fs.existsSync(snapshotPath(s)), false);
});

test('a refresh after forget rebuilds without the deleted item', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  s.store.update((data) => { delete data.items['1']; });
  s.publisher.forget(1);
  s.state.availability.set(1, false);
  assert.equal(await s.publisher.refreshAvailability(), true);
  assert.equal(s.builds.at(-1).catalog.items['1'], undefined);
});

test('forget also removes the item from a snapshot that is still being built', async () => {
  const s = setup([[1, true]]);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let entered;
  const enteredBuild = new Promise((resolve) => { entered = resolve; });
  s.hooks.onBuild = async () => { entered(); await gate; };
  const publishing = s.publisher.publish();
  await enteredBuild;
  s.publisher.forget(1);
  release();
  await publishing;
  assert.equal(readSnap(s).items['1'], undefined);
});

test('a new publisher after a publish does not rebuild when availability is unchanged', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  assert.equal(s.store.load().availabilitySignature, JSON.stringify([[1, true]]));
  const restarted = s.make();
  assert.equal(await restarted.refreshAvailability(), false);
  assert.equal(s.builds.length, 1);
  s.state.availability.set(1, false);
  assert.equal(await restarted.refreshAvailability(), true);
  assert.equal(s.builds.length, 2);
  assert.equal(s.store.load().availabilitySignature, JSON.stringify([[1, false]]));
});

test('a failed availability query stores an Arabic error and rejects', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  let fail = true;
  const publisher = createPublisher({
    store: s.store, snapshotFile: snapshotPath(s), mediaDir: s.dir, siteDir: path.join(s.dir, 'site'), baseUrl: '', logoFallback: '',
    loadProducts: async (ids) => new Map(ids.map((id) => [id, { name: 'p', code: '' }])),
    loadAvailability: async (ids) => { if (fail) throw new Error('sql down'); return new Map(ids.map((id) => [id, true])); },
    build: async () => ({ buildId: 'x', products: 1, pages: 1 })
  });
  await assert.rejects(publisher.refreshAvailability(), /sql down/);
  assert.equal(s.store.load().lastError, 'تعذر تحديث التوفر من قاعدة البيانات');
  fail = false;
  await publisher.refreshAvailability();
  assert.equal(s.store.load().lastError, '');
});

test('a failed refresh rebuild stores the error and rejects', async () => {
  const s = setup([[1, true]]);
  await s.publisher.publish();
  s.state.availability.set(1, false);
  s.hooks.onBuild = async () => { throw new Error('rebuild boom'); };
  await assert.rejects(s.publisher.refreshAvailability(), /rebuild boom/);
  assert.equal(s.store.load().lastError, 'rebuild boom');
});
