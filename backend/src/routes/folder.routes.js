import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { folderController } from '../controllers/folder.controller.js';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.post('/', folderController.create);
router.get('/', folderController.list);
router.get('/:id', folderController.getById);
router.patch('/:id', folderController.update);
router.delete('/:id', folderController.delete);

export { router as folderRoutes };
