import mongoose from "mongoose";

// Guest account: read-only visibility for assigned batches.
// Auth is currently prototype-style via headers (X-Role / X-Guest-Id).
const guestSchema = new mongoose.Schema({
  guestId: {
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
    enum: ["GUEST"],
    default: "GUEST"
  },
  assignedBatchIds: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model("Guest", guestSchema);
