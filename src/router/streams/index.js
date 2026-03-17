import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { canViewStream, canCaptureStream, canRecordStream, loadStreamPermissions } from '../../permissions/streamAccess.js';
import { PermissionModel } from '../../models/permission.model.js';
import { MediaModel } from '../../models/media.model.js';
import { GroupModel } from '../../models/group.model.js';
import streamManager from '../../controller/streamManager.js';
import { PHOTOS_DIR, formatTimestamp } from '../../controller/storage.js';
import { emitLog } from '../../websocket/emitter.js';
import { join } from 'path';
import { writeFileSync, statSync } from 'fs';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /streams - Listar streams accesibles para el usuario
router.get('/', (req, res) => {
    try {
        const streams = PermissionModel.getUserAccessibleStreams(req.user.id);

        // Agregar status de conexión a cada stream
        const streamsWithStatus = streams.map(stream => ({
            ...stream,
            status: streamManager.getStreamStatus(stream.id)
        }));

        res.json({
            success: true,
            data: streamsWithStatus
        });
    } catch (error) {
        console.error('Error listando streams:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar streams'
        });
    }
});

// GET /streams/:id - Información del stream
router.get('/:id', loadStreamPermissions, (req, res) => {
    try {
        if (!req.stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        // Verificar acceso
        if (req.user.role !== 'admin' && !req.stream.isPublic && !req.streamPermissions?.canView) {
            return res.status(403).json({
                success: false,
                error: 'No tienes acceso a este stream'
            });
        }

        const status = streamManager.getStreamStatus(req.stream.id);

        res.json({
            success: true,
            data: {
                id: req.stream.id,
                name: req.stream.name,
                description: req.stream.description,
                isPublic: req.stream.isPublic,
                permissions: req.streamPermissions,
                status
            }
        });
    } catch (error) {
        console.error('Error obteniendo stream:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener stream'
        });
    }
});

// GET /streams/:id/feed - Stream MJPEG
router.get('/:id/feed', canViewStream, (req, res) => {
    const streamId = parseInt(req.params.id);

    // Configurar headers para MJPEG
    const headers = streamManager.getStreamHeaders(streamId);
    res.writeHead(200, {
        'Content-Type': headers?.['content-type'] || 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'close'
    });

    // Agregar cliente al stream
    streamManager.addClient(streamId, res);

    // Manejar desconexión
    req.on('close', () => {
        streamManager.removeClient(streamId, res);
    });
});

// GET /streams/:id/status - Status del stream
router.get('/:id/status', canViewStream, (req, res) => {
    try {
        const status = streamManager.getStreamStatus(parseInt(req.params.id));

        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        // Agregar estadísticas de media
        const mediaStats = MediaModel.getStats({ streamId: parseInt(req.params.id) });

        res.json({
            success: true,
            data: {
                ...status,
                media: mediaStats,
                permissions: req.streamPermissions
            }
        });
    } catch (error) {
        console.error('Error obteniendo status:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener status'
        });
    }
});

// POST /streams/:id/media/capture - Capturar foto
router.post('/:id/media/capture', canCaptureStream, async (req, res) => {
    try {
        const streamId = parseInt(req.params.id);
        const frame = streamManager.getLastFrame(streamId);

        if (!frame) {
            emitLog(streamId, 'Capture failed: No frames available', 'error');
            return res.status(400).json({
                success: false,
                error: 'No hay frames disponibles. Asegúrate de que el stream esté activo.'
            });
        }

        const timestamp = formatTimestamp();
        const filename = `photo_stream${streamId}_${timestamp}.jpg`;
        const filepath = join(PHOTOS_DIR, filename);

        writeFileSync(filepath, frame);
        const stats = statSync(filepath);

        const photo = MediaModel.create({
            type: 'photo',
            filename,
            streamId,
            capturedBy: req.user.id,
            timestamp: new Date().toISOString(),
            size: stats.size
        });

        emitLog(streamId, `Photo captured: ${filename}`, 'success');

        res.json({
            success: true,
            data: photo
        });
    } catch (error) {
        console.error('Error capturando foto:', error);
        emitLog(parseInt(req.params.id), `Capture error: ${error.message}`, 'error');
        res.status(500).json({
            success: false,
            error: 'Error al capturar foto'
        });
    }
});

// POST /streams/:id/media/record/start - Iniciar grabación
router.post('/:id/media/record/start', canRecordStream, (req, res) => {
    try {
        const streamId = parseInt(req.params.id);
        const result = streamManager.startRecording(streamId, req.user.id);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error iniciando grabación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar grabación'
        });
    }
});

// POST /streams/:id/media/record/stop - Detener grabación
router.post('/:id/media/record/stop', canRecordStream, async (req, res) => {
    try {
        const streamId = parseInt(req.params.id);
        const result = await streamManager.stopRecording(streamId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error deteniendo grabación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al detener grabación'
        });
    }
});

// GET /streams/:id/media/record/status - Estado de grabación
router.get('/:id/media/record/status', canViewStream, (req, res) => {
    try {
        const streamId = parseInt(req.params.id);
        const status = streamManager.getRecordingStatus(streamId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error obteniendo estado de grabación:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estado de grabación'
        });
    }
});

// GET /streams/:id/media - Listar media del stream
router.get('/:id/media', canViewStream, (req, res) => {
    try {
        const streamId = parseInt(req.params.id);
        const { type, limit = 50, offset = 0 } = req.query;

        const media = MediaModel.findByStream(streamId, {
            type: type || null,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: media
        });
    } catch (error) {
        console.error('Error listando media:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar media'
        });
    }
});

// GET /users/me/groups - Grupos del usuario actual
router.get('/me/groups', (req, res) => {
    try {
        const groups = GroupModel.getUserGroups(req.user.id);

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Error obteniendo grupos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener grupos'
        });
    }
});

// GET /users/me/permissions - Permisos del usuario actual
router.get('/me/permissions', (req, res) => {
    try {
        const streams = PermissionModel.getUserAccessibleStreams(req.user.id);
        const groups = GroupModel.getUserGroups(req.user.id);

        res.json({
            success: true,
            data: {
                role: req.user.role,
                groups,
                streams: streams.map(s => ({
                    id: s.id,
                    name: s.name,
                    canView: s.canView,
                    canCapture: s.canCapture,
                    canRecord: s.canRecord,
                    canAdmin: s.canAdmin
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo permisos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener permisos'
        });
    }
});

export default router;
