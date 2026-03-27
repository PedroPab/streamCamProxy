/**
 * Tests para AuthManager (logica pura del frontend)
 * Archivo fuente: src/public/js/AuthManager.js
 *
 * Nota: Estas funciones son extraidas/adaptadas para poder
 * testearse en Node.js sin dependencias del navegador (localStorage, fetch)
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

/**
 * Clase testeable de AuthManager
 * Usa Map en lugar de localStorage para tests
 */
class TestableAuthManager {
    constructor(storage = new Map()) {
        this.storage = storage;
        this.tokenKey = 'streamcam_access_token';
        this.refreshKey = 'streamcam_refresh_token';
        this.userKey = 'streamcam_user';
    }

    saveTokens(accessToken, refreshToken, user) {
        this.storage.set(this.tokenKey, accessToken);
        this.storage.set(this.refreshKey, refreshToken);
        this.storage.set(this.userKey, JSON.stringify(user));
    }

    getAccessToken() {
        return this.storage.get(this.tokenKey) || null;
    }

    getRefreshToken() {
        return this.storage.get(this.refreshKey) || null;
    }

    getUser() {
        const user = this.storage.get(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    clearTokens() {
        this.storage.delete(this.tokenKey);
        this.storage.delete(this.refreshKey);
        this.storage.delete(this.userKey);
    }

    /**
     * Decodifica el payload de un JWT
     * Usa Buffer.from en lugar de atob (no existe en Node.js)
     */
    decodeToken(token) {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        // Buffer.from maneja base64url correctamente
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
        return payload;
    }

    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            const now = Date.now() / 1000;
            return payload.exp > now;
        } catch {
            return false;
        }
    }

    getAuthHeaders() {
        const token = this.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    getStreamUrl(baseUrl = '/stream') {
        const token = this.getAccessToken();
        return token ? `${baseUrl}?token=${token}` : baseUrl;
    }

    /**
     * Calcula cuando se debe refrescar el token
     * @returns {number} Milisegundos hasta el refresh, o -1 si no hay token
     */
    calculateRefreshTime() {
        const token = this.getAccessToken();
        if (!token) return -1;

        try {
            const payload = this.decodeToken(token);
            const now = Date.now() / 1000;
            const expiresIn = payload.exp - now;
            // Refrescar 60 segundos antes de expirar, minimo 10 segundos
            return Math.max((expiresIn - 60) * 1000, 10000);
        } catch {
            return -1;
        }
    }
}

// Helpers para crear JWTs de prueba
function createTestJWT(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    // Firma falsa para tests (no se verifica en el cliente)
    const signature = 'test_signature_not_verified';
    return `${headerB64}.${payloadB64}.${signature}`;
}

describe('AuthManager (Frontend Logic)', () => {
    let authManager;
    let storage;

    // Token valido (expira en el futuro lejano)
    const validPayload = {
        sub: 1,
        email: 'test@test.com',
        role: 'user',
        type: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
    };
    const validToken = createTestJWT(validPayload);

    // Token expirado
    const expiredPayload = {
        sub: 1,
        email: 'test@test.com',
        role: 'user',
        type: 'access',
        exp: 1 // Expirado en 1970
    };
    const expiredToken = createTestJWT(expiredPayload);

    const testUser = {
        id: 1,
        email: 'test@test.com',
        username: 'testuser',
        role: 'user'
    };

    beforeEach(() => {
        storage = new Map();
        authManager = new TestableAuthManager(storage);
    });

    describe('decodeToken', () => {
        it('debe decodificar payload de JWT valido', () => {
            const payload = authManager.decodeToken(validToken);

            assert.strictEqual(payload.sub, 1);
            assert.strictEqual(payload.email, 'test@test.com');
            assert.strictEqual(payload.role, 'user');
        });

        it('debe lanzar error para token con menos de 3 partes', () => {
            assert.throws(() => {
                authManager.decodeToken('invalid.token');
            }, /Invalid token/);
        });

        it('debe lanzar error para token con mas de 3 partes', () => {
            assert.throws(() => {
                authManager.decodeToken('a.b.c.d');
            }, /Invalid token/);
        });

        it('debe lanzar error para string vacio', () => {
            assert.throws(() => {
                authManager.decodeToken('');
            }, /Invalid token/);
        });

        it('debe decodificar token con caracteres base64url', () => {
            // Payload con caracteres que requieren base64url
            const specialPayload = { data: 'test+/=' };
            const token = createTestJWT(specialPayload);

            const decoded = authManager.decodeToken(token);
            assert.strictEqual(decoded.data, 'test+/=');
        });
    });

    describe('saveTokens y getters', () => {
        it('debe guardar y recuperar access token', () => {
            authManager.saveTokens(validToken, 'refresh123', testUser);

            assert.strictEqual(authManager.getAccessToken(), validToken);
        });

        it('debe guardar y recuperar refresh token', () => {
            authManager.saveTokens(validToken, 'refresh123', testUser);

            assert.strictEqual(authManager.getRefreshToken(), 'refresh123');
        });

        it('debe guardar y recuperar usuario', () => {
            authManager.saveTokens(validToken, 'refresh123', testUser);

            const user = authManager.getUser();
            assert.deepStrictEqual(user, testUser);
        });

        it('getAccessToken debe retornar null si no hay token', () => {
            assert.strictEqual(authManager.getAccessToken(), null);
        });

        it('getUser debe retornar null si no hay usuario', () => {
            assert.strictEqual(authManager.getUser(), null);
        });
    });

    describe('clearTokens', () => {
        it('debe eliminar todos los tokens', () => {
            authManager.saveTokens(validToken, 'refresh123', testUser);

            authManager.clearTokens();

            assert.strictEqual(authManager.getAccessToken(), null);
            assert.strictEqual(authManager.getRefreshToken(), null);
            assert.strictEqual(authManager.getUser(), null);
        });

        it('no debe fallar si no hay tokens guardados', () => {
            assert.doesNotThrow(() => {
                authManager.clearTokens();
            });
        });
    });

    describe('isAuthenticated', () => {
        it('debe retornar false cuando no hay token', () => {
            assert.strictEqual(authManager.isAuthenticated(), false);
        });

        it('debe retornar true para token no expirado', () => {
            authManager.saveTokens(validToken, 'refresh', testUser);

            assert.strictEqual(authManager.isAuthenticated(), true);
        });

        it('debe retornar false para token expirado', () => {
            authManager.saveTokens(expiredToken, 'refresh', testUser);

            assert.strictEqual(authManager.isAuthenticated(), false);
        });

        it('debe retornar false para token invalido', () => {
            storage.set('streamcam_access_token', 'invalid');

            assert.strictEqual(authManager.isAuthenticated(), false);
        });
    });

    describe('getAuthHeaders', () => {
        it('debe retornar objeto vacio sin token', () => {
            const headers = authManager.getAuthHeaders();

            assert.deepStrictEqual(headers, {});
        });

        it('debe retornar header Authorization con Bearer token', () => {
            authManager.saveTokens(validToken, 'refresh', testUser);

            const headers = authManager.getAuthHeaders();

            assert.strictEqual(headers['Authorization'], `Bearer ${validToken}`);
        });
    });

    describe('getStreamUrl', () => {
        it('debe retornar URL base cuando no hay token', () => {
            const url = authManager.getStreamUrl('/stream');

            assert.strictEqual(url, '/stream');
        });

        it('debe agregar token como query param cuando hay token', () => {
            authManager.saveTokens('mytoken123', 'refresh', testUser);

            const url = authManager.getStreamUrl('/stream');

            assert.strictEqual(url, '/stream?token=mytoken123');
        });

        it('debe usar URL por defecto /stream', () => {
            authManager.saveTokens('mytoken', 'refresh', testUser);

            const url = authManager.getStreamUrl();

            assert.strictEqual(url, '/stream?token=mytoken');
        });

        it('debe funcionar con URLs personalizadas', () => {
            authManager.saveTokens('token123', 'refresh', testUser);

            const url = authManager.getStreamUrl('/api/v1/stream');

            assert.strictEqual(url, '/api/v1/stream?token=token123');
        });
    });

    describe('calculateRefreshTime', () => {
        it('debe retornar -1 sin token', () => {
            assert.strictEqual(authManager.calculateRefreshTime(), -1);
        });

        it('debe retornar tiempo positivo para token valido', () => {
            authManager.saveTokens(validToken, 'refresh', testUser);

            const time = authManager.calculateRefreshTime();

            assert.ok(time > 0);
        });

        it('debe retornar minimo 10000ms', () => {
            // Token que expira en 30 segundos
            const shortPayload = {
                ...validPayload,
                exp: Math.floor(Date.now() / 1000) + 30
            };
            const shortToken = createTestJWT(shortPayload);
            authManager.saveTokens(shortToken, 'refresh', testUser);

            const time = authManager.calculateRefreshTime();

            assert.ok(time >= 10000);
        });

        it('debe retornar -1 para token invalido', () => {
            storage.set('streamcam_access_token', 'invalid.token');

            assert.strictEqual(authManager.calculateRefreshTime(), -1);
        });
    });
});
