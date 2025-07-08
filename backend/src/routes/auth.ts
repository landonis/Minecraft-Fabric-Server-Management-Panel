import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../db';
import { User } from '../types/User';
import authenticateToken from '../middleware/auth';

dotenv.config();


const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

function generateToken(user: User): string {
  return jwt.sign({
    id: user.id,
    username: user.username,
    is_admin: user.is_admin
  }, JWT_SECRET, { expiresIn: '12h' });
}

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User;
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        mustChangePassword: user.must_change_password === 1,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const { user } = req as any;
  res.json({
    id: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
    mustChangePassword: user.must_change_password === 1,
    createdAt: user.created_at
  });
});

router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  const { user } = req as any;
  const { currentPassword, newPassword } = req.body;

  try {
    const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as User;
    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(newPasswordHash, user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to change password', error });
  }
});

export default router;
