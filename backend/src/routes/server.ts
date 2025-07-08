import express from 'express';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const MINECRAFT_PATH = process.env.MINECRAFT_PATH || '/opt/minecraft';
const SERVER_JAR = 'fabric-server-launch.jar';

let serverProcess: any = null;

// Get server status
router.get('/status', (req, res) => {
  const isRunning = serverProcess && !serverProcess.killed;
  
  let uptime = '0m';
  let memory = '0 MB';
  let players = 0;

  if (isRunning && serverProcess.pid) {
    try {
      // Get process info
      exec(`ps -p ${serverProcess.pid} -o etime,rss --no-headers`, (error, stdout) => {
        if (!error && stdout) {
          const [time, rss] = stdout.trim().split(/\s+/);
          uptime = time;
          memory = `${Math.round(parseInt(rss) / 1024)} MB`;
        }
      });
    } catch (error) {
      console.error('Error getting process info:', error);
    }
  }

  res.json({
    success: true,
    data: {
      running: isRunning,
      pid: serverProcess?.pid,
      uptime,
      memory,
      players
    }
  });
});

// Start server
router.post('/start', (req, res) => {
  if (serverProcess && !serverProcess.killed) {
    return res.status(400).json({ success: false, message: 'Server is already running' });
  }

  try {
    const serverJarPath = path.join(MINECRAFT_PATH, SERVER_JAR);
    
    if (!fs.existsSync(serverJarPath)) {
      return res.status(400).json({ success: false, message: 'Server jar not found' });
    }

    serverProcess = spawn('java', ['-Xmx2G', '-Xms1G', '-jar', SERVER_JAR, 'nogui'], {
      cwd: MINECRAFT_PATH,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.on('error', (error: any) => {
      console.error('Server start error:', error);
      res.status(500).json({ success: false, message: 'Failed to start server' });
    });

    serverProcess.on('spawn', () => {
      console.log('Minecraft server started with PID:', serverProcess.pid);
      res.json({ success: true, message: 'Server started successfully' });
    });

    serverProcess.on('exit', (code: number) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });

  } catch (error) {
    console.error('Server start error:', error);
    res.status(500).json({ success: false, message: 'Failed to start server' });
  }
});

// Stop server
router.post('/stop', (req, res) => {
  if (!serverProcess || serverProcess.killed) {
    return res.status(400).json({ success: false, message: 'Server is not running' });
  }

  try {
    serverProcess.stdin.write('stop\n');
    
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
    }, 10000);

    res.json({ success: true, message: 'Server stop command sent' });
  } catch (error) {
    console.error('Server stop error:', error);
    res.status(500).json({ success: false, message: 'Failed to stop server' });
  }
});

// Restart server
router.post('/restart', async (req, res) => {
  try {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.stdin.write('stop\n');
      
      await new Promise(resolve => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGTERM');
          }
          resolve(null);
        }, 10000);
      });
    }

    // Start server again
    setTimeout(() => {
      const serverJarPath = path.join(MINECRAFT_PATH, SERVER_JAR);
      
      serverProcess = spawn('java', ['-Xmx2G', '-Xms1G', '-jar', SERVER_JAR, 'nogui'], {
        cwd: MINECRAFT_PATH,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      serverProcess.on('error', (error: any) => {
        console.error('Server restart error:', error);
      });

      serverProcess.on('exit', (code: number) => {
        console.log(`Server exited with code ${code}`);
        serverProcess = null;
      });
    }, 2000);

    res.json({ success: true, message: 'Server restart initiated' });
  } catch (error) {
    console.error('Server restart error:', error);
    res.status(500).json({ success: false, message: 'Failed to restart server' });
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
        const match = line.match(/\[([^\]]+)\] \[([^\]]+)\]: (.+)/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3]
          };
        }
        return {
          timestamp: new Date().toISOString(),
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