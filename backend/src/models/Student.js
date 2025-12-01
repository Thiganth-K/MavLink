import mongoose from "mongoose";

// Student belongs to exactly one batch (batchId) and one department (dept via existing field).
const studentSchema = new mongoose.Schema({
  regno: { type: String, required: true, unique: true, trim: true, uppercase: true },
  studentname: { type: String, required: true, trim: true },
  dept: { type: String, required: true, uppercase: true, trim: true },
  batchId: { type: String, uppercase: true, trim: true, ref: 'Batch' },
  email: { type: String, required: true, trim: true },
  phno: { type: String, required: true, trim: true }
}, { timestamps: true });

// single-field index for batchId is declared inline removed to avoid duplicates; keep explicit indexes as needed elsewhere

export default mongoose.model("Student", studentSchema);
