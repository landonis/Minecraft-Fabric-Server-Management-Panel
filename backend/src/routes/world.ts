
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import authenticateToken from '../middleware/auth';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/minecraft-imports');
  },
  filename: (req, file, cb) => {
    cb(null, 'imported_world.tar');
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname) !== '.tar') {
      return cb(new Error('Only .tar files are allowed'), false);
    }
    cb(null, true);
  },
});

router.post('/upload', authenticateToken, upload.single('world'), async (req, res) => {
  try {
    const tarPath = '/tmp/minecraft-imports/imported_world.tar';
    const extractPath = process.env.WORLD_PATH;

    if (!extractPath) {
      return res.status(500).json({ error: 'WORLD_PATH not defined in environment' });
    }

    await new Promise((resolve, reject) => {
      exec(`tar -xvf ${tarPath} -C ${extractPath} --strip-components=1`, (error, stdout, stderr) => {
        if (error) {
          console.error('Extract error:', stderr);
          reject(error);
        } else {
          console.log('Extracted:', stdout);
          resolve(true);
        }
      });
    });

    res.json({ message: 'World imported successfully' });
  } catch (error) {
    console.error('World upload failed:', error);
    res.status(500).json({ error: 'Failed to import world' });
  }
});

export default router;
