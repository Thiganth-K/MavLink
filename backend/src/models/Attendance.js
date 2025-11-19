import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: [true, "Student ID is required"]
  },
  regno: { 
    type: String, 
    required: [true, "Registration number is required"],
    trim: true
  },
  studentname: { 
    type: String, 
    required: [true, "Student name is required"],
    trim: true
  },
  date: { 
    type: Date, 
    required: [true, "Date is required"]
  },
  session: {
    type: String,
    enum: {
      values: ["FN", "AN"],
      message: "Session must be either FN (Forenoon) or AN (Afternoon)"
    },
    required: [true, "Session is required"]
  },
  status: {
    type: String,
    enum: {
      values: ["Present", "Absent", "On-Duty"],
      message: "Status must be Present, Absent, or On-Duty"
    },
    required: [true, "Status is required"]
  },
  markedBy: { 
    type: String, 
    required: [true, "Marked by username is required"],
    trim: true
  },
  markedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound unique index: one student can have only one FN and one AN record per day
attendanceSchema.index({ studentId: 1, date: 1, session: 1 }, { unique: true });

// Index for faster queries by date
attendanceSchema.index({ date: 1, session: 1 });

// Index for faster queries by student
attendanceSchema.index({ studentId: 1, session: 1 });

export default mongoose.model("Attendance", attendanceSchema);
