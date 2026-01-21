import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { fileController } from '../controllers/file.controller.js';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.post('/init', uploadLimiter, fileController.initUpload);
router.post('/complete', uploadLimiter, fileController.completeUpload);
router.get('/', fileController.list);
router.get('/:id', fileController.getById);
router.get('/:id/download', fileController.download);
router.patch('/:id', fileController.update);
router.delete('/:id', fileController.delete);

export { router as fileRoutes };
