import express from 'express';
import { verifyAdmin, verifySuperAdmin } from '../middleware/authMiddleware.js';
import { adminSendMessage, superadminReply, listMessages, markMessageRead } from '../controllers/chatController.js';

const router = express.Router();

// Admin sends message to superadmin
router.post('/admin/send', verifyAdmin, adminSendMessage);

// Superadmin replies to a specific admin
router.post('/superadmin/reply', verifySuperAdmin, superadminReply);

// List messages for current user (requires x-admin-id header)
router.get('/messages', listMessages);

// Mark message read
router.post('/:id/read', markMessageRead);

export default router;
