import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  batchId: {
    type: String,
    index: true,
    trim: true,
    uppercase: true
  },
  regno: { type: String, required: true },
  studentname: { type: String, required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["Present", "Absent", "Late"],
    required: true
  },
  markedBy: { type: String, required: true }, // Admin username
  markedAt: { type: Date, default: Date.now }
});

// Create compound index for student and date to prevent duplicate entries
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ batchId: 1, date: 1 });

export default mongoose.model("Attendance", attendanceSchema);
