import express from 'express';
import passport from 'passport';

import { PORT_external } from './src/controller/initData.js';
import homeRouter from './src/router/home.js';
import streamRouter from './src/router/stream.js';
import statusRouter from './src/router/status/index.js';
import mediaRouter from './src/router/media/index.js';
import { initStorage } from './src/controller/storage.js';

import authRouter from './src/router/auth/index.js';
import usersRouter from './src/router/users/index.js';
import { configurePassport } from './src/auth/passport.js';
import { authenticate } from './src/auth/middleware/authenticate.js';
import { initDatabase } from './src/database/index.js';
import { seedAdminUser } from './src/database/seeds/admin.seed.js';

const app = express();

app.use(express.json());

app.use(express.static('src/public'));

configurePassport();
app.use(passport.initialize());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', homeRouter);

app.use('/auth', authRouter);

app.get('/stream', authenticate, streamRouter);
app.use('/status', authenticate, statusRouter);
app.use('/media', authenticate, mediaRouter);
app.use('/users', usersRouter);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

async function startServer() {
    try {
        initDatabase();

        await seedAdminUser();

        await initStorage();

        app.listen(PORT_external, () => {
            console.log('='.repeat(60));
            console.log('Servidor proxy ESP32-CAM iniciado');
            console.log('='.repeat(60));
            console.log(`Servidor escuchando en: http://localhost:${PORT_external}/`);
            console.log(`Stream disponible en:   http://localhost:${PORT_external}/stream`);
            console.log(`Auth endpoints en:      http://localhost:${PORT_external}/auth`);
            console.log('='.repeat(60));
            console.log('Rutas de autenticacion:');
            console.log('  POST /auth/login     - Iniciar sesion');
            console.log('  POST /auth/register  - Registrar usuario');
            console.log('  POST /auth/refresh   - Renovar token');
            console.log('  POST /auth/logout    - Cerrar sesion');
            console.log('  GET  /auth/me        - Usuario actual');
            console.log('='.repeat(60));
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();
