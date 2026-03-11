import express from 'express';
import { PORT_external } from './src/controller/initData.js';
import homeRouter from './src/router/home.js';
import streamRouter from './src/router/stream.js';
import statusRouter from './src/router/status/index.js';
import mediaRouter from './src/router/media/index.js';
import { initStorage } from './src/controller/storage.js';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware para servir archivos estáticos desde la carpeta public
app.use(express.static('src/public'));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', homeRouter);

app.get('/stream', streamRouter);

app.use('/status', statusRouter);

app.use('/media', mediaRouter);

app.use((req, res) => {
    res.status(404).send('Not found');
});

// Inicializar storage antes de escuchar
initStorage().then(() => {
    app.listen(PORT_external, () => {
        console.log('='.repeat(60));
        console.log(`🚀 Servidor proxy ESP32-CAM iniciado`);
        console.log('='.repeat(60));
        console.log(`📡 Servidor escuchando en: http://localhost:${PORT_external}/`);
        console.log(`📹 Stream disponible en:   http://localhost:${PORT_external}/stream`);
        console.log('='.repeat(60));
    });
}).catch((err) => {
    console.error('Error al inicializar el almacenamiento:', err);
}).finally(() => {
    console.log('='.repeat(60));
    console.log(`📁 Almacenamiento inicializado`);
    console.log('='.repeat(60));
});
