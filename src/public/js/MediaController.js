import { MediaViewer } from './MediaViewer.js';

export class MediaController {
    constructor(surveillanceNode) {
        this.node = surveillanceNode;
        this.recording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.currentTab = 'photos';
        this.mediaItems = { photos: [], videos: [] };
        this.currentStreamId = null;
        this.permissions = { canCapture: false, canRecord: false };

        this.elements = {
            btnCapture: document.getElementById('btn-capture'),
            btnRecord: document.getElementById('btn-record'),
            recordText: document.getElementById('record-text'),
            recTimer: document.getElementById('rec-timer'),
            recordingStatus: document.getElementById('recording-status'),
            btnGallery: document.getElementById('btn-gallery'),
            galleryModal: document.getElementById('gallery-modal'),
            galleryContent: document.getElementById('gallery-content'),
            btnCloseGallery: document.getElementById('btn-close-gallery'),
            flashOverlay: document.getElementById('flash-overlay')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.viewer = new MediaViewer(this);
    }

    /**
     * Actualiza los permisos según el stream actual
     */
    updatePermissions(stream) {
        this.currentStreamId = stream?.id || null;

        // Si es modo público, forzar permisos a false
        if (window.isPublicMode) {
            this.permissions = {
                canCapture: false,
                canRecord: false
            };
        } else {
            this.permissions = {
                canCapture: stream?.canCapture || false,
                canRecord: stream?.canRecord || false
            };
        }

        // Actualizar UI de botones según permisos
        const btnCapture = this.elements.btnCapture;
        const btnRecord = this.elements.btnRecord;
        const btnGallery = this.elements.btnGallery;

        if (btnCapture) {
            btnCapture.disabled = !this.permissions.canCapture;
            if (window.isPublicMode) {
                btnCapture.title = 'Registrate para capturar fotos';
            } else {
                btnCapture.title = this.permissions.canCapture ? 'Capture photo' : 'No permission to capture';
            }
        }

        if (btnRecord) {
            btnRecord.disabled = !this.permissions.canRecord;
            if (window.isPublicMode) {
                btnRecord.title = 'Registrate para grabar video';
            } else {
                btnRecord.title = this.permissions.canRecord ? 'Toggle recording' : 'No permission to record';
            }
        }

        // En modo público, también deshabilitar galería
        if (btnGallery) {
            if (window.isPublicMode) {
                btnGallery.disabled = true;
                btnGallery.title = 'Registrate para ver la galeria';
            } else {
                btnGallery.disabled = false;
                btnGallery.title = 'Open gallery';
            }
        }
    }

    getStreamId() {
        return this.currentStreamId || this.node.getCurrentStreamId();
    }

    setupEventListeners() {
        this.elements.btnCapture?.addEventListener('click', () => this.capturePhoto());
        this.elements.btnRecord?.addEventListener('click', () => this.toggleRecording());
        this.elements.btnGallery?.addEventListener('click', () => this.openGallery());
        this.elements.btnCloseGallery?.addEventListener('click', () => this.closeGallery());

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        this.elements.galleryModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.galleryModal) {
                this.closeGallery();
            }
        });
    }

    getAuthHeaders() {
        return this.node.authManager ? this.node.authManager.getAuthHeaders() : {};
    }

    async capturePhoto() {
        const btn = this.elements.btnCapture;
        if (!btn) return;

        const streamId = this.getStreamId();
        if (!streamId) {
            this.node.addLog('No stream selected', 'error');
            return;
        }

        try {
            btn.disabled = true;
            this.flashEffect();

            await fetch(`/streams/${streamId}/media/capture`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            // Logs se reciben via WebSocket
        } catch (error) {
            this.node.addLog(`Network error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    flashEffect() {
        const flash = this.elements.flashOverlay;
        if (flash) {
            flash.classList.add('flash');
            setTimeout(() => flash.classList.remove('flash'), 100);
        }
    }

    async toggleRecording() {
        if (this.recording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        const btn = this.elements.btnRecord;
        if (!btn) return;

        const streamId = this.getStreamId();
        if (!streamId) {
            this.node.addLog('No stream selected', 'error');
            return;
        }

        try {
            btn.disabled = true;

            const res = await fetch(`/streams/${streamId}/media/record/start`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            const data = await res.json();

            if (data.success) {
                this.recording = true;
                this.recordingStartTime = Date.now();
                this.updateRecordingUI(true);
                this.startRecordingTimer();
                // Log se recibe via WebSocket
            }
            // Errores se reciben via WebSocket
        } catch (error) {
            this.node.addLog(`Network error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async stopRecording() {
        const btn = this.elements.btnRecord;
        if (!btn) return;

        const streamId = this.getStreamId();
        if (!streamId) {
            this.node.addLog('No stream selected', 'error');
            return;
        }

        try {
            btn.disabled = true;

            const res = await fetch(`/streams/${streamId}/media/record/stop`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            const data = await res.json();

            if (data.success) {
                this.recording = false;
                this.updateRecordingUI(false);
                this.stopRecordingTimer();
                // Log se recibe via WebSocket
            }
            // Errores se reciben via WebSocket
        } catch (error) {
            this.node.addLog(`Network error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    syncRecordingState(recordingStatus) {
        if (recordingStatus.recording && !this.recording) {
            this.recording = true;
            this.recordingStartTime = Date.now() - recordingStatus.duration;
            this.updateRecordingUI(true);
            this.startRecordingTimer();
        } else if (!recordingStatus.recording && this.recording) {
            this.recording = false;
            this.updateRecordingUI(false);
            this.stopRecordingTimer();
        }
    }

    updateRecordingUI(isRecording) {
        const btn = this.elements.btnRecord;
        const recordText = this.elements.recordText;
        const recordingStatus = this.elements.recordingStatus;

        if (btn) {
            btn.classList.toggle('recording', isRecording);
        }

        if (recordText) {
            recordText.textContent = isRecording ? 'STOP' : 'REC';
        }

        if (recordingStatus) {
            recordingStatus.classList.toggle('active', isRecording);
        }
    }

    startRecordingTimer() {
        this.stopRecordingTimer();

        const updateTimer = () => {
            if (!this.recording) return;

            const elapsed = Date.now() - this.recordingStartTime;
            const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
            const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');

            if (this.elements.recTimer) {
                this.elements.recTimer.textContent = `${hours}:${minutes}:${seconds}`;
            }
        };

        updateTimer();
        this.recordingTimer = setInterval(updateTimer, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }

        if (this.elements.recTimer) {
            this.elements.recTimer.textContent = '00:00:00';
        }
    }

    async openGallery() {
        this.elements.galleryModal?.classList.add('active');
        await this.loadGalleryContent();
    }

    closeGallery() {
        this.elements.galleryModal?.classList.remove('active');
    }

    switchTab(tab) {
        this.currentTab = tab;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.loadGalleryContent();
    }

    async loadGalleryContent() {
        const content = this.elements.galleryContent;
        if (!content) return;

        content.innerHTML = '<div class="gallery-empty">Loading...</div>';

        const streamId = this.getStreamId();
        if (!streamId) {
            content.innerHTML = '<div class="gallery-empty">No stream selected</div>';
            return;
        }

        try {
            const type = this.currentTab === 'photos' ? 'photo' : 'video';
            const res = await fetch(`/streams/${streamId}/media?type=${type}`, { headers: this.getAuthHeaders() });
            const result = await res.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            const items = result.data || [];

            if (this.currentTab === 'photos') {
                this.mediaItems.photos = items;
            } else {
                this.mediaItems.videos = items;
            }

            if (!items || items.length === 0) {
                content.innerHTML = `<div class="gallery-empty">No ${this.currentTab} yet</div>`;
                return;
            }

            content.innerHTML = items.map((item, index) => this.renderGalleryItem(item, index)).join('');

            content.querySelectorAll('.gallery-item').forEach(el => {
                el.addEventListener('click', () => {
                    const index = parseInt(el.dataset.index, 10);
                    const currentItems = this.currentTab === 'photos' ? this.mediaItems.photos : this.mediaItems.videos;
                    this.viewer.open(currentItems, index, this.currentTab);
                });
            });

        } catch (error) {
            content.innerHTML = `<div class="gallery-empty">Error loading gallery</div>`;
            console.error('Gallery error:', error);
        }
    }

    renderGalleryItem(item, index) {
        const isVideo = item.filename.endsWith('.mjpeg');
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('es-ES');
        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const token = this.node.authManager ? this.node.authManager.getAccessToken() : '';

        if (isVideo) {
            const duration = this.formatDuration(item.duration);
            return `
                <div class="gallery-item video" data-filename="${item.filename}" data-index="${index}">
                    <div class="item-info">${dateStr} ${timeStr} - ${duration}</div>
                </div>
            `;
        } else {
            return `
                <div class="gallery-item" data-filename="${item.filename}" data-index="${index}">
                    <img src="/media/file/${item.filename}?token=${token}" alt="${item.filename}" loading="lazy">
                    <div class="item-info">${dateStr} ${timeStr}</div>
                </div>
            `;
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
