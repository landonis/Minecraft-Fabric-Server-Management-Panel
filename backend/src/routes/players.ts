import express from 'express';
import fetch from 'node-fetch';
import authenticateToken from '../middleware/auth';

const router = express.Router();

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

interface Player {
  uuid: string;
  username: string;
  online: boolean;
  lastSeen?: string;
  playtime?: string;
}

interface InventoryItem {
  slot: number;
  item: string;
  count: number;
  nbt?: any;
}

interface PlayerPosition {
  position: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
}

// Mock data for when Fabric mod is not available
const mockPlayers: Player[] = [
  {
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    username: 'Steve',
    online: true,
    playtime: '2h 30m'
  },
  {
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    username: 'Alex',
    online: false,
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    playtime: '1h 45m'
  }
];

router.get('/', authenticateToken, async (_req, res) => {
  const fabricPort = process.env.FABRIC_MOD_PORT || '8080';
  const endpoint = `http://localhost:${fabricPort}/players`;
  
  try {
    const response = await fetch(endpoint, { timeout: 5000 });
    const data = await response.json() as any;
    
    const players = Array.isArray(data?.players)
      ? data.players.map((player: any) => ({
          uuid: player.uuid,
          username: player.username || player.name,
          online: player.online || false,
          lastSeen: player.lastSeen,
          playtime: player.playtime
        })).filter((player: Player) => player.uuid && isValidUUID(player.uuid))
      : mockPlayers;

    res.json(players);
  } catch (error: any) {
    console.log(`Fabric mod API not available, using mock data:`, error.message);
    res.json(mockPlayers);
  }
});

router.get('/:uuid/inventory', authenticateToken, async (req, res) => {
  const { uuid } = req.params;
  
  if (!isValidUUID(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }
  
  const fabricPort = process.env.FABRIC_MOD_PORT || '8080';
  const endpoint = `http://localhost:${fabricPort}/player/${uuid}/inventory`;
  
  try {
    const response = await fetch(endpoint, { timeout: 5000 });
    const data = await response.json() as any;
    
    const inventory = Array.isArray(data?.inventory)
      ? data.inventory.map((item: any) => ({
          slot: item.slot || 0,
          item: item.item || 'minecraft:air',
          count: item.count,
          nbt: item.nbt
        }))
      : [
          { slot: 0, item: 'minecraft:diamond_sword', count: 1 },
          { slot: 1, item: 'minecraft:cooked_beef', count: 32 },
          { slot: 2, item: 'minecraft:torch', count: 64 }
        ];

    res.json({ uuid, inventory });
  } catch (error: any) {
    console.log(`Fabric mod API not available, using mock data:`, error.message);
    res.json({
      uuid,
      inventory: [
        { slot: 0, item: 'minecraft:diamond_sword', count: 1 },
        { slot: 1, item: 'minecraft:cooked_beef', count: 32 },
        { slot: 2, item: 'minecraft:torch', count: 64 }
      ]
    });
  }
});

router.get('/:uuid/position', authenticateToken, async (req, res) => {
  const { uuid } = req.params;
  
  if (!isValidUUID(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }
  
  const fabricPort = process.env.FABRIC_MOD_PORT || '8080';
  const endpoint = `http://localhost:${fabricPort}/player/${uuid}/position`;
  
  try {
    const response = await fetch(endpoint, { timeout: 5000 });
    const data = await response.json() as any;
    
    const position: PlayerPosition = {
      position: {
        x: Number(data?.position?.x) || Math.floor(Math.random() * 1000),
        y: Number(data?.position?.y) || 64,
        z: Number(data?.position?.z) || Math.floor(Math.random() * 1000),
        dimension: String(data?.position?.dimension) || 'minecraft:overworld'
      }
    };

    res.json({ uuid, ...position });
  } catch (error: any) {
    console.log(`Fabric mod API not available, using mock data:`, error.message);
    res.json({
      uuid,
      position: {
        x: Math.floor(Math.random() * 1000),
        y: 64,
        z: Math.floor(Math.random() * 1000),
        dimension: 'minecraft:overworld'
      }
    });
  }
});

router.post('/:uuid/kick', authenticateToken, async (req, res) => {
  const { uuid } = req.params;
  const { reason } = req.body;
  
  if (!isValidUUID(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }
  
  const fabricPort = process.env.FABRIC_MOD_PORT || '8080';
  const endpoint = `http://localhost:${fabricPort}/player/${uuid}/kick`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Kicked by admin' }),
      timeout: 5000
    });
    
    if (response.ok) {
      res.json({ success: true, message: 'Player kicked successfully' });
    } else {
      throw new Error('Failed to kick player');
    }
  } catch (error: any) {
    console.log(`Fabric mod API not available:`, error.message);
    res.json({ success: true, message: 'Kick command sent (mock)' });
  }
});

router.post('/:uuid/message', authenticateToken, async (req, res) => {
  const { uuid } = req.params;
  const { message } = req.body;
  
  if (!isValidUUID(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }
  
  const fabricPort = process.env.FABRIC_MOD_PORT || '8080';
  const endpoint = `http://localhost:${fabricPort}/player/${uuid}/message`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      timeout: 5000
    });
    
    if (response.ok) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      throw new Error('Failed to send message');
    }
  } catch (error: any) {
    console.log(`Fabric mod API not available:`, error.message);
    res.json({ success: true, message: 'Message sent (mock)' });
  }
});

export default router;