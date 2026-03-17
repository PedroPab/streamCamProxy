import { get } from 'http';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import { StreamModel } from '../models/stream.model.js';
import { MediaModel } from '../models/media.model.js';
import { VIDEOS_DIR, formatTimestamp } from './storage.js';
import { emitStatus, emitLog, emitRecording } from '../websocket/emitter.js';

// Marcadores JPEG
const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

/**
 * Parser de frames MJPEG para un stream específico
 */
class StreamFrameParser extends EventEmitter {
    constructor() {
        super();
        this.buffer = Buffer.alloc(0);
        this.currentFrame = null;
        this.frameCount = 0;
    }

    push(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.extractFrames();
    }

    extractFrames() {
        let startIndex = this.findMarker(this.buffer, JPEG_START, 0);

        while (startIndex !== -1) {
            const endIndex = this.findMarker(this.buffer, JPEG_END, startIndex + 2);

            if (endIndex === -1) {
                if (startIndex > 0) {
                    this.buffer = this.buffer.slice(startIndex);
                }
                break;
            }

            const frameEnd = endIndex + JPEG_END.length;
            const frame = this.buffer.slice(startIndex, frameEnd);

            this.currentFrame = frame;
            this.frameCount++;
            this.emit('frame', frame);

            this.buffer = this.buffer.slice(frameEnd);
            startIndex = this.findMarker(this.buffer, JPEG_START, 0);
        }

        if (this.buffer.length > 1024 * 1024) {
            const lastStart = this.findMarker(this.buffer, JPEG_START, this.buffer.length - 100000);
            if (lastStart > 0) {
                this.buffer = this.buffer.slice(lastStart);
            } else {
                this.buffer = Buffer.alloc(0);
            }
        }
    }

    findMarker(buffer, marker, startPos) {
        for (let i = startPos; i <= buffer.length - marker.length; i++) {
            if (buffer[i] === marker[0] && buffer[i + 1] === marker[1]) {
                return i;
            }
        }
        return -1;
    }

    getLastFrame() {
        return this.currentFrame;
    }

    getFrameCount() {
        return this.frameCount;
    }

    reset() {
        this.buffer = Buffer.alloc(0);
        this.currentFrame = null;
        this.frameCount = 0;
    }
}

/**
 * Grabador de video para un stream específico
 */
class StreamVideoRecorder {
    constructor(streamId) {
        this.streamId = streamId;
        this.recording = false;
        this.startTime = null;
        this.frameCount = 0;
        this.filename = null;
        this.writeStream = null;
        this.capturedBy = null;
    }

    start(capturedBy = null) {
        if (this.recording) {
            return { success: false, error: 'Already recording' };
        }

        const timestamp = formatTimestamp();
        this.filename = `video_stream${this.streamId}_${timestamp}.mjpeg`;
        const filepath = join(VIDEOS_DIR, this.filename);

        this.writeStream = createWriteStream(filepath);
        this.recording = true;
        this.startTime = Date.now();
        this.frameCount = 0;
        this.capturedBy = capturedBy;

        console.log(`[Stream ${this.streamId}] Recording started: ${this.filename}`);

        return {
            success: true,
            filename: this.filename,
            startTime: this.startTime
        };
    }

    addFrame(jpegBuffer) {
        if (!this.recording || !this.writeStream) {
            return false;
        }

        const boundary = '--frame\r\n';
        const contentType = 'Content-Type: image/jpeg\r\n';
        const contentLength = `Content-Length: ${jpegBuffer.length}\r\n\r\n`;

        this.writeStream.write(boundary);
        this.writeStream.write(contentType);
        this.writeStream.write(contentLength);
        this.writeStream.write(jpegBuffer);
        this.writeStream.write('\r\n');

        this.frameCount++;
        return true;
    }

    async stop() {
        if (!this.recording) {
            return { success: false, error: 'Not recording' };
        }

        const duration = Date.now() - this.startTime;
        const filename = this.filename;
        const frameCount = this.frameCount;

        await new Promise((resolve, reject) => {
            this.writeStream.end((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Guardar en base de datos
        const { statSync } = await import('fs');
        const filepath = join(VIDEOS_DIR, filename);
        const stats = statSync(filepath);

        const videoEntry = MediaModel.create({
            type: 'video',
            filename,
            streamId: this.streamId,
            capturedBy: this.capturedBy,
            timestamp: new Date().toISOString(),
            size: stats.size,
            duration,
            frames: frameCount
        });

        // Reset estado
        this.recording = false;
        this.startTime = null;
        this.frameCount = 0;
        this.filename = null;
        this.writeStream = null;
        this.capturedBy = null;

        console.log(`[Stream ${this.streamId}] Recording stopped: ${filename} (${frameCount} frames, ${duration}ms)`);

        return {
            success: true,
            video: videoEntry
        };
    }

    getStatus() {
        return {
            recording: this.recording,
            duration: this.recording ? Date.now() - this.startTime : 0,
            frameCount: this.frameCount,
            filename: this.filename
        };
    }

    isRecording() {
        return this.recording;
    }
}

/**
 * Contexto de conexión para un stream
 */
class StreamConnection {
    constructor(streamId, config) {
        this.streamId = streamId;
        this.config = config;
        this.clients = new Set();
        this.frameParser = new StreamFrameParser();
        this.videoRecorder = new StreamVideoRecorder(streamId);

        // Estado de conexión
        this.connecting = false;
        this.connected = false;
        this.request = null;
        this.response = null;
        this.headers = null;
        this.error = null;
    }

    get url() {
        return `http://${this.config.host}:${this.config.port}${this.config.path}`;
    }

    addClient(res) {
        this.clients.add(res);
        console.log(`[Stream ${this.streamId}] Cliente agregado. Total: ${this.clients.size}`);
    }

    removeClient(res) {
        this.clients.delete(res);
        console.log(`[Stream ${this.streamId}] Cliente removido. Total: ${this.clients.size}`);
    }

    getClientCount() {
        return this.clients.size;
    }

    reset() {
        this.connecting = false;
        this.connected = false;
        this.request = null;
        this.response = null;
        this.frameParser.reset();
    }
}

/**
 * Gestor de múltiples streams
 */
class StreamManager {
    constructor() {
        this.streams = new Map(); // streamId -> StreamConnection
    }

    /**
     * Obtiene o crea la conexión para un stream
     */
    getOrCreateConnection(streamId) {
        if (this.streams.has(streamId)) {
            return this.streams.get(streamId);
        }

        const streamConfig = StreamModel.getConnectionInfo(streamId);
        if (!streamConfig) {
            return null;
        }

        const connection = new StreamConnection(streamId, streamConfig);
        this.streams.set(streamId, connection);
        return connection;
    }

    /**
     * Conecta a un stream específico
     */
    connect(streamId) {
        const connection = this.getOrCreateConnection(streamId);
        if (!connection) {
            console.error(`[StreamManager] Stream ${streamId} no encontrado`);
            return false;
        }

        if (connection.connected || connection.connecting) {
            console.log(`[StreamManager] Stream ${streamId} ya conectado o conectando`);
            return true;
        }

        connection.connecting = true;
        connection.error = null;
        console.log(`[StreamManager] Conectando a stream ${streamId}: ${connection.url}`);

        const request = get(connection.url, (response) => {
            this.handleSuccessfulConnection(connection, response);
        });

        request.on('error', (error) => {
            this.handleConnectionError(connection, error);
        });

        connection.request = request;
        return true;
    }

    /**
     * Maneja conexión exitosa
     */
    handleSuccessfulConnection(connection, response) {
        connection.connecting = false;
        connection.connected = true;
        connection.response = response;
        connection.headers = response.headers;

        console.log(`[StreamManager] Conectado a stream ${connection.streamId}`);
        console.log(`  Status: ${response.statusCode}`);
        console.log(`  Content-Type: ${connection.headers['content-type']}`);

        emitStatus(connection.streamId, {
            connected: true,
            clients: connection.clients.size,
            error: null
        });
        emitLog(connection.streamId, 'Camera connected', 'success');

        response.on('data', (chunk) => this.handleDataChunk(connection, chunk));
        response.on('end', () => this.handleStreamEnd(connection));
        response.on('error', (error) => this.handleStreamError(connection, error));
    }

    /**
     * Maneja error de conexión
     */
    handleConnectionError(connection, error) {
        console.error(`[StreamManager] Error conectando a stream ${connection.streamId}:`, error.message);
        connection.error = error.message;
        connection.reset();
        this.disconnectAllClients(connection, 'Error conectando a la cámara');

        emitStatus(connection.streamId, {
            connected: false,
            clients: 0,
            error: error.message
        });
        emitLog(connection.streamId, `Connection error: ${error.message}`, 'error');
    }

    /**
     * Maneja datos recibidos
     */
    handleDataChunk(connection, chunk) {
        connection.frameParser.push(chunk);

        if (connection.videoRecorder.isRecording()) {
            const frame = connection.frameParser.getLastFrame();
            if (frame) {
                connection.videoRecorder.addFrame(frame);
            }
        }

        this.broadcastToClients(connection, chunk);
    }

    /**
     * Maneja fin de stream
     */
    handleStreamEnd(connection) {
        console.log(`[StreamManager] Stream ${connection.streamId} terminó`);
        connection.reset();
        this.disconnectAllClients(connection);
    }

    /**
     * Maneja error en stream
     */
    handleStreamError(connection, error) {
        console.error(`[StreamManager] Error en stream ${connection.streamId}:`, error.message);
        connection.error = error.message;
        connection.reset();
        this.disconnectAllClients(connection, 'Error en el stream');
    }

    /**
     * Broadcast a todos los clientes de un stream
     */
    broadcastToClients(connection, chunk) {
        for (const clientRes of connection.clients) {
            if (!clientRes.writableEnded) {
                clientRes.write(chunk);
            }
        }
    }

    /**
     * Desconecta todos los clientes de un stream
     */
    disconnectAllClients(connection, message = null) {
        for (const clientRes of connection.clients) {
            if (!clientRes.writableEnded) {
                message ? clientRes.end(message) : clientRes.end();
            }
        }
        connection.clients.clear();
    }

    /**
     * Agrega un cliente a un stream
     */
    addClient(streamId, res) {
        const connection = this.getOrCreateConnection(streamId);
        if (!connection) {
            return false;
        }

        connection.addClient(res);

        emitStatus(streamId, {
            connected: connection.connected,
            clients: connection.clients.size
        });

        // Iniciar conexión si es necesario
        if (!connection.connected && !connection.connecting) {
            this.connect(streamId);
        }

        return true;
    }

    /**
     * Remueve un cliente de un stream
     */
    removeClient(streamId, res) {
        const connection = this.streams.get(streamId);
        if (!connection) return;

        connection.removeClient(res);

        emitStatus(streamId, {
            connected: connection.connected,
            clients: connection.clients.size
        });

        // Si no hay más clientes, cerrar conexión
        if (connection.clients.size === 0 && connection.request) {
            console.log(`[StreamManager] Sin clientes en stream ${streamId}, cerrando conexión`);
            connection.request.destroy();
            connection.reset();
        }
    }

    /**
     * Obtiene el estado de un stream
     */
    getStreamStatus(streamId) {
        const connection = this.streams.get(streamId);
        const streamInfo = StreamModel.findById(streamId);

        if (!streamInfo) {
            return null;
        }

        return {
            id: streamId,
            name: streamInfo.name,
            connected: connection?.connected || false,
            connecting: connection?.connecting || false,
            clients: connection?.clients.size || 0,
            error: connection?.error || null,
            recording: connection?.videoRecorder.getStatus() || { recording: false }
        };
    }

    /**
     * Obtiene el estado de todos los streams activos
     */
    getAllStatus() {
        const streams = StreamModel.findAll();
        return streams.map(stream => this.getStreamStatus(stream.id));
    }

    /**
     * Obtiene el último frame de un stream
     */
    getLastFrame(streamId) {
        const connection = this.streams.get(streamId);
        return connection?.frameParser.getLastFrame() || null;
    }

    /**
     * Obtiene los headers del stream
     */
    getStreamHeaders(streamId) {
        const connection = this.streams.get(streamId);
        return connection?.headers || null;
    }

    /**
     * Inicia grabación en un stream
     */
    startRecording(streamId, capturedBy = null) {
        const connection = this.getOrCreateConnection(streamId);
        if (!connection) {
            return { success: false, error: 'Stream no encontrado' };
        }
        const result = connection.videoRecorder.start(capturedBy);
        if (result.success) {
            emitRecording(streamId, { recording: true, startTime: result.startTime });
            emitLog(streamId, 'Recording started', 'success');
        }
        return result;
    }

    /**
     * Detiene grabación en un stream
     */
    async stopRecording(streamId) {
        const connection = this.streams.get(streamId);
        if (!connection) {
            return { success: false, error: 'Stream no encontrado' };
        }
        const result = await connection.videoRecorder.stop();
        if (result.success) {
            emitRecording(streamId, { recording: false });
            emitLog(streamId, `Recording saved: ${result.video?.filename}`, 'success');
        }
        return result;
    }

    /**
     * Obtiene estado de grabación de un stream
     */
    getRecordingStatus(streamId) {
        const connection = this.streams.get(streamId);
        return connection?.videoRecorder.getStatus() || { recording: false };
    }

    /**
     * Recarga la configuración de un stream
     */
    reloadStream(streamId) {
        const connection = this.streams.get(streamId);
        if (connection) {
            // Desconectar clientes existentes
            this.disconnectAllClients(connection, 'Stream reconfigurando');

            // Cerrar conexión
            if (connection.request) {
                connection.request.destroy();
            }

            // Eliminar del mapa para forzar recreación
            this.streams.delete(streamId);
        }
    }
}

// Singleton
const streamManager = new StreamManager();

export { streamManager, StreamManager };
export default streamManager;
