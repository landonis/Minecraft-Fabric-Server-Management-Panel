import express from 'express';
import axios from 'axios';
import { isValidUUID } from '../utils';

const router = express.Router();

interface Player {
  uuid: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  count: number;
}

interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  dimension: string;
}

router.get('/', async (_req, res) => {
  const endpoint = 'http://localhost:8080/players';
  try {
    const { data } = await axios.get(endpoint);
    const players = Array.isArray(data.players)
      ? data.players.map((player: any) => ({
          uuid: player.uuid,
          name: player.name,
        })).filter((player: Player) => player.uuid && isValidUUID(player.uuid))
      : [];

    res.json(players);
  } catch (error: any) {
    console.log(`Fabric mod API not available for ${endpoint}:`, error.message);
    res.status(500).json({ message: 'Could not fetch player list' });
  }
});

router.get('/:uuid/inventory', async (req, res) => {
  const { uuid } = req.params;
  const endpoint = `http://localhost:8080/player/${uuid}/inventory`;
  try {
    const { data } = await axios.get(endpoint);
    const inventory = Array.isArray(data.inventory)
      ? data.inventory.map((item: any) => ({
          id: item.id,
          name: item.name,
          count: item.count,
        }))
      : [];

    res.json(inventory);
  } catch (error: any) {
    console.log(`Fabric mod API not available for ${endpoint}:`, error.message);
    res.status(500).json({ message: 'Could not fetch inventory' });
  }
});

router.get('/:uuid/position', async (req, res) => {
  const { uuid } = req.params;
  const endpoint = `http://localhost:8080/player/${uuid}/position`;
  try {
    const { data } = await axios.get(endpoint);
    let position: PlayerPosition = {
      x: 0,
      y: 0,
      z: 0,
      dimension: 'minecraft:overworld'
    };

    if (data && data.position) {
      position = {
        x: Number(data.position.x) || 0,
        y: Number(data.position.y) || 0,
        z: Number(data.position.z) || 0,
        dimension: String(data.position.dimension || 'minecraft:overworld')
      };
    }

    res.json(position);
  } catch (error: any) {
    console.log(`Fabric mod API not available for ${endpoint}:`, error.message);
    res.status(500).json({ message: 'Could not fetch position' });
  }
});

export default router;
