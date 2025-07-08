import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const router = express.Router();

const WORLD_PATH = process.env.WORLD_PATH || '/opt/minecraft/world';
const BACKUP_PATH = process.env.BACKUP_PATH || '/opt/minecraft/backups';

// Ensure directories exist
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, BACKUP_PATH);
  },
  filename: (req, file, cb) => {
    cb(null, `world_import_${Date.now()}.tar`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.tar')) {
      cb(null, true);
    } else {
      cb(new Error('Only .tar files are allowed'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Export world
router.get('/export', (req, res) => {
  try {
    if (!fs.existsSync(WORLD_PATH)) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const archiveName = `world-backup-${timestamp}.tar`;
    const archivePath = path.join(BACKUP_PATH, archiveName);

    // Create tar archive
    const tar = spawn('tar', ['-cf', archivePath, '-C', path.dirname(WORLD_PATH), path.basename(WORLD_PATH)]);

    tar.on('error', (error) => {
      console.error('Tar error:', error);
      res.status(500).json({ success: false, message: 'Failed to create archive' });
    });

    tar.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ success: false, message: 'Failed to create archive' });
      }

      // Send file and clean up
      res.download(archivePath, archiveName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        
        // Clean up temporary file
        setTimeout(() => {
          if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
          }
        }, 5000);
      });
    });

  } catch (error) {
    console.error('World export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export world' });
  }
});

// Import world
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { filename } = req.file;
    const archivePath = path.join(BACKUP_PATH, filename);

    // Backup existing world
    if (fs.existsSync(WORLD_PATH)) {
      const backupName = `world_backup_${Date.now()}`;
      const backupPath = path.join(BACKUP_PATH, backupName);
      fs.renameSync(WORLD_PATH, backupPath);
    }

    // Extract tar archive
    const tar = spawn('tar', ['-xf', archivePath, '-C', path.dirname(WORLD_PATH)]);

    tar.on('error', (error) => {
      console.error('Tar extract error:', error);
      res.status(500).json({ success: false, message: 'Failed to extract archive' });
    });

    tar.on('close', (code) => {
      // Clean up uploaded file
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }

      if (code !== 0) {
        return res.status(500).json({ success: false, message: 'Failed to extract archive' });
      }

      res.json({ success: true, message: 'World imported successfully' });
    });

  } catch (error) {
    console.error('World import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import world' });
  }
});

export { router as worldRoutes };