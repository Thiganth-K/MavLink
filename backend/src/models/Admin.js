import mongoose from "mongoose";

// Admin model extended with business identifier (adminId) and assignedBatchIds.
// adminId is used for mapping batches; differs from Mongo _id.
const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 32
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 64
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "ADMIN"],
    default: "ADMIN"
  },
  assignedBatchIds: {
    type: [String],
    default: [] // stores Batch.batchId values
  }
}, { timestamps: true });

adminSchema.index({ adminId: 1 });
adminSchema.index({ username: 1 });

export default mongoose.model("Admin", adminSchema);
