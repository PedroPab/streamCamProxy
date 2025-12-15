import { createServer } from 'http';
import { default as routers } from './src/router/index.js';
import { PORT_external } from './src/controller/initData.js';

// Servidor HTTP que exporta /stream y una página de prueba
const server = createServer(routers)

server.listen(PORT_external, () => {
    console.log(`Servidor proxy escuchando en http://localhost:${PORT_external}/`);
    console.log(`Prueba el stream en http://localhost:${PORT_external}/stream`);
});
