import db from '../database/index.js';

export const StreamModel = {
    create({ name, description, host, port = 81, path = '/stream', isPublic = 0, isActive = 1, createdBy = null }) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO streams (name, description, host, port, path, isPublic, isActive, createdAt, updatedAt, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, description || null, host, port, path, isPublic, isActive, now, now, createdBy);
        return this.findById(result.lastInsertRowid);
    },

    findById(id) {
        const stmt = db.prepare(`
            SELECT s.*, u.username as createdByUsername
            FROM streams s
            LEFT JOIN users u ON s.createdBy = u.id
            WHERE s.id = ?
        `);
        return stmt.get(id) || null;
    },

    findAll({ includeInactive = false } = {}) {
        let query = `
            SELECT s.*, u.username as createdByUsername
            FROM streams s
            LEFT JOIN users u ON s.createdBy = u.id
        `;
        if (!includeInactive) {
            query += ' WHERE s.isActive = 1';
        }
        query += ' ORDER BY s.createdAt DESC';
        return db.prepare(query).all();
    },

    findPublic() {
        const stmt = db.prepare(`
            SELECT s.*, u.username as createdByUsername
            FROM streams s
            LEFT JOIN users u ON s.createdBy = u.id
            WHERE s.isPublic = 1 AND s.isActive = 1
            ORDER BY s.name ASC
        `);
        return stmt.all();
    },

    findByUser(userId) {
        const stmt = db.prepare(`
            SELECT DISTINCT s.*, u.username as createdByUsername,
                   sp.canView, sp.canCapture, sp.canRecord, sp.canAdmin
            FROM streams s
            LEFT JOIN users u ON s.createdBy = u.id
            LEFT JOIN stream_permissions sp ON s.id = sp.streamId
            LEFT JOIN user_groups ug ON sp.groupId = ug.groupId
            WHERE s.isActive = 1 AND (s.isPublic = 1 OR ug.userId = ?)
            ORDER BY s.name ASC
        `);
        return stmt.all(userId);
    },

    update(id, updates) {
        const allowedFields = ['name', 'description', 'host', 'port', 'path', 'isPublic', 'isActive'];
        const fieldsToUpdate = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fieldsToUpdate.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fieldsToUpdate.length === 0) return this.findById(id);

        fieldsToUpdate.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push(id);

        const stmt = db.prepare(`UPDATE streams SET ${fieldsToUpdate.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return this.findById(id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM streams WHERE id = ?');
        return stmt.run(id);
    },

    getConnectionInfo(id) {
        const stmt = db.prepare('SELECT host, port, path FROM streams WHERE id = ? AND isActive = 1');
        return stmt.get(id) || null;
    },

    countActive() {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM streams WHERE isActive = 1');
        return stmt.get().count;
    }
};

export default StreamModel;
