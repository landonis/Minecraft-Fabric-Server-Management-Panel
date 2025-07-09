import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../database/init';
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
      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
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
