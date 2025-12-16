import Admin from '../models/Admin.js';
import Guest from '../models/Guest.js';
import Notification from '../models/Notification.js';

// List notifications for current admin
export const listNotifications = async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-id'];
    const guestHeader = req.headers['x-guest-id'];
    const role = String(req.headers['x-role'] || '').trim();
    let admin = null;
    let guest = null;

    if (role === 'GUEST') {
      if (!guestHeader) return res.status(400).json({ message: 'x-guest-id header required for GUEST' });
      guest = await Guest.findOne({ guestId: String(guestHeader).trim().toUpperCase() });
      if (!guest) return res.status(404).json({ message: 'Guest not found' });
    }

    if (adminHeader) {
      admin = await Admin.findOne({ adminId: adminHeader });
      // If the caller claims SUPER_ADMIN but the adminId lookup failed, fall back.
      if (!admin && role === 'SUPER_ADMIN') {
        admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      }
    }
    if (!admin && role === 'SUPER_ADMIN') {
      admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      if (!admin) {
        // Best-effort bootstrap so SUPER_ADMIN can receive notifications even if DB record is missing
        const envUser = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN || null;
        const envPass = process.env.SUPER_ADMIN_PASSWORD || 'change_me_super';
        const adminIdCandidate = envUser ? String(envUser).toUpperCase() : 'SUPERADMIN';
        try {
          admin = await Admin.create({ adminId: adminIdCandidate, username: envUser || 'superadmin', password: envPass, role: 'SUPER_ADMIN', assignedBatchIds: [] });
        } catch (e) {
          admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
        }
      }
    }

    if (role !== 'GUEST' && !admin) {
      return res.status(400).json({ message: 'x-admin-id header required or SUPER_ADMIN role expected' });
    }

    // populate messageRef. Sender details are hydrated manually (Admin or Guest)
    // return only unread notifications by default
    const baseQuery = role === 'GUEST'
      ? { user: guest._id, userModel: 'Guest', read: false }
      : {
          user: admin._id,
          read: false,
          // Backward compatibility: older notifications may not have userModel
          $or: [{ userModel: 'Admin' }, { userModel: { $exists: false } }]
        };

    const notifications = await Notification.find(baseQuery)
      .sort({ createdAt: -1 })
      .populate({ path: 'messageRef' })
      .lean();

    const adminIds = new Set();
    const guestIds = new Set();

    for (const n of notifications) {
      const msg = n.messageRef;
      if (!msg) continue;
      const fromModel = (msg.fromModel || 'Admin');
      if (msg.from) (fromModel === 'Guest' ? guestIds : adminIds).add(String(msg.from));
    }

    const [admins, guests] = await Promise.all([
      Admin.find({ _id: { $in: Array.from(adminIds) } }).select('adminId username role').lean(),
      Guest.find({ _id: { $in: Array.from(guestIds) } }).select('guestId username role').lean()
    ]);

    const adminMap = new Map(admins.map(a => [String(a._id), a]));
    const guestMap = new Map(guests.map(g => [String(g._id), g]));

    // transform response to include convenient fields
    const out = notifications.map(n => {
      const msg = n.messageRef;
      let sender = null;

      if (msg && msg.from) {
        const fromModel = (msg.fromModel || 'Admin');
        const hydrated = fromModel === 'Guest' ? guestMap.get(String(msg.from)) : adminMap.get(String(msg.from));
        if (hydrated) {
          sender = {
            adminId: hydrated.adminId,
            guestId: hydrated.guestId,
            username: hydrated.username,
            role: hydrated.role
          };
        }
      }

      // fallback to meta if sender isn't available
      if (!sender && n.meta) {
        if (n.meta.fromAdminId || n.meta.toAdminId) {
          sender = { adminId: n.meta.fromAdminId || n.meta.toAdminId, username: n.meta.fromUsername || n.meta.toUsername };
        } else if (n.meta.fromGuestId || n.meta.toGuestId) {
          sender = { guestId: n.meta.fromGuestId || n.meta.toGuestId, username: n.meta.fromUsername || n.meta.toUsername };
        }
      }

      return {
        _id: n._id,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
        meta: n.meta || {},
        message: msg ? msg.content : (n.meta && n.meta.preview) || '',
        sender
      };
    });

    return res.json(out);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list notifications', error: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-id'];
    const guestHeader = req.headers['x-guest-id'];
    const role = String(req.headers['x-role'] || '').trim();
    let admin = null;
    let guest = null;

    if (role === 'GUEST') {
      if (!guestHeader) return res.status(400).json({ message: 'x-guest-id header required for GUEST' });
      guest = await Guest.findOne({ guestId: String(guestHeader).trim().toUpperCase() });
      if (!guest) return res.status(404).json({ message: 'Guest not found' });
    }

    if (adminHeader) {
      admin = await Admin.findOne({ adminId: adminHeader });
      if (!admin && role === 'SUPER_ADMIN') {
        admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      }
    }
    if (!admin && role === 'SUPER_ADMIN') {
      admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (role !== 'GUEST' && !admin) return res.status(400).json({ message: 'x-admin-id header required or SUPER_ADMIN role expected' });

    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    if (role === 'GUEST') {
      if (notif.user.toString() !== guest._id.toString()) return res.status(403).json({ message: 'Not authorized' });
      if (notif.userModel && notif.userModel !== 'Guest') return res.status(403).json({ message: 'Not authorized' });
    } else {
      if (notif.user.toString() !== admin._id.toString()) return res.status(403).json({ message: 'Not authorized' });
      // Backward compatibility: accept missing userModel as Admin
      if (notif.userModel && notif.userModel !== 'Admin') return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove notification once read
    await Notification.findByIdAndDelete(notif._id);
    return res.json({ message: 'Notification removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark notification', error: err.message });
  }
};
