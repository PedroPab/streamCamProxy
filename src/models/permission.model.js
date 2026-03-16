import db from '../database/index.js';

export const PermissionModel = {
    // Asignar permisos de stream a un grupo
    assign({ streamId, groupId, canView = 1, canCapture = 0, canRecord = 0, canAdmin = 0, assignedBy = null }) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO stream_permissions (streamId, groupId, canView, canCapture, canRecord, canAdmin, assignedAt, assignedBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(streamId, groupId) DO UPDATE SET
                canView = excluded.canView,
                canCapture = excluded.canCapture,
                canRecord = excluded.canRecord,
                canAdmin = excluded.canAdmin,
                assignedAt = excluded.assignedAt,
                assignedBy = excluded.assignedBy
        `);
        return stmt.run(streamId, groupId, canView, canCapture, canRecord, canAdmin, now, assignedBy);
    },

    // Obtener permisos de un grupo para un stream
    getForGroupAndStream(groupId, streamId) {
        const stmt = db.prepare(`
            SELECT * FROM stream_permissions
            WHERE groupId = ? AND streamId = ?
        `);
        return stmt.get(groupId, streamId) || null;
    },

    // Obtener todos los permisos de un stream
    getByStream(streamId) {
        const stmt = db.prepare(`
            SELECT sp.*, g.name as groupName
            FROM stream_permissions sp
            INNER JOIN groups g ON sp.groupId = g.id
            WHERE sp.streamId = ?
            ORDER BY g.name ASC
        `);
        return stmt.all(streamId);
    },

    // Obtener todos los permisos de un grupo
    getByGroup(groupId) {
        const stmt = db.prepare(`
            SELECT sp.*, s.name as streamName
            FROM stream_permissions sp
            INNER JOIN streams s ON sp.streamId = s.id
            WHERE sp.groupId = ?
            ORDER BY s.name ASC
        `);
        return stmt.all(groupId);
    },

    // Revocar permisos de un stream a un grupo
    revoke(streamId, groupId) {
        const stmt = db.prepare('DELETE FROM stream_permissions WHERE streamId = ? AND groupId = ?');
        return stmt.run(streamId, groupId);
    },

    // Obtener permisos efectivos de un usuario para un stream
    getUserStreamPermissions(userId, streamId) {
        const stmt = db.prepare(`
            SELECT
                MAX(sp.canView) as canView,
                MAX(sp.canCapture) as canCapture,
                MAX(sp.canRecord) as canRecord,
                MAX(sp.canAdmin) as canAdmin
            FROM stream_permissions sp
            INNER JOIN user_groups ug ON sp.groupId = ug.groupId
            WHERE ug.userId = ? AND sp.streamId = ?
        `);
        const result = stmt.get(userId, streamId);
        return result && result.canView !== null ? result : { canView: 0, canCapture: 0, canRecord: 0, canAdmin: 0 };
    },

    // Verificar si usuario puede acceder a stream
    canUserAccessStream(userId, streamId, permission = 'canView') {
        // Primero verificar si el stream es público
        const streamStmt = db.prepare('SELECT isPublic FROM streams WHERE id = ? AND isActive = 1');
        const stream = streamStmt.get(streamId);

        if (!stream) return false;
        if (stream.isPublic && permission === 'canView') return true;

        // Verificar permisos por grupo
        const perms = this.getUserStreamPermissions(userId, streamId);
        return perms[permission] === 1;
    },

    // Obtener todos los streams accesibles por usuario con sus permisos
    getUserAccessibleStreams(userId) {
        const stmt = db.prepare(`
            SELECT DISTINCT s.*,
                   MAX(CASE WHEN s.isPublic = 1 THEN 1 ELSE COALESCE(sp.canView, 0) END) as canView,
                   MAX(COALESCE(sp.canCapture, 0)) as canCapture,
                   MAX(COALESCE(sp.canRecord, 0)) as canRecord,
                   MAX(COALESCE(sp.canAdmin, 0)) as canAdmin
            FROM streams s
            LEFT JOIN stream_permissions sp ON s.id = sp.streamId
            LEFT JOIN user_groups ug ON sp.groupId = ug.groupId AND ug.userId = ?
            WHERE s.isActive = 1 AND (s.isPublic = 1 OR ug.userId IS NOT NULL)
            GROUP BY s.id
            ORDER BY s.name ASC
        `);
        return stmt.all(userId);
    },

    // Obtener matriz completa de permisos (para panel admin)
    getPermissionsMatrix() {
        const stmt = db.prepare(`
            SELECT g.id as groupId, g.name as groupName,
                   s.id as streamId, s.name as streamName,
                   sp.canView, sp.canCapture, sp.canRecord, sp.canAdmin
            FROM groups g
            CROSS JOIN streams s
            LEFT JOIN stream_permissions sp ON g.id = sp.groupId AND s.id = sp.streamId
            WHERE s.isActive = 1
            ORDER BY g.name, s.name
        `);
        return stmt.all();
    }
};

export default PermissionModel;
