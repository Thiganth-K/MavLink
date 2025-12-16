// export-specific.js - export attendance for a single batchId into Excel
//
// Usage Examples (PowerShell):
//   node src/scripts/export-specific.js --batchId SQL 2027
//   node src/scripts/export-specific.js --batchId SQL-MCT-2027 --out .\\exports\\SQL-MCT-2027.xlsx
//   node src/scripts/export-specific.js --batchId SQL-MCT-2027 --startDate 2025-01-01 --endDate 2025-12-31
//   FORCE=1 node src/scripts/export-specific.js --batchId SQL-MCT-2027   # skip confirmation
//
// Output:
// - One row per student in the batch
// - One column per date+session (FN/AN)
// - Summary columns: totalClasses, present, absent, onDuty, late, sickLeave, attendancePercentage

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import readline from 'readline';
import ExcelJS from 'exceljs';

import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Department from '../models/Department.js';
import { parseISTDate, getNextISTDay, toISTDateString } from '../utils/dateUtils.js';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment');
  process.exit(1);
}

const args = process.argv.slice(2);
const argValue = (name) => {
  const idx = args.indexOf(name);
  if (idx < 0) return null;
  return args[idx + 1] ?? null;
};

const batchIdInput = argValue('--batchId') ?? argValue('--batch');
const startDateInput = argValue('--startDate');
const endDateInput = argValue('--endDate');
const outInput = argValue('--out');
const force = process.env.FORCE === '1' || args.includes('--force');

if (!batchIdInput || String(batchIdInput).trim().length < 2) {
  console.error('Usage: node src/scripts/export-specific.js --batchId <BATCH_ID> [--startDate YYYY-MM-DD] [--endDate YYYY-MM-DD] [--out <path>]');
  process.exit(1);
}

const batchId = String(batchIdInput).trim().toUpperCase();

function confirmPrompt(question) {
  if (force) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question + ' (y/N): ', (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(String(answer).trim()));
    });
  });
}

function safeFileName(name) {
  return String(name).replace(/[<>:"/\\|?*]+/g, '_');
}

async function exportBatchAttendance() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const batch = await Batch.findOne({ batchId }).lean();
  if (!batch) {
    console.error(`Batch '${batchId}' not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  let startDate = null;
  let endDate = null;
  if (startDateInput) startDate = parseISTDate(String(startDateInput));
  if (endDateInput) endDate = parseISTDate(String(endDateInput));

  const students = await Student.find({ batchId }).sort({ regno: 1 }).lean();

  const attendanceQuery = { batchId };
  if (startDate && endDate) {
    const endExclusive = getNextISTDay(endDate);
    attendanceQuery.date = { $gte: startDate, $lt: endExclusive };
  }

  const attendanceDocs = await Attendance.find(attendanceQuery).lean();

  console.log('\nExport scope:');
  console.log(` - batchId: ${batchId}`);
  console.log(` - students: ${students.length}`);
  console.log(` - attendance documents: ${attendanceDocs.length}`);
  if (startDate && endDate) console.log(` - date range (IST): ${String(startDateInput)} .. ${String(endDateInput)}`);
  else console.log(' - date range: ALL');

  const ok = await confirmPrompt('Proceed to generate Excel export?');
  if (!ok) {
    console.log('Aborted by user.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Dept name lookup (optional)
  let deptName = '';
  try {
    const dept = await Department.findOne({ deptId: String(batch.deptId || '').toUpperCase() }).lean();
    deptName = dept ? String(dept.deptName || '') : '';
  } catch {}

  // Build distinct date set and per-student maps
  const dateSet = new Set();
  const studentDateSessionMap = new Map(); // regno -> Map(date::session -> status)
  const studentStatsMap = new Map(); // regno -> stats

  for (const a of attendanceDocs) {
    const dateStr = a.date ? toISTDateString(new Date(a.date)) : '';
    if (!dateStr) continue;
    dateSet.add(dateStr);

    const session = String(a.session || '').toUpperCase();
    const entries = Array.isArray(a.entries) ? a.entries : [];

    for (const entry of entries) {
      const reg = String(entry.regno || '').trim().toUpperCase();
      if (!reg) continue;

      if (!studentDateSessionMap.has(reg)) studentDateSessionMap.set(reg, new Map());
      studentDateSessionMap.get(reg).set(`${dateStr}::${session}`, entry.status || '');

      if (!studentStatsMap.has(reg)) {
        studentStatsMap.set(reg, { totalClasses: 0, present: 0, absent: 0, onDuty: 0, late: 0, sickLeave: 0 });
      }
      const st = studentStatsMap.get(reg);
      st.totalClasses++;
      if (entry.status === 'Present') st.present++;
      else if (entry.status === 'Absent') st.absent++;
      else if (entry.status === 'On-Duty') st.onDuty++;
      else if (entry.status === 'Late') st.late++;
      else if (entry.status === 'Sick-Leave') st.sickLeave++;
    }
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'STARS';
  wb.created = new Date();

  const sheet = wb.addWorksheet('BatchAttendance');

  // Columns
  const baseColumns = [
    { header: 'deptId', key: 'deptId', width: 12 },
    { header: 'deptName', key: 'deptName', width: 24 },
    { header: 'batchId', key: 'batchId', width: 16 },
    { header: 'batchName', key: 'batchName', width: 24 },
    { header: 'batchYear', key: 'batchYear', width: 10 },
    { header: 'regno', key: 'regno', width: 14 },
    { header: 'studentname', key: 'studentname', width: 22 }
  ];

  const dateColumns = [];
  for (const d of sortedDates) {
    dateColumns.push({ header: `${d} FN`, key: `d_${d.replace(/-/g, '')}_FN`, width: 12 });
    dateColumns.push({ header: `${d} AN`, key: `d_${d.replace(/-/g, '')}_AN`, width: 12 });
  }

  const summaryColumns = [
    { header: 'totalClasses', key: 'totalClasses', width: 14 },
    { header: 'present', key: 'present', width: 12 },
    { header: 'absent', key: 'absent', width: 12 },
    { header: 'onDuty', key: 'onDuty', width: 12 },
    { header: 'late', key: 'late', width: 12 },
    { header: 'sickLeave', key: 'sickLeave', width: 12 },
    { header: 'attendancePercentage', key: 'attendancePercentage', width: 20 }
  ];

  sheet.columns = [...baseColumns, ...dateColumns, ...summaryColumns];

  // Rows: one per student in this batch
  for (const s of students) {
    const reg = String(s.regno || '').trim().toUpperCase();
    const stats = studentStatsMap.get(reg) || { totalClasses: 0, present: 0, absent: 0, onDuty: 0, late: 0, sickLeave: 0 };

    const effectivePresent = (stats.present || 0) + (stats.onDuty || 0) + (stats.late || 0);
    const effectiveTotal = Math.max(0, (stats.totalClasses || 0) - (stats.sickLeave || 0));
    const percentage = effectiveTotal > 0 ? `${((effectivePresent / effectiveTotal) * 100).toFixed(2)}%` : '0.00%';

    const row = {
      deptId: batch.deptId || '',
      deptName,
      batchId: batch.batchId || batchId,
      batchName: batch.batchName || '',
      batchYear: batch.batchYear || '',
      regno: s.regno || '',
      studentname: s.studentname || ''
    };

    const mapForStudent = studentDateSessionMap.get(reg);
    for (const d of sortedDates) {
      const keyFN = `${d}::FN`;
      const keyAN = `${d}::AN`;
      row[`d_${d.replace(/-/g, '')}_FN`] = mapForStudent && mapForStudent.has(keyFN) ? mapForStudent.get(keyFN) : '';
      row[`d_${d.replace(/-/g, '')}_AN`] = mapForStudent && mapForStudent.has(keyAN) ? mapForStudent.get(keyAN) : '';
    }

    row.totalClasses = stats.totalClasses;
    row.present = stats.present;
    row.absent = stats.absent;
    row.onDuty = stats.onDuty;
    row.late = stats.late;
    row.sickLeave = stats.sickLeave;
    row.attendancePercentage = percentage;

    sheet.addRow(row);
  }

  // Style header
  try {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E5F4' } };
  } catch {}

  // Output path
  const outPath = outInput
    ? path.resolve(process.cwd(), outInput)
    : path.resolve(process.cwd(), 'exports', `${safeFileName(batchId)}_attendance.xlsx`);

  // Ensure directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  await wb.xlsx.writeFile(outPath);

  console.log(`\nExport complete: ${outPath}`);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

exportBatchAttendance().catch(async (err) => {
  console.error('Export failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
