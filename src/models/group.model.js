import db from '../database/index.js';

export const GroupModel = {
    create({ name, description, createdBy = null }) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO groups (name, description, createdAt, updatedAt, createdBy)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, description || null, now, now, createdBy);
        return this.findById(result.lastInsertRowid);
    },

    findById(id) {
        const stmt = db.prepare(`
            SELECT g.*, u.username as createdByUsername
            FROM groups g
            LEFT JOIN users u ON g.createdBy = u.id
            WHERE g.id = ?
        `);
        return stmt.get(id) || null;
    },

    findByName(name) {
        const stmt = db.prepare('SELECT * FROM groups WHERE name = ?');
        return stmt.get(name) || null;
    },

    findAll() {
        const stmt = db.prepare(`
            SELECT g.*, u.username as createdByUsername,
                   (SELECT COUNT(*) FROM user_groups WHERE groupId = g.id) as userCount
            FROM groups g
            LEFT JOIN users u ON g.createdBy = u.id
            ORDER BY g.name ASC
        `);
        return stmt.all();
    },

    update(id, updates) {
        const allowedFields = ['name', 'description'];
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

        const stmt = db.prepare(`UPDATE groups SET ${fieldsToUpdate.join(', ')} WHERE id = ?`);
        stmt.run(...values);

        return this.findById(id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
        return stmt.run(id);
    },

    // Gestión de usuarios en grupos
    addUser(groupId, userId, assignedBy = null) {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO user_groups (userId, groupId, assignedAt, assignedBy)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(userId, groupId, now, assignedBy);
    },

    removeUser(groupId, userId) {
        const stmt = db.prepare('DELETE FROM user_groups WHERE groupId = ? AND userId = ?');
        return stmt.run(groupId, userId);
    },

    getUsers(groupId) {
        const stmt = db.prepare(`
            SELECT u.id, u.email, u.username, u.role, u.isActive, ug.assignedAt
            FROM users u
            INNER JOIN user_groups ug ON u.id = ug.userId
            WHERE ug.groupId = ?
            ORDER BY u.username ASC
        `);
        return stmt.all(groupId);
    },

    getUserGroups(userId) {
        const stmt = db.prepare(`
            SELECT g.*, ug.assignedAt
            FROM groups g
            INNER JOIN user_groups ug ON g.id = ug.groupId
            WHERE ug.userId = ?
            ORDER BY g.name ASC
        `);
        return stmt.all(userId);
    },

    isUserInGroup(userId, groupId) {
        const stmt = db.prepare('SELECT 1 FROM user_groups WHERE userId = ? AND groupId = ?');
        return !!stmt.get(userId, groupId);
    }
};

export default GroupModel;
