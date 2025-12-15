import { get } from 'http';
import {
    ESP32_URL,
    espReq,
    espRes,
    espHeaders,
    connecting,
} from './initData.js';
import clients from './clients.js';

function connectToCamera() {
    if (espRes.get() || connecting.get()) {
        console.log('Ya existe una conexión activa o en proceso.');
        return;
    }

    connecting.set(true);
    console.log('Conectando a ESP32-CAM en:', ESP32_URL);

    const request = get(ESP32_URL, (response) => {
        handleSuccessfulConnection(response);
    });

    request.on('error', (error) => {
        handleConnectionError(error);
    });

    espReq.set(request);
}

function handleSuccessfulConnection(response) {
    connecting.set(false);
    espRes.set(response);
    espHeaders.set(response.headers);

    logConnectionSuccess(response);

    response.on('data', (chunk) => {
        broadcastChunkToClients(chunk);
    });

    response.on('end', () => {
        handleStreamEnd();
    });

    response.on('error', (error) => {
        handleStreamError(error);
    });
}

function logConnectionSuccess(response) {
    console.log('Conectado a ESP32-CAM.');
    console.log('Status:', response.statusCode);
    console.log('Content-Type:', espHeaders.get()['content-type']);
}

function broadcastChunkToClients(chunk) {
    for (const clientRes of clients) {
        if (!clientRes.writableEnded) {
            clientRes.write(chunk);
        }
    }
}

function handleStreamEnd() {
    console.log('Stream de la ESP32-CAM terminó.');
    resetCameraConnection();
    closeAllClients();
}

function handleStreamError(error) {
    console.error('Error en stream ESP32-CAM:', error.message);
    resetCameraConnection();
}

function handleConnectionError(error) {
    connecting.set(false);
    resetCameraConnection();
    console.error('NO se pudo conectar a ESP32-CAM:', error.message);
    notifyClientsOfError();
}

function resetCameraConnection() {
    espRes.set(null);
    espReq.set(null);
}

function closeAllClients() {
    for (const clientRes of clients) {
        if (!clientRes.writableEnded) {
            clientRes.end();
        }
    }
    clients.clear();
}

function notifyClientsOfError() {
    for (const clientRes of clients) {
        if (!clientRes.writableEnded) {
            clientRes.end('Error conectando a la cámara');
        }
    }
    clients.clear();
}

export default connectToCamera;