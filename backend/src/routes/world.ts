import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authenticateToken  from '../middleware/auth';
import { exec } from 'child_process';

const router = express.Router();

// Configure multer to store .tar files in /tmp/minecraft-imports
const upload = multer({
  dest: '/tmp/minecraft-imports',
  fileFilter: (req, file, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!file.originalname.endsWith('.tar')) {
      return cb(new Error('Only .tar files are allowed'), false);
    }
    cb(null, true);
  }
});

// POST /api/world/upload
router.post('/upload', authenticateToken, upload.single('world'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const minecraftWorldDir = process.env.WORLD_PATH || '/home/ubuntu/Minecraft/world';
    const tempFilePath = file.path;

    // Remove existing world directory (backup first in production)
    if (fs.existsSync(minecraftWorldDir)) {
      fs.rmSync(minecraftWorldDir, { recursive: true, force: true });
    }

    // Create target directory
    fs.mkdirSync(minecraftWorldDir, { recursive: true });

    // Extract .tar file
    exec(`tar -xvf ${tempFilePath} -C ${minecraftWorldDir}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Extraction error:', error);
        return res.status(500).json({ error: 'Failed to extract world file' });
      }

      // Remove uploaded file
      fs.unlinkSync(tempFilePath);

      res.json({ message: 'World uploaded and extracted successfully' });
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
