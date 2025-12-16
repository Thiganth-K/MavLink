import Admin from '../models/Admin.js';
import Guest from '../models/Guest.js';
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
      fromModel: 'Admin',
      to: superAdmin._id,
      toModel: 'Admin',
      content,
      direction: 'ADMIN_TO_SUPERADMIN'
    });

    // Create notification for superadmin with sender metadata
    await Notification.create({
      user: superAdmin._id,
      userModel: 'Admin',
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { fromAdminId: sender.adminId, fromUsername: sender.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// Guest sends message to SUPER_ADMIN
export const guestSendMessage = async (req, res) => {
  try {
    const sender = req.guest; // set by verifyGuest
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'content required' });

    // Find the SUPER_ADMIN account (assumes single superadmin)
    let superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) {
      const envUser = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN || null;
      const envPass = process.env.SUPER_ADMIN_PASSWORD || 'change_me_super';
      const adminIdCandidate = envUser ? String(envUser).toUpperCase() : 'SUPERADMIN';
      try {
        superAdmin = await Admin.create({ adminId: adminIdCandidate, username: envUser || 'superadmin', password: envPass, role: 'SUPER_ADMIN', assignedBatchIds: [] });
      } catch (createErr) {
        superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
        if (!superAdmin) return res.status(500).json({ message: 'SUPER_ADMIN not configured' });
      }
    }

    const msg = await ChatMessage.create({
      from: sender._id,
      fromModel: 'Guest',
      to: superAdmin._id,
      toModel: 'Admin',
      content,
      direction: 'GUEST_TO_SUPERADMIN'
    });

    // Create notification for superadmin (notifications are admin-only)
    await Notification.create({
      user: superAdmin._id,
      userModel: 'Admin',
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { fromGuestId: sender.guestId, fromUsername: sender.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// Superadmin replies to a specific admin
export const superadminReply = async (req, res) => {
  try {
    const role = String(req.headers['x-role'] || '').trim();
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    // Allow SUPER_ADMIN to be identified either by x-admin-id header or by role lookup
    let superAdmin = null;
    const superAdminIdHeader = req.headers['x-admin-id'];
    if (superAdminIdHeader) {
      superAdmin = await Admin.findOne({ adminId: superAdminIdHeader });
      if (!superAdmin) {
        superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      }
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
      fromModel: 'Admin',
      to: targetAdmin._id,
      toModel: 'Admin',
      content,
      direction: 'SUPERADMIN_TO_ADMIN'
    });

    // Notify target admin with metadata
    await Notification.create({
      user: targetAdmin._id,
      userModel: 'Admin',
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { toAdminId: targetAdmin.adminId, toUsername: targetAdmin.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send reply', error: err.message });
  }
};

// Superadmin replies to a specific guest
export const superadminReplyGuest = async (req, res) => {
  try {
    const role = String(req.headers['x-role'] || '').trim();
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });

    let superAdmin = null;
    const superAdminIdHeader = req.headers['x-admin-id'];
    if (superAdminIdHeader) {
      superAdmin = await Admin.findOne({ adminId: superAdminIdHeader });
      if (!superAdmin) {
        superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      }
    } else {
      superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    if (!superAdmin) return res.status(404).json({ message: 'SUPER_ADMIN account not found' });

    const { toGuestId, content } = req.body;
    if (!toGuestId || !content) return res.status(400).json({ message: 'toGuestId and content required' });
    const normalizedGuestId = String(toGuestId).trim().toUpperCase();
    const targetGuest = await Guest.findOne({ guestId: normalizedGuestId });
    if (!targetGuest) return res.status(404).json({ message: 'Target guest not found' });

    const msg = await ChatMessage.create({
      from: superAdmin._id,
      fromModel: 'Admin',
      to: targetGuest._id,
      toModel: 'Guest',
      content,
      direction: 'SUPERADMIN_TO_GUEST'
    });

    // Notify guest (so they can see unread badge without opening chat)
    await Notification.create({
      user: targetGuest._id,
      userModel: 'Guest',
      type: 'NEW_MESSAGE',
      messageRef: msg._id,
      meta: { toGuestId: targetGuest.guestId, toUsername: targetGuest.username, preview: String(content).slice(0, 200) }
    });

    return res.status(201).json(msg);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send reply', error: err.message });
  }
};

// Get messages for the current user (admin or superadmin)
export const listMessages = async (req, res) => {
  try {
    const role = String(req.headers['x-role'] || '').trim();

    // Identify current user
    const adminHeader = req.headers['x-admin-id'];
    const guestHeader = req.headers['x-guest-id'];
    let current = null;
    let currentModel = null;

    if (role === 'GUEST') {
      if (!guestHeader) return res.status(400).json({ message: 'x-guest-id header required for GUEST' });
      const normalizedGuestId = String(guestHeader).trim().toUpperCase();
      current = await Guest.findOne({ guestId: normalizedGuestId });
      currentModel = 'Guest';
    } else {
      if (adminHeader) {
        current = await Admin.findOne({ adminId: adminHeader });
        if (!current && role === 'SUPER_ADMIN') {
          current = await Admin.findOne({ role: 'SUPER_ADMIN' });
        }
      } else if (role === 'SUPER_ADMIN') {
        current = await Admin.findOne({ role: 'SUPER_ADMIN' });
        if (!current) {
          // Best-effort bootstrap so SUPER_ADMIN can view messages even if DB record is missing
          const envUser = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN || null;
          const envPass = process.env.SUPER_ADMIN_PASSWORD || 'change_me_super';
          const adminIdCandidate = envUser ? String(envUser).toUpperCase() : 'SUPERADMIN';
          try {
            current = await Admin.create({ adminId: adminIdCandidate, username: envUser || 'superadmin', password: envPass, role: 'SUPER_ADMIN', assignedBatchIds: [] });
          } catch (e) {
            current = await Admin.findOne({ role: 'SUPER_ADMIN' });
          }
        }
      }
      currentModel = 'Admin';
    }

    if (!current) return res.status(400).json({ message: role === 'GUEST' ? 'x-guest-id header required' : 'x-admin-id header required or SUPER_ADMIN role expected' });

    // Base filter: messages involving current user's ObjectId
    const filter = { $or: [{ from: current._id }, { to: current._id }] };

    // Guests can only chat with SUPER_ADMIN
    if (role === 'GUEST') {
      let superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
      if (!superAdmin) {
        const envUser = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN || null;
        const envPass = process.env.SUPER_ADMIN_PASSWORD || 'change_me_super';
        const adminIdCandidate = envUser ? String(envUser).toUpperCase() : 'SUPERADMIN';
        try {
          superAdmin = await Admin.create({ adminId: adminIdCandidate, username: envUser || 'superadmin', password: envPass, role: 'SUPER_ADMIN', assignedBatchIds: [] });
        } catch (createErr) {
          superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
        }
      }
      if (!superAdmin) return res.status(500).json({ message: 'SUPER_ADMIN not configured' });
      filter.$or = [{ from: current._id, to: superAdmin._id }, { from: superAdmin._id, to: current._id }];
    }

    // Superadmin may filter by a specific peer
    if (role === 'SUPER_ADMIN') {
      if (req.query.withAdminId) {
        const otherAdmin = await Admin.findOne({ adminId: req.query.withAdminId, role: 'ADMIN' });
        if (otherAdmin) filter.$or = [{ from: current._id, to: otherAdmin._id }, { from: otherAdmin._id, to: current._id }];
      } else if (req.query.withGuestId) {
        const otherGuestId = String(req.query.withGuestId).trim().toUpperCase();
        const otherGuest = await Guest.findOne({ guestId: otherGuestId });
        if (otherGuest) filter.$or = [{ from: current._id, to: otherGuest._id }, { from: otherGuest._id, to: current._id }];
      }
    }

    const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).lean();

    // Hydrate from/to into { adminId|guestId, username, role }
    const adminIds = new Set();
    const guestIds = new Set();

    for (const m of messages) {
      const fm = m.fromModel || 'Admin';
      const tm = m.toModel || 'Admin';
      if (m.from) (fm === 'Guest' ? guestIds : adminIds).add(String(m.from));
      if (m.to) (tm === 'Guest' ? guestIds : adminIds).add(String(m.to));
    }

    const [admins, guests] = await Promise.all([
      Admin.find({ _id: { $in: Array.from(adminIds) } }).select('adminId username role').lean(),
      Guest.find({ _id: { $in: Array.from(guestIds) } }).select('guestId username role').lean()
    ]);

    const adminMap = new Map(admins.map(a => [String(a._id), a]));
    const guestMap = new Map(guests.map(g => [String(g._id), g]));

    const hydrated = messages.map(m => {
      const fm = m.fromModel || 'Admin';
      const tm = m.toModel || 'Admin';
      return {
        ...m,
        from: fm === 'Guest' ? guestMap.get(String(m.from)) : adminMap.get(String(m.from)),
        to: tm === 'Guest' ? guestMap.get(String(m.to)) : adminMap.get(String(m.to))
      };
    });

    return res.json(hydrated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list messages', error: err.message });
  }
};

// Mark a message as read (only recipient can mark)
export const markMessageRead = async (req, res) => {
  try {
    const adminHeader = req.headers['x-admin-id'];
    const guestHeader = req.headers['x-guest-id'];
    const role = String(req.headers['x-role'] || '').trim();
    let current = null;

    if (role === 'GUEST') {
      if (!guestHeader) return res.status(400).json({ message: 'x-guest-id header required for GUEST' });
      const normalizedGuestId = String(guestHeader).trim().toUpperCase();
      current = await Guest.findOne({ guestId: normalizedGuestId });
    } else {
      if (adminHeader) {
        current = await Admin.findOne({ adminId: adminHeader });
        if (!current && role === 'SUPER_ADMIN') {
          current = await Admin.findOne({ role: 'SUPER_ADMIN' });
        }
      } else if (role === 'SUPER_ADMIN') {
        current = await Admin.findOne({ role: 'SUPER_ADMIN' });
      }
    }

    if (!current) return res.status(400).json({ message: role === 'GUEST' ? 'x-guest-id header required' : 'x-admin-id header required or SUPER_ADMIN role expected' });

    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // only recipient may mark read
    if (!msg.to || msg.to.toString() !== current._id.toString()) {
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
