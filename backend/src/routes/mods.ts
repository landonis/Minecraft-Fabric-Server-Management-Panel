import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import authenticateToken from '../middleware/auth';

const router = express.Router();

const MODS_PATH = process.env.MODS_PATH || '/opt/minecraft/mods';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MODS_PATH);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname) !== '.jar') {
      return cb(new Error('Only .jar files are allowed') as unknown as null, false);
    }
    cb(null, true);
  }
});

router.get('/', authenticateToken, async (_req, res) => {
  const mods = await db.prepare('SELECT * FROM mods').all();
  res.json(mods);
});

router.post('/', authenticateToken, upload.single('mod'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Mod file is required' });

  const { originalname, filename, size } = req.file;
  const id = uuidv4();
  const uploaded_at = new Date().toISOString();

  await db.prepare(
    'INSERT INTO mods (id, original_name, filename, size, active, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, originalname, filename, size, 1, uploaded_at);

  res.json({ success: true, id });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const modRow = await db.prepare('SELECT * FROM mods WHERE id = ?').get(id);
  const mod = modRow as { filename: string } | undefined;

  if (!mod) return res.status(404).json({ error: 'Mod not found' });

  const filePath = path.join(MODS_PATH, mod.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.prepare('DELETE FROM mods WHERE id = ?').run(id);

  res.json({ success: true });
});

export default router;
