import logger from '../utils/logger.js';

// Simple admin profile endpoint. Relies on verifyAdmin middleware which
// attaches `req.admin` (Admin document) after verifying headers.
export const getProfile = async (req, res) => {
  try {
    const admin = req.admin;
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // NOTE: per frontend requirement this endpoint returns the stored password.
    // This is insecure for production; consider removing password from this response later.
    const payload = {
      username: admin.username,
      adminId: admin.adminId,
      assignedBatchIds: admin.assignedBatchIds || [],
      role: admin.role || 'ADMIN',
      password: admin.password
    };

    logger.debug('getProfile success', { adminId: admin.adminId });
    return res.status(200).json({ message: 'Profile fetched', profile: payload });
  } catch (err) {
    logger.error('getProfile error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export default { getProfile };
