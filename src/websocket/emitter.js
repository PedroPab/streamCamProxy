let ioInstance = null;

export function setIO(io) {
    ioInstance = io;
}

export function getIO() {
    return ioInstance;
}

export function emitToStream(streamId, event, data) {
    if (!ioInstance) return;
    ioInstance.to(`stream:${streamId}`).emit(event, { streamId, ...data });
}

export function emitLog(streamId, message, type = 'info') {
    emitToStream(streamId, 'stream:log', {
        message,
        type,
        timestamp: new Date().toISOString()
    });
}

export function emitStatus(streamId, status) {
    emitToStream(streamId, 'stream:status', status);
}

export function emitRecording(streamId, recordingState) {
    emitToStream(streamId, 'stream:recording', recordingState);
}
