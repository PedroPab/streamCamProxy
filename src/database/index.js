import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const DB_PATH = process.env.DATABASE_PATH || join(PROJECT_ROOT, 'storage', 'database.sqlite');

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
    // Tabla de usuarios
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            username TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            isActive INTEGER DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            lastLogin TEXT,
            refreshToken TEXT
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // Tabla de streams (cámaras/conexiones)
    db.exec(`
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
            createdBy INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_streams_active ON streams(isActive);
        CREATE INDEX IF NOT EXISTS idx_streams_public ON streams(isPublic);
    `);

    // Tabla de grupos de usuarios
    db.exec(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            createdBy INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
    `);

    // Tabla de relación Usuario-Grupo (N:N)
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            groupId INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            assignedAt TEXT NOT NULL,
            assignedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(userId, groupId)
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_groups_user ON user_groups(userId);
        CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(groupId);
    `);

    // Tabla de permisos Stream-Grupo
    db.exec(`
        CREATE TABLE IF NOT EXISTS stream_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            streamId INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
            groupId INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            canView INTEGER DEFAULT 1,
            canCapture INTEGER DEFAULT 0,
            canRecord INTEGER DEFAULT 0,
            canAdmin INTEGER DEFAULT 0,
            assignedAt TEXT NOT NULL,
            assignedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(streamId, groupId)
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_stream_perms_stream ON stream_permissions(streamId);
        CREATE INDEX IF NOT EXISTS idx_stream_perms_group ON stream_permissions(groupId);
    `);

    // Tabla de media (fotos y videos)
    db.exec(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
            filename TEXT NOT NULL UNIQUE,
            streamId INTEGER REFERENCES streams(id) ON DELETE SET NULL,
            capturedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
            timestamp TEXT NOT NULL,
            size INTEGER DEFAULT 0,
            duration INTEGER,
            frames INTEGER,
            metadata TEXT,
            createdAt TEXT NOT NULL
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
        CREATE INDEX IF NOT EXISTS idx_media_stream ON media(streamId);
        CREATE INDEX IF NOT EXISTS idx_media_timestamp ON media(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_media_user ON media(capturedBy);
    `);

    console.log('Base de datos inicializada en:', DB_PATH);
}

export function closeDatabase() {
    db.close();
}

export default db;
