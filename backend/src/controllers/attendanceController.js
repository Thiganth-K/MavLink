import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";

// ---------------- MARK ATTENDANCE ----------------
export const markAttendance = async (req, res) => {
  try {
    const { attendanceData, markedBy } = req.body;
    // attendanceData is array of { studentId, regno, studentname, date, status }

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ message: "Invalid attendance data" });
    }

    const results = [];
    const errors = [];

    for (const record of attendanceData) {
      try {
        const { studentId, regno, studentname, date, status } = record;

        // Check if attendance already exists for this student on this date
        const existingAttendance = await Attendance.findOne({
          studentId,
          date: new Date(date)
        });

        if (existingAttendance) {
          // Update existing attendance only if status changed
          if (existingAttendance.status !== status) {
            existingAttendance.status = status;
            existingAttendance.markedBy = markedBy;
            existingAttendance.markedAt = new Date();
            await existingAttendance.save();
            results.push({ studentId, status: "updated" });
          } else {
            // Status unchanged, no update needed
            results.push({ studentId, status: "unchanged" });
          }
        } else {
          // Create new attendance record
          const attendance = await Attendance.create({
            studentId,
            regno,
            studentname,
            date: new Date(date),
            status,
            markedBy
          });
          results.push({ studentId, status: "created" });
        }
      } catch (err) {
        errors.push({ studentId: record.studentId, error: err.message });
      }
    }

    res.status(200).json({
      message: "Attendance marked successfully",
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ message: "Error marking attendance", error: err.message });
  }
};

// ---------------- GET ATTENDANCE BY DATE ----------------
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ studentname: 1 });

    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
};

// ---------------- GET ATTENDANCE BY DATE RANGE ----------------
export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: -1, studentname: 1 });

    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
};

// ---------------- GET ATTENDANCE BY STUDENT ----------------
export const getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const attendance = await Attendance.find({ studentId }).sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
};

// ---------------- GET ALL ATTENDANCE ----------------
export const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ date: -1, studentname: 1 });
    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance", error: err.message });
  }
};

// ---------------- DELETE ATTENDANCE ----------------
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Attendance.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    res.status(200).json({ message: "Attendance record deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting attendance", error: err.message });
  }
};

// ---------------- GET ATTENDANCE STATISTICS ----------------
export const getAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: start, $lte: end } };
    }

    const stats = await Attendance.aggregate([
      { $match: dateFilter },
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
      },
      {
        $project: {
          _id: 1,
          regno: 1,
          studentname: 1,
          totalClasses: 1,
          present: 1,
          absent: 1,
          late: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: ["$present", "$totalClasses"] },
              100
            ]
          }
        }
      },
      { $sort: { studentname: 1 } }
    ]);

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance statistics", error: err.message });
  }
};
