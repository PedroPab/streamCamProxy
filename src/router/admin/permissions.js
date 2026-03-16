import express from 'express';
import { PermissionModel } from '../../models/permission.model.js';
import { StreamModel } from '../../models/stream.model.js';
import { GroupModel } from '../../models/group.model.js';

const router = express.Router();

// GET /admin/permissions - Obtener matriz completa de permisos
router.get('/', (req, res) => {
    try {
        const matrix = PermissionModel.getPermissionsMatrix();
        const groups = GroupModel.findAll();
        const streams = StreamModel.findAll();

        res.json({
            success: true,
            data: {
                groups,
                streams,
                matrix
            }
        });
    } catch (error) {
        console.error('Error obteniendo matriz de permisos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener permisos'
        });
    }
});

// GET /admin/streams/:streamId/permissions - Permisos de un stream
router.get('/streams/:streamId', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.streamId);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const permissions = PermissionModel.getByStream(req.params.streamId);

        res.json({
            success: true,
            data: {
                stream,
                permissions
            }
        });
    } catch (error) {
        console.error('Error obteniendo permisos del stream:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener permisos'
        });
    }
});

// POST /admin/streams/:streamId/permissions - Asignar permisos
router.post('/streams/:streamId', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.streamId);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const { groupId, canView, canCapture, canRecord, canAdmin } = req.body;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: 'groupId es requerido'
            });
        }

        const group = GroupModel.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        PermissionModel.assign({
            streamId: parseInt(req.params.streamId),
            groupId: parseInt(groupId),
            canView: canView ? 1 : 0,
            canCapture: canCapture ? 1 : 0,
            canRecord: canRecord ? 1 : 0,
            canAdmin: canAdmin ? 1 : 0,
            assignedBy: req.user.id
        });

        const permissions = PermissionModel.getByStream(req.params.streamId);

        res.json({
            success: true,
            message: `Permisos asignados al grupo ${group.name}`,
            data: permissions
        });
    } catch (error) {
        console.error('Error asignando permisos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al asignar permisos'
        });
    }
});

// PUT /admin/streams/:streamId/permissions/:groupId - Actualizar permisos
router.put('/streams/:streamId/:groupId', (req, res) => {
    try {
        const stream = StreamModel.findById(req.params.streamId);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: 'Stream no encontrado'
            });
        }

        const group = GroupModel.findById(req.params.groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        const { canView, canCapture, canRecord, canAdmin } = req.body;

        PermissionModel.assign({
            streamId: parseInt(req.params.streamId),
            groupId: parseInt(req.params.groupId),
            canView: canView !== undefined ? (canView ? 1 : 0) : 0,
            canCapture: canCapture !== undefined ? (canCapture ? 1 : 0) : 0,
            canRecord: canRecord !== undefined ? (canRecord ? 1 : 0) : 0,
            canAdmin: canAdmin !== undefined ? (canAdmin ? 1 : 0) : 0,
            assignedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Permisos actualizados'
        });
    } catch (error) {
        console.error('Error actualizando permisos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar permisos'
        });
    }
});

// DELETE /admin/streams/:streamId/permissions/:groupId - Revocar permisos
router.delete('/streams/:streamId/:groupId', (req, res) => {
    try {
        PermissionModel.revoke(req.params.streamId, req.params.groupId);

        res.json({
            success: true,
            message: 'Permisos revocados'
        });
    } catch (error) {
        console.error('Error revocando permisos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al revocar permisos'
        });
    }
});

// POST /admin/permissions/batch - Actualizar múltiples permisos
router.post('/batch', (req, res) => {
    try {
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                error: 'permissions debe ser un array'
            });
        }

        for (const perm of permissions) {
            const { streamId, groupId, canView, canCapture, canRecord, canAdmin } = perm;

            if (!streamId || !groupId) continue;

            PermissionModel.assign({
                streamId: parseInt(streamId),
                groupId: parseInt(groupId),
                canView: canView ? 1 : 0,
                canCapture: canCapture ? 1 : 0,
                canRecord: canRecord ? 1 : 0,
                canAdmin: canAdmin ? 1 : 0,
                assignedBy: req.user.id
            });
        }

        res.json({
            success: true,
            message: `${permissions.length} permisos actualizados`
        });
    } catch (error) {
        console.error('Error actualizando permisos en batch:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar permisos'
        });
    }
});

export default router;
