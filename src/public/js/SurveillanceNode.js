import { MediaController } from './MediaController.js';
import { SocketManager } from './SocketManager.js';

export class SurveillanceNode {
    constructor(authManager, isAuthenticated = true) {
        this.authManager = authManager;
        this.isAuthenticated = isAuthenticated;

        // Solo inicializar WebSocket si está autenticado
        if (isAuthenticated) {
            this.socketManager = new SocketManager(authManager);
        } else {
            this.socketManager = null;
        }

        this.elements = {
            streamImg: document.getElementById('stream-img'),
            streamOverlay: document.getElementById('stream-overlay'),
            connectionLed: document.getElementById('connection-led'),
            connectionStatus: document.getElementById('connection-status'),
            clientCount: document.getElementById('client-count'),
            recIndicator: document.getElementById('rec-indicator'),
            systemTime: document.getElementById('system-time'),
            logEntries: document.getElementById('log-entries'),
            uptime: document.getElementById('uptime'),
            photoCount: document.getElementById('photo-count'),
            videoCount: document.getElementById('video-count')
        };

        this.state = {
            connected: false,
            clients: 0,
            startTime: Date.now(),
            lastUpdate: null,
            currentStream: null,
            feedConnected: false
        };

        this.config = {
            statusInterval: 3000
        };

        this.init();
    }

    /**
     * Cambia al stream especificado
     */
    changeStream(stream) {
        if (!stream) return;

        const prevStream = this.state.currentStream;

        // Solo usar WebSocket si está autenticado
        if (this.socketManager) {
            if (prevStream) {
                this.socketManager.unsubscribeFromStream(prevStream.id);
            }
            this.socketManager.subscribeToStream(stream.id);
        }

        this.state.currentStream = stream;
        this.state.feedConnected = false;

        // Actualizar título del panel
        const panelTitle = document.querySelector('.stream-panel .panel-title');
        if (panelTitle) {
            panelTitle.textContent = stream.name || 'LIVE_FEED';
        }

        // Actualizar endpoint info
        const endpointEl = document.querySelector('.status-value.endpoint');
        if (endpointEl) {
            const endpoint = this.isAuthenticated
                ? `/streams/${stream.id}/feed`
                : `/streams/public/${stream.id}/feed`;
            endpointEl.textContent = endpoint;
        }

        // Mostrar overlay mientras carga
        this.showOverlay('SWITCHING STREAM...');

        // Limpiar imagen anterior antes de cargar la nueva
        if (this.elements.streamImg) {
            // Ocultar imagen anterior inmediatamente
            this.elements.streamImg.classList.add('stream-loading');

            // Limpiar src para detener stream anterior
            this.elements.streamImg.src = '';

            // Cargar nuevo stream después de un pequeño delay para asegurar limpieza
            setTimeout(() => {
                if (this.isAuthenticated && this.authManager) {
                    // Modo autenticado - usar token
                    const token = this.authManager.getAccessToken();
                    this.elements.streamImg.src = `/streams/${stream.id}/feed?token=${token}&t=${Date.now()}`;
                } else {
                    // Modo público - sin token
                    this.elements.streamImg.src = `/streams/public/${stream.id}/feed?t=${Date.now()}`;
                }
            }, 50);
        }

        // Log del cambio
        if (prevStream && prevStream.id !== stream.id) {
            this.addLog(`Switched to: ${stream.name}`, 'info');
        } else if (!prevStream) {
            this.addLog(`Connected to: ${stream.name}`, 'info');
        }

        // Actualizar permisos en MediaController
        if (this.mediaController) {
            this.mediaController.updatePermissions(stream);
        }
    }

    getCurrentStreamId() {
        return this.state.currentStream?.id || null;
    }

    init() {
        this.initStream();
        this.setupStreamListeners();

        // Solo inicializar WebSocket si está autenticado
        if (this.isAuthenticated) {
            this.initWebSocket();
        }

        this.startClock();
        this.startUptimeCounter();
        this.mediaController = new MediaController(this);
        this.addLog('System initialized', 'info');
        this.addLog('Connecting to feed...', 'info');

        // En modo público, iniciar polling para status
        if (!this.isAuthenticated) {
            this.startPublicStatusPolling();
        }
    }

    startPublicStatusPolling() {
        // Polling cada 5 segundos para actualizar status en modo público
        setInterval(() => {
            const streamId = this.getCurrentStreamId();
            if (streamId) {
                this.fetchPublicStatus(streamId);
            }
        }, 5000);
    }

    async fetchPublicStatus(streamId) {
        try {
            const response = await fetch(`/streams/public/${streamId}/status`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateStatus({
                        connected: data.data.connected,
                        clients: data.data.clients,
                        streamId: streamId
                    });
                }
            }
        } catch (error) {
            // Silenciar errores de polling
        }
    }

    initWebSocket() {
        if (!this.socketManager) return;
        this.socketManager.connect();

        this.socketManager.on('connected', () => {
            this.addLog('WebSocket connected', 'success');
        });

        this.socketManager.on('disconnected', (reason) => {
            this.addLog(`WebSocket disconnected: ${reason}`, 'error');
        });

        this.socketManager.on('status', (data) => {
            if (data.streamId === this.getCurrentStreamId()) {
                this.updateStatus(data);
            }
        });

        this.socketManager.on('log', (data) => {
            if (data.streamId === this.getCurrentStreamId()) {
                this.addLog(data.message, data.type);
            }
        });

        this.socketManager.on('recording', (data) => {
            if (data.streamId === this.getCurrentStreamId() && this.mediaController) {
                this.mediaController.syncRecordingState(data);
            }
        });
    }

    initStream() {
        // El stream se inicializa cuando StreamSelector selecciona uno
        // Ocultar imagen y mostrar overlay inicial
        if (this.elements.streamImg) {
            this.elements.streamImg.classList.add('stream-loading');
        }
        this.showOverlay('SELECT A STREAM...');
    }

    setupStreamListeners() {
        if (this.elements.streamImg) {
            this.elements.streamImg.addEventListener('load', () => {
                this.onStreamLoad();
            });

            this.elements.streamImg.addEventListener('error', () => {
                this.onStreamError();
            });
        }
    }

    onStreamLoad() {
        // Mostrar imagen cuando carga exitosamente
        if (this.elements.streamImg) {
            this.elements.streamImg.classList.remove('stream-loading');
        }
        this.hideOverlay();

        // Solo mostrar log la primera vez que conecta
        if (!this.state.feedConnected) {
            this.state.feedConnected = true;
            this.addLog('Feed connection established', 'success');
        }
    }

    onStreamError() {
        // Mantener imagen oculta en caso de error
        if (this.elements.streamImg) {
            this.elements.streamImg.classList.add('stream-loading');
        }
        this.showOverlay('FEED DISCONNECTED');
        this.state.feedConnected = false;
        this.addLog('Feed connection lost', 'error');

        setTimeout(() => {
            const streamId = this.getCurrentStreamId();
            if (this.elements.streamImg && streamId) {
                this.showOverlay('RECONNECTING...');

                if (this.isAuthenticated && this.authManager) {
                    const token = this.authManager.getAccessToken();
                    this.elements.streamImg.src = `/streams/${streamId}/feed?token=${token}&t=${Date.now()}`;
                } else {
                    this.elements.streamImg.src = `/streams/public/${streamId}/feed?t=${Date.now()}`;
                }

                this.addLog('Attempting reconnection...', 'info');
            }
        }, 5000);
    }

    updateStatus(data) {
        const prevConnected = this.state.connected;
        const prevClients = this.state.clients;

        this.state.connected = data.connected;
        this.state.clients = data.clients;
        this.state.lastUpdate = Date.now();

        this.updateConnectionIndicator(data.connected);

        if (data.clients !== prevClients) {
            this.updateClientCount(data.clients, prevClients);
        }

        this.updateRecIndicator(data.connected);

        if (data.media) {
            this.updateMediaStats(data.media);
        }

        if (data.recording && this.mediaController) {
            this.mediaController.syncRecordingState(data.recording);
        }

        if (data.connected !== prevConnected) {
            if (data.connected) {
                this.hideOverlay();
                // Log se recibe via WebSocket
            }
            // Los logs de conexión/desconexión se reciben via WebSocket
        }
    }

    updateMediaStats(media) {
        if (this.elements.photoCount) {
            this.elements.photoCount.textContent = media.photos || media.photoCount || 0;
        }
        if (this.elements.videoCount) {
            this.elements.videoCount.textContent = media.videos || media.videoCount || 0;
        }
    }

    updateConnectionIndicator(connected) {
        const led = this.elements.connectionLed;
        const status = this.elements.connectionStatus;

        if (led) {
            led.classList.remove('online', 'offline');
            led.classList.add(connected ? 'online' : 'offline');
        }

        if (status) {
            status.textContent = connected ? 'ONLINE' : 'OFFLINE';
            status.style.color = connected ? 'var(--text-primary)' : 'var(--text-error)';
        }
    }

    updateClientCount(newCount, oldCount) {
        const el = this.elements.clientCount;
        if (!el) return;

        el.style.transform = 'scale(1.3)';
        el.style.color = newCount > oldCount ? 'var(--text-cyan)' : 'var(--text-warning)';

        setTimeout(() => {
            el.textContent = newCount;
            el.style.transform = 'scale(1)';
            el.style.color = 'var(--text-primary)';
        }, 150);

        if (newCount > oldCount) {
            this.addLog(`Viewer connected (${newCount} total)`, 'info');
        } else if (newCount < oldCount) {
            this.addLog(`Viewer disconnected (${newCount} total)`, 'info');
        }
    }

    updateRecIndicator(connected) {
        const rec = this.elements.recIndicator;
        if (rec) {
            if (connected) {
                rec.classList.remove('offline');
            } else {
                rec.classList.add('offline');
            }
        }
    }

    hideOverlay() {
        if (this.elements.streamOverlay) {
            this.elements.streamOverlay.classList.add('hidden');
        }
    }

    showOverlay(message) {
        const overlay = this.elements.streamOverlay;
        if (overlay) {
            overlay.classList.remove('hidden');
            const loadingText = overlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES', { hour12: false });
            if (this.elements.systemTime) {
                this.elements.systemTime.textContent = time;
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    startUptimeCounter() {
        const updateUptime = () => {
            const elapsed = Date.now() - this.state.startTime;
            const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
            const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');

            if (this.elements.uptime) {
                this.elements.uptime.textContent = `UPTIME: ${hours}:${minutes}:${seconds}`;
            }
        };

        updateUptime();
        setInterval(updateUptime, 1000);
    }

    addLog(message, type = 'info') {
        const logContainer = this.elements.logEntries;
        if (!logContainer) return;

        const now = new Date();
        const timestamp = now.toLocaleTimeString('es-ES', { hour12: false });

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;

        logContainer.insertBefore(entry, logContainer.firstChild);

        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }
}
