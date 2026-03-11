import { MediaController } from './MediaController.js';

export class SurveillanceNode {
    constructor() {
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
            lastUpdate: null
        };

        this.config = {
            statusInterval: 3000,
            statusEndpoint: '/status'
        };

        this.init();
    }

    init() {
        this.setupStreamListeners();
        this.startStatusPolling();
        this.startClock();
        this.startUptimeCounter();
        this.mediaController = new MediaController(this);
        this.addLog('System initialized', 'info');
        this.addLog('Connecting to feed...', 'info');
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
        this.hideOverlay();
        this.addLog('Feed connection established', 'success');
    }

    onStreamError() {
        this.showOverlay('FEED DISCONNECTED');
        this.addLog('Feed connection lost', 'error');

        setTimeout(() => {
            if (this.elements.streamImg) {
                this.elements.streamImg.src = '/stream?' + Date.now();
                this.addLog('Attempting reconnection...', 'info');
            }
        }, 5000);
    }

    startStatusPolling() {
        this.fetchStatus();
        setInterval(() => this.fetchStatus(), this.config.statusInterval);
    }

    async fetchStatus() {
        try {
            const response = await fetch(this.config.statusEndpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.updateStatus(data);

        } catch (error) {
            console.error('Status fetch error:', error);
            this.updateStatus({ connected: false, clients: 0, error: error.message });
        }
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
                this.addLog('Camera connection restored', 'success');
            } else {
                this.addLog('Camera connection lost', 'error');
            }
        }
    }

    updateMediaStats(media) {
        if (this.elements.photoCount) {
            this.elements.photoCount.textContent = media.photoCount || 0;
        }
        if (this.elements.videoCount) {
            this.elements.videoCount.textContent = media.videoCount || 0;
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
