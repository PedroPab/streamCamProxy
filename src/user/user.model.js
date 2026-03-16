import db from '../database/index.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const UserModel = {
    async create({ email, password, username, role = 'user' }) {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO users (email, password, username, role, isActive, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        `);

        const result = stmt.run(email, hashedPassword, username, role, now, now);

        return this.findById(result.lastInsertRowid);
    },

    findById(id) {
        const stmt = db.prepare(`
            SELECT id, email, username, role, isActive, createdAt, updatedAt, lastLogin
            FROM users WHERE id = ?
        `);
        return stmt.get(id) || null;
    },

    findByEmail(email) {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email) || null;
    },

    async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    updateLastLogin(id) {
        const stmt = db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?');
        stmt.run(new Date().toISOString(), id);
    },

    saveRefreshToken(id, refreshToken) {
        const stmt = db.prepare('UPDATE users SET refreshToken = ? WHERE id = ?');
        stmt.run(refreshToken, id);
    },

    clearRefreshToken(id) {
        const stmt = db.prepare('UPDATE users SET refreshToken = NULL WHERE id = ?');
        stmt.run(id);
    },

    verifyRefreshToken(id, refreshToken) {
        const stmt = db.prepare('SELECT refreshToken FROM users WHERE id = ?');
        const user = stmt.get(id);
        return user && user.refreshToken === refreshToken;
    },

    findAll() {
        const stmt = db.prepare(`
            SELECT id, email, username, role, isActive, createdAt, updatedAt, lastLogin
            FROM users ORDER BY createdAt DESC
        `);
        return stmt.all();
    },

    async update(id, updates) {
        const allowedFields = ['username', 'role', 'isActive'];
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

        const stmt = db.prepare(`
            UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?
        `);
        stmt.run(...values);

        return this.findById(id);
    },

    async changePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const stmt = db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?');
        stmt.run(hashedPassword, new Date().toISOString(), id);
    },

    delete(id) {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);
    }
};

export default UserModel;
