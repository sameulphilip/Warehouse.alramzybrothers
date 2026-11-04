const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 50000000;
const SIZES = [['lg', 1600, 82], ['sm', 480, 78]];

let sharpModule = null;
function getSharp() {
  if (!sharpModule) sharpModule = require('sharp');
  return sharpModule;
}

function isImageId(value) {
  return /^[a-f0-9]{16}$/.test(String(value || ''));
}

async function saveImage(buffer, mediaDir) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('الصورة فاضية');
  if (buffer.length > MAX_BYTES) throw new Error('الصورة أكبر من 8 ميجا');
  let meta;
  try {
    meta = await getSharp()(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch (error) {
    throw new Error('الملف مش صورة مقبولة');
  }
  if (!ALLOWED.has(meta.format)) throw new Error('المقبول JPG أو PNG أو WebP بس');
  const id = crypto.randomBytes(8).toString('hex');
  fs.mkdirSync(mediaDir, { recursive: true });
  try {
    for (const [size, width, quality] of SIZES) {
      await getSharp()(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
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
