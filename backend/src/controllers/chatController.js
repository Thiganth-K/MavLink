import Admin from '../models/Admin.js';
import ChatMessage from '../models/ChatMessage.js';
import Notification from '../models/Notification.js';

// Admin sends message to SUPER_ADMIN
export const adminSendMessage = async (req, res) => {
  try {
    const sender = req.admin; // set by verifyAdmin
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'content required' });

    // Find the SUPER_ADMIN account (assumes single superadmin)
      let superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      if (!superAdmin) {
        // Attempt to create a SUPER_ADMIN record from environment variables if available
        const envUser = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN || null;
        const envPass = process.env.SUPER_ADMIN_PASSWORD || 'change_me_super';
        const adminIdCandidate = envUser ? String(envUser).toUpperCase() : 'SUPERADMIN';
        try {
          superAdmin = await Admin.create({ adminId: adminIdCandidate, username: envUser || 'superadmin', password: envPass, role: 'SUPER_ADMIN', assignedBatchIds: [] });
          // created
        } catch (createErr) {
          // If create fails (e.g., duplicate or validation), re-query and if still missing return error
          superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
          if (!superAdmin) return res.status(500).json({ message: 'SUPER_ADMIN not configured' });
        }
      }

    const msg = await ChatMessage.create({
      from: sender._id,
      to: superAdmin._id,
      content,
      direction: 'ADMIN_TO_SUPERADMIN'
    });

    // Create notification for superadmin with sender metadata
    await Notification.create({
      user: superAdmin._id,
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { fromAdminId: sender.adminId, fromUsername: sender.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// Superadmin replies to a specific admin
export const superadminReply = async (req, res) => {
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    // Allow SUPER_ADMIN to be identified either by x-admin-id header or by role lookup
    let superAdmin = null;
    const superAdminIdHeader = req.headers['x-admin-id'];
    if (superAdminIdHeader) {
      superAdmin = await Admin.findOne({ adminId: superAdminIdHeader });
    } else {
      superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (!superAdmin) return res.status(404).json({ message: 'SUPER_ADMIN account not found' });

    const { toAdminId, content } = req.body;
    if (!toAdminId || !content) return res.status(400).json({ message: 'toAdminId and content required' });
    const targetAdmin = await Admin.findOne({ adminId: toAdminId, role: 'ADMIN' });
    if (!targetAdmin) return res.status(404).json({ message: 'Target admin not found' });

    const msg = await ChatMessage.create({
      from: superAdmin._id,
      to: targetAdmin._id,
      content,
      direction: 'SUPERADMIN_TO_ADMIN'
    });

    // Notify target admin with metadata
    await Notification.create({
      user: targetAdmin._id,
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { toAdminId: targetAdmin.adminId, toUsername: targetAdmin.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send reply', error: err.message });
  }
};

// Get messages for the current user (admin or superadmin)
export const listMessages = async (req, res) => {
  try {
    const role = req.headers['x-role'];
    const adminHeader = req.headers['x-admin-id'];
    let admin = null;
    if (adminHeader) {
      admin = await Admin.findOne({ adminId: adminHeader });
    } else if (role === 'SUPER_ADMIN') {
      admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (!admin) return res.status(400).json({ message: 'x-admin-id header required or SUPER_ADMIN role expected' });

    const filter = { $or: [{ from: admin._id }, { to: admin._id }] };

    // optional query param to filter conversation with specific adminId
    if (req.query.withAdminId) {
      const other = await Admin.findOne({ adminId: req.query.withAdminId });
      if (other) filter.$or = [{ from: admin._id, to: other._id }, { from: other._id, to: admin._id }];
    }

    const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).populate('from to', 'adminId username role');
    return res.json(messages);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list messages', error: err.message });
  }
};

// Mark a message as read (only recipient can mark)
export const markMessageRead = async (req, res) => {
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

    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // only recipient may mark read
    if (!msg.to || msg.to.toString() !== admin._id.toString()) {
      return res.status(403).json({ message: 'Only recipient can mark message as read' });
    }

    msg.read = true;
    await msg.save();

    // remove related notifications when a message is read (so it no longer appears in dropdown)
    await Notification.deleteMany({ messageRef: msg._id });

    return res.json({ message: 'Marked read and removed notifications' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to mark read', error: err.message });
  }
};
