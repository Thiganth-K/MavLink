// killer-batch.js - targeted batch purge script
// Usage Examples (PowerShell):
//   node src/scripts/killer-batch.js --batchId CSE2023           # Delete Batch(CSE2023) + related students + attendance
//   node src/scripts/killer-batch.js --batch CSE2023             # Alias for --batchId
//   FORCE=1 node src/scripts/killer-batch.js --batchId ECE2022   # Skip interactive confirmation (env FORCE=1)
//   node src/scripts/killer-batch.js --batchId CSE2023 --no-students   # Delete batch + attendance only
//   node src/scripts/killer-batch.js --batchId CSE2023 --no-attendance # Delete batch + students only
//
// Notes:
// - batchId is case-insensitive; normalized to uppercase internally
// - By default, this script will remove:
//     * The Batch document
//     * Students belonging to that batch (by batchId)
//     * Attendance documents for that batch (by batchId)
// - Use the flags --no-students or --no-attendance to skip parts of the cascade.

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import readline from 'readline';

import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment');
  process.exit(1);
}

const args = process.argv.slice(2);
const batchIdx = args.indexOf('--batchId') >= 0 ? args.indexOf('--batchId') : args.indexOf('--batch');
const batchIdInput = batchIdx >= 0 ? args[batchIdx + 1] : null;
const skipStudents = args.includes('--no-students');
const skipAttendance = args.includes('--no-attendance');
const force = process.env.FORCE === '1' || args.includes('--force');

if (!batchIdInput || String(batchIdInput).trim().length < 2) {
  console.error('Usage: node src/scripts/killer-batch.js --batchId <BATCH_ID> [--no-students] [--no-attendance]');
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

async function purgeBatch() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const batch = await Batch.findOne({ batchId }).lean();
  if (!batch) {
    console.error(`Batch '${batchId}' not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Gather impact summary before confirmation
  const studentsCount = skipStudents ? 0 : await Student.countDocuments({ batchId });
  const attendanceCount = skipAttendance ? 0 : await Attendance.countDocuments({ batchId });

  console.log('\nPlanned destructive operations:');
  console.log(` - Delete batch: ${batchId} (${batch.batchName})`);
  if (!skipStudents) console.log(` - Delete ~${studentsCount} students in this batch`);
  else console.log(' - Skipping students deletion (--no-students)');
  if (!skipAttendance) console.log(` - Delete ~${attendanceCount} attendance documents for this batch`);
  else console.log(' - Skipping attendance deletion (--no-attendance)');

  const ok = await confirmPrompt('Proceed with purge for batch?');
  if (!ok) {
    console.log('Aborted by user.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const summary = { batchRemoved: 0, studentsRemoved: 0, attendanceRemoved: 0 };

  // Delete related collections first, then batch
  if (!skipAttendance) {
    const attRes = await Attendance.deleteMany({ batchId });
    summary.attendanceRemoved = attRes.deletedCount || 0;
    console.log(`Removed ${summary.attendanceRemoved} attendance documents for batch ${batchId}.`);
  }

  if (!skipStudents) {
    const studRes = await Student.deleteMany({ batchId });
    summary.studentsRemoved = studRes.deletedCount || 0;
    console.log(`Removed ${summary.studentsRemoved} students for batch ${batchId}.`);
  }

  const batchRes = await Batch.deleteOne({ batchId });
  summary.batchRemoved = batchRes.deletedCount || 0;
  console.log(`Removed ${summary.batchRemoved} batch '${batchId}'.`);

  console.log('\nPurge complete summary:', summary);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

purgeBatch().catch(err => {
  console.error('Batch purge failed:', err);
  process.exit(1);
});
