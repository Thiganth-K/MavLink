import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Always load .env from backend folder, even if run from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { dropLegacyAttendanceIndexes } from './utils/indexCleanup.js';
import logger from './utils/logger.js';

import superAdminRoutes from './routes/superAdminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import batchRoutes from './routes/batchRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';


const app = express();

// Enable CORS for frontend connections
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

app.use(express.json());

// Resolve frontend dist path
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

// Read from .env
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  logger.error('MONGO_URI not defined in .env');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    logger.info('MongoDB connected');
    try {
      const result = await dropLegacyAttendanceIndexes(mongoose.connection.db);
      if (result && Array.isArray(result.dropped) && result.dropped.length > 0) {
        logger.warn(`Dropped legacy attendance indexes: ${result.dropped.join(', ')}`);
      }
      if (result && result.error) {
        logger.warn('Index cleanup error', { error: result.error && result.error.message ? result.error.message : result.error });
      }
    } catch (err) {
      logger.warn('Index cleanup failed', { error: err && err.message ? err.message : err });
    }
  })
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err.message });
    process.exit(1);
  });

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  logger.debug('Incoming request', { method: req.method, url: req.originalUrl, params: req.params, query: req.query });
  // Body may be large; log keys only
  if (req.body && Object.keys(req.body).length) {
    logger.debug('Request body keys', { keys: Object.keys(req.body) });
  }
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug('Response sent', { method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: duration });
  });
  next();
});

//routes inga irruku
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/departments', departmentRoutes);
// Chat and notifications
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
// Health check route (API only)
app.get('/api/health', (req, res) => {
  logger.debug('Health check route hit');
  res.send('Server is up and running');
});

// Serve frontend static files
app.use(express.static(frontendDistPath));

// Fallback to index.html for non-API routes (SPA)
// Use a middleware instead of wildcard route to avoid path-to-regexp '*' errors
app.use((req, res, next) => {
  // Only handle GET requests
  if (req.method !== 'GET') return next();
  // Skip API routes
  if (req.path.startsWith('/api')) return next();
  // If the request matches a file in dist, let express.static serve it
  // Otherwise, serve index.html (client-side routing)
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});