import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";
import { parseISTDate, getNextISTDay, getISTTimestamp, toISTDateString } from "../utils/dateUtils.js";
import logger from "../utils/logger.js";

// ============================================================
// MARK ATTENDANCE FOR A SPECIFIC SESSION
// ============================================================
export const markAttendance = async (req, res) => {
  const start = Date.now();
  logger.debug('markAttendance start', { count: Array.isArray(req.body.attendanceData) ? req.body.attendanceData.length : 0, batchId: req.body.batchId, session: req.body.session });
  try {
    const { attendanceData, markedBy, batchId, date: dateInput, session } = req.body;
    // attendanceData is array of { studentId, regno, studentname, status, reason? }

    // Validate request body
    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ success: false, message: "attendanceData must be an array" });
    }

    if (!markedBy || typeof markedBy !== 'string') {
      return res.status(400).json({ success: false, message: "markedBy is required and must be a string" });
    }

    if (!batchId) {
      return res.status(400).json({ success: false, message: "batchId is required" });
    }

    if (!session || !["FN", "AN"].includes(session)) {
      return res.status(400).json({ success: false, message: "session must be 'FN' or 'AN'" });
    }

    // Authorization: ensure admin allowed for batch when role is ADMIN
    const role = req.headers['x-role'];
    if (role === 'ADMIN') {
      const adminId = req.headers['x-admin-id'];
      if (!adminId) return res.status(400).json({ success: false, message: 'x-admin-id header required' });
      const admin = await Admin.findOne({ adminId });
      if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
      if (!admin.assignedBatchIds || !admin.assignedBatchIds.includes(String(batchId).toUpperCase())) return res.status(403).json({ success: false, message: 'Admin not assigned to batch' });
    }

    // Default date to today's IST if not provided
    const dateStr = dateInput && typeof dateInput === 'string' ? dateInput : toISTDateString(getISTTimestamp());
    const attendanceDate = parseISTDate(dateStr);

    // Upsert per batch/date/session: load existing document if any
    const batchKey = String(batchId).toUpperCase();
    let doc = await Attendance.findOne({ batchId: batchKey, date: attendanceDate, session });

    if (!doc) {
      doc = new Attendance({ batchId: batchKey, date: attendanceDate, session, markedBy, markedAt: getISTTimestamp(), entries: [] });
    }

    // Build a map of existing entries by studentId
    const existingMap = new Map();
    doc.entries.forEach(e => existingMap.set(String(e.studentId), e));

    const results = [];
    const errors = [];

    // Optionally validate batch students membership if Batch exists
    const batch = await Batch.findOne({ batchId: batchKey });
    let allowedRegnos = null;
    if (batch && Array.isArray(batch.students)) {
      allowedRegnos = new Set(batch.students.map(s => String(s.regno).toUpperCase()));
    }

    for (const rec of attendanceData) {
      try {
        const { studentId, regno, studentname, status, reason } = rec;

        if (!studentId || !regno || !studentname || !status) {
          errors.push({ studentId: studentId || 'unknown', error: 'Missing required fields' });
          continue;
        }

        if (!["Present", "Absent", "On-Duty"].includes(status)) {
          errors.push({ studentId, error: 'Status must be Present, Absent, or On-Duty' });
          continue;
        }

        if (status === 'On-Duty') {
          if (!reason || String(reason).trim().length < 3) {
            errors.push({ studentId, error: 'On-Duty entries require a reason (min 3 chars)' });
            continue;
          }
        }

        if (allowedRegnos && !allowedRegnos.has(String(regno).toUpperCase())) {
          errors.push({ studentId, error: `Student ${regno} not in batch ${batchKey}` });
          continue;
        }

        const key = String(studentId);
        const existing = existingMap.get(key);

        if (existing) {
          const existingReason = existing.reason || '';
          if (existing.status === status && (status !== 'On-Duty' || existingReason === (reason || ''))) {
            results.push({ studentId, regno, studentname, action: 'unchanged', status });
          } else {
            existing.status = status;
            existing.reason = status === 'On-Duty' ? reason : undefined;
            results.push({ studentId, regno, studentname, action: 'updated', status });
          }
        } else {
          // push new entry
          doc.entries.push({ studentId, regno, studentname, status, reason: status === 'On-Duty' ? reason : undefined });
          results.push({ studentId, regno, studentname, action: 'created', status });
        }
      } catch (err) {
        errors.push({ studentId: rec.studentId || 'unknown', error: err.message });
      }
    }

    // Update markedBy/markedAt and save
    doc.markedBy = markedBy;
    doc.markedAt = getISTTimestamp();
    try {
      await doc.save();
    } catch (saveErr) {
      // Handle duplicate key race (another process created the doc concurrently)
      if (saveErr && saveErr.code === 11000) {
        console.warn('Duplicate attendance doc detected while saving. Merging entries with existing doc.');
        const fresh = await Attendance.findOne({ batchId: batchKey, date: attendanceDate, session });
        if (fresh) {
          // build map from fresh entries
          const freshMap = new Map();
          (Array.isArray(fresh.entries) ? fresh.entries : []).forEach(e => freshMap.set(String(e.studentId), e));
          // merge entries from our doc (overwrite with our version)
          (Array.isArray(doc.entries) ? doc.entries : []).forEach(e => freshMap.set(String(e.studentId), e));
          fresh.entries = Array.from(freshMap.values());
          fresh.markedBy = markedBy;
          fresh.markedAt = getISTTimestamp();
          await fresh.save();
          doc = fresh; // use the saved fresh doc for response
        } else {
          // rethrow if fresh doc not found
          throw saveErr;
        }
      } else {
        throw saveErr;
      }
    }

    logger.info('markAttendance success', { durationMs: Date.now() - start, successCount: results.length, errorCount: errors.length, batchId: batchKey, session });
    return res.status(200).json({
      success: true,
      message: `Attendance processed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: attendanceData.length,
      successCount: results.length,
      errorCount: errors.length,
      attendanceDocument: doc.toObject()
    });

  } catch (error) {
    logger.error('markAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message
    });
  }
};

// ============================================================
// GET ATTENDANCE BY DATE (BOTH FN AND AN SESSIONS)
// ============================================================
export const getAttendanceByDate = async (req, res) => {
  const start = Date.now();
  logger.debug('getAttendanceByDate start', { query: req.query });
  try {
    const { date, batchId } = req.query;

    // Default to today IST if no date provided
    const dateStr = date && typeof date === 'string' ? date : toISTDateString(getISTTimestamp());
    const attendanceDate = parseISTDate(dateStr);
    const nextDate = getNextISTDay(attendanceDate);

    const filter = { date: { $gte: attendanceDate, $lt: nextDate } };
    if (batchId) filter.batchId = String(batchId).toUpperCase();

    const docs = await Attendance.find(filter).sort({ session: 1 });

    // Flatten entries per session
    const fnRecords = [];
    const anRecords = [];
    docs.forEach(doc => {
      const entries = Array.isArray(doc.entries) ? doc.entries : [];
      entries.forEach(e => {
        const rec = {
          batchId: doc.batchId,
          session: doc.session,
          studentId: e.studentId,
          regno: e.regno,
          studentname: e.studentname,
          status: e.status,
          reason: e.reason || null,
          markedBy: doc.markedBy,
          markedAt: doc.markedAt
        };
        if (doc.session === 'FN') fnRecords.push(rec);
        else if (doc.session === 'AN') anRecords.push(rec);
      });
    });

    logger.info('getAttendanceByDate success', { durationMs: Date.now() - start, fnCount: fnRecords.length, anCount: anRecords.length });
    return res.status(200).json({
      success: true,
      message: `Found ${fnRecords.length + anRecords.length} attendance entries for ${dateStr}`,
      data: { FN: fnRecords, AN: anRecords },
      summary: {
        date: dateStr,
        fnCount: fnRecords.length,
        anCount: anRecords.length,
        total: fnRecords.length + anRecords.length
      }
    });

  } catch (error) {
    logger.error('getAttendanceByDate error', { error: error.message });
    return res.status(500).json({ success: false, message: "Failed to fetch attendance", error: error.message });
  }
};

// ============================================================
// GET ATTENDANCE BY DATE AND SESSION (FN OR AN ONLY)
// ============================================================
export const getAttendanceByDateAndSession = async (req, res) => {
  const start = Date.now();
  logger.debug('getAttendanceByDateAndSession start', { query: req.query });
  try {
    const { date, session, batchId } = req.query;

    if (!session || !["FN", "AN"].includes(session)) return res.status(400).json({ success: false, message: "session query parameter is required and must be 'FN' or 'AN'" });

    const dateStr = date && typeof date === 'string' ? date : toISTDateString(getISTTimestamp());
    const attendanceDate = parseISTDate(dateStr);
    const nextDate = getNextISTDay(attendanceDate);

    const filter = { date: { $gte: attendanceDate, $lt: nextDate }, session };
    if (batchId) filter.batchId = String(batchId).toUpperCase();

    const docs = await Attendance.find(filter).sort({ 'entries.studentname': 1 });

    const flattened = [];
    docs.forEach(doc => {
      const entries = Array.isArray(doc.entries) ? doc.entries : [];
      entries.forEach(e => flattened.push({ batchId: doc.batchId, studentId: e.studentId, regno: e.regno, studentname: e.studentname, status: e.status, reason: e.reason || null, markedBy: doc.markedBy, markedAt: doc.markedAt }));
    });

    const presentCount = flattened.filter(r => r.status === 'Present').length;
    const absentCount = flattened.filter(r => r.status === 'Absent').length;
    const onDutyCount = flattened.filter(r => r.status === 'On-Duty').length;

    logger.info('getAttendanceByDateAndSession success', { durationMs: Date.now() - start, count: flattened.length, session });
    return res.status(200).json({ success: true, message: `Found ${flattened.length} attendance entries for ${session} on ${dateStr}`, data: flattened, summary: { date: dateStr, session, totalRecords: flattened.length, presentCount, absentCount, onDutyCount } });

  } catch (error) {
    logger.error('getAttendanceByDateAndSession error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message
    });
  }
};

// ============================================================
// GET SESSION SUMMARY BY DATE (STATS FOR BOTH FN AND AN)
// ============================================================
export const getSessionSummaryByDate = async (req, res) => {
  const start = Date.now();
  logger.debug('getSessionSummaryByDate start', { query: req.query });
  try {
    const { date } = req.query;

    const dateStr = date && typeof date === 'string' ? date : toISTDateString(getISTTimestamp());
    const attendanceDate = parseISTDate(dateStr);
    const nextDate = getNextISTDay(attendanceDate);

    const docs = await Attendance.find({ date: { $gte: attendanceDate, $lt: nextDate } });

    const fnEntries = [];
    const anEntries = [];
    docs.forEach(doc => {
      const entries = Array.isArray(doc.entries) ? doc.entries : [];
      entries.forEach(e => {
        if (doc.session === 'FN') fnEntries.push(e);
        else if (doc.session === 'AN') anEntries.push(e);
      });
    });

    const fnSummary = { session: 'FN', totalRecords: fnEntries.length, presentCount: fnEntries.filter(r => r.status === 'Present').length, absentCount: fnEntries.filter(r => r.status === 'Absent').length, onDutyCount: fnEntries.filter(r => r.status === 'On-Duty').length };
    const anSummary = { session: 'AN', totalRecords: anEntries.length, presentCount: anEntries.filter(r => r.status === 'Present').length, absentCount: anEntries.filter(r => r.status === 'Absent').length, onDutyCount: anEntries.filter(r => r.status === 'On-Duty').length };

    logger.info('getSessionSummaryByDate success', { durationMs: Date.now() - start, fnTotal: fnEntries.length, anTotal: anEntries.length });
    return res.status(200).json({ success: true, message: `Session summary for ${dateStr}`, date: dateStr, summary: { FN: fnSummary, AN: anSummary, totalRecords: fnEntries.length + anEntries.length } });

  } catch (error) {
    logger.error('getSessionSummaryByDate error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session summary",
      error: error.message
    });
  }
};

// ============================================================
// GET ATTENDANCE BY DATE RANGE (WITH SESSION GROUPING)
// ============================================================
export const getAttendanceByDateRange = async (req, res) => {
  const start = Date.now();
  logger.debug('getAttendanceByDateRange start', { query: req.query });
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate query parameters are required"
      });
    }

    const start = parseISTDate(startDate);
    const end = parseISTDate(endDate);
    // Set end to end of day
    end.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({ date: { $gte: start, $lte: end } }).sort({ date: 1, session: 1 });

    // Group by date and session and flatten entries
    const groupedData = {};
    attendanceRecords.forEach(doc => {
      const dateKey = toISTDateString(doc.date);
      if (!groupedData[dateKey]) groupedData[dateKey] = { FN: [], AN: [] };
      const entries = Array.isArray(doc.entries) ? doc.entries : [];
      entries.forEach(e => groupedData[dateKey][doc.session].push({ batchId: doc.batchId, studentId: e.studentId, regno: e.regno, studentname: e.studentname, status: e.status, reason: e.reason || null }));
    });

    // Count total flattened entries
    const totalRecords = Object.values(groupedData).reduce((acc, d) => acc + (d.FN.length + d.AN.length), 0);

    logger.info('getAttendanceByDateRange success', { durationMs: Date.now() - start, totalRecords, datesCount: Object.keys(groupedData).length });
    return res.status(200).json({ success: true, message: `Found ${totalRecords} records from ${startDate} to ${endDate}`, data: attendanceRecords, groupedByDate: groupedData, summary: { startDate, endDate, totalRecords, datesCount: Object.keys(groupedData).length } });

  } catch (error) {
    logger.error('getAttendanceByDateRange error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message
    });
  }
};

// ============================================================
// GET ATTENDANCE SUMMARY BY DATE (GROUPED BY DATE AND SESSION)
// ============================================================
export const getAttendanceByDateSummary = async (req, res) => {
  const start = Date.now();
  logger.debug('getAttendanceByDateSummary start', { query: req.query });
  try {
    const { batchId } = req.query;
    const { dates } = req.query;

    if (!dates) return res.status(400).json({ success: false, message: "dates query parameter is required (comma-separated)" });

    const dateArray = dates.split(',').map(d => d.trim());
    const summaries = [];

    for (const dateStr of dateArray) {
      const attendanceDate = parseISTDate(dateStr);
      const nextDate = getNextISTDay(attendanceDate);
      const filter = { date: { $gte: attendanceDate, $lt: nextDate } };
      if (batchId) filter.batchId = String(batchId).toUpperCase();

      const docs = await Attendance.find(filter);
      const fnEntries = [];
      const anEntries = [];
      docs.forEach(doc => {
        const entries = Array.isArray(doc.entries) ? doc.entries : [];
        entries.forEach(e => {
          if (doc.session === 'FN') fnEntries.push(e);
          else if (doc.session === 'AN') anEntries.push(e);
        });
      });

      summaries.push({ date: dateStr, FN: { total: fnEntries.length, present: fnEntries.filter(r => r.status === 'Present').length, absent: fnEntries.filter(r => r.status === 'Absent').length, onDuty: fnEntries.filter(r => r.status === 'On-Duty').length }, AN: { total: anEntries.length, present: anEntries.filter(r => r.status === 'Present').length, absent: anEntries.filter(r => r.status === 'Absent').length, onDuty: anEntries.filter(r => r.status === 'On-Duty').length } });
    }

    logger.info('getAttendanceByDateSummary success', { durationMs: Date.now() - start, dates: dateArray.length });
    return res.status(200).json({ success: true, message: `Summary for ${dateArray.length} dates`, data: summaries });

  } catch (error) {
    logger.error('getAttendanceByDateSummary error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance summary",
      error: error.message
    });
  }
};

// ============================================================
// GET STUDENTS FOR A BATCH (HELPER FOR MARKING ATTENDANCE)
// ============================================================
export const getStudentsByBatch = async (req, res) => {
  const start = Date.now();
  logger.debug('getStudentsByBatch start', { query: req.query });
  try {
    const { batchId, date: dateQuery, session } = req.query;
    if (!batchId) return res.status(400).json({ success: false, message: 'batchId query parameter is required' });

    const key = String(batchId).toUpperCase();
    const students = await Student.find({ batchId: key }).sort({ regno: 1 }).select('_id regno studentname dept');

    // If session is provided (FN/AN), optionally include existing attendance status/reason for the given date.
    let attendanceMap = new Map();
    if (session && (String(session) === 'FN' || String(session) === 'AN')) {
      // Default date to today's IST if not provided
      const dateStr = dateQuery && typeof dateQuery === 'string' ? dateQuery : toISTDateString(getISTTimestamp());
      const attendanceDate = parseISTDate(dateStr);

      const doc = await Attendance.findOne({ batchId: key, date: attendanceDate, session: String(session) });
      if (doc && Array.isArray(doc.entries)) {
        doc.entries.forEach(e => {
          try {
            const sid = String(e.studentId);
            attendanceMap.set(sid, { status: e.status, reason: e.reason || null, markedBy: doc.markedBy, markedAt: doc.markedAt });
          } catch (err) {
            // skip malformed entry
          }
        });
      }
    }

    // Attach attendance info (if any) to student records
    const studentsWithStatus = students.map(s => {
      const base = { _id: s._id, regno: s.regno, studentname: s.studentname, dept: s.dept };
      const info = attendanceMap.get(String(s._id));
      if (info) return { ...base, status: info.status, reason: info.reason, markedBy: info.markedBy, markedAt: info.markedAt };
      return { ...base, status: null, reason: null };
    });

    logger.info('getStudentsByBatch success', { durationMs: Date.now() - start, count: students.length, batchId: key });
    return res.status(200).json({ success: true, message: `Found ${students.length} students for batch ${key}`, data: studentsWithStatus });
  } catch (error) {
    logger.error('getStudentsByBatch error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch students for batch', error: error.message });
  }
};
