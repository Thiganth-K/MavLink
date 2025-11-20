import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByDateRange,
  getAttendanceByStudent,
  getAllAttendance,
  deleteAttendance,
  getAttendanceStats
} from "../controllers/attendanceController.js";

const router = express.Router();

// Mark attendance (create or update)
router.post("/mark", markAttendance);

// Get attendance by date
router.get("/date", getAttendanceByDate);

// Get attendance by date range
router.get("/range", getAttendanceByDateRange);

// Get attendance by student
router.get("/student/:studentId", getAttendanceByStudent);

// Get all attendance
router.get("/", getAllAttendance);

// Get attendance statistics
router.get("/stats", getAttendanceStats);

// Delete attendance record
router.delete("/:id", deleteAttendance);

export default router;
