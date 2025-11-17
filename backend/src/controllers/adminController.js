const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

exports.list = async (_req, res) => {
  const admins = await Admin.find().select('-passwordHash');
  res.json(admins);
};

exports.create = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });

  const exists = await Admin.findOne({ username });
  if (exists) return res.status(409).json({ message: 'username already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ username, passwordHash });
  res.status(201).json({ _id: admin._id, username: admin.username, role: admin.role });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body || {};
  const update = {};
  if (username) update.username = username;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const admin = await Admin.findByIdAndUpdate(id, update, { new: true });
  if (!admin) return res.status(404).json({ message: 'admin not found' });
  res.json({ _id: admin._id, username: admin.username, role: admin.role });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const admin = await Admin.findByIdAndDelete(id);
  if (!admin) return res.status(404).json({ message: 'admin not found' });
  res.json({ ok: true });
};
