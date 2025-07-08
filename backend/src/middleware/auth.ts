import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db';
import { User } from '../types/User';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (error, userDecoded) => {
    if (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      return res.status(500).json({ message: 'Token verification failed' });
    }

    const user = userDecoded as Partial<User>;
    if (!user || !user.id || !user.username) {
      return res.status(403).json({ message: 'Token payload invalid' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin || 0,
      must_change_password: user.must_change_password || 0,
      created_at: user.created_at || new Date().toISOString()
    };

    next();
  });
}

export default authenticateToken;
