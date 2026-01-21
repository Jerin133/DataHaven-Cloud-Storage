import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { linkShareController } from '../controllers/linkShare.controller.js';

const router = express.Router();

// Public route for accessing shared links
router.get('/:token', linkShareController.getByToken);

// Protected routes
router.use(authenticate);
router.post('/', linkShareController.create);
router.delete('/:id', linkShareController.delete);

export { router as linkShareRoutes };
