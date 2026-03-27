/**
 * Mock Database - SQLite en memoria para tests aislados
 */
import Database from 'better-sqlite3';

/**
 * Crea una base de datos SQLite en memoria con el schema del proyecto
 */
export function createTestDatabase() {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Crear tablas (schema copiado del proyecto)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            username TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            isActive INTEGER DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            lastLogin TEXT,
            refreshToken TEXT
        );

        CREATE TABLE IF NOT EXISTS streams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 81,
            path TEXT NOT NULL DEFAULT '/stream',
            isPublic INTEGER DEFAULT 0,
            isActive INTEGER DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            createdBy INTEGER REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            createdBy INTEGER REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            groupId INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            assignedAt TEXT NOT NULL,
            assignedBy INTEGER REFERENCES users(id),
            UNIQUE(userId, groupId)
        );

        CREATE TABLE IF NOT EXISTS stream_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            streamId INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
            groupId INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            canView INTEGER DEFAULT 1,
            canCapture INTEGER DEFAULT 0,
            canRecord INTEGER DEFAULT 0,
            canAdmin INTEGER DEFAULT 0,
            assignedAt TEXT NOT NULL,
            assignedBy INTEGER REFERENCES users(id),
            UNIQUE(streamId, groupId)
        );

        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
            filename TEXT NOT NULL UNIQUE,
            streamId INTEGER REFERENCES streams(id),
            capturedBy INTEGER REFERENCES users(id),
            timestamp TEXT NOT NULL,
            size INTEGER DEFAULT 0,
            duration INTEGER,
            frames INTEGER,
            metadata TEXT,
            createdAt TEXT NOT NULL
        );
    `);

    return db;
}

/**
 * Seed de datos basicos para tests
 */
export function seedTestData(db) {
    const now = new Date().toISOString();

    // Hash de 'testpassword123' con bcrypt (12 rounds)
    const passwordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYRgVGJkXGmC';

    // Usuario admin
    const adminResult = db.prepare(`
        INSERT INTO users (email, password, username, role, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run('admin@test.com', passwordHash, 'admin', 'admin', now, now);

    // Usuario normal
    const userResult = db.prepare(`
        INSERT INTO users (email, password, username, role, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run('user@test.com', passwordHash, 'testuser', 'user', now, now);

    // Stream de prueba
    const streamResult = db.prepare(`
        INSERT INTO streams (name, description, host, port, path, isPublic, isActive, createdAt, updatedAt, createdBy)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run('Test Camera', 'Test stream', '192.168.1.100', 81, '/stream', 0, now, now, adminResult.lastInsertRowid);

    // Grupo de prueba
    const groupResult = db.prepare(`
        INSERT INTO groups (name, description, createdAt, updatedAt, createdBy)
        VALUES (?, ?, ?, ?, ?)
    `).run('Test Group', 'Group for testing', now, now, adminResult.lastInsertRowid);

    // Asignar usuario al grupo
    db.prepare(`
        INSERT INTO user_groups (userId, groupId, assignedAt, assignedBy)
        VALUES (?, ?, ?, ?)
    `).run(userResult.lastInsertRowid, groupResult.lastInsertRowid, now, adminResult.lastInsertRowid);

    // Permisos del grupo sobre el stream
    db.prepare(`
        INSERT INTO stream_permissions (streamId, groupId, canView, canCapture, canRecord, canAdmin, assignedAt, assignedBy)
        VALUES (?, ?, 1, 1, 0, 0, ?, ?)
    `).run(streamResult.lastInsertRowid, groupResult.lastInsertRowid, now, adminResult.lastInsertRowid);

    return {
        adminId: adminResult.lastInsertRowid,
        userId: userResult.lastInsertRowid,
        streamId: streamResult.lastInsertRowid,
        groupId: groupResult.lastInsertRowid
    };
}

/**
 * Limpia todos los datos de las tablas
 */
export function clearTestData(db) {
    db.exec(`
        DELETE FROM media;
        DELETE FROM stream_permissions;
        DELETE FROM user_groups;
        DELETE FROM groups;
        DELETE FROM streams;
        DELETE FROM users;
    `);
}
