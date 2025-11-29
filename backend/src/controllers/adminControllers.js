import logger from '../utils/logger.js';

// Simple admin profile endpoint. Relies on verifyAdmin middleware which
// attaches `req.admin` (Admin document) after verifying headers.
export const getProfile = async (req, res) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // Fetch batch details for assignedBatchIds
    let batches = [];
    if (Array.isArray(admin.assignedBatchIds) && admin.assignedBatchIds.length > 0) {
      const Batch = (await import('../models/Batch.js')).default;
      batches = await Batch.find({ batchId: { $in: admin.assignedBatchIds } }).lean();
    }

    // Map batches to include only relevant fields for the profile
    const batchSummaries = batches.map(b => ({
      batchId: b.batchId,
      batchName: b.batchName,
      dept: b.deptId,
      studentCount: Array.isArray(b.students) ? b.students.length : 0
    }));

    const payload = {
      username: admin.username,
      adminId: admin.adminId,
      assignedBatchIds: admin.assignedBatchIds || [],
      role: admin.role || 'ADMIN',
      password: admin.password,
      batches: batchSummaries
    };

    logger.debug('getProfile success', { adminId: admin.adminId });
    return res.status(200).json({ message: 'Profile fetched', profile: payload });
  } catch (err) {
    logger.error('getProfile error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export default { getProfile };
