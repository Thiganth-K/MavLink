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
  adminId: { type: String, uppercase: true, trim: true, ref: 'Admin' }, // optional at creation
  createdBy: { type: String, required: true }, // superadmin identifier (username or id)
  students: { type: [batchStudentSchema], default: [] }
}, { timestamps: true });

batchSchema.index({ batchId: 1 });
batchSchema.index({ adminId: 1 });
batchSchema.index({ deptId: 1 });

export default mongoose.model('Batch', batchSchema);
