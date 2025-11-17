require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Config
const PORT = process.env.PORT || 5001;
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
app.use('/api/auth', authRoutes);

// Start server
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

