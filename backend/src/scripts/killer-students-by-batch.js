#!/usr/bin/env node
// killer-students-by-batch.js - delete all Student records for a given batchId
// Usage (PowerShell):
//   node src/scripts/killer-students-by-batch.js --batchId CSE2023 [--dry-run] [--force]
//   node src/scripts/killer-students-by-batch.js --batch CSE2023   # alias
// Notes:
// - batchId is normalized to uppercase
// - Requires MONGO_URI in backend/.env

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import readline from 'readline';
import Student from '../models/Student.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment');
  process.exit(1);
}

const args = process.argv.slice(2);
const idx = args.indexOf('--batchId') >= 0 ? args.indexOf('--batchId') : args.indexOf('--batch');
const batchIdInput = idx >= 0 ? args[idx + 1] : null;
const dryRun = args.includes('--dry-run');
const force = args.includes('--force') || process.env.FORCE === '1';

if (!batchIdInput || String(batchIdInput).trim().length < 1) {
  console.log('Usage: node src/scripts/killer-students-by-batch.js --batchId <BATCH_ID> [--dry-run] [--force]');
  process.exit(1);
}

const batchId = String(batchIdInput).trim().toUpperCase();

function confirmPrompt(question) {
  if (force) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question + ' (y/N): ', answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(String(answer).trim()));
    });
  });
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const filter = { batchId };
  const count = await Student.countDocuments(filter);
  console.log(`Matched students for batch '${batchId}':`, count);

  if (dryRun) {
    console.log('Dry run - no changes made.');
    await mongoose.disconnect();
    return;
  }

  const ok = await confirmPrompt(`Proceed to delete ${count} students in batch '${batchId}'?`);
  if (!ok) {
    console.log('Aborted by user.');
    await mongoose.disconnect();
    return;
  }

  try {
    const res = await Student.deleteMany(filter);
    console.log('Deleted student documents:', res.deletedCount ?? res);
  } catch (err) {
    console.error('Error deleting students:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch(err => { console.error('Purge failed:', err); process.exit(1); });
