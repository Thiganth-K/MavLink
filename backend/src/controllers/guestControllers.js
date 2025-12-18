import logger from '../utils/logger.js';
import ExcelJS from 'exceljs';
import Batch from '../models/Batch.js';
import Department from '../models/Department.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import { toISTDateString, parseISTDate, getNextISTDay } from '../utils/dateUtils.js';

// Simple guest profile endpoint. Relies on verifyGuest middleware which
// attaches `req.guest` (Guest document) after verifying headers.
export const getProfile = async (req, res) => {
  try {
    const guest = req.guest;
    if (!guest) return res.status(404).json({ message: 'Guest not found' });

    const payload = {
      username: guest.username,
      guestId: guest.guestId,
      assignedBatchIds: guest.assignedBatchIds || [],
      role: guest.role || 'GUEST',
      password: guest.password,
      isActive: guest.isActive !== false
    };

    logger.debug('guest getProfile success', { guestId: guest.guestId });
    return res.status(200).json({ message: 'Profile fetched', profile: payload });
  } catch (err) {
    logger.error('guest getProfile error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Export data for a guest: one sheet per assigned batch with student attendance
export const exportGuestData = async (req, res) => {
  const start = Date.now();
  logger.debug('exportGuestData start', { guestId: req.guest && req.guest.guestId, query: req.query });

  try {
    const guest = req.guest;
    if (!guest) return res.status(404).json({ message: 'Guest not found' });

    let assignedBatchIds = Array.isArray(guest.assignedBatchIds) ? guest.assignedBatchIds.map(x => String(x).toUpperCase()) : [];
    if (!assignedBatchIds.length) return res.status(400).json({ message: 'No batches assigned to guest' });

    // Optional: limit export to specific batches via `batchIds` (comma-separated or array) or legacy `batchId`.
    let requestedBatchIds = null;
    if (req.query && req.query.batchIds) {
      if (Array.isArray(req.query.batchIds)) requestedBatchIds = req.query.batchIds.map(x => String(x).toUpperCase());
      else requestedBatchIds = String(req.query.batchIds).split(',').map(x => String(x).trim().toUpperCase()).filter(Boolean);
    } else if (req.query && req.query.batchId) {
      requestedBatchIds = [String(req.query.batchId).toUpperCase()];
    }

    if (requestedBatchIds && requestedBatchIds.length) {
      // ensure requested batches are subset of assigned batches
      const notAssigned = requestedBatchIds.filter(b => !assignedBatchIds.includes(b));
      if (notAssigned.length) {
        logger.warn('exportGuestData forbidden - requested batch not assigned to guest', { guestId: guest.guestId, notAssigned });
        return res.status(403).json({ message: 'Not assigned to one or more requested batches' });
      }
      assignedBatchIds = requestedBatchIds;
    }

    // Date range support (optional) - similar to superadmin export
    const { startDate: qStart, endDate: qEnd, allDates: allDatesParam } = req.query || {};
    let startDate = qStart ? parseISTDate(String(qStart)) : null;
    let endDate = qEnd ? parseISTDate(String(qEnd)) : null;
    const allDates = (typeof allDatesParam === 'string' && (allDatesParam === 'true' || allDatesParam === '1')) || false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'STARS-Guest-Export';
    wb.created = new Date();

    // Fetch batches that guest is assigned to
    const batches = await Batch.find({ batchId: { $in: assignedBatchIds } }).lean();
    const batchById = new Map();
    batches.forEach(b => batchById.set(b.batchId, b));

    // Fetch departments for mapping deptId -> deptName
    const deptIds = Array.from(new Set(batches.map(b => String(b.deptId || '').toUpperCase()).filter(Boolean)));
    const departments = deptIds.length ? await Department.find({ deptId: { $in: deptIds } }).lean() : [];
    const deptById = new Map();
    (departments || []).forEach(d => deptById.set(String(d.deptId).toUpperCase(), d));

    for (const batchId of assignedBatchIds) {
      const batch = batchById.get(batchId) || { batchId };

      // Fetch students for this batch
      const students = await Student.find({ batchId }).lean();

      // Build attendance query for this batch
      const attendanceQuery = { batchId };
      if (!allDates && startDate && endDate) {
        const endExclusive = getNextISTDay(endDate);
        attendanceQuery.date = { $gte: startDate, $lt: endExclusive };
      }

      const attendanceDocs = await Attendance.find(attendanceQuery).lean();

      // Build date set and maps
      const dateSet = new Set();
      const studentDateSessionMap = new Map(); // regno -> Map(date -> {FN: status, AN: status})
      const studentAttendanceMap = new Map(); // regno -> stats

      (attendanceDocs || []).forEach(a => {
        const dateStr = a.date ? toISTDateString(new Date(a.date)) : '';
        if (!dateStr) return;
        dateSet.add(dateStr);

        (a.entries || []).forEach(entry => {
          const reg = String(entry.regno || '').trim();
          if (!reg) return;

          // `session` is stored on the attendance document (a.session), not per-entry.
          const session = String(a.session || '').toUpperCase() || 'FN';
          const statusRaw = String(entry.status || '').toUpperCase();

          if (!studentDateSessionMap.has(reg)) studentDateSessionMap.set(reg, new Map());
          const mapForReg = studentDateSessionMap.get(reg);
          if (!mapForReg.has(dateStr)) mapForReg.set(dateStr, {});
          const sessObj = mapForReg.get(dateStr);
          sessObj[session] = statusRaw;

          if (!studentAttendanceMap.has(reg)) studentAttendanceMap.set(reg, { totalClasses: 0, present: 0, absent: 0, onDuty: 0, late: 0, sickLeave: 0 });
          const stats = studentAttendanceMap.get(reg);

          // Count this session towards totals
          stats.totalClasses = (stats.totalClasses || 0) + 1;
          if (statusRaw === 'P' || statusRaw === 'PRESENT') stats.present = (stats.present || 0) + 1;
          else if (statusRaw === 'A' || statusRaw === 'ABSENT') stats.absent = (stats.absent || 0) + 1;
          else if (statusRaw === 'ON_DUTY' || statusRaw === 'ONDUTY' || statusRaw === 'ON DUTY') stats.onDuty = (stats.onDuty || 0) + 1;
          else if (statusRaw === 'LATE') stats.late = (stats.late || 0) + 1;
          else if (statusRaw === 'SICK' || statusRaw === 'SICK_LEAVE' || statusRaw === 'SICKLEAVE') stats.sickLeave = (stats.sickLeave || 0) + 1;
        });
      });

      const sortedDates = Array.from(dateSet).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);

      // Build worksheet for this batch
      let sheetName = batch.batchName ? String(batch.batchName) : String(batch.batchId || 'Sheet');
      // remove characters invalid in Excel sheet names and trim
      sheetName = sheetName.replace(/[\/\?\*\:\[\]]/g, ' ').trim() || 'Sheet';
      const safeName = sheetName.substring(0, 31); // Excel sheet name limit
      const ws = wb.addWorksheet(safeName);

      // columns: meta + base + date columns (FN/AN) + summary
      const baseColumns = [
        { header: 'batchId', key: 'batchId', width: 12 },
        { header: 'batchName', key: 'batchName', width: 24 },
        { header: 'deptId', key: 'deptId', width: 12 },
        { header: 'deptName', key: 'deptName', width: 24 },
        { header: 'regno', key: 'regno', width: 14 },
        { header: 'studentname', key: 'studentname', width: 24 }
      ];

      const dateColumns = [];
      for (const d of sortedDates) {
        dateColumns.push({ header: `${d} FN`, key: `d_${d.replace(/-/g,'')}_FN`, width: 12 });
        dateColumns.push({ header: `${d} AN`, key: `d_${d.replace(/-/g,'')}_AN`, width: 12 });
      }

      const summaryColumns = [
        { header: 'totalClasses', key: 'totalClasses', width: 14 },
        { header: 'present', key: 'present', width: 10 },
        { header: 'absent', key: 'absent', width: 10 },
        { header: 'onDuty', key: 'onDuty', width: 10 },
        { header: 'late', key: 'late', width: 10 },
        { header: 'sickLeave', key: 'sickLeave', width: 10 },
        { header: 'attendancePercentage', key: 'attendancePercentage', width: 16 }
      ];

      ws.columns = [...baseColumns, ...dateColumns, ...summaryColumns];

      const allStudents = Array.isArray(students) ? students : [];
      for (const s of allStudents) {
        const reg = String(s.regno || '').trim();
        const stats = studentAttendanceMap.get(reg) || { totalClasses: 0, present: 0, absent: 0, onDuty: 0, late: 0, sickLeave: 0 };
        const effectivePresent = (stats.present || 0) + (stats.onDuty || 0) + (stats.late || 0);
        const effectiveTotal = Math.max(0, (stats.totalClasses || 0) - (stats.sickLeave || 0));
        const percentage = effectiveTotal > 0 ? `${((effectivePresent / effectiveTotal) * 100).toFixed(2)}%` : '0.00%';

        const deptDoc = deptById.get(String(batch.deptId || '').toUpperCase()) || {};
        const row = {
          batchId: batch.batchId || '',
          batchName: batch.batchName || '',
          deptId: batch.deptId || '',
          deptName: deptDoc.deptName || '',
          regno: s.regno || '',
          studentname: s.studentname || ''
        };

        const mapForStudent = studentDateSessionMap.get(reg) || new Map();
        for (const d of sortedDates) {
          const sessData = mapForStudent.get(d) || {};
          row[`d_${d.replace(/-/g,'')}_FN`] = sessData['FN'] || '';
          row[`d_${d.replace(/-/g,'')}_AN`] = sessData['AN'] || '';
        }

        row.totalClasses = stats.totalClasses;
        row.present = stats.present;
        row.absent = stats.absent;
        row.onDuty = stats.onDuty;
        row.late = stats.late;
        row.sickLeave = stats.sickLeave;
        row.attendancePercentage = percentage;

        ws.addRow(row);
      }

      try {
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      } catch (e) {}
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=\"STARS_guest_export_${guest.guestId || 'guest'}.xlsx\"`);
    await wb.xlsx.write(res);
    res.end();

    logger.info('exportGuestData success', { durationMs: Date.now() - start, batches: assignedBatchIds.length });
  } catch (err) {
    logger.error('exportGuestData error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ message: 'Failed to export guest data', error: err && err.message ? err.message : err });
  }
};

export default { getProfile, exportGuestData };
