import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import logger from "../utils/logger.js";

// ---------- LOGIN ----------
export const loginController = async (req, res) => {
  logger.debug('loginController start', { bodyKeys: Object.keys(req.body || {}) });
  const { username, password } = req.body;

  const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  // SUPER ADMIN LOGIN (from .env)
  if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
    logger.info('loginController superadmin success', { username });
    return res.status(200).json({
      message: "Super Admin login successful",
      role: "SUPER_ADMIN",
      user: { username }
    });
  }

  // ADMIN LOGIN (from DB)
  const adminUser = await Admin.findOne({ username });

  if (!adminUser) {
    logger.warn('loginController admin not found', { username });
    return res.status(404).json({ message: "User not found" });
  }

  if (password !== adminUser.password) {
    logger.warn('loginController invalid credentials', { username });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  logger.info('loginController admin success', { username });
  return res.status(200).json({
    message: "Admin login successful",
    role: adminUser.role,
    user: { username: adminUser.username, adminId: adminUser.adminId, assignedBatchIds: adminUser.assignedBatchIds }
  });
};

// ---------- CREATE ADMIN ----------
export const createAdmin = async (req, res) => {
  logger.debug('createAdmin start', { bodyKeys: Object.keys(req.body || {}) });
  const { adminId, username, password } = req.body;

  try {
    const newAdmin = await Admin.create({
      adminId,
      username,
      password,
      role: "ADMIN"
    });

    logger.info('createAdmin success', { adminId });
    return res.status(201).json({
      message: "Admin created successfully",
      admin: newAdmin
    });
  } catch (err) {
    logger.error('createAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error creating admin", error: err });
  }
};

// ---------- READ ALL ADMINS ----------
export const getAdmins = async (req, res) => {
  const start = Date.now();
  logger.debug('getAdmins start');
  try {
    const admins = await Admin.find();
    logger.info('getAdmins success', { durationMs: Date.now() - start, count: admins.length });
    return res.status(200).json(admins);
  } catch (err) {
    logger.error('getAdmins error', { error: err.message });
    return res.status(500).json({ message: "Error fetching admins" });
  }
};

// ---------- UPDATE ADMIN ----------
export const updateAdmin = async (req, res) => {
  const start = Date.now();
  logger.debug('updateAdmin start', { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
  const { id } = req.params;
  const { username, password, adminId } = req.body;

  try {
    const updateFields = {};
    if (username) updateFields.username = username;
    if (password) updateFields.password = password;
    if (adminId) updateFields.adminId = adminId;
    const updated = await Admin.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updated) {
      logger.warn('updateAdmin not found', { id });
      return res.status(404).json({ message: "Admin not found" });
    }

    logger.info('updateAdmin success', { durationMs: Date.now() - start, id });
    return res.status(200).json({
      message: "Admin updated successfully",
      admin: updated
    });
  } catch (err) {
    logger.error('updateAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error updating admin" });
  }
};

// ---------- DELETE ADMIN ----------
export const deleteAdmin = async (req, res) => {
  const start = Date.now();
  logger.debug('deleteAdmin start', { id: req.params.id });
  const { id } = req.params;

  try {
    const deleted = await Admin.findByIdAndDelete(id);

    if (!deleted) {
      logger.warn('deleteAdmin not found', { id });
      return res.status(404).json({ message: "Admin not found" });
    }

    logger.info('deleteAdmin success', { durationMs: Date.now() - start, id });
    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    logger.error('deleteAdmin error', { error: err.message });
    return res.status(500).json({ message: "Error deleting admin" });
  }
};

export const logoutSuperAdmin = (req, res) => {
  logger.info('logoutSuperAdmin');
  return res.status(200).json({
    message: "Super Admin logged out successfully"
  });
};

// ---------- EXPORT DATA (EXCEL) ----------
// Generates a workbook with multiple sheets: Admins, Batches, Departments, Students, Attendance
// Only SUPER_ADMIN role should invoke (simple header check for now)
// exportPlatformData feature removed per request

// ---------- ADMIN ↔ BATCH MAPPING ----------
// Returns each admin with its enriched batch list plus unassigned batches.
// Shape:
// { admins: [ { adminId, username, batches: [{ batchId, batchName, batchYear, deptId }] } ], unassignedBatches: [...], totalAdmins, totalBatches, generatedAt }
export const getAdminBatchMapping = async (req, res) => {
  const start = Date.now();
  logger.debug('getAdminBatchMapping start');
  try {
    const [adminsRaw, batchesRaw] = await Promise.all([
      Admin.find().lean(),
      Batch.find().lean()
    ]);

    // Build quick lookup of batches by adminId
    const batchesByAdmin = new Map();
    for (const b of batchesRaw) {
      const key = (b.adminId || '').trim();
      if (!key) continue;
      if (!batchesByAdmin.has(key)) batchesByAdmin.set(key, []);
      batchesByAdmin.get(key).push({
        batchId: b.batchId,
        batchName: b.batchName,
        batchYear: b.batchYear,
        deptId: b.deptId
      });
    }

    const admins = adminsRaw.map(a => ({
      adminId: a.adminId,
      username: a.username,
      batches: batchesByAdmin.get(a.adminId) || []
    }));

    // Identify unassigned batches (no adminId)
    const unassignedBatches = batchesRaw.filter(b => !b.adminId).map(b => ({
      batchId: b.batchId,
      batchName: b.batchName,
      batchYear: b.batchYear,
      deptId: b.deptId
    }));

    logger.info('getAdminBatchMapping success', { durationMs: Date.now() - start, admins: admins.length, batches: batchesRaw.length, unassignedCount: unassignedBatches.length });
    return res.status(200).json({
      admins,
      unassignedBatches,
      totalAdmins: admins.length,
      totalBatches: batchesRaw.length,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error('getAdminBatchMapping error', { error: err.message });
    return res.status(500).json({ message: 'Failed to build mapping', error: err.message });
  }
};