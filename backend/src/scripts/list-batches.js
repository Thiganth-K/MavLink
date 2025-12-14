#!/usr/bin/env node
// list-batches.js
// Usage examples (PowerShell):
//   node src/scripts/list-batches.js                # list all batches (JSON)
//   node src/scripts/list-batches.js --csv           # output CSV to stdout
//   node src/scripts/list-batches.js --dept CSE      # filter by deptId
//   node src/scripts/list-batches.js --admin ADM01   # filter by adminId or _id
//   node src/scripts/list-batches.js --year 2023     # filter by batchYear
//   node src/scripts/list-batches.js --limit 50      # limit results
// Notes:
// - Respects MONGO_URI from environment (.env)
// - Outputs JSON by default, CSV with --csv

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Batch from '../models/Batch.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not defined in environment');
  process.exit(1);
}

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const getValue = (name) => {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  return argv[idx + 1] ? String(argv[idx + 1]) : null;
};

const dept = getValue('--dept') || getValue('--department') || null;
const admin = getValue('--admin') || getValue('--adminId') || null;
const year = getValue('--year') || getValue('--batchYear') || null;
const limit = Number(getValue('--limit') || getValue('--l') || 0) || 0;
const csv = hasFlag('--csv');

async function listBatches() {
  await mongoose.connect(MONGO_URI);

  const query = {};
  if (dept) query.deptId = String(dept).toUpperCase();
  if (year) query.batchYear = Number(year);
  if (admin) {
    // Support both single adminId field and adminIds array
    query.$or = [ { adminIds: admin }, { adminId: admin }, { adminIds: String(admin).toUpperCase() }, { adminId: String(admin).toUpperCase() } ];
  }

  let q = Batch.find(query).lean();
  if (limit && limit > 0) q = q.limit(limit);

  const batches = await q.exec();

  if (csv) {
    // CSV header
    const header = ['batchId','batchName','batchYear','deptId','adminId','adminIdsCount','studentsCount','createdAt'];
    console.log(header.join(','));
    for (const b of batches) {
      const adminId = b.adminId || (Array.isArray(b.adminIds) && b.adminIds.length ? b.adminIds.join(';') : '');
      const row = [
        safe(b.batchId),
        safe(b.batchName),
        safe(String(b.batchYear || '')),
        safe(b.deptId),
        safe(adminId),
        safe(String(Array.isArray(b.adminIds) ? b.adminIds.length : 0)),
        safe(String(Array.isArray(b.students) ? b.students.length : 0)),
        safe(b.createdAt)
      ];
      console.log(row.join(','));
    }
  } else {
    console.log(JSON.stringify(batches, null, 2));
  }

  await mongoose.disconnect();
}

function safe(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).replace(/\r|\n/g, ' ');
  // Escape double quotes by doubling them for CSV contexts
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

listBatches().catch(err => {
  console.error('Failed to list batches:', err && err.message ? err.message : err);
  process.exit(1);
});
