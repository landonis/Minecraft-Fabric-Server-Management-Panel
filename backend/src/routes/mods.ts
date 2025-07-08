import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database/init';

const router = express.Router();

const MODS_PATH = process.env.MODS_PATH || '/opt/minecraft/mods';

// Ensure mods directory exists
if (!fs.existsSync(MODS_PATH)) {
  fs.mkdirSync(MODS_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MODS_PATH);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const filename = `${name}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.jar')) {
      cb(null, true);
    } else {
      cb(new Error('Only .jar files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload mod
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { filename, originalname, size } = req.file;

    // Insert into database
    const result = db.prepare(
      'INSERT INTO mods (filename, original_name, size) VALUES (?, ?, ?)'
    ).run(filename, originalname, size);

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        filename,
        originalName: originalname,
        size,
        active: true,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Mod upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload mod' });
  }
});

// Get all mods
router.get('/', (req, res) => {
  try {
    const mods = db.prepare(
      'SELECT id, filename, original_name, size, active, uploaded_at FROM mods ORDER BY uploaded_at DESC'
    ).all();

    const result = mods.map(mod => ({
      id: mod.id,
      filename: mod.original_name,
      size: mod.size,
      active: mod.active === 1,
      uploadedAt: mod.uploaded_at
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching mods:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mods' });
  }
});

// Delete mod
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get mod info
    const mod = db.prepare('SELECT filename FROM mods WHERE id = ?').get(id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Mod not found' });
    }

    // Delete file
    const filePath = path.join(MODS_PATH, mod.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    db.prepare('DELETE FROM mods WHERE id = ?').run(id);

    res.json({ success: true, message: 'Mod deleted successfully' });
  } catch (error) {
    console.error('Error deleting mod:', error);
    res.status(500).json({ success: false, message: 'Failed to delete mod' });
  }
});

export { router as modRoutes };