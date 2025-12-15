import express from 'express';
import { PORT_external } from './src/controller/initData.js';
import homeRouter from './src/router/home.js';
import streamRouter from './src/router/stream.js';

const app = express();

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', homeRouter);

app.get('/stream', streamRouter);

app.use((req, res) => {
    res.status(404).send('Not found');
});

app.listen(PORT_external, () => {
    console.log('='.repeat(60));
    console.log(`🚀 Servidor proxy ESP32-CAM iniciado`);
    console.log('='.repeat(60));
    console.log(`📡 Servidor escuchando en: http://localhost:${PORT_external}/`);
    console.log(`📹 Stream disponible en:   http://localhost:${PORT_external}/stream`);
    console.log('='.repeat(60));
});
