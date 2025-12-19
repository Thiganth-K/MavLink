import express from 'express';
import { verifyGuest } from '../middleware/authMiddleware.js';
import { getProfile, exportGuestData } from '../controllers/guestControllers.js';

const router = express.Router();

// GET /api/guest/profile
router.get('/profile', verifyGuest, getProfile);

// GET /api/guest/export?batchId=... (optional)
router.get('/export', verifyGuest, exportGuestData);

export default router;
