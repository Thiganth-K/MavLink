import mongoose from 'mongoose';

// ChatMessage represents a single message between a SUPER_ADMIN and another user.
// Supported peers: Admin and Guest. We store the peer model alongside ObjectId so
// we can hydrate sender/recipient details in controllers.
const chatMessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, required: true },
  fromModel: { type: String, enum: ['Admin', 'Guest'], default: 'Admin' },
  to: { type: mongoose.Schema.Types.ObjectId, required: true },
  toModel: { type: String, enum: ['Admin', 'Guest'], default: 'Admin' },
  content: { type: String, required: true, trim: true },
  direction: {
    type: String,
    enum: ['ADMIN_TO_SUPERADMIN', 'SUPERADMIN_TO_ADMIN', 'GUEST_TO_SUPERADMIN', 'SUPERADMIN_TO_GUEST'],
    required: true
  },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
