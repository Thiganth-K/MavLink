import mongoose from "mongoose";
import { parseISTDate, toISTDateString, getISTTimestamp } from "../utils/dateUtils.js";

/**
 * Batch-wise attendance schema.
 * A single document represents attendance for a given batch, date and session (FN/AN).
 * The `entries` array contains per-student attendance records for that batch/session.
 */
const attendanceEntrySchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ["Present", "Absent", "On-Duty"],
    required: [true, "Status is required"]
  }
}, { _id: false });

// If status is 'On-Duty', a reason must be provided explaining why student is on-duty
attendanceEntrySchema.add({
  reason: {
    type: String,
    trim: true,
    minlength: [3, 'Reason too short'],
    maxlength: [500, 'Reason too long'],
    required: function() {
      return this.status === 'On-Duty';
    }
  }
});

const batchAttendanceSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: [true, "Batch ID is required"],
    trim: true,
    uppercase: true,
    // index created via explicit schema.index calls below
  },
  date: {
    // Date represents the IST date (midnight IST) converted to UTC when stored
    type: Date,
    required: [true, "Date is required"]
  },
  session: {
    type: String,
    enum: ["FN", "AN"],
    required: [true, "Session is required"]
  },
  markedBy: {
    // username or admin identifier who marked the attendance
    type: String,
    required: [true, "Marked by is required"],
    trim: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  entries: {
    type: [attendanceEntrySchema],
    default: []
  }
}, {
  timestamps: true
});

// Ensure only one attendance document exists per batch/date/session
batchAttendanceSchema.index({ batchId: 1, date: 1, session: 1 }, { unique: true });
// Fast queries by batch + date range
batchAttendanceSchema.index({ batchId: 1, date: 1 });
// Fast queries by date and session
batchAttendanceSchema.index({ date: 1, session: 1 });

export default mongoose.model("Attendance", batchAttendanceSchema);

// Normalize `date` to represent midnight IST (stored as UTC instant) using shared utils
batchAttendanceSchema.pre('save', function (next) {
  try {
    if (this.isModified('date') && this.date) {
      let normalized = null;
      if (typeof this.date === 'string') {
        // assume 'YYYY-MM-DD'
        normalized = parseISTDate(this.date);
      } else if (this.date instanceof Date) {
        // convert Date -> IST YYYY-MM-DD -> parsed IST midnight
        const ds = toISTDateString(this.date);
        normalized = parseISTDate(ds);
      }

      if (normalized) this.date = normalized;
    }

    // Ensure markedAt exists (defaults to now). Use getISTTimestamp() for consistency.
    if (!this.markedAt) this.markedAt = getISTTimestamp();
  } catch (err) {
    // swallow and continue; validation should catch issues
  }
  next();
});

// Virtuals to get IST-formatted strings for date and markedAt
batchAttendanceSchema.virtual('dateIST').get(function () {
  if (!this.date) return null;
  try {
    // Return YYYY-MM-DD for the stored date in IST
    return toISTDateString(this.date);
  } catch (e) {
    return null;
  }
});

batchAttendanceSchema.virtual('markedAtIST').get(function () {
  if (!this.markedAt) return null;
  try {
    return new Date(this.markedAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' });
  } catch (e) {
    return null;
  }
});

// Ensure virtuals are included when converting to JSON
batchAttendanceSchema.set('toJSON', { virtuals: true });
batchAttendanceSchema.set('toObject', { virtuals: true });
