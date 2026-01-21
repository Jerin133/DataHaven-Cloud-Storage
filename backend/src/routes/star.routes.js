import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { starController } from '../controllers/star.controller.js';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.post('/', starController.create);
router.delete('/', starController.delete);
router.get('/', starController.list);

export { router as starRoutes };
