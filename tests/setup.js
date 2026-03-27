/**
 * Setup global para tests - Helpers reutilizables
 */

/**
 * Crea un mock de usuario para tests
 */
export function createMockUser(overrides = {}) {
    return {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        isActive: 1,
        ...overrides
    };
}

/**
 * Crea un mock de request para tests de middlewares
 */
export function createMockRequest(overrides = {}) {
    return {
        user: null,
        body: {},
        params: {},
        query: {},
        headers: {},
        ...overrides
    };
}

/**
 * Crea un mock de response para tests de middlewares
 */
export function createMockResponse() {
    const res = {
        statusCode: 200,
        _json: null,
        _headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this._json = data;
            return this;
        },
        setHeader(key, value) {
            this._headers[key] = value;
            return this;
        },
        end() {
            return this;
        }
    };
    return res;
}

/**
 * Crea una funcion next() mock para middlewares
 */
export function createMockNext() {
    let called = false;
    let error = null;

    const next = (err) => {
        called = true;
        error = err || null;
    };

    next.wasCalled = () => called;
    next.getError = () => error;

    return next;
}
