/**
 * Tests para MJPEGFrameParser
 * Archivo fuente: src/controller/frameParser.js
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MJPEGFrameParser } from '../../../src/controller/frameParser.js';
import { JPEG_START, JPEG_END, createTestJpegFrame, createMultipleJpegFrames } from '../../helpers/fixtures.js';

describe('MJPEGFrameParser', () => {
    let parser;

    beforeEach(() => {
        parser = new MJPEGFrameParser();
    });

    describe('findMarker', () => {
        it('debe encontrar marcador al inicio del buffer', () => {
            const buffer = Buffer.concat([JPEG_START, Buffer.from([0x00, 0x01])]);
            const index = parser.findMarker(buffer, JPEG_START, 0);

            assert.strictEqual(index, 0);
        });

        it('debe encontrar marcador en medio del buffer', () => {
            const buffer = Buffer.concat([
                Buffer.from([0x00, 0x01]),
                JPEG_START,
                Buffer.from([0x02, 0x03])
            ]);
            const index = parser.findMarker(buffer, JPEG_START, 0);

            assert.strictEqual(index, 2);
        });

        it('debe retornar -1 cuando marcador no existe', () => {
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
            const index = parser.findMarker(buffer, JPEG_START, 0);

            assert.strictEqual(index, -1);
        });

        it('debe respetar parametro startPos', () => {
            const buffer = Buffer.concat([JPEG_START, JPEG_START]);
            const index = parser.findMarker(buffer, JPEG_START, 1);

            assert.strictEqual(index, 2);
        });

        it('debe encontrar marcador JPEG_END', () => {
            const buffer = Buffer.concat([
                Buffer.from([0x00]),
                JPEG_END
            ]);
            const index = parser.findMarker(buffer, JPEG_END, 0);

            assert.strictEqual(index, 1);
        });

        it('debe retornar -1 para buffer vacio', () => {
            const buffer = Buffer.alloc(0);
            const index = parser.findMarker(buffer, JPEG_START, 0);

            assert.strictEqual(index, -1);
        });

        it('debe retornar -1 si startPos excede longitud', () => {
            const buffer = Buffer.concat([JPEG_START]);
            const index = parser.findMarker(buffer, JPEG_START, 10);

            assert.strictEqual(index, -1);
        });
    });

    describe('push y extractFrames', () => {
        it('debe emitir evento frame para JPEG completo', (t, done) => {
            const frame = createTestJpegFrame(5);

            parser.on('frame', (receivedFrame) => {
                assert.ok(Buffer.isBuffer(receivedFrame));
                assert.strictEqual(receivedFrame.length, frame.length);
                done();
            });

            parser.push(frame);
        });

        it('debe incrementar frameCount despues de extraer frame', () => {
            const frame = createTestJpegFrame(5);

            assert.strictEqual(parser.getFrameCount(), 0);
            parser.push(frame);
            assert.strictEqual(parser.getFrameCount(), 1);
        });

        it('debe manejar frames incompletos sin emitir', () => {
            const incompleteFrame = Buffer.concat([JPEG_START, Buffer.from([0x01, 0x02])]);
            let frameEmitted = false;

            parser.on('frame', () => { frameEmitted = true; });
            parser.push(incompleteFrame);

            assert.strictEqual(frameEmitted, false);
            assert.strictEqual(parser.getFrameCount(), 0);
        });

        it('debe completar frame cuando llega el marcador final', () => {
            let receivedFrame = null;

            parser.on('frame', (frame) => { receivedFrame = frame; });

            // Enviar inicio y datos
            parser.push(Buffer.concat([JPEG_START, Buffer.from([0x01, 0x02])]));
            assert.strictEqual(receivedFrame, null);

            // Enviar fin
            parser.push(JPEG_END);
            assert.ok(receivedFrame !== null);
            assert.strictEqual(parser.getFrameCount(), 1);
        });

        it('debe manejar multiples frames en un solo chunk', () => {
            let frameCount = 0;
            parser.on('frame', () => { frameCount++; });

            const multipleFrames = createMultipleJpegFrames(3, 5);
            parser.push(multipleFrames);

            assert.strictEqual(frameCount, 3);
            assert.strictEqual(parser.getFrameCount(), 3);
        });

        it('debe manejar frames fragmentados en multiples chunks', () => {
            let receivedFrames = [];
            parser.on('frame', (frame) => { receivedFrames.push(frame); });

            // Primer frame completo + inicio del segundo
            const frame1 = createTestJpegFrame(3);
            const partialFrame2Start = Buffer.concat([JPEG_START, Buffer.from([0xAA])]);

            parser.push(Buffer.concat([frame1, partialFrame2Start]));
            assert.strictEqual(receivedFrames.length, 1);

            // Resto del segundo frame
            parser.push(Buffer.concat([Buffer.from([0xBB]), JPEG_END]));
            assert.strictEqual(receivedFrames.length, 2);
        });
    });

    describe('getLastFrame', () => {
        it('debe retornar null si no hay frames', () => {
            assert.strictEqual(parser.getLastFrame(), null);
        });

        it('debe retornar el ultimo frame extraido', () => {
            const frame = createTestJpegFrame(5);
            parser.push(frame);

            const lastFrame = parser.getLastFrame();
            assert.ok(Buffer.isBuffer(lastFrame));
            assert.deepStrictEqual(lastFrame, frame);
        });

        it('debe actualizar con cada nuevo frame', () => {
            const frame1 = createTestJpegFrame(3);
            const frame2 = createTestJpegFrame(7);

            parser.push(frame1);
            const last1 = parser.getLastFrame();

            parser.push(frame2);
            const last2 = parser.getLastFrame();

            assert.strictEqual(last1.length, frame1.length);
            assert.strictEqual(last2.length, frame2.length);
        });
    });

    describe('getFrameCount', () => {
        it('debe iniciar en 0', () => {
            assert.strictEqual(parser.getFrameCount(), 0);
        });

        it('debe incrementar con cada frame', () => {
            parser.push(createTestJpegFrame(3));
            assert.strictEqual(parser.getFrameCount(), 1);

            parser.push(createTestJpegFrame(3));
            assert.strictEqual(parser.getFrameCount(), 2);

            parser.push(createTestJpegFrame(3));
            assert.strictEqual(parser.getFrameCount(), 3);
        });

        it('debe contar correctamente multiples frames en un chunk', () => {
            const frames = createMultipleJpegFrames(5, 3);
            parser.push(frames);

            assert.strictEqual(parser.getFrameCount(), 5);
        });
    });

    describe('reset', () => {
        it('debe limpiar frameCount', () => {
            parser.push(createTestJpegFrame(5));
            assert.strictEqual(parser.getFrameCount(), 1);

            parser.reset();
            assert.strictEqual(parser.getFrameCount(), 0);
        });

        it('debe limpiar lastFrame', () => {
            parser.push(createTestJpegFrame(5));
            assert.ok(parser.getLastFrame() !== null);

            parser.reset();
            assert.strictEqual(parser.getLastFrame(), null);
        });

        it('debe limpiar buffer interno', () => {
            // Enviar frame incompleto
            parser.push(Buffer.concat([JPEG_START, Buffer.from([0x01])]));

            parser.reset();

            // Enviar solo el final - no debe completar frame previo
            let frameEmitted = false;
            parser.on('frame', () => { frameEmitted = true; });
            parser.push(JPEG_END);

            assert.strictEqual(frameEmitted, false);
        });

        it('debe permitir procesar nuevos frames despues de reset', () => {
            parser.push(createTestJpegFrame(5));
            parser.reset();

            let newFrameReceived = false;
            parser.on('frame', () => { newFrameReceived = true; });

            parser.push(createTestJpegFrame(3));

            assert.strictEqual(newFrameReceived, true);
            assert.strictEqual(parser.getFrameCount(), 1);
        });
    });
});
