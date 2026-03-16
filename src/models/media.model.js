import db from '../database/index.js';

export const MediaModel = {
    create({ type, filename, streamId = null, capturedBy = null, timestamp, size = 0, duration = null, frames = null, metadata = null }) {
        const now = new Date().toISOString();
        const metadataJson = metadata ? JSON.stringify(metadata) : null;

        const stmt = db.prepare(`
            INSERT INTO media (type, filename, streamId, capturedBy, timestamp, size, duration, frames, metadata, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(type, filename, streamId, capturedBy, timestamp, size, duration, frames, metadataJson, now);
        return this.findById(result.lastInsertRowid);
    },

    findById(id) {
        const stmt = db.prepare(`
            SELECT m.*, s.name as streamName, u.username as capturedByUsername
            FROM media m
            LEFT JOIN streams s ON m.streamId = s.id
            LEFT JOIN users u ON m.capturedBy = u.id
            WHERE m.id = ?
        `);
        const result = stmt.get(id);
        if (result && result.metadata) {
            result.metadata = JSON.parse(result.metadata);
        }
        return result || null;
    },

    findByFilename(filename) {
        const stmt = db.prepare('SELECT * FROM media WHERE filename = ?');
        const result = stmt.get(filename);
        if (result && result.metadata) {
            result.metadata = JSON.parse(result.metadata);
        }
        return result || null;
    },

    findAll({ type = null, streamId = null, limit = 100, offset = 0 } = {}) {
        let query = `
            SELECT m.*, s.name as streamName, u.username as capturedByUsername
            FROM media m
            LEFT JOIN streams s ON m.streamId = s.id
            LEFT JOIN users u ON m.capturedBy = u.id
            WHERE 1=1
        `;
        const params = [];

        if (type) {
            query += ' AND m.type = ?';
            params.push(type);
        }
        if (streamId) {
            query += ' AND m.streamId = ?';
            params.push(streamId);
        }

        query += ' ORDER BY m.timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results = db.prepare(query).all(...params);
        return results.map(r => {
            if (r.metadata) r.metadata = JSON.parse(r.metadata);
            return r;
        });
    },

    findByStream(streamId, { type = null, limit = 100, offset = 0 } = {}) {
        return this.findAll({ type, streamId, limit, offset });
    },

    findByUser(capturedBy, { type = null, limit = 100, offset = 0 } = {}) {
        let query = `
            SELECT m.*, s.name as streamName
            FROM media m
            LEFT JOIN streams s ON m.streamId = s.id
            WHERE m.capturedBy = ?
        `;
        const params = [capturedBy];

        if (type) {
            query += ' AND m.type = ?';
            params.push(type);
        }

        query += ' ORDER BY m.timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results = db.prepare(query).all(...params);
        return results.map(r => {
            if (r.metadata) r.metadata = JSON.parse(r.metadata);
            return r;
        });
    },

    update(id, updates) {
        const allowedFields = ['streamId', 'size', 'duration', 'frames', 'metadata'];
        const fieldsToUpdate = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fieldsToUpdate.push(`${key} = ?`);
                if (key === 'metadata') {
                    values.push(value ? JSON.stringify(value) : null);
                } else {
                    values.push(value);
                }
            }
        }

        if (fieldsToUpdate.length === 0) return this.findById(id);

        values.push(id);

        const stmt = db.prepare(`UPDATE media SET ${fieldsToUpdate.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return this.findById(id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM media WHERE id = ?');
        return stmt.run(id);
    },

    deleteByFilename(filename) {
        const stmt = db.prepare('DELETE FROM media WHERE filename = ?');
        return stmt.run(filename);
    },

    // Estadísticas
    getStats({ streamId = null } = {}) {
        let query = `
            SELECT
                type,
                COUNT(*) as count,
                SUM(size) as totalSize,
                SUM(CASE WHEN type = 'video' THEN duration ELSE 0 END) as totalDuration
            FROM media
        `;
        const params = [];

        if (streamId) {
            query += ' WHERE streamId = ?';
            params.push(streamId);
        }

        query += ' GROUP BY type';

        const results = db.prepare(query).all(...params);
        const stats = { photos: 0, videos: 0, totalSize: 0, totalDuration: 0 };

        for (const row of results) {
            if (row.type === 'photo') {
                stats.photos = row.count;
            } else if (row.type === 'video') {
                stats.videos = row.count;
                stats.totalDuration = row.totalDuration || 0;
            }
            stats.totalSize += row.totalSize || 0;
        }

        return stats;
    },

    countByType(type) {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM media WHERE type = ?');
        return stmt.get(type).count;
    }
};

export default MediaModel;
