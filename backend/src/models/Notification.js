import mongoose from 'mongoose';

// Simple notification model targeting an Admin user.
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  type: { type: String, required: true },
  messageRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
