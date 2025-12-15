import { get } from 'http';
import {
    ESP32_URL,
    espReq,
    espRes,
    espHeaders,
    connecting,
} from './initData.js';
import clients from './clients.js';

// Constantes
const ERROR_MESSAGES = {
    CONNECTION_FAILED: 'Error conectando a la cámara',
    STREAM_ERROR: 'Error en el stream de la cámara',
};

// Función Principal

/**
 * Establece conexión con la cámara ESP32-CAM
 * Si ya existe una conexión activa o en proceso, no hace nada
 */
function connectToCamera() {
    if (isConnectionActive()) {
        console.log('Ya existe una conexión activa o en proceso.');
        return;
    }

    initializeConnection();
}


// Handlers de Conexión


/**
 * Maneja una conexión exitosa con la ESP32-CAM
 * @param {http.IncomingMessage} response - Respuesta HTTP de la cámara
 */
function handleSuccessfulConnection(response) {
    updateConnectionState(response);
    logConnectionSuccess(response);
    registerStreamEventHandlers(response);
}

/**
 * Maneja errores durante el intento de conexión inicial
 * @param {Error} error - Error capturado
 */
function handleConnectionError(error) {
    console.error('NO se pudo conectar a ESP32-CAM:', error.message);
    resetCameraState();
    disconnectAllClients(ERROR_MESSAGES.CONNECTION_FAILED);
}


// Handlers de Eventos de Stream


/**
 * Maneja datos recibidos del stream de la cámara
 * @param {Buffer} chunk - Fragmento de datos MJPEG
 */
function handleDataChunk(chunk) {
    broadcastToClients(chunk);
}

/**
 * Maneja el fin normal del stream de la cámara
 */
function handleStreamEnd() {
    console.log('Stream de la ESP32-CAM terminó.');
    resetCameraState();
    disconnectAllClients();
}

/**
 * Maneja errores en el stream activo de la cámara
 * @param {Error} error - Error capturado
 */
function handleStreamError(error) {
    console.error('Error en stream ESP32-CAM:', error.message);
    resetCameraState();
    disconnectAllClients(ERROR_MESSAGES.STREAM_ERROR);
}


// Utilidades de Estado


/**
 * Verifica si existe una conexión activa o en proceso
 * @returns {boolean}
 */
function isConnectionActive() {
    return espRes.get() !== null || connecting.get() === true;
}

/**
 * Inicializa una nueva conexión HTTP con la ESP32-CAM
 */
function initializeConnection() {
    connecting.set(true);
    console.log('Conectando a ESP32-CAM en:', ESP32_URL);

    const request = get(ESP32_URL, handleSuccessfulConnection);
    request.on('error', handleConnectionError);

    espReq.set(request);
}

/**
 * Actualiza el estado de conexión tras una conexión exitosa
 * @param {http.IncomingMessage} response - Respuesta HTTP
 */
function updateConnectionState(response) {
    connecting.set(false);
    espRes.set(response);
    espHeaders.set(response.headers);
}

/**
 * Registra todos los event handlers para el stream de respuesta
 * @param {http.IncomingMessage} response - Respuesta HTTP
 */
function registerStreamEventHandlers(response) {
    response.on('data', handleDataChunk);
    response.on('end', handleStreamEnd);
    response.on('error', handleStreamError);
}

/**
 * Reinicia el estado de conexión de la cámara a valores por defecto
 */
function resetCameraState() {
    espRes.set(null);
    espReq.set(null);
    connecting.set(false);
}


// Utilidades de Broadcast a Clientes


/**
 * Envía datos a todos los clientes conectados
 * @param {Buffer} chunk - Datos a transmitir
 */
function broadcastToClients(chunk) {
    for (const clientRes of clients) {
        if (isClientWritable(clientRes)) {
            clientRes.write(chunk);
        }
    }
}

/**
 * Desconecta todos los clientes conectados
 * @param {string|null} message - Mensaje opcional para enviar antes de cerrar
 */
function disconnectAllClients(message = null) {
    for (const clientRes of clients) {
        if (isClientWritable(clientRes)) {
            message ? clientRes.end(message) : clientRes.end();
        }
    }
    clients.clear();
}

/**
 * Verifica si un cliente puede recibir datos
 * @param {http.ServerResponse} clientRes - Respuesta del cliente
 * @returns {boolean}
 */
function isClientWritable(clientRes) {
    return !clientRes.writableEnded;
}


// Utilidades de Logging


/**
 * Registra información sobre la conexión exitosa
 * @param {http.IncomingMessage} response - Respuesta HTTP
 */
function logConnectionSuccess(response) {
    const headers = espHeaders.get();
    console.log('Conectado a ESP32-CAM.');
    console.log('Status:', response.statusCode);
    console.log('Content-Type:', headers['content-type']);
}


// Exportaciones


export default connectToCamera;
