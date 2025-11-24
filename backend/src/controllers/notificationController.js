import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';

// List notifications for current admin
export const listNotifications = async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-id'];
    const role = req.headers['x-role'];
    let admin = null;
    if (adminHeader) {
      admin = await Admin.findOne({ adminId: adminHeader });
    } else if (role === 'SUPER_ADMIN') {
      admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (!admin) return res.status(400).json({ message: 'x-admin-id header required or SUPER_ADMIN role expected' });

    // populate messageRef and sender info so frontend can show message preview and redirect to chat
    // return only unread notifications by default
    const notifications = await Notification.find({ user: admin._id, read: false }).sort({ createdAt: -1 })
      .populate({ path: 'messageRef', populate: { path: 'from to', select: 'adminId username role' } });

    // transform response to include convenient fields
    const out = notifications.map(n => ({
      _id: n._id,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt,
      meta: n.meta || {},
      message: n.messageRef ? n.messageRef.content : (n.meta && n.meta.preview) || '',
      sender: n.messageRef && n.messageRef.from ? { adminId: n.messageRef.from.adminId, username: n.messageRef.from.username, role: n.messageRef.from.role } : (n.meta && (n.meta.fromAdminId || n.meta.toAdminId) ? { adminId: n.meta.fromAdminId || n.meta.toAdminId, username: n.meta.fromUsername || n.meta.toUsername } : null)
    }));

    return res.json(out);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list notifications', error: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-id'];
    const role = req.headers['x-role'];
    let admin = null;
    if (adminHeader) {
      admin = await Admin.findOne({ adminId: adminHeader });
    } else if (role === 'SUPER_ADMIN') {
      admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (!admin) return res.status(400).json({ message: 'x-admin-id header required or SUPER_ADMIN role expected' });

    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    if (notif.user.toString() !== admin._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    // Remove notification once read
    await Notification.findByIdAndDelete(notif._id);
    return res.json({ message: 'Notification removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark notification', error: err.message });
  }
};
