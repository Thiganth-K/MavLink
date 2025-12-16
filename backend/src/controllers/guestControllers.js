import logger from '../utils/logger.js';

// Simple guest profile endpoint. Relies on verifyGuest middleware which
// attaches `req.guest` (Guest document) after verifying headers.
export const getProfile = async (req, res) => {
  try {
    const guest = req.guest;
    if (!guest) return res.status(404).json({ message: 'Guest not found' });

    const payload = {
      username: guest.username,
      guestId: guest.guestId,
      assignedBatchIds: guest.assignedBatchIds || [],
      role: guest.role || 'GUEST',
      password: guest.password,
      isActive: guest.isActive !== false
    };

    logger.debug('guest getProfile success', { guestId: guest.guestId });
    return res.status(200).json({ message: 'Profile fetched', profile: payload });
  } catch (err) {
    logger.error('guest getProfile error', { error: err && err.message ? err.message : err });
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export default { getProfile };
