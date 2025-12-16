import express from 'express';
import {
  loginController,
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  createGuest,
  getGuests,
  updateGuest,
  deleteGuest,
  logoutSuperAdmin,
  getExportYears,
  getAdminBatchMapping,
  exportAdvancedData
} from "../controllers/superAdminControllers.js";
const router = express.Router();

// POST /api/superadmin/login
router.post('/login', loginController);
//logout
router.post('/logout', logoutSuperAdmin);

// CRUD (Only Super Admin should use these)
router.post("/admin", createAdmin);
router.get("/admin", getAdmins);
router.put("/admin/:id", updateAdmin);
router.delete("/admin/:id", deleteAdmin);

// Guest CRUD
router.post('/guest', createGuest);
router.get('/guest', getGuests);
router.put('/guest/:id', updateGuest);
router.delete('/guest/:id', deleteGuest);
// Mapping of admins to batches
router.get('/admin-batch-mapping', getAdminBatchMapping);
// Available export years for UI dropdown
router.get('/export-years', getExportYears);
// Advanced export with filters
router.get('/export-advanced', exportAdvancedData);
export default router;