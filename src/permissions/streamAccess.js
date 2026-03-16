import { PermissionModel } from '../models/permission.model.js';
import { StreamModel } from '../models/stream.model.js';

/**
 * Middleware para verificar acceso a un stream específico
 * @param {string} permission - Permiso requerido: 'canView', 'canCapture', 'canRecord', 'canAdmin'
 */
export function requireStreamPermission(permission = 'canView') {
    return async (req, res, next) => {
        try {
            const streamId = parseInt(req.params.streamId || req.params.id, 10);

            if (!streamId || isNaN(streamId)) {
                return res.status(400).json({
                    success: false,
                    error: 'ID de stream inválido'
                });
            }

            // Verificar que el stream existe y está activo
            const stream = StreamModel.findById(streamId);
            if (!stream) {
                return res.status(404).json({
                    success: false,
                    error: 'Stream no encontrado'
                });
            }

            if (!stream.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'Stream inactivo'
                });
            }

            // Admin tiene acceso total
            if (req.user.role === 'admin') {
                req.stream = stream;
                req.streamPermissions = {
                    canView: 1,
                    canCapture: 1,
                    canRecord: 1,
                    canAdmin: 1
                };
                return next();
            }

            // Si es público y solo requiere ver, permitir
            if (stream.isPublic && permission === 'canView') {
                req.stream = stream;
                req.streamPermissions = PermissionModel.getUserStreamPermissions(req.user.id, streamId);
                return next();
            }

            // Verificar permisos por grupo
            const userPermissions = PermissionModel.getUserStreamPermissions(req.user.id, streamId);

            if (!userPermissions[permission]) {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado',
                    message: `No tienes permiso de ${permission} para este stream`
                });
            }

            req.stream = stream;
            req.streamPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Error verificando permisos de stream:', error);
            res.status(500).json({
                success: false,
                error: 'Error al verificar permisos'
            });
        }
    };
}

/**
 * Middleware que verifica si el usuario puede ver el stream
 */
export const canViewStream = requireStreamPermission('canView');

/**
 * Middleware que verifica si el usuario puede capturar fotos
 */
export const canCaptureStream = requireStreamPermission('canCapture');

/**
 * Middleware que verifica si el usuario puede grabar video
 */
export const canRecordStream = requireStreamPermission('canRecord');

/**
 * Middleware que verifica si el usuario puede administrar el stream
 */
export const canAdminStream = requireStreamPermission('canAdmin');

/**
 * Middleware que carga los permisos del usuario para el stream sin bloquear
 * Útil para endpoints que muestran info según permisos
 */
export function loadStreamPermissions(req, res, next) {
    try {
        const streamId = parseInt(req.params.streamId || req.params.id, 10);

        if (!streamId || isNaN(streamId)) {
            req.streamPermissions = null;
            return next();
        }

        const stream = StreamModel.findById(streamId);
        if (!stream) {
            req.streamPermissions = null;
            return next();
        }

        req.stream = stream;

        if (req.user.role === 'admin') {
            req.streamPermissions = {
                canView: 1,
                canCapture: 1,
                canRecord: 1,
                canAdmin: 1
            };
        } else {
            req.streamPermissions = PermissionModel.getUserStreamPermissions(req.user.id, streamId);
        }

        next();
    } catch (error) {
        console.error('Error cargando permisos de stream:', error);
        req.streamPermissions = null;
        next();
    }
}

export default {
    requireStreamPermission,
    canViewStream,
    canCaptureStream,
    canRecordStream,
    canAdminStream,
    loadStreamPermissions
};
