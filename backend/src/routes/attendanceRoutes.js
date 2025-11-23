import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByDateAndSession,
  getAttendanceByDateRange,
  getAttendanceByDateSummary,
  getSessionSummaryByDate
  , getStudentsByBatch
  , getAttendanceStats
} from "../controllers/attendanceController.js";

const router = express.Router();

// ============================================================
// ATTENDANCE ROUTES WITH SESSION SUPPORT
// ============================================================

// Mark attendance for a specific session (FN or AN)
// POST /api/attendance/mark
// Body: {
//   attendanceData: [{ studentId, regno, studentname, status, reason? }, ...],
//   markedBy: string,
//   batchId: string,
//   session: 'FN' | 'AN',
//   date?: 'YYYY-MM-DD' // optional - defaults to today's IST if omitted
// }
router.post("/mark", markAttendance);

// Get attendance by date (returns both FN and AN sessions)
// GET /api/attendance/date?date=YYYY-MM-DD&batchId=BATCH1
// If `date` is omitted, defaults to today's IST date.
router.get("/date", getAttendanceByDate);

// Get attendance by date and specific session (FN or AN only)
// GET /api/attendance/date/session?date=YYYY-MM-DD&session=FN&batchId=BATCH1
// `date` is optional and defaults to today's IST date.
router.get("/date/session", getAttendanceByDateAndSession);

// Get session-wise summary for a specific date (stats for both FN and AN)
// GET /api/attendance/date/summary?date=YYYY-MM-DD
// If `date` is omitted, defaults to today's IST date.
router.get("/date/summary", getSessionSummaryByDate);

// Get students belonging to a batch (used when marking attendance)
// GET /api/attendance/students?batchId=BATCH1
router.get("/students", getStudentsByBatch);

// Stats per student (avg attendance etc.)
// GET /api/attendance/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&batchId=BATCH1
router.get('/stats', getAttendanceStats);

// Get attendance summary by multiple dates (comma-separated)
// GET /api/attendance/summary?dates=YYYY-MM-DD,YYYY-MM-DD&batchId=BATCH1
// `batchId` is optional.
router.get("/summary", getAttendanceByDateSummary);

// Get attendance by date range (with session grouping)
// GET /api/attendance/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/range", getAttendanceByDateRange);

export default router;
