import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";

// ============================================================
// MARK ATTENDANCE FOR A SPECIFIC SESSION
// ============================================================
export const markAttendance = async (req, res) => {
  try {
    const { attendanceData, markedBy, batchId } = req.body;
    // attendanceData is array of { studentId, regno, studentname, date, status }

    // Validate request body
    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        success: false,
        message: "attendanceData must be an array"
      });
    }

    if (!markedBy || typeof markedBy !== 'string') {
      return res.status(400).json({
        success: false,
        message: "markedBy is required and must be a string"
      });
    }

    // Authorization: ensure admin allowed for batch
    const role = req.headers['x-role'];
    if (role === 'ADMIN') {
      const adminId = req.headers['x-admin-id'];
      if (!adminId) return res.status(400).json({ message: 'x-admin-id header required' });
      const admin = await Admin.findOne({ adminId });
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      if (!batchId) return res.status(400).json({ message: 'batchId required' });
      if (!admin.assignedBatchIds.includes(batchId)) return res.status(403).json({ message: 'Admin not assigned to batch' });
      // Optional deeper validation: ensure all students belong to batch snapshot
      const batch = await Batch.findOne({ batchId });
      if (!batch) return res.status(404).json({ message: 'Batch not found' });
      const allowedRegnos = new Set(batch.students.map(s => s.regno.toUpperCase()));
      for (const rec of attendanceData) {
        if (!allowedRegnos.has((rec.regno || '').toUpperCase())) {
          return res.status(403).json({ message: `Student ${rec.regno} not in batch ${batchId}` });
        }
      }
    }

    const results = [];
    const errors = [];

    // Process each attendance record
    for (const record of attendanceData) {
      try {
        const { studentId, regno, studentname, date, session, status } = record;

        // Validate individual record fields
        if (!studentId || !regno || !studentname || !date || !session || !status) {
          errors.push({
            studentId: studentId || 'unknown',
            error: 'Missing required fields'
          });
          continue;
        }

        // Validate session
        if (!["FN", "AN"].includes(session)) {
          errors.push({
            studentId,
            error: 'Session must be FN or AN'
          });
          continue;
        }

        // Validate status
        if (!["Present", "Absent", "On-Duty"].includes(status)) {
          errors.push({
            studentId,
            error: 'Status must be Present, Absent, or On-Duty'
          });
          continue;
        }

        // Parse date as IST
        const attendanceDate = parseISTDate(date);

        // Check if attendance exists for this student, date, and session
        const existingAttendance = await Attendance.findOne({
          studentId,
          date: attendanceDate,
          session
        });

        if (existingAttendance) {
          // Update existing record only if status changed
          if (existingAttendance.status !== status) {
            existingAttendance.status = status;
            existingAttendance.markedBy = markedBy;
            existingAttendance.markedAt = new Date();
            if (batchId) existingAttendance.batchId = batchId;
            await existingAttendance.save();
            
            results.push({
              studentId,
              regno,
              studentname,
              session,
              status: 'updated',
              attendanceStatus: status
            });
          } else {
            // Status unchanged
            results.push({
              studentId,
              regno,
              studentname,
              session,
              status: 'unchanged',
              attendanceStatus: status
            });
          }
        } else {
          // Create new attendance record
          const newAttendance = await Attendance.create({
            studentId,
            regno,
            studentname,
            date: attendanceDate,
            session,
            status,
            markedBy,
            batchId: batchId || undefined
          });
        }
      } catch (err) {
        errors.push({
          studentId: record.studentId || 'unknown',
          error: err.message
        });
      }
    }

    // Send response
    return res.status(200).json({
      success: true,
      message: `Attendance processed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: attendanceData.length,
      successCount: results.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error("Error in markAttendance:", error);
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
  try {
    const { date, batchId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required"
      });
    }

    // Parse date as IST
    const attendanceDate = parseISTDate(date);
    const nextDate = getNextISTDay(attendanceDate);

    // Find all attendance records for this date (both sessions)
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: attendanceDate,
        $lt: nextDate
      }
    }).sort({ session: 1, studentname: 1 }); // Sort by session first, then name

    const filter = { date: { $gte: startOfDay, $lte: endOfDay } };
    if (batchId) {
      filter.batchId = String(batchId).toUpperCase();
    }
    const attendance = await Attendance.find(filter).sort({ studentname: 1 });

  } catch (error) {
    console.error("Error in getAttendanceByDate:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message
    });
  }
};

// ============================================================
// GET ATTENDANCE BY DATE AND SESSION (FN OR AN ONLY)
// ============================================================
export const getAttendanceByDateAndSession = async (req, res) => {
  try {
    const { date, session } = req.query;

    // Validate parameters
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required"
      });
    }

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "session query parameter is required"
      });
    }

    if (!["FN", "AN"].includes(session)) {
      return res.status(400).json({
        success: false,
        message: "session must be either 'FN' or 'AN'"
      });
    }

    // Parse date as IST
    const attendanceDate = parseISTDate(date);
    const nextDate = getNextISTDay(attendanceDate);

    // Find attendance records for specific date and session
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: attendanceDate,
        $lt: nextDate
      },
      session: session
    }).sort({ studentname: 1 });

    // Calculate statistics
    const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
    const onDutyCount = attendanceRecords.filter(r => r.status === 'On-Duty').length;

    return res.status(200).json({
      success: true,
      message: `Found ${attendanceRecords.length} attendance records for ${session} session on ${date}`,
      data: attendanceRecords,
      summary: {
        date: date,
        session: session,
        totalRecords: attendanceRecords.length,
        presentCount,
        absentCount,
        onDutyCount
      }
    });

  } catch (error) {
    console.error("Error in getAttendanceByDateAndSession:", error);
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
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required"
      });
    }

    // Parse date as IST
    const attendanceDate = parseISTDate(date);
    const nextDate = getNextISTDay(attendanceDate);

    // Get all attendance records for the date
    const allRecords = await Attendance.find({
      date: {
        $gte: attendanceDate,
        $lt: nextDate
      }
    });

    // Separate by session
    const fnRecords = allRecords.filter(r => r.session === 'FN');
    const anRecords = allRecords.filter(r => r.session === 'AN');

    // Calculate FN statistics
    const fnSummary = {
      session: 'FN',
      totalRecords: fnRecords.length,
      presentCount: fnRecords.filter(r => r.status === 'Present').length,
      absentCount: fnRecords.filter(r => r.status === 'Absent').length,
      onDutyCount: fnRecords.filter(r => r.status === 'On-Duty').length
    };

    // Calculate AN statistics
    const anSummary = {
      session: 'AN',
      totalRecords: anRecords.length,
      presentCount: anRecords.filter(r => r.status === 'Present').length,
      absentCount: anRecords.filter(r => r.status === 'Absent').length,
      onDutyCount: anRecords.filter(r => r.status === 'On-Duty').length
    };

    return res.status(200).json({
      success: true,
      message: `Session summary for ${date}`,
      date: date,
      summary: {
        FN: fnSummary,
        AN: anSummary,
        totalRecords: allRecords.length
      }
    });

  } catch (error) {
    console.error("Error in getSessionSummaryByDate:", error);
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

    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: 1, session: 1, studentname: 1 });

    // Group by date and session
    const groupedData = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { FN: [], AN: [] };
      }
      groupedData[dateKey][record.session].push(record);
    });

    return res.status(200).json({
      success: true,
      message: `Found ${attendanceRecords.length} records from ${startDate} to ${endDate}`,
      data: attendanceRecords,
      groupedByDate: groupedData,
      summary: {
        startDate,
        endDate,
        totalRecords: attendanceRecords.length,
        datesCount: Object.keys(groupedData).length
      }
    });

  } catch (error) {
    console.error("Error in getAttendanceByDateRange:", error);
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
  try {
    const { startDate, endDate, batchId } = req.query;

    if (!dates) {
      return res.status(400).json({
        success: false,
        message: "dates query parameter is required (comma-separated)"
      });
    }

    const matchStage = { ...dateFilter };
    if (batchId) {
      matchStage.batchId = String(batchId).toUpperCase();
    }
    const stats = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$studentId",
          regno: { $first: "$regno" },
          studentname: { $first: "$studentname" },
          totalClasses: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] }
          }
        }
      });

      const fnRecords = records.filter(r => r.session === 'FN');
      const anRecords = records.filter(r => r.session === 'AN');

      summaries.push({
        date: dateStr,
        FN: {
          total: fnRecords.length,
          present: fnRecords.filter(r => r.status === 'Present').length,
          absent: fnRecords.filter(r => r.status === 'Absent').length,
          onDuty: fnRecords.filter(r => r.status === 'On-Duty').length
        },
        AN: {
          total: anRecords.length,
          present: anRecords.filter(r => r.status === 'Present').length,
          absent: anRecords.filter(r => r.status === 'Absent').length,
          onDuty: anRecords.filter(r => r.status === 'On-Duty').length
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Summary for ${dateArray.length} dates`,
      data: summaries
    });

  } catch (error) {
    console.error("Error in getAttendanceByDateSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance summary",
      error: error.message
    });
  }
};
