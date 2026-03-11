import { EventEmitter } from 'events';

// Marcadores JPEG
const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

class MJPEGFrameParser extends EventEmitter {
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
                // Frame incompleto, esperar más datos
                if (startIndex > 0) {
                    this.buffer = this.buffer.slice(startIndex);
                }
                break;
            }

            // Extraer frame JPEG completo (incluye marcadores)
            const frameEnd = endIndex + JPEG_END.length;
            const frame = this.buffer.slice(startIndex, frameEnd);

            this.currentFrame = frame;
            this.frameCount++;
            this.emit('frame', frame);

            // Continuar buscando desde después del frame
            this.buffer = this.buffer.slice(frameEnd);
            startIndex = this.findMarker(this.buffer, JPEG_START, 0);
        }

        // Limpiar buffer si crece demasiado sin frames válidos
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

// Instancia singleton
const frameParser = new MJPEGFrameParser();

export { frameParser, MJPEGFrameParser };
