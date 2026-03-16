import express from 'express';
import {
    capturePhoto,
    startRecording,
    stopRecording,
    getRecordingStatus,
    listMedia,
    serveMedia,
    removeMedia
} from '../../controller/mediaController.js';
import { authorize } from '../../auth/middleware/authorize.js';

const router = express.Router();

router.post('/capture', capturePhoto);

router.post('/record/start', startRecording);
router.post('/record/stop', stopRecording);
router.get('/record/status', getRecordingStatus);

router.get('/', listMedia);
router.get('/file/:filename', serveMedia);

router.delete('/:type/:id', authorize('admin'), removeMedia);

export default router;
