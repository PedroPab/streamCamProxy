// server.js
const http = require('http');

const ESP32_HOST = '192.168.1.68';  // 👈 tu IP
const ESP32_PORT = 81;              // normalmente 81 para /stream en el ejemplo de cámara
const ESP32_PATH = '/stream';       // ruta típica del stream
const ESP32_URL = `http://${ESP32_HOST}:${ESP32_PORT}${ESP32_PATH}`;

const clients = new Set();          // respuestas (res) de los navegadores conectados a /stream

let espReq = null;                  // request hacia la cámara
let espRes = null;                  // response (stream MJPEG) de la cámara
let espHeaders = null;              // headers de la cámara
let connecting = false;             // bandera para no reconectar 20 veces

function connectToCamera() {
    if (espRes || connecting) {
        return;
    }

    connecting = true;
    console.log('Conectando a ESP32-CAM en:', ESP32_URL);

    espReq = http.get(ESP32_URL, (res) => {
        connecting = false;
        espRes = res;
        espHeaders = res.headers;

        console.log('Conectado a ESP32-CAM.');
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', espHeaders['content-type']);

        // Cada chunk de la cámara se reenvía a TODOS los clientes
        res.on('data', (chunk) => {
            for (const clientRes of clients) {
                if (!clientRes.writableEnded) {
                    clientRes.write(chunk);
                }
            }
        });

        res.on('end', () => {
            console.log('Stream de la ESP32-CAM terminó.');
            espRes = null;
            // Cerramos todos los clientes porque ya no hay stream
            for (const clientRes of clients) {
                if (!clientRes.writableEnded) {
                    clientRes.end();
                }
            }
            clients.clear();
        });

        res.on('error', (err) => {
            console.error('Error en stream ESP32-CAM:', err.message);
            espRes = null;
        });
    });

    espReq.on('error', (err) => {
        connecting = false;
        espRes = null;
        console.error('NO se pudo conectar a ESP32-CAM:', err.message);

        // Avisamos a los clientes que hubo un error
        for (const clientRes of clients) {
            if (!clientRes.writableEnded) {
                clientRes.end('Error conectando a la cámara');
            }
        }
        clients.clear();
    });
}

// Servidor HTTP que exporta /stream y una página de prueba
const server = http.createServer((req, res) => {
    if (req.url === '/stream') {
        // Usamos el Content-Type original de la cámara si ya lo conocemos
        const contentType =
            (espHeaders && espHeaders['content-type']) ||
            'multipart/x-mixed-replace; boundary=frame';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            Connection: 'close',
        });

        clients.add(res);
        console.log('Cliente conectado a /stream. Total clientes:', clients.size);

        // Aseguramos que haya conexión a la cámara
        connectToCamera();

        // Cuando el navegador se cierra o recarga, quitamos el cliente
        req.on('close', () => {
            clients.delete(res);
            console.log('Cliente desconectado. Total clientes:', clients.size);

            // Si ya no quedan clientes, podemos cerrar la conexión con la cámara
            if (clients.size === 0 && espRes) {
                console.log('No hay clientes, cerrando stream de la cámara.');
                try {
                    espReq && espReq.destroy();
                    espRes && espRes.destroy();
                } catch (e) {
                    console.error('Error cerrando conexiones:', e.message);
                }
                espReq = null;
                espRes = null;
            }
        });
    } else if (req.url === '/') {
        // Una página HTML sencilla para probar
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
      <html>
        <head><title>ESP32-CAM Proxy</title></head>
        <body style="background:#111; color:#eee; text-align:center;">
          <h1>ESP32-CAM vía Node (puerto 3001)</h1>
          <p>Si todo está bien, deberías ver el video abajo:</p>
          <img src="/stream" style="max-width:90%; border:2px solid #444;" />
        </body>
      </html>
    `);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 3001; // 👈 tu puerto
server.listen(PORT, () => {
    console.log(`Servidor proxy escuchando en http://localhost:${PORT}/`);
    console.log(`Prueba el stream en http://localhost:${PORT}/stream`);
});
