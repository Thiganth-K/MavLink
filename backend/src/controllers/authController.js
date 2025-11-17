const jwt = require('jsonwebtoken');

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET in environment');
  }
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

exports.login = (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const adminUser = process.env.SUPER_ADMIN_USERNAME;
  const adminPass = process.env.SUPER_ADMIN_PASSWORD;

  // Basic demo authentication using env super admin
  if (username === adminUser && password === adminPass) {
    const token = signToken({ username, role: 'admin' });
    return res.json({
      token,
      user: { username, role: 'admin' }
    });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
};
