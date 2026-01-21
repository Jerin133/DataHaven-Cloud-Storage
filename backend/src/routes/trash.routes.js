import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { trashController } from '../controllers/trash.controller.js';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.get('/', trashController.list);
router.post('/restore', trashController.restore);
router.delete('/empty', trashController.empty);
router.delete('/item', trashController.deleteItem);

export { router as trashRoutes };
