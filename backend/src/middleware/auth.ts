import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

export interface User {
  id: number;
  username: string;
  is_admin: number;
  must_change_password?: number;
  created_at?: string;
}

// Extend Express Request type to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware: Verify JWT and attach user to request
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, SECRET) as User;

    // Pull latest user info from DB (optional for added safety)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      must_change_password: user.must_change_password,
      created_at: user.created_at,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(500).json({ error: 'Authentication error' });
  }
};

export default authenticate;
