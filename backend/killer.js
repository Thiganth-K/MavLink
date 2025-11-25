// killer.js - destructive purge script
// Usage Examples (PowerShell):
//   node killer.js --preserve-superadmin          # Remove all admins except SUPER_ADMIN, plus batches, students, attendance, chats, notifications
//   node killer.js --nuke-all                     # Remove EVERYTHING (all collections including SUPER_ADMIN)
//   node killer.js --keep-departments            # Keep Department collection while purging others
//   FORCE=1 node killer.js --nuke-all            # Skip interactive confirmation (env FORCE=1)

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import readline from 'readline';

import Admin from './src/models/Admin.js';
import Batch from './src/models/Batch.js';
import Student from './src/models/Student.js';
import Attendance from './src/models/Attendance.js';
import Department from './src/models/Department.js';
import ChatMessage from './src/models/ChatMessage.js';
import Notification from './src/models/Notification.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment');
  process.exit(1);
}

const args = process.argv.slice(2);
const preserveSuperAdmin = args.includes('--preserve-superadmin');
const nukeAll = args.includes('--nuke-all');
const keepDepartments = args.includes('--keep-departments');
const force = process.env.FORCE === '1' || args.includes('--force');

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

async function purge() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  if (!nukeAll && !preserveSuperAdmin) {
    console.log('No scope flag provided. Use --preserve-superadmin or --nuke-all');
    process.exit(1);
  }

  console.log('\nPlanned destructive operations:');
  console.log(` - Delete batches (all)`);
  console.log(` - Delete students (all)`);
  console.log(` - Delete attendance records (all)`);
  console.log(` - Delete chat messages (all)`);
  console.log(` - Delete notifications (all)`);
  console.log(` - Delete admins ${preserveSuperAdmin ? '(excluding SUPER_ADMIN)' : '(including SUPER_ADMIN)'}`);
  console.log(` - Delete departments ${keepDepartments ? '(SKIPPED)' : '(all)'}`);

  const ok = await confirmPrompt('Proceed with purge?');
  if (!ok) {
    console.log('Aborted by user.');
    process.exit(0);
  }

  const summary = { adminsRemoved: 0, batchesRemoved: 0, studentsRemoved: 0, attendanceRemoved: 0, chatMessagesRemoved: 0, notificationsRemoved: 0, departmentsRemoved: 0 };

  // Attendance first (optional order). Simpler to just delete all.
  const attRes = await Attendance.deleteMany({});
  summary.attendanceRemoved = attRes.deletedCount || 0;
  console.log(`Removed ${summary.attendanceRemoved} attendance records.`);

  // Batches
  const batchRes = await Batch.deleteMany({});
  summary.batchesRemoved = batchRes.deletedCount || 0;
  console.log(`Removed ${summary.batchesRemoved} batches.`);

  // Students
  const studRes = await Student.deleteMany({});
  summary.studentsRemoved = studRes.deletedCount || 0;
  console.log(`Removed ${summary.studentsRemoved} students.`);

  // Chat Messages
  const chatRes = await ChatMessage.deleteMany({});
  summary.chatMessagesRemoved = chatRes.deletedCount || 0;
  console.log(`Removed ${summary.chatMessagesRemoved} chat messages.`);

  // Notifications
  const notifRes = await Notification.deleteMany({});
  summary.notificationsRemoved = notifRes.deletedCount || 0;
  console.log(`Removed ${summary.notificationsRemoved} notifications.`);

  // Admins
  let adminFilter = {};
  if (preserveSuperAdmin && !nukeAll) {
    adminFilter = { role: { $ne: 'SUPER_ADMIN' } };
  }
  const adminRes = await Admin.deleteMany(adminFilter);
  summary.adminsRemoved = adminRes.deletedCount || 0;
  console.log(`Removed ${summary.adminsRemoved} admins.`);

  // Departments
  if (!keepDepartments) {
    const deptRes = await Department.deleteMany({});
    summary.departmentsRemoved = deptRes.deletedCount || 0;
    console.log(`Removed ${summary.departmentsRemoved} departments.`);
  } else {
    console.log('Departments kept intact.');
  }

  console.log('\nPurge complete summary:', summary);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

purge().catch(err => {
  console.error('Purge failed:', err);
  process.exit(1);
});
