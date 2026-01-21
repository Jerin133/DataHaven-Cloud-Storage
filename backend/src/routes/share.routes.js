import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { shareController } from '../controllers/share.controller.js';

const router = express.Router();

/* 🔓 PUBLIC shared download (NO auth header required) */
router.get('/files/:fileId/download', shareController.downloadSharedFile);

/* 🔐 Everything else requires login */
router.use(authenticate);

router.post('/', shareController.create);
router.get('/shared-with-me', shareController.sharedWithMe);
router.get('/:folderId/shared-contents', shareController.sharedContents);
router.get('/:resourceType/:resourceId', shareController.list);
router.delete('/:id', shareController.delete);

export { router as shareRoutes };