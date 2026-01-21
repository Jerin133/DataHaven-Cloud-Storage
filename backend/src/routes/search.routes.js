import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { searchController } from '../controllers/search.controller.js';

const router = express.Router();

router.use(authenticate); // All routes require authentication

router.get('/', searchController.search);

export { router as searchRoutes };
