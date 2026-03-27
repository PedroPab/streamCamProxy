/**
 * Tests para URLRouter (logica pura del frontend)
 * Archivo fuente: src/public/js/URLRouter.js
 *
 * Nota: Estas funciones son extraidas/adaptadas para poder
 * testearse en Node.js sin dependencias del navegador (window.location)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Funciones puras extraidas de URLRouter para testing

/**
 * Parsea el ID del stream desde un string de query params
 * @param {string} searchString - Query string (ej: "?stream=5&other=value")
 * @returns {number|null} ID del stream o null
 */
function parseStreamIdFromSearch(searchString) {
    const params = new URLSearchParams(searchString);
    const streamId = params.get('stream');
    return streamId ? parseInt(streamId, 10) : null;
}

/**
 * Construye una URL con el parametro stream
 * @param {string} baseUrl - URL base completa
 * @param {number|null} streamId - ID del stream
 * @returns {string} URL con o sin parametro stream
 */
function buildURLWithStream(baseUrl, streamId) {
    const url = new URL(baseUrl);
    if (streamId) {
        url.searchParams.set('stream', streamId);
    } else {
        url.searchParams.delete('stream');
    }
    return url.toString();
}

/**
 * Extrae los query params de una URL
 * @param {string} urlString - URL completa
 * @returns {URLSearchParams} Objeto con los parametros
 */
function getSearchParams(urlString) {
    const url = new URL(urlString);
    return url.searchParams;
}

/**
 * Verifica si una URL tiene el parametro stream
 * @param {string} urlString - URL a verificar
 * @returns {boolean}
 */
function hasStreamParam(urlString) {
    const url = new URL(urlString);
    return url.searchParams.has('stream');
}

/**
 * Remueve el parametro stream de una URL
 * @param {string} urlString - URL con parametro stream
 * @returns {string} URL sin parametro stream
 */
function removeStreamParam(urlString) {
    const url = new URL(urlString);
    url.searchParams.delete('stream');
    return url.toString();
}

describe('URLRouter (Frontend Logic)', () => {

    describe('parseStreamIdFromSearch', () => {
        it('debe extraer ID de stream del query string', () => {
            const id = parseStreamIdFromSearch('?stream=5');

            assert.strictEqual(id, 5);
        });

        it('debe retornar null cuando no existe parametro stream', () => {
            const id = parseStreamIdFromSearch('?other=value');

            assert.strictEqual(id, null);
        });

        it('debe manejar query string vacio', () => {
            const id = parseStreamIdFromSearch('');

            assert.strictEqual(id, null);
        });

        it('debe manejar solo signo de interrogacion', () => {
            const id = parseStreamIdFromSearch('?');

            assert.strictEqual(id, null);
        });

        it('debe parsear stream ID como entero', () => {
            const id = parseStreamIdFromSearch('?stream=123');

            assert.strictEqual(typeof id, 'number');
            assert.strictEqual(id, 123);
        });

        it('debe manejar multiples parametros', () => {
            const id = parseStreamIdFromSearch('?other=1&stream=42&another=test');

            assert.strictEqual(id, 42);
        });

        it('debe retornar NaN para valores no numericos', () => {
            const id = parseStreamIdFromSearch('?stream=abc');

            assert.ok(Number.isNaN(id));
        });

        it('debe manejar stream=0', () => {
            const id = parseStreamIdFromSearch('?stream=0');

            assert.strictEqual(id, 0);
        });

        it('debe manejar IDs grandes', () => {
            const id = parseStreamIdFromSearch('?stream=999999');

            assert.strictEqual(id, 999999);
        });
    });

    describe('buildURLWithStream', () => {
        const baseUrl = 'http://localhost:3000/app';

        it('debe agregar parametro stream a URL', () => {
            const url = buildURLWithStream(baseUrl, 5);

            assert.ok(url.includes('stream=5'));
        });

        it('debe no agregar parametro cuando streamId es null', () => {
            const url = buildURLWithStream(baseUrl, null);

            assert.ok(!url.includes('stream'));
        });

        it('debe no agregar parametro cuando streamId es 0', () => {
            const url = buildURLWithStream(baseUrl, 0);

            // 0 es falsy, entonces no se agrega
            assert.ok(!url.includes('stream'));
        });

        it('debe mantener la URL base', () => {
            const url = buildURLWithStream(baseUrl, 10);

            assert.ok(url.startsWith('http://localhost:3000/app'));
        });

        it('debe manejar URL con parametros existentes', () => {
            const urlWithParams = 'http://localhost:3000/app?existing=value';
            const url = buildURLWithStream(urlWithParams, 7);

            assert.ok(url.includes('existing=value'));
            assert.ok(url.includes('stream=7'));
        });

        it('debe reemplazar parametro stream existente', () => {
            const urlWithStream = 'http://localhost:3000/app?stream=1';
            const url = buildURLWithStream(urlWithStream, 99);

            assert.ok(url.includes('stream=99'));
            assert.ok(!url.includes('stream=1'));
        });

        it('debe eliminar parametro stream existente cuando streamId es null', () => {
            const urlWithStream = 'http://localhost:3000/app?stream=1&other=test';
            const url = buildURLWithStream(urlWithStream, null);

            assert.ok(!url.includes('stream='));
            assert.ok(url.includes('other=test'));
        });
    });

    describe('getSearchParams', () => {
        it('debe extraer parametros de URL', () => {
            const params = getSearchParams('http://localhost/?a=1&b=2');

            assert.strictEqual(params.get('a'), '1');
            assert.strictEqual(params.get('b'), '2');
        });

        it('debe retornar URLSearchParams vacio para URL sin parametros', () => {
            const params = getSearchParams('http://localhost/');

            assert.strictEqual(params.toString(), '');
        });

        it('debe manejar parametros codificados', () => {
            const params = getSearchParams('http://localhost/?name=hello%20world');

            assert.strictEqual(params.get('name'), 'hello world');
        });
    });

    describe('hasStreamParam', () => {
        it('debe retornar true si tiene parametro stream', () => {
            assert.strictEqual(hasStreamParam('http://localhost/?stream=1'), true);
        });

        it('debe retornar false si no tiene parametro stream', () => {
            assert.strictEqual(hasStreamParam('http://localhost/?other=1'), false);
        });

        it('debe retornar true para stream vacio', () => {
            // stream= existe aunque este vacio
            assert.strictEqual(hasStreamParam('http://localhost/?stream='), true);
        });
    });

    describe('removeStreamParam', () => {
        it('debe remover parametro stream', () => {
            const url = removeStreamParam('http://localhost/?stream=5');

            assert.ok(!url.includes('stream'));
        });

        it('debe mantener otros parametros', () => {
            const url = removeStreamParam('http://localhost/?a=1&stream=5&b=2');

            assert.ok(url.includes('a=1'));
            assert.ok(url.includes('b=2'));
            assert.ok(!url.includes('stream'));
        });

        it('debe manejar URL sin parametro stream', () => {
            const original = 'http://localhost/?other=value';
            const url = removeStreamParam(original);

            assert.ok(url.includes('other=value'));
        });
    });
});
