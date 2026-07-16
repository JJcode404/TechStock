/**
 * Multer file-upload configuration for product images.
 *
 * - Stores files on disk under UPLOAD_DIR with a random, collision-free name.
 * - Restricts to image mime types and enforces the configured size limit.
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { BadRequestError } from '../errors/index.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!existsSync(uploadRoot)) mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});
