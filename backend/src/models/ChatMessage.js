import mongoose from 'mongoose';

// ChatMessage represents a single message between an Admin (including SUPER_ADMIN)
// from -> to. For admin-to-superadmin messages `to` points to the SUPER_ADMIN account.
const chatMessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  content: { type: String, required: true, trim: true },
  direction: {
    type: String,
    enum: ['ADMIN_TO_SUPERADMIN', 'SUPERADMIN_TO_ADMIN'],
    required: true
  },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
