import express from 'express';
import { verifyGuest } from '../middleware/authMiddleware.js';
import { getProfile } from '../controllers/guestControllers.js';

const router = express.Router();

// GET /api/guest/profile
router.get('/profile', verifyGuest, getProfile);

export default router;
