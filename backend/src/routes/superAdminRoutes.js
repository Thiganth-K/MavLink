import express from 'express';
import {
  loginController,
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
  logoutSuperAdmin,
  getAdminBatchMapping
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
// Mapping of admins to batches
router.get('/admin-batch-mapping', getAdminBatchMapping);
export default router;
