import mongoose from 'mongoose';

// Embedded student snapshot for quick display (optional duplication of Student collection entries)
const batchStudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  regno: { type: String, required: true },
  dept: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true }
}, { _id: false });

const batchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  batchName: { type: String, required: true, trim: true },
  batchYear: { type: Number, required: true },
  deptId: { type: String, required: true, uppercase: true, trim: true, ref: 'Department' },
  // Support multiple admins per batch: store admin business IDs (adminId strings)
  adminIds: { type: [String], uppercase: true, trim: true, default: [], ref: 'Admin' },
  createdBy: { type: String, required: true }, // superadmin identifier (username or id)
  students: { type: [batchStudentSchema], default: [] }
}, { timestamps: true });

// `batchId` has `unique: true` which creates an index; avoid duplicate single-field index declaration
// Index on adminIds to allow queries like { adminIds: adminId }
batchSchema.index({ adminIds: 1 });
batchSchema.index({ deptId: 1 });

export default mongoose.model('Batch', batchSchema);
