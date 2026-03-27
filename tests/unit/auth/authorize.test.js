/**
 * Tests para el middleware authorize
 * Archivo fuente: src/auth/middleware/authorize.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { authorize, isAdmin, isAuthenticated } from '../../../src/auth/middleware/authorize.js';
import { createMockRequest, createMockResponse } from '../../setup.js';

describe('Authorize Middleware', () => {

    describe('authorize()', () => {
        it('debe llamar next() cuando usuario tiene rol permitido', () => {
            const middleware = authorize('admin', 'user');
            const req = createMockRequest({ user: { role: 'user' } });
            const res = createMockResponse();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('debe retornar 401 cuando usuario no esta autenticado', () => {
            const middleware = authorize('admin');
            const req = createMockRequest({ user: null });
            const res = createMockResponse();

            middleware(req, res, () => {});

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.error, 'No autenticado');
        });

        it('debe retornar 403 cuando rol no esta permitido', () => {
            const middleware = authorize('admin');
            const req = createMockRequest({ user: { role: 'user' } });
            const res = createMockResponse();

            middleware(req, res, () => {});

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res._json.success, false);
            assert.strictEqual(res._json.error, 'Acceso denegado');
        });

        it('debe incluir mensaje descriptivo en 403', () => {
            const middleware = authorize('admin', 'moderator');
            const req = createMockRequest({ user: { role: 'user' } });
            const res = createMockResponse();

            middleware(req, res, () => {});

            assert.ok(res._json.message.includes('admin o moderator'));
            assert.ok(res._json.message.includes('user'));
        });

        it('debe permitir multiples roles', () => {
            const middleware = authorize('admin', 'moderator', 'user');
            const req = createMockRequest({ user: { role: 'moderator' } });
            const res = createMockResponse();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('debe rechazar si req.user es undefined', () => {
            const middleware = authorize('user');
            const req = createMockRequest();
            delete req.user;
            const res = createMockResponse();

            middleware(req, res, () => {});

            assert.strictEqual(res.statusCode, 401);
        });
    });

    describe('isAdmin', () => {
        it('debe permitir usuarios admin', () => {
            const req = createMockRequest({ user: { role: 'admin' } });
            const res = createMockResponse();
            let nextCalled = false;

            isAdmin(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('debe rechazar usuarios no admin', () => {
            const req = createMockRequest({ user: { role: 'user' } });
            const res = createMockResponse();

            isAdmin(req, res, () => {});

            assert.strictEqual(res.statusCode, 403);
        });

        it('debe rechazar usuarios sin autenticar', () => {
            const req = createMockRequest({ user: null });
            const res = createMockResponse();

            isAdmin(req, res, () => {});

            assert.strictEqual(res.statusCode, 401);
        });
    });

    describe('isAuthenticated', () => {
        it('debe permitir usuarios admin', () => {
            const req = createMockRequest({ user: { role: 'admin' } });
            const res = createMockResponse();
            let nextCalled = false;

            isAuthenticated(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('debe permitir usuarios normales', () => {
            const req = createMockRequest({ user: { role: 'user' } });
            const res = createMockResponse();
            let nextCalled = false;

            isAuthenticated(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('debe rechazar usuarios sin autenticar', () => {
            const req = createMockRequest({ user: null });
            const res = createMockResponse();

            isAuthenticated(req, res, () => {});

            assert.strictEqual(res.statusCode, 401);
        });

        it('debe rechazar roles desconocidos', () => {
            const req = createMockRequest({ user: { role: 'guest' } });
            const res = createMockResponse();

            isAuthenticated(req, res, () => {});

            assert.strictEqual(res.statusCode, 403);
        });
    });
});
