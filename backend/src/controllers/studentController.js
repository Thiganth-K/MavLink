import Student from "../models/Student.js";
import fs from "fs";
import csv from "csv-parser";
import logger from "../utils/logger.js";

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
        await Student.insertMany(results);
        fs.unlinkSync(filePath); // delete temp file
        logger.info('uploadCSV success', { inserted: results.length });
        res.status(200).json({
          message: "CSV imported successfully",
          inserted: results.length
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
    const student = await Student.create(req.body);
    logger.info('createStudent success', { id: student._id });
    res.status(201).json({ message: "Student created", student });
  } catch (err) {
    logger.error('createStudent error', { error: err.message });
    res.status(500).json({ error: err });
  }
};

// ---------------- READ ALL ----------------
export const getStudents = async (req, res) => {
  try {
    const { batchId } = req.query;
    const filter = {};
    if (batchId) {
      filter.batchId = String(batchId).toUpperCase();
    }
    const students = await Student.find(filter);
    res.status(200).json(students);
        const start = Date.now();
        logger.debug('getStudents start', { query: req.query });
  } catch (err) {
        logger.info('getStudents success', { durationMs: Date.now() - start, count: students.length });
    res.status(500).json({ error: err });
  }
        logger.error('getStudents error', { error: err.message });
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
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

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
