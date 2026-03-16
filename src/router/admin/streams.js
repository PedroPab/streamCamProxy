import express from 'express';
import { StreamModel } from '../../models/stream.model.js';
import { PermissionModel } from '../../models/permission.model.js';
import streamManager from '../../controller/streamManager.js';

const router = express.Router();

// GET /admin/streams - Listar todos los streams
router.get('/', (req, res) => {
    try {
        const streams = StreamModel.findAll({ includeInactive: true });
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

// POST /admin/streams - Crear stream
router.post('/', (req, res) => {
    try {
        const { name, description, host, port, path, isPublic, isActive } = req.body;

        if (!name || !host) {
            return res.status(400).json({
                success: false,
                error: 'Nombre y host son requeridos'
            });
        }

        const stream = StreamModel.create({
            name,
            description,
            host,
            port: port || 81,
            path: path || '/stream',
            isPublic: isPublic ? 1 : 0,
            isActive: isActive !== false ? 1 : 0,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: stream
        });
    } catch (error) {
        console.error('Error creando stream:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear stream'
        });
    }
});

// GET /admin/streams/:id - Obtener stream por ID
router.get('/:id', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.id);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const status = streamManager.getStreamStatus(stream.id);
        const permissions = PermissionModel.getByStream(stream.id);

        res.json({
            success: true,
            data: {
                ...stream,
                status,
                permissions
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

// PUT /admin/streams/:id - Actualizar stream
router.put('/:id', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.id);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const { name, description, host, port, path, isPublic, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (host !== undefined) updates.host = host;
        if (port !== undefined) updates.port = port;
        if (path !== undefined) updates.path = path;
        if (isPublic !== undefined) updates.isPublic = isPublic ? 1 : 0;
        if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

        const updated = StreamModel.update(req.params.id, updates);

        // Recargar conexión si cambió la configuración
        if (host !== undefined || port !== undefined || path !== undefined) {
            streamManager.reloadStream(parseInt(req.params.id));
        }

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Error actualizando stream:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar stream'
        });
    }
});

// DELETE /admin/streams/:id - Eliminar stream
router.delete('/:id', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.id);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        // Desconectar clientes antes de eliminar
        streamManager.reloadStream(parseInt(req.params.id));

        StreamModel.delete(req.params.id);

        res.json({
            success: true,
            message: 'Stream eliminado'
        });
    } catch (error) {
        console.error('Error eliminando stream:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar stream'
        });
    }
});

// POST /admin/streams/:id/test - Probar conexión del stream
router.post('/:id/test', async (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.id);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const { get } = await import('http');
        const url = `http://${stream.host}:${stream.port}${stream.path}`;

        const testConnection = () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout'));
                }, 5000);

                const request = get(url, (response) => {
                    clearTimeout(timeout);
                    request.destroy();
                    resolve({
                        success: true,
                        statusCode: response.statusCode,
                        contentType: response.headers['content-type']
                    });
                });

                request.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        };

        const result = await testConnection();

        res.json({
            success: true,
            data: {
                url,
                ...result
            }
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            data: {
                url: `http://${req.body?.host || 'unknown'}:${req.body?.port || 81}${req.body?.path || '/stream'}`
            }
        });
    }
});

export default router;
