import { createWriteStream } from 'fs';
import { join } from 'path';
import { VIDEOS_DIR, saveVideo, formatTimestamp } from './storage.js';

class VideoRecorder {
    constructor() {
        this.recording = false;
        this.startTime = null;
        this.frameCount = 0;
        this.filename = null;
        this.writeStream = null;
    }

    start() {
        if (this.recording) {
            return { success: false, error: 'Already recording' };
        }

        const timestamp = formatTimestamp();
        this.filename = `video_${timestamp}.mjpeg`;
        const filepath = join(VIDEOS_DIR, this.filename);

        this.writeStream = createWriteStream(filepath);
        this.recording = true;
        this.startTime = Date.now();
        this.frameCount = 0;

        console.log(`Recording started: ${this.filename}`);

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

        // Escribir frame con boundary MJPEG
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

        // Cerrar stream de escritura
        await new Promise((resolve, reject) => {
            this.writeStream.end((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Reset estado
        this.recording = false;
        this.startTime = null;
        this.frameCount = 0;
        this.filename = null;
        this.writeStream = null;

        // Guardar en metadatos
        const videoEntry = await saveVideo(filename, duration, frameCount);

        console.log(`Recording stopped: ${filename} (${frameCount} frames, ${duration}ms)`);

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

// Instancia singleton
const videoRecorder = new VideoRecorder();

export { videoRecorder, VideoRecorder };
