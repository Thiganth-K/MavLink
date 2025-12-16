import mongoose from 'mongoose';

// Notification model targeting either an Admin or Guest user.
// Backward compatible: older documents may not have `userModel`, which should be treated as 'Admin'.
const notificationSchema = new mongoose.Schema({
  userModel: { type: String, enum: ['Admin', 'Guest'], default: 'Admin' },
  user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true },
  type: { type: String, required: true },
  messageRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
