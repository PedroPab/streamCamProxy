/**
 * Tests para validadores de autenticacion
 * Funciones puras extraidas para testing
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Funciones de validacion (logica pura extraida)
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    return password && typeof password === 'string' && password.length >= 6;
}

function isValidUsername(username) {
    return username && typeof username === 'string' && username.length >= 2 && username.length <= 50;
}

function validateRegistrationInput(email, password, username) {
    const errors = [];

    if (!email || !password || !username) {
        errors.push('Todos los campos son requeridos');
    }

    if (email && !isValidEmail(email)) {
        errors.push('Email invalido');
    }

    if (password && !isValidPassword(password)) {
        errors.push('Password debe tener al menos 6 caracteres');
    }

    if (username && !isValidUsername(username)) {
        errors.push('Username debe tener entre 2 y 50 caracteres');
    }

    return errors;
}

function validateLoginInput(email, password) {
    const errors = [];

    if (!email || !password) {
        errors.push('Email y password son requeridos');
    }

    if (email && !isValidEmail(email)) {
        errors.push('Email invalido');
    }

    return errors;
}

// Tests
describe('Auth Validators', () => {

    describe('isValidEmail', () => {
        it('debe aceptar email valido', () => {
            assert.strictEqual(isValidEmail('test@example.com'), true);
        });

        it('debe aceptar email con subdominio', () => {
            assert.strictEqual(isValidEmail('user@mail.example.com'), true);
        });

        it('debe aceptar email con numeros', () => {
            assert.strictEqual(isValidEmail('user123@test.com'), true);
        });

        it('debe rechazar email sin @', () => {
            assert.strictEqual(isValidEmail('testexample.com'), false);
        });

        it('debe rechazar email sin dominio', () => {
            assert.strictEqual(isValidEmail('test@'), false);
        });

        it('debe rechazar email sin extension', () => {
            assert.strictEqual(isValidEmail('test@example'), false);
        });

        it('debe rechazar email con espacios', () => {
            assert.strictEqual(isValidEmail('test @example.com'), false);
            assert.strictEqual(isValidEmail('test@ example.com'), false);
        });

        it('debe rechazar email vacio', () => {
            assert.strictEqual(isValidEmail(''), false);
        });

        it('debe rechazar null', () => {
            assert.strictEqual(isValidEmail(null), false);
        });

        it('debe rechazar undefined', () => {
            assert.strictEqual(isValidEmail(undefined), false);
        });

        it('debe rechazar numeros', () => {
            assert.strictEqual(isValidEmail(12345), false);
        });
    });

    describe('isValidPassword', () => {
        it('debe aceptar password con 6 caracteres', () => {
            assert.strictEqual(isValidPassword('123456'), true);
        });

        it('debe aceptar password con mas de 6 caracteres', () => {
            assert.strictEqual(isValidPassword('mySecurePassword123'), true);
        });

        it('debe rechazar password con menos de 6 caracteres', () => {
            assert.strictEqual(isValidPassword('12345'), false);
        });

        it('debe rechazar password vacio', () => {
            assert.ok(!isValidPassword(''));
        });

        it('debe rechazar null', () => {
            assert.ok(!isValidPassword(null));
        });

        it('debe rechazar undefined', () => {
            assert.ok(!isValidPassword(undefined));
        });

        it('debe rechazar numeros (no string)', () => {
            assert.strictEqual(isValidPassword(123456), false);
        });
    });

    describe('isValidUsername', () => {
        it('debe aceptar username valido', () => {
            assert.strictEqual(isValidUsername('john'), true);
        });

        it('debe aceptar username con 2 caracteres (minimo)', () => {
            assert.strictEqual(isValidUsername('ab'), true);
        });

        it('debe aceptar username con 50 caracteres (maximo)', () => {
            assert.strictEqual(isValidUsername('a'.repeat(50)), true);
        });

        it('debe rechazar username con 1 caracter', () => {
            assert.strictEqual(isValidUsername('a'), false);
        });

        it('debe rechazar username con mas de 50 caracteres', () => {
            assert.strictEqual(isValidUsername('a'.repeat(51)), false);
        });

        it('debe rechazar username vacio', () => {
            assert.ok(!isValidUsername(''));
        });

        it('debe rechazar null', () => {
            assert.ok(!isValidUsername(null));
        });
    });

    describe('validateRegistrationInput', () => {
        it('debe retornar array vacio para input valido', () => {
            const errors = validateRegistrationInput('test@test.com', '123456', 'testuser');

            assert.deepStrictEqual(errors, []);
        });

        it('debe retornar error para campos faltantes', () => {
            const errors = validateRegistrationInput('', '', '');

            assert.ok(errors.includes('Todos los campos son requeridos'));
        });

        it('debe retornar error para email invalido', () => {
            const errors = validateRegistrationInput('invalid-email', '123456', 'user');

            assert.ok(errors.some(e => e.includes('Email')));
        });

        it('debe retornar error para password corto', () => {
            const errors = validateRegistrationInput('test@test.com', '123', 'user');

            assert.ok(errors.some(e => e.includes('Password')));
        });

        it('debe retornar error para username invalido', () => {
            const errors = validateRegistrationInput('test@test.com', '123456', 'a');

            assert.ok(errors.some(e => e.includes('Username')));
        });

        it('debe retornar multiples errores', () => {
            const errors = validateRegistrationInput('invalid', '123', 'a');

            assert.ok(errors.length >= 3);
        });
    });

    describe('validateLoginInput', () => {
        it('debe retornar array vacio para input valido', () => {
            const errors = validateLoginInput('test@test.com', '123456');

            assert.deepStrictEqual(errors, []);
        });

        it('debe retornar error si falta email', () => {
            const errors = validateLoginInput('', '123456');

            assert.ok(errors.length > 0);
        });

        it('debe retornar error si falta password', () => {
            const errors = validateLoginInput('test@test.com', '');

            assert.ok(errors.length > 0);
        });

        it('debe retornar error para email invalido', () => {
            const errors = validateLoginInput('invalid', '123456');

            assert.ok(errors.some(e => e.includes('Email')));
        });
    });
});
