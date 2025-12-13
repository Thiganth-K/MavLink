#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';

// Usage (PowerShell):
//   node src/scripts/delete-attendance-by-batch.js --batchId CSE2023 [--dry-run] [--force]
//   node src/scripts/delete-attendance-by-batch.js --batch CSE2023   # alias
// Env: MONGO_URI must be set (backend/.env)

const args = process.argv.slice(2);
const idx = args.indexOf('--batchId') >= 0 ? args.indexOf('--batchId') : args.indexOf('--batch');
const batchIdInput = idx >= 0 ? args[idx + 1] : null;
const dryRun = args.includes('--dry-run');
const force = args.includes('--force') || process.env.FORCE === '1';

if (!batchIdInput || String(batchIdInput).trim().length < 1) {
  console.log('Usage: node src/scripts/delete-attendance-by-batch.js --batchId <BATCH_ID> [--dry-run] [--force]');
  process.exit(1);
}

const batchId = String(batchIdInput).trim().toUpperCase();
const MONGO = process.env.MONGO_URI || process.env.MONGO || 'mongodb://localhost:27017/mavlink';

async function confirmProceed() {
  if (force) return true;
  return new Promise((resolve) => {
    process.stdout.write(`Delete ALL attendance documents for batch '${batchId}'? Type YES to confirm: `);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      resolve(String(data || '').trim() === 'YES');
    });
  });
}

async function main() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO);

  const filter = { batchId };
  const count = await Attendance.countDocuments(filter);
  console.log(`Matched attendance documents for batch '${batchId}':`, count);

  if (dryRun) {
    console.log('Dry run - no changes made.');
    await mongoose.disconnect();
    return;
  }

  const ok = await confirmProceed();
  if (!ok) {
    console.log('Aborted. No changes made.');
    await mongoose.disconnect();
    return;
  }

  try {
    const res = await Attendance.deleteMany(filter);
    console.log('Deleted attendance documents:', res.deletedCount ?? res);
  } catch (err) {
    console.error('Error deleting attendance:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
