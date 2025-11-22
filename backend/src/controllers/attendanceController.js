import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";

// ---------------- MARK ATTENDANCE ----------------
export const markAttendance = async (req, res) => {
  try {
    const { attendanceData, markedBy, batchId } = req.body;
    // attendanceData is array of { studentId, regno, studentname, date, status }

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ message: "Invalid attendance data" });
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
            if (batchId) existingAttendance.batchId = batchId;
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
            markedBy,
            batchId: batchId || undefined
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
    const { date, batchId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = { date: { $gte: startOfDay, $lte: endOfDay } };
    if (batchId) {
      filter.batchId = String(batchId).toUpperCase();
    }
    const attendance = await Attendance.find(filter).sort({ studentname: 1 });

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
    const { startDate, endDate, batchId } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: start, $lte: end } };
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
