import express from 'express';
import { verifyAdmin, verifyGuest, verifySuperAdmin } from '../middleware/authMiddleware.js';
import { adminSendMessage, guestSendMessage, superadminReply, superadminReplyGuest, listMessages, markMessageRead } from '../controllers/chatController.js';

const router = express.Router();

// Admin sends message to superadmin
router.post('/admin/send', verifyAdmin, adminSendMessage);

// Guest sends message to superadmin
router.post('/guest/send', verifyGuest, guestSendMessage);

// Superadmin replies to a specific admin
router.post('/superadmin/reply', verifySuperAdmin, superadminReply);

// Superadmin replies to a specific guest
router.post('/superadmin/reply-guest', verifySuperAdmin, superadminReplyGuest);

// List messages for current user (requires x-admin-id header)
router.get('/messages', listMessages);

// Mark message read
router.post('/:id/read', markMessageRead);

export default router;
