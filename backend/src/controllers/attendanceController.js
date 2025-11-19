import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";

// ============================================================
// MARK ATTENDANCE FOR A SPECIFIC SESSION
// ============================================================
export const markAttendance = async (req, res) => {
  try {
    const { attendanceData, markedBy } = req.body;

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

        // Normalize date to midnight UTC
        const attendanceDate = new Date(date);
        attendanceDate.setUTCHours(0, 0, 0, 0);

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
            markedAt: new Date()
          });

          results.push({
            studentId,
            regno,
            studentname,
            session,
            status: 'created',
            attendanceStatus: status
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
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required"
      });
    }

    // Normalize date to midnight UTC
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const nextDate = new Date(attendanceDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find all attendance records for this date (both sessions)
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: attendanceDate,
        $lt: nextDate
      }
    }).sort({ session: 1, studentname: 1 }); // Sort by session first, then name

    // Separate by session
    const fnRecords = attendanceRecords.filter(r => r.session === 'FN');
    const anRecords = attendanceRecords.filter(r => r.session === 'AN');

    return res.status(200).json({
      success: true,
      message: `Found ${attendanceRecords.length} total attendance records for ${date}`,
      data: attendanceRecords,
      summary: {
        date: date,
        totalRecords: attendanceRecords.length,
        fnCount: fnRecords.length,
        anCount: anRecords.length
      }
    });

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

    // Normalize date to midnight UTC
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const nextDate = new Date(attendanceDate);
    nextDate.setDate(nextDate.getDate() + 1);

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

    // Normalize date to midnight UTC
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    const nextDate = new Date(attendanceDate);
    nextDate.setDate(nextDate.getDate() + 1);

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

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

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
    const { dates } = req.query;

    if (!dates) {
      return res.status(400).json({
        success: false,
        message: "dates query parameter is required (comma-separated)"
      });
    }

    const dateArray = dates.split(',').map(d => d.trim());

    const summaries = [];

    for (const dateStr of dateArray) {
      const attendanceDate = new Date(dateStr);
      attendanceDate.setUTCHours(0, 0, 0, 0);

      const nextDate = new Date(attendanceDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const records = await Attendance.find({
        date: {
          $gte: attendanceDate,
          $lt: nextDate
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
