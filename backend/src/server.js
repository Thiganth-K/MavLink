import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { dropLegacyAttendanceIndexes } from './utils/indexCleanup.js';
import logger from './utils/logger.js';

import superAdminRoutes from '../src/routes/superAdminRoutes.js';
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import batchRoutes from './routes/batchRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';


const app = express();

// Enable CORS for frontend connections
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

app.use(express.json());

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
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/departments', departmentRoutes);
// Simple test route
app.get('/', (req, res) => {
  logger.debug('Health check route hit');
  res.send('Server is up and running');
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
