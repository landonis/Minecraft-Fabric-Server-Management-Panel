import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

const WORLD_PATH = process.env.WORLD_PATH || '/opt/minecraft/world';
const BACKUP_PATH = process.env.BACKUP_PATH || '/opt/minecraft/backups';
const TEMP_PATH = process.env.TEMP_PATH || '/tmp/minecraft-imports';
const SERVICE_NAME = 'minecraft-server';

// Ensure directories exist
[BACKUP_PATH, TEMP_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_PATH);
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

// Get world info
router.get('/info', (req, res) => {
  try {
    if (!fs.existsSync(WORLD_PATH)) {
      return res.json({
        success: true,
        data: {
          exists: false,
          name: 'No world found',
          size: 0
        }
      });
    }

    // Get world size
    const getDirectorySize = (dirPath: string): number => {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    };

    const worldSize = getDirectorySize(WORLD_PATH);
    const worldName = path.basename(WORLD_PATH);

    res.json({
      success: true,
      data: {
        exists: true,
        name: worldName,
        size: worldSize,
        sizeFormatted: formatFileSize(worldSize)
      }
    });
  } catch (error) {
    console.error('World info error:', error);
    res.status(500).json({ success: false, message: 'Failed to get world info' });
  }
});

// Export world
router.get('/export', async (req, res) => {
  try {
    if (!fs.existsSync(WORLD_PATH)) {
      return res.status(404).json({ success: false, message: 'World not found' });
    }

    // Check if server is running and warn user
    try {
      const { stdout: activeState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
      if (activeState.trim() === 'active') {
        console.warn('Warning: Exporting world while server is running');
      }
    } catch (error) {
      // Service might not exist yet, continue
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
router.post('/import', upload.single('file'), async (req, res) => {
  let tempExtractPath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { filename } = req.file;
    const archivePath = path.join(TEMP_PATH, filename);

    // Create temporary extraction directory
    tempExtractPath = path.join(TEMP_PATH, `extract_${Date.now()}`);
    fs.mkdirSync(tempExtractPath, { recursive: true });

    // Extract tar archive to temp directory
    const extractResult = await new Promise<boolean>((resolve) => {
      const tar = spawn('tar', ['-xf', archivePath, '-C', tempExtractPath!]);
      
      tar.on('error', (error) => {
        console.error('Tar extract error:', error);
        resolve(false);
      });

      tar.on('close', (code) => {
        resolve(code === 0);
      });
    });

    // Clean up uploaded file
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }

    if (!extractResult) {
      return res.status(500).json({ success: false, message: 'Failed to extract archive' });
    }

    // Validate extracted content
    const extractedFiles = fs.readdirSync(tempExtractPath);
    let worldFolder: string | null = null;

    // Look for world folder (might be nested)
    for (const item of extractedFiles) {
      const itemPath = path.join(tempExtractPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        const levelDatPath = path.join(itemPath, 'level.dat');
        if (fs.existsSync(levelDatPath)) {
          worldFolder = itemPath;
          break;
        }
      }
    }

    if (!worldFolder) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid world archive: level.dat not found' 
      });
    }

    // Stop server before replacing world
    let wasRunning = false;
    try {
      const { stdout: activeState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
      wasRunning = activeState.trim() === 'active';
      
      if (wasRunning) {
        console.log('Stopping server for world import...');
        await execAsync(`systemctl stop ${SERVICE_NAME}`);
        
        // Wait for server to fully stop
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.warn('Could not check/stop server:', error);
    }

    // Backup existing world if it exists
    if (fs.existsSync(WORLD_PATH)) {
      const backupName = `world_backup_${Date.now()}`;
      const backupPath = path.join(BACKUP_PATH, backupName);
      fs.renameSync(WORLD_PATH, backupPath);
      console.log(`Existing world backed up to: ${backupPath}`);
    }

    // Move new world into place
    fs.renameSync(worldFolder, WORLD_PATH);

    // Restart server if it was running
    if (wasRunning) {
      console.log('Restarting server after world import...');
      try {
        await execAsync(`systemctl start ${SERVICE_NAME}`);
      } catch (error) {
        console.error('Failed to restart server:', error);
      }
    }

    res.json({ 
      success: true, 
      message: 'World imported successfully' + (wasRunning ? ' and server restarted' : '') 
    });

  } catch (error) {
    console.error('World import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import world' });
  } finally {
    // Clean up temporary extraction directory
    if (tempExtractPath && fs.existsSync(tempExtractPath)) {
      try {
        fs.rmSync(tempExtractPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to clean up temp directory:', cleanupError);
      }
    }
  }
});

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export { router as worldRoutes };