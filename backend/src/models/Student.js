import mongoose from "mongoose";

// Student belongs to exactly one batch (batchId) and one department (dept via existing field).
const studentSchema = new mongoose.Schema({
  regno: { type: String, required: true, unique: true, trim: true, uppercase: true },
  studentname: { type: String, required: true, trim: true },
  dept: { type: String, required: true, uppercase: true, trim: true },
  batchId: { type: String, uppercase: true, trim: true, index: true, ref: 'Batch' },
  email: { type: String, required: true, trim: true },
  phno: { type: String, required: true, trim: true }
}, { timestamps: true });

studentSchema.index({ batchId: 1 });

export default mongoose.model("Student", studentSchema);
