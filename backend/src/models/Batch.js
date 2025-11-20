import mongoose from 'mongoose';

const batchStudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  regno: { type: String, required: true },
  dept: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true }
}, { _id: false });

const batchSchema = new mongoose.Schema({
  batchName: { type: String, required: true, unique: true },
  batchYear: { type: Number, required: true },
  students: { type: [batchStudentSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('Batch', batchSchema);
