import mongoose from 'mongoose';

// Department model: academic department (e.g. CSE, ECE)
const departmentSchema = new mongoose.Schema({
  deptId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 16
  },
  deptName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 64
  }
}, { timestamps: true });

// `deptId` is unique and creates an index automatically; avoid duplicate single-field index declaration

export default mongoose.model('Department', departmentSchema);
