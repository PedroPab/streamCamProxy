import { URLRouter } from './URLRouter.js';

/**
 * StreamSelector - Componente para seleccionar y cambiar entre streams
 */
export class StreamSelector {
    constructor(authManager, onStreamChange, socketManager = null, isPublicMode = false) {
        this.authManager = authManager;
        this.onStreamChange = onStreamChange;
        this.socketManager = socketManager;
        this.isPublicMode = isPublicMode;
        this.streams = [];
        this.currentStreamId = null;
        this.container = null;

        this.init();
    }

    async init() {
        await this.loadStreams();
        this.render();
        this.setupEventListeners();
        this.setupWebSocket();
        this.setupURLRouting();

        // Verificar si hay stream en la URL
        const urlStreamId = URLRouter.getStreamIdFromURL();
        const streamFromURL = urlStreamId ? this.streams.find(s => s.id === urlStreamId) : null;

        if (streamFromURL) {
            // Seleccionar stream de la URL
            this.selectStream(urlStreamId);
        } else if (this.streams.length > 0 && !this.currentStreamId) {
            // Seleccionar primer stream por defecto
            this.selectStream(this.streams[0].id);
        }
    }

    setupURLRouting() {
        // Escuchar cambios en el historial (botones atrás/adelante)
        URLRouter.onPopState((streamId) => {
            if (streamId && this.streams.find(s => s.id === streamId)) {
                this.selectStream(streamId, false); // false = no actualizar URL
            }
        });
    }

    setupWebSocket() {
        if (!this.socketManager) return;

        // Escuchar actualizaciones de status de cualquier stream
        this.socketManager.on('streams:status', (data) => {
            this.updateStreamStatus(data.streamId, data);
        });
    }

    updateStreamStatus(streamId, status) {
        const stream = this.streams.find(s => s.id === streamId);
        if (stream) {
            stream.status = {
                ...stream.status,
                connected: status.connected,
                clients: status.clients,
                error: status.error
            };
            this.updateStreamItemUI(streamId);
        }
    }

    updateStreamItemUI(streamId) {
        const item = this.container?.querySelector(`[data-stream-id="${streamId}"]`);
        if (!item) return;

        const stream = this.streams.find(s => s.id === streamId);
        if (!stream) return;

        const led = item.querySelector('.led');
        const viewers = item.querySelector('.viewers');

        if (led) {
            led.classList.remove('online', 'offline');
            led.classList.add(stream.status?.connected ? 'online' : 'offline');
        }
        if (viewers) {
            viewers.textContent = stream.status?.clients || 0;
        }
    }

    async loadStreams() {
        try {
            let response;

            if (this.isPublicMode) {
                // Modo público - solo streams públicos, sin autenticación
                response = await fetch('/streams/public');
            } else {
                // Modo autenticado - todos los streams accesibles
                const headers = this.authManager.getAuthHeaders();
                response = await fetch('/streams', { headers });
            }

            if (!response.ok) {
                throw new Error('Error cargando streams');
            }

            const data = await response.json();
            this.streams = data.data || [];
        } catch (error) {
            console.error('Error loading streams:', error);
            this.streams = [];
        }
    }

    render() {
        // Buscar o crear el contenedor
        this.container = document.getElementById('stream-selector');
        if (!this.container) {
            // Insertar después del status-panel
            const statusPanel = document.querySelector('.status-panel');
            if (statusPanel) {
                this.container = document.createElement('section');
                this.container.id = 'stream-selector';
                this.container.className = 'panel stream-selector-panel';
                statusPanel.parentNode.insertBefore(this.container, statusPanel);
            }
        }

        if (!this.container) return;

        this.container.innerHTML = `
            <div class="panel-header">
                <span class="panel-icon">[#]</span>
                <span class="panel-title">STREAMS</span>
                <span class="stream-count">(${this.streams.length})</span>
            </div>
            <div class="panel-content stream-list">
                ${this.renderStreamList()}
            </div>
        `;
    }

    renderStreamList() {
        if (this.streams.length === 0) {
            return '<div class="no-streams">No streams available</div>';
        }

        return this.streams.map(stream => `
            <div class="stream-item ${stream.id === this.currentStreamId ? 'active' : ''}"
                 data-stream-id="${stream.id}">
                <div class="stream-info">
                    <span class="stream-name">${this.escapeHtml(stream.name)}</span>
                    <span class="stream-meta">
                        <span class="led ${stream.status?.connected ? 'online' : 'offline'}"></span>
                        <span class="viewers">${stream.status?.clients || 0}</span>
                    </span>
                </div>
                <div class="stream-permissions">
                    ${stream.canCapture ? '<span class="perm" title="Capture">[+]</span>' : ''}
                    ${stream.canRecord ? '<span class="perm" title="Record">[R]</span>' : ''}
                    ${stream.canAdmin ? '<span class="perm admin" title="Admin">[A]</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        if (!this.container) return;

        this.container.addEventListener('click', (e) => {
            const streamItem = e.target.closest('.stream-item');
            if (streamItem) {
                const streamId = parseInt(streamItem.dataset.streamId);
                this.selectStream(streamId);
            }
        });
    }

    selectStream(streamId, updateURL = true) {
        if (streamId === this.currentStreamId) return;

        this.currentStreamId = streamId;
        const stream = this.streams.find(s => s.id === streamId);

        // Actualizar UI
        this.container?.querySelectorAll('.stream-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.streamId) === streamId);
        });

        // Actualizar URL para permitir compartir
        if (updateURL) {
            URLRouter.updateURL(streamId);
        }

        // Notificar al callback
        if (this.onStreamChange && stream) {
            this.onStreamChange(stream);
        }
    }

    async refreshStreams() {
        try {
            let response;

            if (this.isPublicMode) {
                response = await fetch('/streams/public');
            } else {
                const headers = this.authManager.getAuthHeaders();
                response = await fetch('/streams', { headers });
            }

            if (response.ok) {
                const data = await response.json();
                this.streams = data.data || [];

                const listContainer = this.container?.querySelector('.stream-list');
                if (listContainer) {
                    listContainer.innerHTML = this.renderStreamList();
                }
            }
        } catch (error) {
            console.error('Error refreshing streams:', error);
        }
    }

    getCurrentStream() {
        return this.streams.find(s => s.id === this.currentStreamId) || null;
    }

    getCurrentStreamId() {
        return this.currentStreamId;
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default StreamSelector;
