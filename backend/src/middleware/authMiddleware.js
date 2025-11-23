// Simple role-based middleware relying on headers for this prototype.
// In production replace with JWT/session validation.
import Admin from '../models/Admin.js';
import Batch from '../models/Batch.js';

export const verifySuperAdmin = (req, res, next) => {
  const role = req.headers['x-role'];
  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'SUPER_ADMIN role required' });
  }
  next();
};

// verifyAdmin ensures admin role and optionally restricts to batchId parameter/body
export const verifyAdmin = async (req, res, next) => {
  const role = req.headers['x-role'];
  if (role !== 'ADMIN') {
    return res.status(403).json({ message: 'ADMIN role required' });
  }
  const adminId = req.headers['x-admin-id'];
  if (!adminId) return res.status(400).json({ message: 'x-admin-id header required' });
  const admin = await Admin.findOne({ adminId });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  // If a batchId is provided, ensure admin assigned
  const batchId = (req.body && req.body.batchId) || (req.params && req.params.batchId) || (req.query && req.query.batchId);
  if (batchId) {
    const assigned = Array.isArray(admin.assignedBatchIds) ? admin.assignedBatchIds : [];
    if (!assigned.includes(batchId)) {
      return res.status(403).json({ message: 'Admin not assigned to this batch' });
    }
  }
  req.admin = admin;
  next();
};

// Additional helper to ensure a batch belongs to admin when operating on student IDs
export const ensureStudentsWithinAdminBatches = async (admin, studentIds) => {
  if (!Array.isArray(studentIds)) return false;
  const batches = await Batch.find({ batchId: { $in: admin.assignedBatchIds } });
  // Build set of allowed regnos from batch snapshot
  const allowedRegnos = new Set();
  for (const b of batches) {
    for (const s of b.students) allowedRegnos.add(s.regno.toUpperCase());
  }
  return allowedRegnos; // caller can test membership
};
