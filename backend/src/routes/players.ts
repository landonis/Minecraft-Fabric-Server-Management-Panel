import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const FABRIC_MOD_PORT = process.env.FABRIC_MOD_PORT || '8080';

// Get players
router.get('/', async (req, res) => {
  try {
    // TODO: Integrate with custom Fabric mod
    // This is a stub implementation with mock data
    
    try {
      // Attempt to connect to Fabric mod API
      const response = await fetch(`http://127.0.0.1:${FABRIC_MOD_PORT}/players`, {
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, data });
      }
    } catch (error) {
      // Fabric mod not available, return mock data
      console.log('Fabric mod API not available, returning mock data');
    }

    // Mock data for demonstration
    const mockPlayers = [
      {
        username: 'Steve',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        online: true,
        playtime: '2h 30m',
        lastSeen: new Date().toISOString()
      },
      {
        username: 'Alex',
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        online: false,
        playtime: '1h 15m',
        lastSeen: new Date(Date.now() - 3600000).toISOString()
      },
      {
        username: 'Notch',
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        online: false,
        playtime: '45m',
        lastSeen: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    res.json({ success: true, data: mockPlayers });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch players' });
  }
});

export { router as playerRoutes };