import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Admin from '../models/Admin.js';
import Batch from '../models/Batch.js';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment. Run this from backend folder with .env present.');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const batches = await Batch.find({ $or: [ { adminIds: { $exists: false } }, { adminIds: { $size: 0 } } ] }).lean();
  console.log(`Found ${batches.length} batches without adminIds array.`);

  for (const b of batches) {
    // If document has legacy adminId, migrate that to adminIds array and update Admin.assignedBatchIds
    if (b.adminId && String(b.adminId).trim()) {
      const aid = String(b.adminId).trim();
      console.log(`Migrating batch ${b.batchId} -> admin ${aid}`);
      await Batch.updateOne({ _id: b._id }, { $set: { adminIds: [aid] }, $unset: { adminId: "" } });

      const admin = await Admin.findOne({ adminId: aid });
      if (admin) {
        if (!Array.isArray(admin.assignedBatchIds)) admin.assignedBatchIds = [];
        if (!admin.assignedBatchIds.includes(b.batchId)) {
          admin.assignedBatchIds.push(b.batchId);
          await admin.save();
          console.log(` - added ${b.batchId} to admin ${aid}`);
        }
      }
    }
  }

  console.log('Migration complete. Disconnecting...');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
