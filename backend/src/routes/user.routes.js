import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { userController } from '../controllers/user.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/storage', userController.getStorage);

export { router as userRoutes };
