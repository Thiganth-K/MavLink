import Student from "../models/Student.js";
import fs from "fs";
import csv from "csv-parser";

// ---------------- CSV UPLOAD ----------------
export const uploadCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded" });
  }

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
        res.status(200).json({
          message: "CSV imported successfully",
          inserted: results.length
        });
      } catch (err) {
        res.status(500).json({ message: "Error inserting CSV data", error: err });
      }
    });
};

// ---------------- CREATE ----------------
export const createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ message: "Student created", student });
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err });
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
  } catch (err) {
    console.error('Error in getAssignedStudents:', err);
    return res.status(500).json({ message: 'Failed to fetch assigned students', error: err.message });
  }
};

// ---------------- READ BY ID ----------------
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json(student);
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

// ---------------- UPDATE ----------------
export const updateStudent = async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!updated) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ message: "Student updated", student: updated });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};

// ---------------- DELETE ----------------
export const deleteStudent = async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: err });
  }
};


export const deleteAllStudents = async (req, res) => {
  try {
    const result = await Student.deleteMany({}); // deletes all documents

    res.status(200).json({
      success: true,
      message: "All students deleted successfully",
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error("Error deleting all students:", error);

    res.status(500).json({
      success: false,
      message: "Server error while deleting all students",
      error: error.message,
    });
  }
};
