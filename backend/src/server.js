require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Config
const PORT = Number(process.env.PORT) || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
	res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);

// Database and server start
async function start() {
	let dbReady = false;
	try {
		if (!process.env.MONGO_URI) {
			console.warn('MONGO_URI not set. Admin CRUD will not work without DB.');
		} else {
			await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || 'mavlink' });
			console.log('MongoDB connected');
			dbReady = true;
		}
	} catch (err) {
		console.error('MongoDB connection failed. Continuing without DB:', err.message || err);
	}
	app.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}${dbReady ? '' : ' (DB not connected)'}`);
	});
}

start();

