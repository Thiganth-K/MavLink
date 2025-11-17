import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';

import superAdminRoutes from '../src/routes/superAdminRoutes.js';
import studentRoutes from "./routes/studentRoutes.js";


const app = express();
app.use(express.json());

// Read from .env
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI not defined in .env');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

//routes inga irruku
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/students', studentRoutes);
// Simple test route
app.get('/', (req, res) => {
  res.send('Server is up and running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
