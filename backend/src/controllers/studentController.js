import Student from "../models/Student.js";
import fs from "fs";
import csv from "csv-parser";
import logger from "../utils/logger.js";
import Batch from '../models/Batch.js';

// ---------------- CSV UPLOAD ----------------
export const uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded" });
  }

  logger.debug('uploadCSV start', { file: req.file && req.file.originalname });

  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      try {
          const inserted = await Student.insertMany(results);
          // Sync batch snapshots for inserted students that include batchId
          try {
            for (const s of inserted) {
              const batchId = s.batchId ? String(s.batchId).toUpperCase() : null;
              if (!batchId) continue;
              const batch = await Batch.findOne({ batchId });
              if (!batch) continue;
              const exists = Array.isArray(batch.students) && batch.students.some(x => String(x.regno).toUpperCase() === String(s.regno).toUpperCase());
              if (!exists) {
                batch.students.push({ name: s.studentname, regno: s.regno, dept: s.dept, email: s.email, mobile: s.phno });
                await batch.save();
              }
            }
          } catch (syncErr) {
            logger.warn('uploadCSV: failed to sync batch snapshots', { error: syncErr && syncErr.message ? syncErr.message : syncErr });
          }

          fs.unlinkSync(filePath); // delete temp file
          logger.info('uploadCSV success', { inserted: inserted.length });
          res.status(200).json({
            message: "CSV imported successfully",
            inserted: inserted.length
          });
      } catch (err) {
        logger.error('uploadCSV error', { error: err.message });
        res.status(500).json({ message: "Error inserting CSV data", error: err });
      }
    });
};

// ---------------- CREATE ----------------
export const createStudent = async (req, res) => {
  try {
    // Log incoming headers/body for easier debugging when clients report failures
    logger.debug('createStudent request', { headers: { 'x-role': req.headers['x-role'], 'x-admin-id': req.headers['x-admin-id'] }, bodyKeys: Object.keys(req.body || {}) });

    // Basic validation to provide clearer errors back to client
    const { studentname, email, regno, dept, phno } = req.body || {};
    const missing = [];
    if (!studentname || !String(studentname).trim()) missing.push('studentname');
    if (!email || !String(email).trim()) missing.push('email');
    if (!regno || !String(regno).trim()) missing.push('regno');
    if (!dept || !String(dept).trim()) missing.push('dept');
    if (!phno || !String(phno).trim()) missing.push('phno');
    if (missing.length) return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });

    const payload = Object.assign({}, req.body);
    // Normalize regno and dept casing here to avoid surprises
    if (payload.regno) payload.regno = String(payload.regno).trim().toUpperCase();
    if (payload.dept) payload.dept = String(payload.dept).trim().toUpperCase();

    const student = await Student.create(payload);
    logger.info('createStudent success', { id: student._id });

    // If a batchId was provided, keep the Batch.students snapshot in sync
    try {
      const batchId = student.batchId ? String(student.batchId).toUpperCase() : null;
      if (batchId) {
        const batch = await Batch.findOne({ batchId });
        if (batch) {
          const exists = Array.isArray(batch.students) && batch.students.some(s => String(s.regno).toUpperCase() === String(student.regno).toUpperCase());
          if (!exists) {
            batch.students.push({ name: student.studentname, regno: student.regno, dept: student.dept, email: student.email, mobile: student.phno });
            await batch.save();
          }
        }
      }
    } catch (syncErr) {
      logger.warn('createStudent: failed to sync batch snapshot', { error: syncErr && syncErr.message ? syncErr.message : syncErr });
    }

    res.status(201).json({ message: "Student created", student });
  } catch (err) {
    logger.error('createStudent error', { error: err && err.message ? err.message : err, stack: err && err.stack ? err.stack : undefined });
    // Return readable message when mongoose validation fails
    if (err && err.name === 'ValidationError') {
      const messages = Object.values(err.errors || {}).map((e) => e.message || String(e));
      return res.status(400).json({ message: messages.join('; ') });
    }
    res.status(500).json({ message: 'Failed to create student', error: err && err.message ? err.message : err });
  }
};

// ---------------- READ ALL ----------------
export const getStudents = async (req, res) => {
  const start = Date.now();
  try {
    const { batchId } = req.query;
    const filter = {};
    if (batchId) {
      filter.batchId = String(batchId).toUpperCase();
    }
    const students = await Student.find(filter);
    logger.debug('getStudents start', { query: req.query });
    logger.info('getStudents success', { durationMs: Date.now() - start, count: students.length });
    return res.status(200).json(students);
  } catch (err) {
    logger.error('getStudents error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ error: err && err.message ? err.message : err });
  }
};

// ---------------- GET ASSIGNED STUDENTS ----------------
// Returns students that belong to batches assigned to the given admin.
// Admin identifier can be supplied via `x-admin-id` header or `adminId` query parameter.
export const getAssignedStudents = async (req, res) => {
  try {
    const adminIdHeader = req.headers['x-admin-id'];
    const adminIdQuery = req.query.adminId;
    const adminId = adminIdHeader || adminIdQuery;

    if (!adminId) return res.status(400).json({ message: 'adminId is required (header x-admin-id or query adminId)' });

    // Load Admin model lazily to avoid circular imports at top-level (Admin model is in ../models/Admin.js)
    const Admin = (await import('../models/Admin.js')).default;
    const admin = await Admin.findOne({ adminId: String(adminId).toUpperCase() });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const assigned = Array.isArray(admin.assignedBatchIds) ? admin.assignedBatchIds.map(String).map(s => s.toUpperCase()) : [];

    if (assigned.length === 0) {
      return res.status(200).json([]);
    }

    const students = await Student.find({ batchId: { $in: assigned } }).sort({ regno: 1 });
    return res.status(200).json(students);
        const start = Date.now();
        logger.debug('getAssignedStudents start', { headers: { 'x-admin-id': req.headers['x-admin-id'] }, query: req.query });
  } catch (err) {
        logger.info('getAssignedStudents success', { durationMs: Date.now() - start, count: students.length, adminId });
    console.error('Error in getAssignedStudents:', err);
    return res.status(500).json({ message: 'Failed to fetch assigned students', error: err.message });
        logger.error('getAssignedStudents error', { error: err.message });
  }
};

// ---------------- READ BY ID ----------------
export const getStudentById = async (req, res) => {
  try {
      const start = Date.now();
      logger.debug('getStudentById start', { id: req.params.id });
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json(student);
        logger.info('getStudentById success', { durationMs: Date.now() - start, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err });
        logger.error('getStudentById error', { error: err.message });
  }
};

// ---------------- UPDATE ----------------
export const updateStudent = async (req, res) => {
  try {
      const start = Date.now();
      logger.debug('updateStudent start', { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
    // Load current student to detect batch changes
    const current = await Student.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "Student not found" });

    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    // If batchId changed, update batch snapshots: remove from old, add to new
    try {
      const oldBatchId = current.batchId ? String(current.batchId).toUpperCase() : null;
      const newBatchId = updated.batchId ? String(updated.batchId).toUpperCase() : null;
      const regnoKey = String(updated.regno).toUpperCase();
      if (oldBatchId !== newBatchId) {
        if (oldBatchId) {
          const oldBatch = await Batch.findOne({ batchId: oldBatchId });
          if (oldBatch && Array.isArray(oldBatch.students)) {
            oldBatch.students = oldBatch.students.filter(s => String(s.regno).toUpperCase() !== regnoKey);
            await oldBatch.save();
          }
        }
        if (newBatchId) {
          const newBatch = await Batch.findOne({ batchId: newBatchId });
          if (newBatch) {
            const exists = Array.isArray(newBatch.students) && newBatch.students.some(s => String(s.regno).toUpperCase() === regnoKey);
            if (!exists) {
              newBatch.students.push({ name: updated.studentname, regno: updated.regno, dept: updated.dept, email: updated.email, mobile: updated.phno });
              await newBatch.save();
            }
          }
        }
      } else if (newBatchId) {
        // If same batch but other details changed (name/email/dept/phno), update snapshot
        const batch = await Batch.findOne({ batchId: newBatchId });
        if (batch && Array.isArray(batch.students)) {
          let changed = false;
          batch.students = batch.students.map(s => {
            if (String(s.regno).toUpperCase() === regnoKey) {
              changed = true;
              return { name: updated.studentname, regno: updated.regno, dept: updated.dept, email: updated.email, mobile: updated.phno };
            }
            return s;
          });
          if (changed) await batch.save();
        }
      }
    } catch (syncErr) {
      logger.warn('updateStudent: failed to sync batch snapshot', { error: syncErr && syncErr.message ? syncErr.message : syncErr });
    }

    if (!updated) return res.status(404).json({ message: "Student not found" });

        logger.info('updateStudent success', { durationMs: Date.now() - start, id: req.params.id });
    res.status(200).json({ message: "Student updated", student: updated });
  } catch (err) {
        logger.error('updateStudent error', { error: err.message });
    res.status(500).json({ error: err });
  }
};

// ---------------- DELETE ----------------
export const deleteStudent = async (req, res) => {
      const start = Date.now();
      logger.debug('deleteStudent start', { id: req.params.id });
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Student not found" });

    // Remove from batch snapshot if present
    try {
      const batchId = deleted.batchId ? String(deleted.batchId).toUpperCase() : null;
      if (batchId) {
        const batch = await Batch.findOne({ batchId });
        if (batch && Array.isArray(batch.students)) {
          batch.students = batch.students.filter(s => String(s.regno).toUpperCase() !== String(deleted.regno).toUpperCase());
          await batch.save();
        }
      }
    } catch (syncErr) {
      logger.warn('deleteStudent: failed to sync batch snapshot', { error: syncErr && syncErr.message ? syncErr.message : syncErr });
    }

    logger.info('deleteStudent success', { durationMs: Date.now() - start, id: req.params.id });

    res.status(200).json({ message: "Student deleted" });
        logger.error('deleteStudent error', { error: err.message });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

      const start = Date.now();
      logger.warn('deleteAllStudents start');

export const deleteAllStudents = async (req, res) => {
  try {
        logger.warn('deleteAllStudents success', { durationMs: Date.now() - start, deleted: result.deletedCount });
    const result = await Student.deleteMany({}); // deletes all documents

    res.status(200).json({
      success: true,
      message: "All students deleted successfully",
      deletedCount: result.deletedCount,
    });
        logger.error('deleteAllStudents error', { error: error.message });

  } catch (error) {
    console.error("Error deleting all students:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting all students",
      error: error.message,
    });
  }
};
