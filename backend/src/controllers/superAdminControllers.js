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
  try {
    logger.debug('loginController start', { bodyKeys: Object.keys(req.body || {}) });
    const { username, password } = req.body || {};

    const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

    logger.debug('loginController env presence', { hasSuperAdminUsername: !!SUPER_ADMIN_USERNAME, hasSuperAdminPassword: !!SUPER_ADMIN_PASSWORD });

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
  } catch (err) {
    logger.error('loginController error', { error: err && err.message ? err.message : err, stack: err && err.stack ? err.stack : undefined });
    return res.status(500).json({ message: 'Internal server error during login', error: err && err.message ? err.message : err });
  }
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

    // Build quick lookup of batches by each adminId (support many-to-many via batch.adminIds)
    const batchesByAdmin = new Map();
    for (const b of batchesRaw) {
      // Support older documents that may still have `adminId` (single) field.
      const adminIds = Array.isArray(b.adminIds)
        ? b.adminIds.map(x => String(x).trim()).filter(Boolean)
        : (b.adminId ? [String(b.adminId).trim()] : []);
      for (const key of adminIds) {
        if (!batchesByAdmin.has(key)) batchesByAdmin.set(key, []);
        batchesByAdmin.get(key).push({
          batchId: b.batchId,
          batchName: b.batchName,
          batchYear: b.batchYear,
          deptId: b.deptId
        });
      }
    }

    const admins = adminsRaw.map(a => ({
      adminId: a.adminId,
      username: a.username,
      batches: batchesByAdmin.get(a.adminId) || []
    }));

    // Identify unassigned batches (no adminIds)
    const unassignedBatches = batchesRaw.filter(b => !Array.isArray(b.adminIds) || b.adminIds.length === 0).map(b => ({
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
    // Support explicit all-dates via query param `allDates=true` or preset=all
    const allDatesParam = req.query.allDates;
    const allDates = (typeof allDatesParam === 'string' && (allDatesParam === 'true' || allDatesParam === '1')) || p === 'all';

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

    // Determine batch years filter (optional) - expects comma separated values
    let batchYearsFilter = [];
    if (req.query.batchYears && String(req.query.batchYears).trim().length) {
      batchYearsFilter = String(req.query.batchYears).split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
    }

    // Fetch datasets
    const departments = await Department.find().lean();

    // Batches filtered by departments and/or batchYears (or all)
    const batchQuery = {};
    if (deptFilterIds.length) batchQuery.deptId = { $in: deptFilterIds };
    if (batchYearsFilter.length) batchQuery.batchYear = { $in: batchYearsFilter };
    const batches = await Batch.find(batchQuery).lean();
    const batchIds = new Set(batches.map(b => b.batchId));

    // Students filtered by those batches (or all departments if none specified)
    const students = await Student.find(deptFilterIds.length ? { dept: { $in: departments.filter(d => deptFilterIds.includes(d.deptId)).map(d => d.deptName) } } : {}).lean();

    // Attendance filtered by batchId set and date range (skip date filter if allDates requested)
    const attendanceQuery = {};
    if (batchIds.size) attendanceQuery['batchId'] = { $in: Array.from(batchIds) };
    if (!allDates && startDate && endDate) {
      const endExclusive = getNextISTDay(endDate);
      attendanceQuery['date'] = { $gte: startDate, $lt: endExclusive };
    }
    const attendance = await Attendance.find(attendanceQuery).lean();

    // Build workbook with a single combined sheet: department/batch/student + date pivot + summary
    const wb = new ExcelJS.Workbook();
    wb.creator = 'STARS';
    wb.created = new Date();

    // Build lookup maps
    const batchById = new Map();
    batches.forEach(b => batchById.set(b.batchId, b));
    const deptById = new Map();
    departments.forEach(d => deptById.set(d.deptId, d.deptName));

    // Collect distinct dates and build student maps
    const dateSet = new Set();
    const studentDateSessionMap = new Map(); // regno -> Map(date::session -> status)
    const studentAttendanceMap = new Map();
    attendance.forEach(a => {
      const dateStr = a.date ? toISTDateString(new Date(a.date)) : '';
      if (!dateStr) return;
      dateSet.add(dateStr);
      (a.entries || []).forEach(entry => {
        const reg = String(entry.regno || '').trim();
        if (!reg) return;
        if (!studentDateSessionMap.has(reg)) studentDateSessionMap.set(reg, new Map());
        const sessionKey = `${dateStr}::${String(entry.session || a.session || '').toUpperCase()}`;
        studentDateSessionMap.get(reg).set(sessionKey, entry.status || '');

        if (!studentAttendanceMap.has(reg)) {
          studentAttendanceMap.set(reg, { regno: reg, studentname: entry.studentname, totalClasses: 0, present: 0, absent: 0, onDuty: 0 });
        }
        const st = studentAttendanceMap.get(reg);
        st.totalClasses++;
        if (entry.status === 'Present') st.present++;
        else if (entry.status === 'Absent') st.absent++;
        else if (entry.status === 'On-Duty') st.onDuty++;
      });
    });

    const sortedDates = Array.from(dateSet).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);

    // Build columns
    const dateColumns = [];
    for (const d of sortedDates) {
      dateColumns.push({ header: `${d} FN`, key: `d_${d.replace(/-/g,'')}_FN`, width: 12 });
      dateColumns.push({ header: `${d} AN`, key: `d_${d.replace(/-/g,'')}_AN`, width: 12 });
    }

    const baseColumns = [
      { header: 'deptId', key: 'deptId', width: 12 },
      { header: 'deptName', key: 'deptName', width: 24 },
      { header: 'batchId', key: 'batchId', width: 16 },
      { header: 'batchName', key: 'batchName', width: 20 },
      { header: 'batchYear', key: 'batchYear', width: 10 },
      { header: 'regno', key: 'regno', width: 14 },
      { header: 'studentname', key: 'studentname', width: 20 }
    ];

    const summaryColumns = [
      { header: 'totalClasses', key: 'totalClasses', width: 14 },
      { header: 'present', key: 'present', width: 12 },
      { header: 'absent', key: 'absent', width: 12 },
      { header: 'onDuty', key: 'onDuty', width: 12 },
      { header: 'attendancePercentage', key: 'attendancePercentage', width: 20 }
    ];

    const exportSheet = wb.addWorksheet('ExportData');
    exportSheet.columns = [...baseColumns, ...dateColumns, ...summaryColumns];

    // One row per student
    const allStudents = Array.isArray(students) ? students : [];
    for (const s of allStudents) {
      const reg = String(s.regno || '').trim();
      const batchInfo = batchById.get(s.batchId) || {};
      const deptName = s.dept || (batchInfo.deptId ? deptById.get(batchInfo.deptId) || '' : '');
      const stats = studentAttendanceMap.get(reg) || { totalClasses: 0, present: 0, absent: 0, onDuty: 0 };
      const percentage = stats.totalClasses > 0 ? `${((stats.present / stats.totalClasses) * 100).toFixed(2)}%` : '0.00%';

      const row = {
        deptId: batchInfo.deptId || '',
        deptName,
        batchId: s.batchId || '',
        batchName: batchInfo.batchName || '',
        batchYear: batchInfo.batchYear || '',
        regno: s.regno,
        studentname: s.studentname
      };

      const mapForStudent = studentDateSessionMap.get(reg);
      for (const d of sortedDates) {
        const keyFN = `${d}::FN`;
        const keyAN = `${d}::AN`;
        const cellKeyFN = `d_${d.replace(/-/g,'')}_FN`;
        const cellKeyAN = `d_${d.replace(/-/g,'')}_AN`;
        row[cellKeyFN] = mapForStudent && mapForStudent.has(keyFN) ? mapForStudent.get(keyFN) : '';
        row[cellKeyAN] = mapForStudent && mapForStudent.has(keyAN) ? mapForStudent.get(keyAN) : '';
      }

      row.totalClasses = stats.totalClasses;
      row.present = stats.present;
      row.absent = stats.absent;
      row.onDuty = stats.onDuty;
      row.attendancePercentage = percentage;

      exportSheet.addRow(row);
    }

    // style header
    try {
      exportSheet.getRow(1).font = { bold: true };
      exportSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      exportSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E5F4' } };
    } catch (e) {}

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="STARS_export_advanced.xlsx"');
    await wb.xlsx.write(res);
    res.end();
    logger.info('exportAdvancedData success', { durationMs: Date.now() - start, batches: batches.length, departments: departments.length, students: students.length, attendanceDocs: attendance.length });
  } catch (err) {
    logger.error('exportAdvancedData error', { error: err && err.message ? err.message : err });
    res.status(500).json({ message: 'Failed to export data', error: err && err.message ? err.message : err });
  }
};

// ---------- GET AVAILABLE EXPORT YEARS ----------
// Returns distinct batchYear values present in the Batch collection (sorted ascending)
export const getExportYears = async (req, res) => {
  const start = Date.now();
  logger.debug('getExportYears start');
  try {
    const role = req.headers['x-role'] || req.headers['X-Role'];
    if (role !== 'SUPER_ADMIN') {
      logger.warn('getExportYears forbidden', { role });
      return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    }

    const years = await Batch.distinct('batchYear');
    const yearsSorted = (Array.isArray(years) ? years.map(y => Number(y)).filter(n => !Number.isNaN(n)) : []).sort((a,b) => a - b);

    logger.info('getExportYears success', { durationMs: Date.now() - start, count: yearsSorted.length });
    return res.status(200).json(yearsSorted);
  } catch (err) {
    logger.error('getExportYears error', { error: err.message });
    return res.status(500).json({ message: 'Failed to fetch export years', error: err.message });
  }
};