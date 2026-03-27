/**
 * Tests para el modulo JWT
 * Archivo fuente: src/auth/jwt.js
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair
} from '../../../src/auth/jwt.js';
import { NORMAL_USER, ADMIN_USER } from '../../helpers/fixtures.js';

describe('JWT Module', () => {

    describe('generateAccessToken', () => {
        it('debe generar un token JWT valido con 3 partes', () => {
            const token = generateAccessToken(NORMAL_USER);

            assert.ok(token, 'Token debe existir');
            assert.strictEqual(typeof token, 'string');
            assert.strictEqual(token.split('.').length, 3, 'JWT debe tener 3 partes');
        });

        it('debe incluir sub, email, role y type en el payload', () => {
            const token = generateAccessToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.sub, NORMAL_USER.id);
            assert.strictEqual(decoded.email, NORMAL_USER.email);
            assert.strictEqual(decoded.role, NORMAL_USER.role);
            assert.strictEqual(decoded.type, 'access');
        });

        it('debe incluir issuer y audience correctos', () => {
            const token = generateAccessToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.iss, 'streamcam-api');
            assert.strictEqual(decoded.aud, 'streamcam-client');
        });

        it('debe incluir expiracion (exp)', () => {
            const token = generateAccessToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.ok(decoded.exp, 'Token debe tener expiracion');
            assert.ok(decoded.exp > Date.now() / 1000, 'Expiracion debe ser futura');
        });

        it('debe funcionar con usuario admin', () => {
            const token = generateAccessToken(ADMIN_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.role, 'admin');
        });
    });

    describe('generateRefreshToken', () => {
        it('debe generar un token JWT valido', () => {
            const token = generateRefreshToken(NORMAL_USER);

            assert.ok(token);
            assert.strictEqual(token.split('.').length, 3);
        });

        it('debe incluir type=refresh en el payload', () => {
            const token = generateRefreshToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.type, 'refresh');
        });

        it('debe incluir sub y email pero NO role', () => {
            const token = generateRefreshToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.sub, NORMAL_USER.id);
            assert.strictEqual(decoded.email, NORMAL_USER.email);
            assert.strictEqual(decoded.role, undefined);
        });

        it('debe incluir issuer pero NO audience', () => {
            const token = generateRefreshToken(NORMAL_USER);
            const decoded = jwt.decode(token);

            assert.strictEqual(decoded.iss, 'streamcam-api');
            assert.strictEqual(decoded.aud, undefined);
        });
    });

    describe('verifyAccessToken', () => {
        it('debe retornar payload para token valido', () => {
            const token = generateAccessToken(NORMAL_USER);
            const payload = verifyAccessToken(token);

            assert.ok(payload, 'Payload debe existir');
            assert.strictEqual(payload.sub, NORMAL_USER.id);
            assert.strictEqual(payload.email, NORMAL_USER.email);
        });

        it('debe retornar null para token invalido', () => {
            const payload = verifyAccessToken('invalid.token.here');

            assert.strictEqual(payload, null);
        });

        it('debe retornar null para token manipulado', () => {
            const token = generateAccessToken(NORMAL_USER);
            const tampered = token.slice(0, -5) + 'xxxxx';
            const payload = verifyAccessToken(tampered);

            assert.strictEqual(payload, null);
        });

        it('debe retornar null para string vacio', () => {
            const payload = verifyAccessToken('');

            assert.strictEqual(payload, null);
        });

        it('debe retornar null para refresh token (audience incorrecta)', () => {
            const refreshToken = generateRefreshToken(NORMAL_USER);
            const payload = verifyAccessToken(refreshToken);

            assert.strictEqual(payload, null);
        });
    });

    describe('verifyRefreshToken', () => {
        it('debe retornar payload para refresh token valido', () => {
            const token = generateRefreshToken(NORMAL_USER);
            const payload = verifyRefreshToken(token);

            assert.ok(payload);
            assert.strictEqual(payload.sub, NORMAL_USER.id);
            assert.strictEqual(payload.type, 'refresh');
        });

        it('debe retornar null para token invalido', () => {
            const payload = verifyRefreshToken('invalid.token');

            assert.strictEqual(payload, null);
        });

        it('debe retornar null para access token (type incorrecto)', () => {
            const accessToken = generateAccessToken(NORMAL_USER);
            const payload = verifyRefreshToken(accessToken);

            assert.strictEqual(payload, null);
        });
    });

    describe('generateTokenPair', () => {
        it('debe retornar objeto con accessToken y refreshToken', () => {
            const pair = generateTokenPair(NORMAL_USER);

            assert.ok(pair.accessToken);
            assert.ok(pair.refreshToken);
            assert.strictEqual(typeof pair.accessToken, 'string');
            assert.strictEqual(typeof pair.refreshToken, 'string');
        });

        it('debe incluir expiresIn y tokenType', () => {
            const pair = generateTokenPair(NORMAL_USER);

            assert.ok(pair.expiresIn);
            assert.strictEqual(pair.tokenType, 'Bearer');
        });

        it('accessToken debe ser verificable', () => {
            const pair = generateTokenPair(NORMAL_USER);
            const payload = verifyAccessToken(pair.accessToken);

            assert.ok(payload);
            assert.strictEqual(payload.sub, NORMAL_USER.id);
        });

        it('refreshToken debe ser verificable', () => {
            const pair = generateTokenPair(NORMAL_USER);
            const payload = verifyRefreshToken(pair.refreshToken);

            assert.ok(payload);
            assert.strictEqual(payload.sub, NORMAL_USER.id);
        });
    });
});
