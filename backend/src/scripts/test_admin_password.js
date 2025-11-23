import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

async function run() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('MONGO_URI not defined in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const adminId = 'ADMIN001';
    const username = 'admin001';
    const password = 'pass1234';

    // Upsert admin
    const updated = await Admin.findOneAndUpdate(
      { adminId },
      { adminId, username, password, role: 'ADMIN' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Upserted admin:', { adminId: updated.adminId, username: updated.username });

    // Read back
    const found = await Admin.findOne({ adminId });
    if (!found) {
      console.error('Admin not found after upsert');
      process.exitCode = 2;
    } else {
      console.log('Retrieved admin fields:');
      console.log('adminId:', found.adminId);
      console.log('username:', found.username);
      console.log('password:', found.password);
      console.log('assignedBatchIds:', found.assignedBatchIds);
    }
  } catch (err) {
    console.error('Error during test:', err && err.message ? err.message : err);
    process.exitCode = 3;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
