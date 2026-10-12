import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { env } from './config.js';
import { httpError } from './http.js';

fs.mkdirSync(env.portraitDir, { recursive: true });
fs.mkdirSync(env.prizeDir, { recursive: true });

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(httpError(400, 'Bilden behöver vara jpg, png eller webp.'));
      return;
    }
    cb(null, true);
  },
});

export async function saveImage(file, directory, filename) {
  if (!file) throw httpError(400, 'En bild saknas.');
  const dest = path.join(directory, filename);
  await sharp(file.buffer)
    .rotate()
    .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toFile(dest);
  return dest;
}

export function removeFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}
