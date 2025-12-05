// killer-dept.js - targeted department purge script
// Usage Examples (PowerShell):
//   node src/scripts/killer-dept.js --dept CSE                 # Delete only the Department(CSE)
//   node src/scripts/killer-dept.js --dept ECE --cascade       # Delete Department(ECE) + related batches, students, attendance
//   FORCE=1 node src/scripts/killer-dept.js --dept MECH --cascade  # Skip interactive confirmation (env FORCE=1)
//
// Notes:
// - deptId is case-insensitive; normalized to uppercase internally
// - "--cascade" will remove:
//     * Department
//     * Batches with matching deptId
//     * Students belonging to those batches (by batchId)
//     * Attendance documents for those batches
// - Without "--cascade", only the Department document is deleted.

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import readline from 'readline';

import Department from '../models/Department.js';
import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment');
  process.exit(1);
}

const args = process.argv.slice(2);
const deptArgIndex = args.indexOf('--dept');
const deptIdInput = deptArgIndex >= 0 ? args[deptArgIndex + 1] : null;
const cascade = args.includes('--cascade');
const force = process.env.FORCE === '1' || args.includes('--force');

if (!deptIdInput || String(deptIdInput).trim().length < 2) {
  console.error('Usage: node src/scripts/killer-dept.js --dept <DEPT_ID> [--cascade]');
  process.exit(1);
}

const deptId = String(deptIdInput).trim().toUpperCase();

function confirmPrompt(question) {
  if (force) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question + ' (y/N): ', answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function purgeDept() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const dept = await Department.findOne({ deptId });
  if (!dept) {
    console.error(`Department '${deptId}' not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Gather impact summary before confirmation
  const batches = await Batch.find({ deptId }).select('batchId batchName').lean();
  const batchIds = batches.map(b => String(b.batchId).toUpperCase());
  let studentsCount = 0;
  let attendanceCount = 0;

  if (cascade) {
    if (batchIds.length) {
      studentsCount = await Student.countDocuments({ batchId: { $in: batchIds } });
      attendanceCount = await Attendance.countDocuments({ batchId: { $in: batchIds } });
    }
  }

  console.log('\nPlanned destructive operations:');
  console.log(` - Delete department: ${deptId} (${dept.deptName})`);
  if (cascade) {
    console.log(` - Delete ${batches.length} batches in department`);
    console.log(` - Delete ~${studentsCount} students in those batches`);
    console.log(` - Delete ~${attendanceCount} attendance documents for those batches`);
  } else {
    console.log(' - Cascade disabled: only Department will be deleted');
  }

  const ok = await confirmPrompt('Proceed with purge for department?');
  if (!ok) {
    console.log('Aborted by user.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const summary = { departmentRemoved: 0, batchesRemoved: 0, studentsRemoved: 0, attendanceRemoved: 0 };

  // Delete department first or last? Do last to keep references while counting
  if (cascade) {
    if (batchIds.length) {
      const attRes = await Attendance.deleteMany({ batchId: { $in: batchIds } });
      summary.attendanceRemoved = attRes.deletedCount || 0;
      console.log(`Removed ${summary.attendanceRemoved} attendance documents for dept ${deptId}.`);

      const studRes = await Student.deleteMany({ batchId: { $in: batchIds } });
      summary.studentsRemoved = studRes.deletedCount || 0;
      console.log(`Removed ${summary.studentsRemoved} students for dept ${deptId}.`);

      const batchRes = await Batch.deleteMany({ deptId });
      summary.batchesRemoved = batchRes.deletedCount || 0;
      console.log(`Removed ${summary.batchesRemoved} batches for dept ${deptId}.`);
    }
  }

  const deptRes = await Department.deleteOne({ deptId });
  summary.departmentRemoved = deptRes.deletedCount || 0;
  console.log(`Removed ${summary.departmentRemoved} department '${deptId}'.`);

  console.log('\nPurge complete summary:', summary);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

purgeDept().catch(err => {
  console.error('Department purge failed:', err);
  process.exit(1);
});
