#!/usr/bin/env node
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';

// Usage:
//   node delete-attendance-by-admin.js --username <username> --adminId <adminId> [--dry-run] [--force]
// Requires: set MONGO_URI env var or ensure .env is loaded by your environment.

const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--username' && argv[i+1]) opts.username = argv[++i];
  else if (a === '--adminId' && argv[i+1]) opts.adminId = argv[++i];
  else if (a === '--dry-run') opts.dry = true;
  else if (a === '--force') opts.force = true;
  else if (a === '--help' || a === '-h') opts.help = true;
}

if (opts.help || (!opts.username && !opts.adminId)) {
  console.log('Usage: node delete-attendance-by-admin.js --username <username> --adminId <adminId> [--dry-run] [--force]');
  process.exit(opts.help ? 0 : 1);
}

const MONGO = process.env.MONGO_URI || process.env.MONGO || 'mongodb://localhost:27017/mavlink';

async function confirmProceed() {
  if (opts.force || process.env.FORCE === '1') return true;
  return new Promise((resolve) => {
    process.stdout.write('Proceed to delete attendance records? Type YES to confirm: ');
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      resolve(String(data || '').trim() === 'YES');
    });
  });
}

async function main() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  const filters = [];
  if (opts.username) filters.push({ markedBy: opts.username });
  if (opts.adminId) filters.push({ markedBy: opts.adminId });
  const filter = { $or: filters };

  const count = await Attendance.countDocuments(filter);
  console.log('Attendance documents matched:', count);

  if (opts.dry) {
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
    console.log('Deleted attendance documents:', res.deletedCount || res);
  } catch (err) {
    console.error('Error deleting attendance:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
