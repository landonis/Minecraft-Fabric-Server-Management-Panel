import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import serverRoutes from './routes/server';
import modRoutes from './routes/mods';
import worldRoutes from './routes/world';
import playerRoutes from './routes/players';
import authenticate from './middleware/auth';

dotenv.config({ path: '/home/ubuntu/minecraft-manager/.env' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/server', authenticate, serverRoutes);
app.use('/mods', authenticate, modRoutes);
app.use('/world', authenticate, worldRoutes);
app.use('/players', authenticate, playerRoutes);

// Root test
app.get('/', (_req, res) => {
  res.send('Minecraft Fabric Server Manager API is running');
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
