export class SocketManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
    }

    connect() {
        const token = this.authManager.getAccessToken();
        if (!token) {
            console.error('[Socket] No auth token available');
            return;
        }

        this.socket = io({
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('[Socket] Connected');
            this.connected = true;
            this.emit('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            this.connected = false;
            this.emit('disconnected', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
            if (error.message.includes('Authentication')) {
                window.location.href = '/login.html';
            }
        });

        this.socket.on('stream:status', (data) => this.emit('status', data));
        this.socket.on('stream:log', (data) => this.emit('log', data));
        this.socket.on('stream:recording', (data) => this.emit('recording', data));
        this.socket.on('streams:status', (data) => this.emit('streams:status', data));
        this.socket.on('error', (data) => this.emit('error', data));
    }

    subscribeToStream(streamId) {
        if (!this.socket || !this.connected) {
            this.once('connected', () => this.subscribeToStream(streamId));
            return;
        }
        this.socket.emit('stream:subscribe', streamId);
    }

    unsubscribeFromStream(streamId) {
        if (this.socket && this.connected) {
            this.socket.emit('stream:unsubscribe', streamId);
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback(...args);
        };
        this.on(event, wrapper);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
