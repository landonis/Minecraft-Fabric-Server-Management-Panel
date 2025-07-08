import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import authenticate, { User } from '../middleware/auth';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT token for a user
function generateToken(user: User) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
    },
    SECRET,
    { expiresIn: '8h' }
  );
}

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

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
});

// POST /auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

  const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);

  if (!isValid) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(newPasswordHash, user.id);

  res.json({ success: true });
});

export default router;
