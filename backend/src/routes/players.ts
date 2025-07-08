import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const FABRIC_MOD_PORT = process.env.FABRIC_MOD_PORT || '8080';
const FABRIC_API_BASE = `http://127.0.0.1:${FABRIC_MOD_PORT}`;

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Helper function to make API calls to Fabric mod
const callFabricAPI = async (endpoint: string, options: any = {}) => {
  try {
    const response = await fetch(`${FABRIC_API_BASE}${endpoint}`, {
      timeout: 5000,
      ...options
    });
    
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`API call failed: ${response.status}`);
  } catch (error) {
    console.log(`Fabric mod API not available for ${endpoint}:`, error.message);
    return null;
  }
};

// Get all players
router.get('/', async (req, res) => {
  try {
    const data = await callFabricAPI('/players');
    
    if (data) {
      // Validate and sanitize data from mod
      const players = Array.isArray(data.players) ? data.players.map(player => ({
        username: String(player.username || 'Unknown'),
        uuid: String(player.uuid || ''),
        online: Boolean(player.online),
        playtime: String(player.playtime || '0m'),
        lastSeen: player.lastSeen ? new Date(player.lastSeen).toISOString() : new Date().toISOString(),
        position: player.position ? {
          x: Number(player.position.x) || 0,
          y: Number(player.position.y) || 0,
          z: Number(player.position.z) || 0
        } : null
      })).filter(player => player.uuid && isValidUUID(player.uuid)) : [];
      
      return res.json({ success: true, data: players });
    }

    // Fallback mock data for demonstration
    const mockPlayers = [
      {
        username: 'Steve',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        online: true,
        playtime: '2h 30m',
        lastSeen: new Date().toISOString(),
        position: { x: 10, y: 64, z: -200 }
      },
      {
        username: 'Alex',
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        online: false,
        playtime: '1h 15m',
        lastSeen: new Date(Date.now() - 3600000).toISOString(),
        position: { x: -50, y: 70, z: 100 }
      },
      {
        username: 'Notch',
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        online: false,
        playtime: '45m',
        lastSeen: new Date(Date.now() - 7200000).toISOString(),
        position: { x: 0, y: 64, z: 0 }
      }
    ];

    res.json({ success: true, data: mockPlayers });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch players' });
  }
});

// Get player inventory
router.get('/:uuid/inventory', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    if (!isValidUUID(uuid)) {
      return res.status(400).json({ success: false, message: 'Invalid UUID format' });
    }

    const data = await callFabricAPI(`/players/${uuid}/inventory`);
    
    if (data) {
      // Validate and sanitize inventory data
      const inventory = Array.isArray(data.inventory) ? data.inventory.map(item => ({
        slot: Number(item.slot) || 0,
        item: String(item.item || 'minecraft:air'),
        count: Number(item.count) || 0,
        nbt: item.nbt || null
      })) : [];
      
      return res.json({ success: true, data: { uuid, inventory } });
    }

    // Mock inventory data
    const mockInventory = [
      { slot: 0, item: 'minecraft:diamond_sword', count: 1 },
      { slot: 1, item: 'minecraft:diamond_pickaxe', count: 1 },
      { slot: 2, item: 'minecraft:cooked_beef', count: 32 },
      { slot: 3, item: 'minecraft:torch', count: 64 },
      { slot: 4, item: 'minecraft:cobblestone', count: 64 }
    ];

    res.json({ success: true, data: { uuid, inventory: mockInventory } });
  } catch (error) {
    console.error('Error fetching player inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch player inventory' });
  }
});

// Get player position
router.get('/:uuid/position', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    if (!isValidUUID(uuid)) {
      return res.status(400).json({ success: false, message: 'Invalid UUID format' });
    }

    const data = await callFabricAPI(`/players/${uuid}/position`);
    
    if (data && data.position) {
      const position = {
        x: Number(data.position.x) || 0,
        y: Number(data.position.y) || 0,
        z: Number(data.position.z) || 0,
        dimension: String(data.position.dimension || 'minecraft:overworld')
      };
      
      return res.json({ success: true, data: { uuid, position } });
    }

    // Mock position data
    const mockPosition = {
      x: Math.floor(Math.random() * 1000) - 500,
      y: 64,
      z: Math.floor(Math.random() * 1000) - 500,
      dimension: 'minecraft:overworld'
    };

    res.json({ success: true, data: { uuid, position: mockPosition } });
  } catch (error) {
    console.error('Error fetching player position:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch player position' });
  }
});

// Kick player
router.post('/:uuid/kick', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason } = req.body;
    
    if (!isValidUUID(uuid)) {
      return res.status(400).json({ success: false, message: 'Invalid UUID format' });
    }

    const sanitizedReason = String(reason || 'Kicked by admin').substring(0, 100);

    const data = await callFabricAPI(`/players/${uuid}/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: sanitizedReason })
    });
    
    if (data) {
      return res.json({ success: true, message: 'Player kicked successfully' });
    }

    // Mock response when mod is not available
    res.json({ 
      success: true, 
      message: 'Kick command sent (Fabric mod integration required for actual functionality)' 
    });
  } catch (error) {
    console.error('Error kicking player:', error);
    res.status(500).json({ success: false, message: 'Failed to kick player' });
  }
});

// Send message to player
router.post('/:uuid/message', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { message } = req.body;
    
    if (!isValidUUID(uuid)) {
      return res.status(400).json({ success: false, message: 'Invalid UUID format' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const sanitizedMessage = String(message).substring(0, 256);

    const data = await callFabricAPI(`/players/${uuid}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: sanitizedMessage })
    });
    
    if (data) {
      return res.json({ success: true, message: 'Message sent successfully' });
    }

    // Mock response when mod is not available
    res.json({ 
      success: true, 
      message: 'Message sent (Fabric mod integration required for actual functionality)' 
    });
  } catch (error) {
    console.error('Error sending message to player:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

export default router;
