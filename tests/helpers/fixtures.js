/**
 * Fixtures - Datos de prueba reutilizables
 */

// Password de prueba y su hash (bcrypt con 12 rounds)
export const TEST_PASSWORD = 'testpassword123';
// Nota: Este hash es para tests, no usar en produccion
export const TEST_PASSWORD_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYRgVGJkXGmC';

// Usuarios de prueba
export const ADMIN_USER = {
    id: 1,
    email: 'admin@test.com',
    username: 'admin',
    role: 'admin',
    isActive: 1
};

export const NORMAL_USER = {
    id: 2,
    email: 'user@test.com',
    username: 'testuser',
    role: 'user',
    isActive: 1
};

export const INACTIVE_USER = {
    id: 3,
    email: 'inactive@test.com',
    username: 'inactive',
    role: 'user',
    isActive: 0
};

// Stream de prueba
export const TEST_STREAM = {
    id: 1,
    name: 'Test Camera',
    description: 'Camera for testing',
    host: '192.168.1.100',
    port: 81,
    path: '/stream',
    isPublic: 0,
    isActive: 1
};

// Grupo de prueba
export const TEST_GROUP = {
    id: 1,
    name: 'Test Group',
    description: 'Group for testing'
};

// JWT de prueba (payload: {"sub":1,"email":"test@test.com","role":"user","type":"access","exp":9999999999})
// NOTA: Este token tiene exp muy lejano para tests
export const VALID_JWT_PAYLOAD = {
    sub: 1,
    email: 'test@test.com',
    role: 'user',
    type: 'access',
    exp: 9999999999
};

// Base64 del payload para construir tokens de prueba
export const VALID_JWT_PAYLOAD_B64 = Buffer.from(JSON.stringify(VALID_JWT_PAYLOAD)).toString('base64url');

// Payload expirado
export const EXPIRED_JWT_PAYLOAD = {
    sub: 1,
    email: 'test@test.com',
    role: 'user',
    type: 'access',
    exp: 1 // Expirado en 1970
};

export const EXPIRED_JWT_PAYLOAD_B64 = Buffer.from(JSON.stringify(EXPIRED_JWT_PAYLOAD)).toString('base64url');

// Marcadores JPEG para tests de frameParser
export const JPEG_START = Buffer.from([0xff, 0xd8]);
export const JPEG_END = Buffer.from([0xff, 0xd9]);

/**
 * Crea un frame JPEG de prueba
 */
export function createTestJpegFrame(dataSize = 10) {
    const data = Buffer.alloc(dataSize, 0x00);
    return Buffer.concat([JPEG_START, data, JPEG_END]);
}

/**
 * Crea multiples frames JPEG concatenados
 */
export function createMultipleJpegFrames(count, dataSize = 10) {
    const frames = [];
    for (let i = 0; i < count; i++) {
        frames.push(createTestJpegFrame(dataSize));
    }
    return Buffer.concat(frames);
}
