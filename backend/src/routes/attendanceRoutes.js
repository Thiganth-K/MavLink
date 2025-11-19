import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByDateAndSession,
  getAttendanceByDateRange,
  getAttendanceByDateSummary,
  getSessionSummaryByDate
} from "../controllers/attendanceController.js";

const router = express.Router();

// ============================================================
// ATTENDANCE ROUTES WITH SESSION SUPPORT
// ============================================================

// Mark attendance for a specific session (FN or AN)
// POST /api/attendance/mark
// Body: { attendanceData: [{ studentId, regno, studentname, date, session, status }], markedBy }
router.post("/mark", markAttendance);

// Get attendance by date (returns both FN and AN sessions)
// GET /api/attendance/date?date=YYYY-MM-DD
router.get("/date", getAttendanceByDate);

// Get attendance by date and specific session (FN or AN only)
// GET /api/attendance/date/session?date=YYYY-MM-DD&session=FN or AN
router.get("/date/session", getAttendanceByDateAndSession);

// Get session-wise summary for a specific date (stats for both FN and AN)
// GET /api/attendance/date/summary?date=YYYY-MM-DD
router.get("/date/summary", getSessionSummaryByDate);

// Get attendance summary by multiple dates (comma-separated)
// GET /api/attendance/summary?dates=YYYY-MM-DD,YYYY-MM-DD
router.get("/summary", getAttendanceByDateSummary);

// Get attendance by date range (with session grouping)
// GET /api/attendance/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/range", getAttendanceByDateRange);

export default router;
