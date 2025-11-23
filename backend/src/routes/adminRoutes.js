import express from 'express';
import { verifyAdmin } from '../middleware/authMiddleware.js';
import { getProfile } from '../controllers/adminControllers.js';

const router = express.Router();

// GET /api/admin/profile
router.get('/profile', verifyAdmin, getProfile);

export default router;
