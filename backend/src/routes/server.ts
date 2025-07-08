import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { serverRoutes } from './routes/server';
import { modRoutes } from './routes/mods';
import { worldRoutes } from './routes/world';
import { playerRoutes } from './routes/players';

const router = express.Router();
const execAsync = promisify(exec);

const MINECRAFT_PATH = process.env.MINECRAFT_PATH || '/opt/minecraft';
const SERVICE_NAME = 'minecraft-server';

// Get server status using systemd
router.get('/status', async (req, res) => {
  try {
    // Check if service is active
    const { stdout: activeState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    const isRunning = activeState.trim() === 'active';

    let uptime = '0m';
    let memory = '0 MB';
    let players = 0;

    if (isRunning) {
      try {
        // Get service status details
        const { stdout: statusOutput } = await execAsync(`systemctl show ${SERVICE_NAME} -p ActiveEnterTimestamp,MemoryCurrent`);
        
        // Parse uptime
        const activeEnterMatch = statusOutput.match(/ActiveEnterTimestamp=(.+)/);
        if (activeEnterMatch) {
          const startTime = new Date(activeEnterMatch[1]);
          const now = new Date();
          const uptimeMs = now.getTime() - startTime.getTime();
          const uptimeMinutes = Math.floor(uptimeMs / (1000 * 60));
          const hours = Math.floor(uptimeMinutes / 60);
          const minutes = uptimeMinutes % 60;
          uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }

        // Parse memory usage
        const memoryMatch = statusOutput.match(/MemoryCurrent=(\d+)/);
        if (memoryMatch) {
          const memoryBytes = parseInt(memoryMatch[1]);
          memory = `${Math.round(memoryBytes / 1024 / 1024)} MB`;
        }

        // Get player count from server logs if available
        try {
          const logPath = path.join(MINECRAFT_PATH, 'logs', 'latest.log');
          if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, 'utf-8');
            const playerMatches = logContent.match(/There are (\d+) of a max of \d+ players online/g);
            if (playerMatches && playerMatches.length > 0) {
              const lastMatch = playerMatches[playerMatches.length - 1];
              const playerCount = lastMatch.match(/There are (\d+)/);
              if (playerCount) {
                players = parseInt(playerCount[1]);
              }
            }
          }
        } catch (logError) {
          console.warn('Could not read player count from logs:', logError);
        }
      } catch (statusError) {
        console.warn('Could not get detailed status:', statusError);
      }
    }

    res.json({
      success: true,
      data: {
        running: isRunning,
        uptime,
        memory,
        players
      }
    });
  } catch (error) {
    console.error('Server status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get server status',
      data: {
        running: false,
        uptime: '0m',
        memory: '0 MB',
        players: 0
      }
    });
  }
});

// Start server using systemd
router.post('/start', async (req, res) => {
  try {
    // Check if already running
    const { stdout: activeState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    if (activeState.trim() === 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Server is already running' 
      });
    }

    // Start the service
    await execAsync(`systemctl start ${SERVICE_NAME}`);
    
    // Wait a moment and verify it started
    await new Promise(resolve => setTimeout(resolve, 2000));
    const { stdout: newState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    
    if (newState.trim() === 'active') {
      res.json({ 
        success: true, 
        message: 'Server started successfully' 
      });
    } else {
      // Get failure reason
      const { stdout: status } = await execAsync(`systemctl status ${SERVICE_NAME} --no-pager -l`);
      res.status(500).json({ 
        success: false, 
        message: 'Server failed to start',
        details: status
      });
    }
  } catch (error) {
    console.error('Server start error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start server',
      details: error.message
    });
  }
});

// Stop server using systemd
router.post('/stop', async (req, res) => {
  try {
    // Check if running
    const { stdout: activeState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    if (activeState.trim() !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Server is not running' 
      });
    }

    // Stop the service
    await execAsync(`systemctl stop ${SERVICE_NAME}`);
    
    // Wait a moment and verify it stopped
    await new Promise(resolve => setTimeout(resolve, 2000));
    const { stdout: newState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    
    if (newState.trim() === 'inactive') {
      res.json({ 
        success: true, 
        message: 'Server stopped successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Server failed to stop properly' 
      });
    }
  } catch (error) {
    console.error('Server stop error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to stop server',
      details: error.message
    });
  }
});

// Restart server using systemd
router.post('/restart', async (req, res) => {
  try {
    // Restart the service
    await execAsync(`systemctl restart ${SERVICE_NAME}`);
    
    // Wait a moment and verify it restarted
    await new Promise(resolve => setTimeout(resolve, 3000));
    const { stdout: newState } = await execAsync(`systemctl is-active ${SERVICE_NAME}`);
    
    if (newState.trim() === 'active') {
      res.json({ 
        success: true, 
        message: 'Server restarted successfully' 
      });
    } else {
      // Get failure reason
      const { stdout: status } = await execAsync(`systemctl status ${SERVICE_NAME} --no-pager -l`);
      res.status(500).json({ 
        success: false, 
        message: 'Server failed to restart',
        details: status
      });
    }
  } catch (error) {
    console.error('Server restart error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to restart server',
      details: error.message
    });
  }
});

// Get server logs
router.get('/logs', (req, res) => {
  try {
    const logPath = path.join(MINECRAFT_PATH, 'logs', 'latest.log');
    
    if (!fs.existsSync(logPath)) {
      return res.json({ success: true, data: [] });
    }

    const logs = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .slice(-100)
      .map(line => {
        const match = line.match(/\[([^\]]+)\] \[([^\]]+)\/([^\]]+)\]: (.+)/);
        if (match) {
          return {
            timestamp: match[1],
            thread: match[2],
            level: match[3],
            message: match[4]
          };
        }
        return {
          timestamp: new Date().toISOString(),
          thread: 'Server',
          level: 'INFO',
          message: line
        };
      });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ success: false, message: 'Failed to read logs' });
  }
});

export { router as serverRoutes };
