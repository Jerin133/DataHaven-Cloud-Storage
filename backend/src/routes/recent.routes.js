import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { recentController } from '../controllers/recent.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/touch', recentController.touch);
router.get('/', authenticate, recentController.list)

export { router as recentRoutes };
