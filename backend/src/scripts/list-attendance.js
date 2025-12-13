#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';

// Usage (PowerShell):
//   node src/scripts/list-attendance.js                      # List all documents (paginated)
//   node src/scripts/list-attendance.js --limit 50           # Limit number of docs
//   node src/scripts/list-attendance.js --batchId CSE2023    # Filter by batchId
//   node src/scripts/list-attendance.js --date 2025-12-07    # Filter by IST date (YYYY-MM-DD)
//   node src/scripts/list-attendance.js --session FN         # Filter by session (FN|AN)
//   node src/scripts/list-attendance.js --csv out.csv        # Export selection to CSV
//
// Env: MONGO_URI must be set (backend/.env)

const args = process.argv.slice(2);
function getArg(name, def = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? def : def;
}

const batchIdArg = getArg('--batchId') || getArg('--batch');
const dateArg = getArg('--date'); // YYYY-MM-DD (IST)
const sessionArg = getArg('--session'); // FN|AN
const limitArg = Number(getArg('--limit', '0')) || 0;
const csvPath = getArg('--csv');

const MONGO = process.env.MONGO_URI || process.env.MONGO || 'mongodb://localhost:27017/mavlink';

function toUpperTrim(s) { return String(s || '').trim().toUpperCase(); }

async function main() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO);

  const filter = {};
  if (batchIdArg) filter.batchId = toUpperTrim(batchIdArg);
  if (sessionArg) filter.session = String(sessionArg).trim().toUpperCase();

  // If dateArg provided (YYYY-MM-DD IST), match by virtual 'dateIST' or compute range
  if (dateArg) {
    // Compute UTC range for the IST date
    const d = new Date(dateArg + 'T00:00:00+05:30');
    const start = new Date(d.toISOString());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    filter.date = { $gte: start, $lt: end };
  }

  const count = await Attendance.countDocuments(filter);
  console.log('Attendance documents matched:', count);

  const query = Attendance.find(filter).sort({ date: 1, session: 1, batchId: 1 });
  if (limitArg > 0) query.limit(limitArg);
  const docs = await query.lean();

  if (csvPath) {
    const fs = await import('node:fs');
    const headers = ['_id','batchId','dateIST','session','markedBy','markedAt','entriesCount','createdAt','updatedAt'];
    const lines = [headers.join(',')];
    for (const doc of docs) {
      const dateIST = doc.dateIST ?? null;
      const entriesCount = Array.isArray(doc.entries) ? doc.entries.length : 0;
      const row = [
        doc._id,
        doc.batchId,
        dateIST,
        doc.session,
        doc.markedBy,
        doc.markedAt,
        entriesCount,
        doc.createdAt,
        doc.updatedAt
      ].map(v => {
        const s = v == null ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(',');
      lines.push(row);
    }
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
    console.log(`Exported ${docs.length} rows to ${csvPath}`);
  } else {
    // Pretty print minimal info
    for (const doc of docs) {
      const dateIST = doc.dateIST ?? null;
      const entriesCount = Array.isArray(doc.entries) ? doc.entries.length : 0;
      console.log('---');
      console.log('id:', doc._id);
      console.log('batchId:', doc.batchId);
      console.log('date (IST):', dateIST);
      console.log('session:', doc.session);
      console.log('markedBy:', doc.markedBy);
      console.log('entries:', entriesCount);
      console.log('createdAt:', doc.createdAt);
      console.log('updatedAt:', doc.updatedAt);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
