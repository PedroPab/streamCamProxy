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

const router = express.Router();

// Capturar foto
router.post('/capture', capturePhoto);

// Grabación de video
router.post('/record/start', startRecording);
router.post('/record/stop', stopRecording);
router.get('/record/status', getRecordingStatus);

// Listar y servir archivos
router.get('/', listMedia);
router.get('/file/:filename', serveMedia);

// Eliminar media
router.delete('/:type/:id', removeMedia);

export default router;
