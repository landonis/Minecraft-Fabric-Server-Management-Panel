export function generateToken(user: { id: number, username: string, is_admin: number }) {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined in environment');

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1,
    },
    secret,
    { expiresIn: '12h' }
  );
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
