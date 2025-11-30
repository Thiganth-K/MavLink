import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import logger from "../utils/logger.js";
import ExcelJS from "exceljs";
import { parseISTDate, getNextISTDay, getTodayIST, toISTDateString } from '../utils/dateUtils.js';

// ---------- LOGIN ----------
export const loginController = async (req, res) => {
  logger.debug('loginController start', { bodyKeys: Object.keys(req.body || {}) });
  const { username, password } = req.body;

  const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  // SUPER ADMIN LOGIN (from .env)
  if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
    logger.info('loginController superadmin success', { username });
    return res.status(200).json({
      message: "Super Admin login successful",
      role: "SUPER_ADMIN",
      user: { username }
    });
  }

  // ADMIN LOGIN (from DB)
  const adminUser = await Admin.findOne({ username });

  if (!adminUser) {
    logger.warn('loginController admin not found', { username });
    return res.status(404).json({ message: "User not found" });
  }

  if (password !== adminUser.password) {
    logger.warn('loginController invalid credentials', { username });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  logger.info('loginController admin success', { username });
  return res.status(200).json({
    message: "Admin login successful",
    role: adminUser.role,
    user: { username: adminUser.username, adminId: adminUser.adminId, assignedBatchIds: adminUser.assignedBatchIds }
  });
};

// ---------- CREATE ADMIN ----------
export const createAdmin = async (req, res) => {
  logger.debug('createAdmin start', { bodyKeys: Object.keys(req.body || {}) });
  const { adminId, username, password } = req.body;

  try {
    const newAdmin = await Admin.create({
      adminId,
      username,
      password,
      role: "ADMIN"
    });

    logger.info('createAdmin success', { adminId });
    return res.status(201).json({
      message: "Admin created successfully",
      admin: newAdmin
    });
  } catch (err) {
    logger.error('createAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error creating admin", error: err });
  }
};

// ---------- READ ALL ADMINS ----------
export const getAdmins = async (req, res) => {
  const start = Date.now();
  logger.debug('getAdmins start');
  try {
    const admins = await Admin.find();
    logger.info('getAdmins success', { durationMs: Date.now() - start, count: admins.length });
    return res.status(200).json(admins);
  } catch (err) {
    logger.error('getAdmins error', { error: err.message });
    return res.status(500).json({ message: "Error fetching admins" });
  }
};

// ---------- UPDATE ADMIN ----------
export const updateAdmin = async (req, res) => {
  const start = Date.now();
  logger.debug('updateAdmin start', { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
	const { id } = req.params;
	const { username, password, adminId, assignedBatchIds } = req.body;

  try {
    const updateFields = {};
    if (username) updateFields.username = username;
    if (password) updateFields.password = password;
    if (adminId) updateFields.adminId = adminId;
    if (Array.isArray(assignedBatchIds)) updateFields.assignedBatchIds = assignedBatchIds;
    const updated = await Admin.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updated) {
      logger.warn('updateAdmin not found', { id });
      return res.status(404).json({ message: "Admin not found" });
    }

    logger.info('updateAdmin success', { durationMs: Date.now() - start, id });
    return res.status(200).json({
      message: "Admin updated successfully",
      admin: updated
    });
  } catch (err) {
    logger.error('updateAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error updating admin" });
  }
};

// ---------- DELETE ADMIN ----------
export const deleteAdmin = async (req, res) => {
  const start = Date.now();
  logger.debug('deleteAdmin start', { id: req.params.id });
  const { id } = req.params;

  try {
    const deleted = await Admin.findByIdAndDelete(id);

    if (!deleted) {
      logger.warn('deleteAdmin not found', { id });
      return res.status(404).json({ message: "Admin not found" });
    }

    logger.info('deleteAdmin success', { durationMs: Date.now() - start, id });
    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    logger.error('deleteAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error deleting admin" });
  }
};

export const logoutSuperAdmin = (req, res) => {
  logger.info('logoutSuperAdmin');
  return res.status(200).json({
    message: "Super Admin logged out successfully"
  });
};

// ---------- EXPORT DATA (EXCEL) ----------
// Generates a workbook with multiple sheets: Admins, Batches, Departments, Students, Attendance
// Only SUPER_ADMIN role should invoke (simple header check for now)
// exportPlatformData feature removed per request

// ---------- ADMIN ↔ BATCH MAPPING ----------
// Returns each admin with its enriched batch list plus unassigned batches.
// Shape:
// { admins: [ { adminId, username, batches: [{ batchId, batchName, batchYear, deptId }] } ], unassignedBatches: [...], totalAdmins, totalBatches, generatedAt }
export const getAdminBatchMapping = async (req, res) => {
  const start = Date.now();
  logger.debug('getAdminBatchMapping start');
  try {
    const [adminsRaw, batchesRaw] = await Promise.all([
      Admin.find().lean(),
      Batch.find().lean()
    ]);

    // Build quick lookup of batches by adminId
    const batchesByAdmin = new Map();
    for (const b of batchesRaw) {
      const key = (b.adminId || '').trim();
      if (!key) continue;
      if (!batchesByAdmin.has(key)) batchesByAdmin.set(key, []);
      batchesByAdmin.get(key).push({
        batchId: b.batchId,
        batchName: b.batchName,
        batchYear: b.batchYear,
        deptId: b.deptId
      });
    }

    const admins = adminsRaw.map(a => ({
      adminId: a.adminId,
      username: a.username,
      batches: batchesByAdmin.get(a.adminId) || []
    }));

    // Identify unassigned batches (no adminId)
    const unassignedBatches = batchesRaw.filter(b => !b.adminId).map(b => ({
      batchId: b.batchId,
      batchName: b.batchName,
      batchYear: b.batchYear,
      deptId: b.deptId
    }));

    logger.info('getAdminBatchMapping success', { durationMs: Date.now() - start, admins: admins.length, batches: batchesRaw.length, unassignedCount: unassignedBatches.length });
    return res.status(200).json({
      admins,
      unassignedBatches,
      totalAdmins: admins.length,
      totalBatches: batchesRaw.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error('getAdminBatchMapping error', { error: err.message });
    return res.status(500).json({ message: 'Failed to build mapping', error: err.message });
  }
};

// ---------- ADVANCED EXPORT (filtered by departments and date presets) ----------
// GET /api/superadmin/export-advanced?deptIds=a,b&preset=today|thisWeek|thisMonth|all&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// If deptIds omitted or equals 'ALL', exports all departments.
// If preset provided, overrides start/endDate.
export const exportAdvancedData = async (req, res) => {
  const start = Date.now();
  logger.debug('exportAdvancedData start', { query: req.query });
  try {
    const role = req.headers['x-role'] || req.headers['X-Role'];
    if (role !== 'SUPER_ADMIN') {
      logger.warn('exportAdvancedData forbidden', { role });
      return res.status(403).json({ message: 'SUPER_ADMIN role required for export' });
    }

    const { deptIds, preset, startDate: qStart, endDate: qEnd } = req.query || {};

    // Resolve date range using IST-aware helpers. We'll treat startDate as inclusive (IST midnight)
    // and endDate as inclusive by making the query use an exclusive upper bound (next IST day).
    let startDate = qStart ? parseISTDate(String(qStart)) : null;
    let endDate = qEnd ? parseISTDate(String(qEnd)) : null;

    const p = String(preset || '').toLowerCase();
    if (p) {
      if (p === 'today') {
        const todayStr = getTodayIST();
        startDate = parseISTDate(todayStr);
        endDate = parseISTDate(todayStr);
      } else if (p === 'thisweek') {
        const todayStr = getTodayIST();
        const todayIST = parseISTDate(todayStr);
        const day = todayIST.getUTCDay(); // 0..6, Sun=0
        const diffToMonday = (day + 6) % 7;
        const monday = new Date(todayIST);
        monday.setUTCDate(todayIST.getUTCDate() - diffToMonday);
        const sunday = new Date(monday);
        sunday.setUTCDate(monday.getUTCDate() + 6);
        startDate = parseISTDate(new Date(monday).toISOString().slice(0,10));
        endDate = parseISTDate(new Date(sunday).toISOString().slice(0,10));
      } else if (p === 'thismonth') {
        const todayStr = getTodayIST();
        const [yy, mm] = todayStr.split('-');
        const year = Number(yy);
        const month = Number(mm);
        const firstStr = `${year}-${String(month).padStart(2,'0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastStr = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
        startDate = parseISTDate(firstStr);
        endDate = parseISTDate(lastStr);
      } else if (p === 'all') {
        startDate = null;
        endDate = null;
      }
    }

    // Determine departments filter
    let deptFilterIds = [];
    if (deptIds && String(deptIds).trim().length) {
      if (String(deptIds).toUpperCase() !== 'ALL') {
        deptFilterIds = String(deptIds).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Fetch datasets
    const [admins, departments] = await Promise.all([
      Admin.find().lean(),
      Department.find().lean()
    ]);

    // Batches filtered by departments (or all)
    const batchQuery = deptFilterIds.length ? { deptId: { $in: deptFilterIds } } : {};
    const batches = await Batch.find(batchQuery).lean();
    const batchIds = new Set(batches.map(b => b.batchId));

    // Students filtered by those batches (or all departments if none specified)
    const students = await Student.find(deptFilterIds.length ? { dept: { $in: departments.filter(d => deptFilterIds.includes(d.deptId)).map(d => d.deptName) } } : {}).lean();

    // Attendance filtered by batchId set and date range
    const attendanceQuery = {};
    if (batchIds.size) attendanceQuery['batchId'] = { $in: Array.from(batchIds) };
    if (startDate && endDate) {
      // Use exclusive upper bound for end date: date >= startDate && date < nextDay(endDate)
      const endExclusive = getNextISTDay(endDate);
      attendanceQuery['date'] = { $gte: startDate, $lt: endExclusive };
    }
    const attendance = await Attendance.find(attendanceQuery).lean();

    // Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Stars';
    wb.created = new Date();

    const metaSheet = wb.addWorksheet('ExportMeta');
    metaSheet.addRow(['GeneratedAt', new Date().toISOString()]);
    metaSheet.addRow(['Preset', p || 'custom']);
    metaSheet.addRow(['StartDate', startDate ? startDate.toISOString().slice(0,10) : '']);
    metaSheet.addRow(['EndDate', endDate ? endDate.toISOString().slice(0,10) : '']);
    metaSheet.addRow(['DeptIds', deptFilterIds.length ? deptFilterIds.join(',') : 'ALL']);

    const adminSheet = wb.addWorksheet('Admins');
    adminSheet.columns = [
      { header: 'adminId', key: 'adminId', width: 16 },
      { header: 'username', key: 'username', width: 20 },
      { header: 'role', key: 'role', width: 14 },
      { header: 'assignedBatchIds', key: 'assignedBatchIds', width: 40 }
    ];
    admins.forEach(a => adminSheet.addRow({
      adminId: a.adminId,
      username: a.username,
      role: a.role,
      assignedBatchIds: (a.assignedBatchIds || []).join(',')
    }));

    const deptSheet = wb.addWorksheet('Departments');
    deptSheet.columns = [
      { header: 'deptId', key: 'deptId', width: 12 },
      { header: 'deptName', key: 'deptName', width: 24 }
    ];
    (deptFilterIds.length ? departments.filter(d => deptFilterIds.includes(d.deptId)) : departments)
      .forEach(d => deptSheet.addRow({ deptId: d.deptId, deptName: d.deptName }));

    const batchSheet = wb.addWorksheet('Batches');
    batchSheet.columns = [
      { header: 'batchId', key: 'batchId', width: 16 },
      { header: 'batchName', key: 'batchName', width: 20 },
      { header: 'batchYear', key: 'batchYear', width: 10 },
      { header: 'deptId', key: 'deptId', width: 12 },
      { header: 'adminId', key: 'adminId', width: 16 }
    ];
    batches.forEach(b => batchSheet.addRow({ batchId: b.batchId, batchName: b.batchName, batchYear: b.batchYear, deptId: b.deptId, adminId: b.adminId || '' }));

    const studentSheet = wb.addWorksheet('Students');
    studentSheet.columns = [
      { header: 'regno', key: 'regno', width: 16 },
      { header: 'studentname', key: 'studentname', width: 20 },
      { header: 'dept', key: 'dept', width: 12 },
      { header: 'batchId', key: 'batchId', width: 16 },
      { header: 'email', key: 'email', width: 28 },
      { header: 'phno', key: 'phno', width: 16 }
    ];
    students.forEach(s => studentSheet.addRow({ regno: s.regno, studentname: s.studentname, dept: s.dept, batchId: s.batchId || '', email: s.email, phno: s.phno }));

    const attendanceSheet = wb.addWorksheet('Attendance');
    attendanceSheet.columns = [
      { header: 'batchId', key: 'batchId', width: 12 },
      { header: 'date', key: 'date', width: 14 },
      { header: 'session', key: 'session', width: 8 },
      { header: 'markedBy', key: 'markedBy', width: 18 },
      { header: 'regno', key: 'regno', width: 14 },
      { header: 'studentname', key: 'studentname', width: 20 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'reason', key: 'reason', width: 30 }
    ];
    attendance.forEach(a => {
      const dateStr = a.date ? toISTDateString(new Date(a.date)) : '';
      (a.entries || []).forEach(entry => {
        attendanceSheet.addRow({
          batchId: a.batchId,
          date: dateStr,
          session: a.session,
          markedBy: a.markedBy,
          regno: entry.regno,
          studentname: entry.studentname,
          status: entry.status,
          reason: entry.reason || ''
        });
      });
    });

    // Calculate attendance percentage for each student
    const studentAttendanceMap = new Map();
    attendance.forEach(a => {
      (a.entries || []).forEach(entry => {
        const key = entry.regno;
        if (!studentAttendanceMap.has(key)) {
          studentAttendanceMap.set(key, {
            regno: entry.regno,
            studentname: entry.studentname,
            totalClasses: 0,
            present: 0,
            absent: 0,
            onDuty: 0
          });
        }
        const stats = studentAttendanceMap.get(key);
        stats.totalClasses++;
        if (entry.status === 'Present') stats.present++;
        else if (entry.status === 'Absent') stats.absent++;
        else if (entry.status === 'On-Duty') stats.onDuty++;
      });
    });

    // Create Attendance Summary sheet
    const summarySheet = wb.addWorksheet('Attendance Summary');
    summarySheet.columns = [
      { header: 'regno', key: 'regno', width: 16 },
      { header: 'studentname', key: 'studentname', width: 20 },
      { header: 'totalClasses', key: 'totalClasses', width: 14 },
      { header: 'present', key: 'present', width: 12 },
      { header: 'absent', key: 'absent', width: 12 },
      { header: 'onDuty', key: 'onDuty', width: 12 },
      { header: 'attendancePercentage', key: 'attendancePercentage', width: 20 }
    ];
    
    Array.from(studentAttendanceMap.values())
      .sort((a, b) => a.regno.localeCompare(b.regno))
      .forEach(stats => {
        const percentage = stats.totalClasses > 0 
          ? ((stats.present / stats.totalClasses) * 100).toFixed(2) 
          : '0.00';
        summarySheet.addRow({
          regno: stats.regno,
          studentname: stats.studentname,
          totalClasses: stats.totalClasses,
          present: stats.present,
          absent: stats.absent,
          onDuty: stats.onDuty,
          attendancePercentage: `${percentage}%`
        });
      });

    [metaSheet, adminSheet, deptSheet, batchSheet, studentSheet, attendanceSheet, summarySheet].forEach(sh => {
      sh.getRow(1).font = { bold: true };
      sh.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      sh.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E5F4' }
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stars_export_advanced.xlsx"');
    await wb.xlsx.write(res);
    res.end();
    logger.info('exportAdvancedData success', { durationMs: Date.now() - start, admins: admins.length, batches: batches.length, departments: departments.length, students: students.length, attendanceDocs: attendance.length });
  } catch (err) {
    logger.error('exportAdvancedData error', { error: err.message });
    res.status(500).json({ message: 'Failed to export data', error: err.message });
  }
};