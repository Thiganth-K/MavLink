#!/usr/bin/env node
// list-attendance-batchids.js
// Lists distinct batchId values present in the Attendance collection.
//
// Usage examples (PowerShell):
//   node src/scripts/list-attendance-batchids.js         # JSON array (sorted)
//   node src/scripts/list-attendance-batchids.js --csv   # CSV to stdout
//
// Notes:
// - Respects MONGO_URI from environment (.env)

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in environment');
  process.exit(1);
}

const argv = process.argv.slice(2);
const csv = argv.includes('--csv');

async function listAttendanceBatchIds() {
  await mongoose.connect(MONGO_URI);

  try {
    const raw = await Attendance.distinct('batchId');
    const batchIds = (Array.isArray(raw) ? raw : [])
      .map(b => String(b || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (csv) {
      console.log('batchId');
      for (const id of batchIds) console.log(safe(id));
    } else {
      console.log(JSON.stringify(batchIds, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}

function safe(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).replace(/\r|\n/g, ' ');
  if (s.includes(',') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

listAttendanceBatchIds().catch(err => {
  console.error('Failed to list Attendance batchIds:', err && err.message ? err.message : err);
  process.exit(1);
});
