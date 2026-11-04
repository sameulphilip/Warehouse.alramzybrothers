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
  const jpeg = await blank(2400, 1200).jpeg().withExif({ IFD0: { Copyright: 'secret-owner' } }).toBuffer();
  assert.ok((await sharp(jpeg).metadata()).exif, 'input must carry EXIF');
  const id = await saveImage(jpeg, dir);
  assert.equal(isImageId(id), true);
  const large = await sharp(path.join(dir, `${id}-lg.webp`)).metadata();
  const small = await sharp(path.join(dir, `${id}-sm.webp`)).metadata();
  assert.equal(large.format, 'webp');
  assert.equal(large.width, 1600);
  assert.equal(large.exif, undefined);
  assert.equal(small.width, 480);
  assert.equal(small.exif, undefined);
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
