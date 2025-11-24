import express from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', listNotifications);
router.post('/:id/read', markNotificationRead);

export default router;
