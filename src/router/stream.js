import { espReq, espRes, espHeaders } from '../controller/initData.js';
import clients from '../controller/clients.js';
import connectToCamera from '../controller/connectToCamera.js';

const DEFAULT_CONTENT_TYPE = 'multipart/x-mixed-replace; boundary=frame';

const RESPONSE_HEADERS = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    Connection: 'close',
};

/**
 * Maneja las solicitudes HTTP al endpoint /stream
 * Conecta navegadores al stream MJPEG de la ESP32-CAM
 * Compatible con Express middleware
 * @param {import('express').Request} req - Request de Express
 * @param {import('express').Response} res - Response de Express
 */
const streamRouter = (req, res) => {
    initializeClientResponse(res);
    registerClient(res);
    ensureCameraConnection();
    registerClientDisconnectHandler(req, res);
};

/**
 * Configura los headers de respuesta para streaming MJPEG
 * @param {import('express').Response} res - Response de Express
 */
function initializeClientResponse(res) {
    const contentType = getContentType();

    res.writeHead(200, {
        'Content-Type': contentType,
        ...RESPONSE_HEADERS,
    });
}

/**
 * Obtiene el Content-Type apropiado para el stream
 * Usa el Content-Type de la cámara si está disponible, o un valor por defecto
 * @returns {string}
 */
function getContentType() {
    const headers = espHeaders.get();
    return (headers && headers['content-type']) || DEFAULT_CONTENT_TYPE;
}

/**
 * Registra un nuevo cliente en la colección
 * @param {import('express').Response} res - Response de Express
 */
function registerClient(res) {
    clients.add(res);
    logClientConnected();
}

/**
 * Asegura que exista una conexión activa con la cámara
 */
function ensureCameraConnection() {
    connectToCamera();
}


// Manejo de Desconexión de Clientes

/**
 * Registra el handler para cuando un cliente se desconecta
 * @param {import('express').Request} req - Request de Express
 * @param {import('express').Response} res - Response de Express
 */
function registerClientDisconnectHandler(req, res) {
    req.on('close', () => {
        handleClientDisconnect(res);
    });
}

/**
 * Maneja la desconexión de un cliente
 * @param {import('express').Response} res - Response del cliente desconectado
 */
function handleClientDisconnect(res) {
    unregisterClient(res);
    logClientDisconnected();

    if (shouldCloseCameraConnection()) {
        closeCameraConnection();
    }
}

/**
 * Elimina un cliente de la colección
 * @param {import('express').Response} res - Response de Express
 */
function unregisterClient(res) {
    clients.delete(res);
}

/**
 * Determina si se debe cerrar la conexión con la cámara
 * Solo cierra si no quedan clientes conectados
 * @returns {boolean}
 */
function shouldCloseCameraConnection() {
    return clients.size === 0 && espRes.get() !== null;
}

/**
 * Cierra la conexión activa con la ESP32-CAM
 */
function closeCameraConnection() {
    console.log('No hay clientes, cerrando stream de la cámara.');

    try {
        destroyCameraStreams();
    } catch (error) {
        logConnectionCloseError(error);
    }
}

/**
 * Destruye los streams de conexión con la cámara
 */
function destroyCameraStreams() {
    const request = espReq.get();
    const response = espRes.get();

    if (request) {
        request.destroy();
        espReq.set(null);
    }

    if (response) {
        response.destroy();
        espRes.set(null);
    }
}


// Utilidades de Logging

/**
 * Registra en consola cuando un cliente se conecta
 */
function logClientConnected() {
    console.log('Cliente conectado a /stream. Total clientes:', clients.size);
}

/**
 * Registra en consola cuando un cliente se desconecta
 */
function logClientDisconnected() {
    console.log('Cliente desconectado. Total clientes:', clients.size);
}

/**
 * Registra errores al cerrar las conexiones
 * @param {Error} error - Error capturado
 */
function logConnectionCloseError(error) {
    console.error('Error cerrando conexiones:', error.message);
}

export default streamRouter;
