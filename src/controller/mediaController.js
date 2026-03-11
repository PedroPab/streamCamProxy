import { join } from 'path';
import { frameParser } from './frameParser.js';
import { videoRecorder } from './videoRecorder.js';
import {
    savePhoto,
    getMediaList,
    deletePhoto,
    deleteVideo,
    PHOTOS_DIR,
    VIDEOS_DIR
} from './storage.js';

// Capturar foto
async function capturePhoto(req, res) {
    try {
        const frame = frameParser.getLastFrame();

        if (!frame) {
            return res.status(503).json({
                success: false,
                error: 'No frame available. Camera may not be connected.'
            });
        }

        const photo = await savePhoto(frame);

        res.json({
            success: true,
            photo
        });
    } catch (error) {
        console.error('Capture error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Iniciar grabación
function startRecording(req, res) {
    try {
        const result = videoRecorder.start();

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Start recording error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Detener grabación
async function stopRecording(req, res) {
    try {
        const result = await videoRecorder.stop();

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Stop recording error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Estado de grabación
function getRecordingStatus(req, res) {
    res.json(videoRecorder.getStatus());
}

// Listar media
async function listMedia(req, res) {
    try {
        const media = await getMediaList();
        res.json(media);
    } catch (error) {
        console.error('List media error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Servir archivo de media
function serveMedia(req, res) {
    const { filename } = req.params;

    // Validar nombre de archivo (seguridad)
    if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid filename'
        });
    }

    const isPhoto = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
    const isVideo = filename.endsWith('.mjpeg');

    if (!isPhoto && !isVideo) {
        return res.status(400).json({
            success: false,
            error: 'Unsupported file type'
        });
    }

    const dir = isPhoto ? PHOTOS_DIR : VIDEOS_DIR;
    const filepath = join(dir, filename);

    res.sendFile(filepath, (err) => {
        if (err) {
            res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
    });
}

// Eliminar media
async function removeMedia(req, res) {
    try {
        const { id, type } = req.params;

        if (type === 'photo') {
            const photo = await deletePhoto(id);
            res.json({ success: true, deleted: photo });
        } else if (type === 'video') {
            const video = await deleteVideo(id);
            res.json({ success: true, deleted: video });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid type. Use "photo" or "video"'
            });
        }
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export {
    capturePhoto,
    startRecording,
    stopRecording,
    getRecordingStatus,
    listMedia,
    serveMedia,
    removeMedia
};
