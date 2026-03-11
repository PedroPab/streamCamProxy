export class MediaViewer {
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
