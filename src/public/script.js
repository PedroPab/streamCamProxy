// ==========================================
// ESP32-CAM SURVEILLANCE NODE
// Client-side Controller
// ==========================================

class SurveillanceNode {
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

        // Actualizar stats de media
        if (data.media) {
            this.updateMediaStats(data.media);
        }

        // Sincronizar estado de grabacion
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

// ==========================================
// Media Viewer
// ==========================================

class MediaViewer {
    constructor(mediaController) {
        this.mediaController = mediaController;
        this.items = [];
        this.currentIndex = 0;
        this.isVideo = false;
        this.videoPlaying = false;
        this.videoFrames = [];
        this.videoFrameIndex = 0;
        this.videoInterval = null;
        this.videoSpeed = 1;
        this.videoDuration = 0;

        this.elements = {
            viewer: document.getElementById('media-viewer'),
            backdrop: document.querySelector('.viewer-backdrop'),
            filename: document.getElementById('viewer-filename'),
            image: document.getElementById('viewer-image'),
            video: document.getElementById('viewer-video'),
            videoFrame: document.getElementById('viewer-video-frame'),
            loading: document.getElementById('viewer-loading'),
            info: document.getElementById('viewer-info'),
            date: document.getElementById('viewer-date'),
            btnClose: document.getElementById('btn-close-viewer'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            btnDownload: document.getElementById('btn-download'),
            btnDelete: document.getElementById('btn-delete'),
            btnPlayPause: document.getElementById('btn-play-pause'),
            btnSpeed: document.getElementById('btn-video-speed'),
            videoProgress: document.getElementById('video-progress-bar'),
            videoProgressContainer: document.querySelector('.video-progress'),
            videoTime: document.getElementById('video-time'),
            confirmModal: document.getElementById('confirm-modal'),
            confirmFilename: document.getElementById('confirm-filename'),
            btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
            btnConfirmDelete: document.getElementById('btn-confirm-delete')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.btnClose?.addEventListener('click', () => this.close());
        this.elements.backdrop?.addEventListener('click', () => this.close());
        this.elements.btnPrev?.addEventListener('click', () => this.navigate(-1));
        this.elements.btnNext?.addEventListener('click', () => this.navigate(1));
        this.elements.btnDownload?.addEventListener('click', () => this.download());
        this.elements.btnDelete?.addEventListener('click', () => this.confirmDelete());
        this.elements.btnPlayPause?.addEventListener('click', () => this.togglePlayPause());
        this.elements.btnSpeed?.addEventListener('click', () => this.cycleSpeed());
        this.elements.videoProgressContainer?.addEventListener('click', (e) => this.seekVideo(e));
        this.elements.btnConfirmCancel?.addEventListener('click', () => this.hideConfirmModal());
        this.elements.btnConfirmDelete?.addEventListener('click', () => this.executeDelete());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleKeyboard(e) {
        if (!this.elements.viewer?.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.navigate(-1);
                break;
            case 'ArrowRight':
                this.navigate(1);
                break;
            case ' ':
                if (this.isVideo) {
                    e.preventDefault();
                    this.togglePlayPause();
                }
                break;
        }
    }

    open(items, index, type) {
        this.items = items;
        this.currentIndex = index;
        this.currentType = type;
        this.elements.viewer?.classList.add('active');
        this.loadMedia();
    }

    close() {
        this.stopVideo();
        this.elements.viewer?.classList.remove('active');
        this.elements.image?.classList.remove('active');
        this.elements.video?.classList.remove('active');
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.items.length) {
            this.stopVideo();
            this.currentIndex = newIndex;
            this.loadMedia();
        }
    }

    loadMedia() {
        const item = this.items[this.currentIndex];
        if (!item) return;

        this.showLoading(true);
        this.updateNavButtons();
        this.updateInfo(item);

        this.isVideo = item.filename.endsWith('.mjpeg');

        this.elements.image?.classList.remove('active');
        this.elements.video?.classList.remove('active');

        if (this.isVideo) {
            this.loadVideo(item);
        } else {
            this.loadImage(item);
        }
    }

    loadImage(item) {
        const img = this.elements.image;
        if (!img) return;

        img.onload = () => {
            this.showLoading(false);
            img.classList.add('active');
        };

        img.onerror = () => {
            this.showLoading(false);
            this.mediaController.node.addLog(`Failed to load: ${item.filename}`, 'error');
        };

        img.src = `/media/file/${item.filename}`;
    }

    async loadVideo(item) {
        this.videoFrames = [];
        this.videoFrameIndex = 0;
        this.videoDuration = item.duration || 0;
        this.updateVideoTime();

        try {
            const response = await fetch(`/media/file/${item.filename}`);
            if (!response.ok) throw new Error('Failed to load video');

            const buffer = await response.arrayBuffer();
            this.videoFrames = this.parseMjpeg(buffer);

            if (this.videoFrames.length > 0) {
                this.showLoading(false);
                this.elements.video?.classList.add('active');
                this.displayVideoFrame(0);
                this.elements.btnPlayPause.textContent = '▶ PLAY';
            } else {
                throw new Error('No frames found');
            }
        } catch (error) {
            this.showLoading(false);
            this.mediaController.node.addLog(`Video load error: ${error.message}`, 'error');
        }
    }

    parseMjpeg(buffer) {
        const frames = [];
        const data = new Uint8Array(buffer);
        let i = 0;

        while (i < data.length - 1) {
            if (data[i] === 0xFF && data[i + 1] === 0xD8) {
                let end = i + 2;
                while (end < data.length - 1) {
                    if (data[end] === 0xFF && data[end + 1] === 0xD9) {
                        end += 2;
                        break;
                    }
                    end++;
                }

                const frameData = data.slice(i, end);
                const blob = new Blob([frameData], { type: 'image/jpeg' });
                frames.push(URL.createObjectURL(blob));
                i = end;
            } else {
                i++;
            }
        }

        return frames;
    }

    displayVideoFrame(index) {
        if (index >= 0 && index < this.videoFrames.length) {
            this.videoFrameIndex = index;
            if (this.elements.videoFrame) {
                this.elements.videoFrame.src = this.videoFrames[index];
            }
            this.updateVideoProgress();
        }
    }

    togglePlayPause() {
        if (this.videoPlaying) {
            this.pauseVideo();
        } else {
            this.playVideo();
        }
    }

    playVideo() {
        if (this.videoFrames.length === 0) return;

        if (this.videoFrameIndex >= this.videoFrames.length - 1) {
            this.videoFrameIndex = 0;
        }

        this.videoPlaying = true;
        this.elements.btnPlayPause.textContent = '⏸ PAUSE';
        this.elements.btnPlayPause.classList.add('playing');

        const frameRate = 10 * this.videoSpeed;
        const interval = 1000 / frameRate;

        this.videoInterval = setInterval(() => {
            this.videoFrameIndex++;
            if (this.videoFrameIndex >= this.videoFrames.length) {
                this.pauseVideo();
                this.videoFrameIndex = this.videoFrames.length - 1;
            } else {
                this.displayVideoFrame(this.videoFrameIndex);
            }
        }, interval);
    }

    pauseVideo() {
        this.videoPlaying = false;
        this.elements.btnPlayPause.textContent = '▶ PLAY';
        this.elements.btnPlayPause.classList.remove('playing');

        if (this.videoInterval) {
            clearInterval(this.videoInterval);
            this.videoInterval = null;
        }
    }

    stopVideo() {
        this.pauseVideo();
        this.videoFrames.forEach(url => URL.revokeObjectURL(url));
        this.videoFrames = [];
        this.videoFrameIndex = 0;
    }

    cycleSpeed() {
        const speeds = [0.5, 1, 1.5, 2];
        const currentIdx = speeds.indexOf(this.videoSpeed);
        this.videoSpeed = speeds[(currentIdx + 1) % speeds.length];
        this.elements.btnSpeed.textContent = `${this.videoSpeed}x`;

        if (this.videoPlaying) {
            this.pauseVideo();
            this.playVideo();
        }
    }

    seekVideo(e) {
        const rect = this.elements.videoProgressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const frameIndex = Math.floor(percent * this.videoFrames.length);
        this.displayVideoFrame(Math.max(0, Math.min(frameIndex, this.videoFrames.length - 1)));
    }

    updateVideoProgress() {
        if (this.videoFrames.length === 0) return;

        const percent = (this.videoFrameIndex / (this.videoFrames.length - 1)) * 100;
        if (this.elements.videoProgress) {
            this.elements.videoProgress.style.width = `${percent}%`;
        }
        this.updateVideoTime();
    }

    updateVideoTime() {
        if (!this.elements.videoTime) return;

        const totalFrames = this.videoFrames.length || 1;
        const currentTime = (this.videoFrameIndex / totalFrames) * (this.videoDuration / 1000);
        const totalTime = this.videoDuration / 1000;

        const formatTime = (secs) => {
            const m = Math.floor(secs / 60);
            const s = Math.floor(secs % 60);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        this.elements.videoTime.textContent = `${formatTime(currentTime)} / ${formatTime(totalTime)}`;
    }

    showLoading(show) {
        this.elements.loading?.classList.toggle('active', show);
    }

    updateNavButtons() {
        if (this.elements.btnPrev) {
            this.elements.btnPrev.disabled = this.currentIndex === 0;
        }
        if (this.elements.btnNext) {
            this.elements.btnNext.disabled = this.currentIndex === this.items.length - 1;
        }
    }

    updateInfo(item) {
        if (this.elements.filename) {
            this.elements.filename.textContent = item.filename;
        }
        if (this.elements.info) {
            this.elements.info.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
        }
        if (this.elements.date) {
            const date = new Date(item.timestamp);
            this.elements.date.textContent = date.toLocaleString('es-ES');
        }
    }

    download() {
        const item = this.items[this.currentIndex];
        if (!item) return;

        const link = document.createElement('a');
        link.href = `/media/file/${item.filename}`;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.mediaController.node.addLog(`Downloaded: ${item.filename}`, 'success');
    }

    confirmDelete() {
        const item = this.items[this.currentIndex];
        if (!item) return;

        if (this.elements.confirmFilename) {
            this.elements.confirmFilename.textContent = item.filename;
        }
        this.elements.confirmModal?.classList.add('active');
    }

    hideConfirmModal() {
        this.elements.confirmModal?.classList.remove('active');
    }

    async executeDelete() {
        const item = this.items[this.currentIndex];
        if (!item) return;

        this.hideConfirmModal();

        const isVideo = item.filename.endsWith('.mjpeg');
        const type = isVideo ? 'video' : 'photo';

        try {
            const res = await fetch(`/media/${type}/${item.id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                this.mediaController.node.addLog(`Deleted: ${item.filename}`, 'success');
                this.items.splice(this.currentIndex, 1);

                if (this.items.length === 0) {
                    this.close();
                    this.mediaController.loadGalleryContent();
                } else {
                    if (this.currentIndex >= this.items.length) {
                        this.currentIndex = this.items.length - 1;
                    }
                    this.loadMedia();
                    this.mediaController.loadGalleryContent();
                }
            } else {
                this.mediaController.node.addLog(`Delete failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.mediaController.node.addLog(`Delete error: ${error.message}`, 'error');
        }
    }
}

// ==========================================
// Media Controller
// ==========================================

class MediaController {
    constructor(surveillanceNode) {
        this.node = surveillanceNode;
        this.recording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.currentTab = 'photos';
        this.mediaItems = { photos: [], videos: [] };

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

    setupEventListeners() {
        this.elements.btnCapture?.addEventListener('click', () => this.capturePhoto());
        this.elements.btnRecord?.addEventListener('click', () => this.toggleRecording());
        this.elements.btnGallery?.addEventListener('click', () => this.openGallery());
        this.elements.btnCloseGallery?.addEventListener('click', () => this.closeGallery());

        // Tabs de galeria
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Cerrar modal al hacer clic fuera
        this.elements.galleryModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.galleryModal) {
                this.closeGallery();
            }
        });
    }

    async capturePhoto() {
        const btn = this.elements.btnCapture;
        if (!btn) return;

        try {
            btn.disabled = true;
            this.flashEffect();

            const res = await fetch('/media/capture', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                this.node.addLog(`Photo captured: ${data.photo.filename}`, 'success');
            } else {
                this.node.addLog(`Capture failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.node.addLog(`Capture error: ${error.message}`, 'error');
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

        try {
            btn.disabled = true;

            const res = await fetch('/media/record/start', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                this.recording = true;
                this.recordingStartTime = Date.now();
                this.updateRecordingUI(true);
                this.startRecordingTimer();
                this.node.addLog('Recording started', 'success');
            } else {
                this.node.addLog(`Recording failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.node.addLog(`Recording error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async stopRecording() {
        const btn = this.elements.btnRecord;
        if (!btn) return;

        try {
            btn.disabled = true;

            const res = await fetch('/media/record/stop', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                this.recording = false;
                this.updateRecordingUI(false);
                this.stopRecordingTimer();
                this.node.addLog(`Video saved: ${data.video.filename}`, 'success');
            } else {
                this.node.addLog(`Stop recording failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.node.addLog(`Stop recording error: ${error.message}`, 'error');
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

        try {
            const res = await fetch('/media');
            const data = await res.json();

            this.mediaItems.photos = data.photos || [];
            this.mediaItems.videos = data.videos || [];

            const items = this.currentTab === 'photos' ? this.mediaItems.photos : this.mediaItems.videos;

            if (!items || items.length === 0) {
                content.innerHTML = `<div class="gallery-empty">No ${this.currentTab} yet</div>`;
                return;
            }

            content.innerHTML = items.map((item, index) => this.renderGalleryItem(item, index)).join('');

            // Agregar event listeners a los items
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
                    <img src="/media/file/${item.filename}" alt="${item.filename}" loading="lazy">
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

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    window.surveillanceNode = new SurveillanceNode();
});
