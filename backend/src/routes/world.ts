import express from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import authenticateToken from '../middleware/auth';
import { exec } from 'child_process';

const router = express.Router();

// Configure multer to accept only .tar files
const upload = multer({
  dest: '/tmp/minecraft-imports',
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (!file.originalname.endsWith('.tar')) {
      cb(new Error('Only .tar files are allowed'));
    } else {
      cb(null, true);
    }
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

    // Remove existing world directory (be careful in production)
    if (fs.existsSync(minecraftWorldDir)) {
      fs.rmSync(minecraftWorldDir, { recursive: true, force: true });
    }

    fs.mkdirSync(minecraftWorldDir, { recursive: true });

    // Extract uploaded world .tar
    exec(`tar -xvf ${tempFilePath} -C ${minecraftWorldDir}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Extraction error:', error);
        return res.status(500).json({ error: 'Failed to extract world file' });
      }

      fs.unlinkSync(tempFilePath);
      res.json({ message: 'World uploaded and extracted successfully' });
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
