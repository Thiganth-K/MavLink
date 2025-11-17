import express from 'express';
import { loginSuperAdmin,  logoutSuperAdmin} from '../controllers/superAdminControllers.js';

const router = express.Router();

// POST /api/superadmin/login
router.post('/login', loginSuperAdmin);
//logout
router.post('/logout', logoutSuperAdmin);
export default router;
