import streamManager from '../controller/streamManager.js';
import { PermissionModel } from '../models/permission.model.js';

export function registerHandlers(io, socket) {
    const user = socket.user;

    socket.on('stream:subscribe', (streamId) => {
        const hasAccess = checkStreamAccess(user, streamId);
        if (!hasAccess) {
            socket.emit('error', { message: 'No access to this stream' });
            return;
        }

        socket.join(`stream:${streamId}`);
        console.log(`[WebSocket] ${user.email} subscribed to stream:${streamId}`);

        const status = streamManager.getStreamStatus(streamId);
        socket.emit('stream:status', { streamId, ...status });
    });

    socket.on('stream:unsubscribe', (streamId) => {
        socket.leave(`stream:${streamId}`);
        console.log(`[WebSocket] ${user.email} unsubscribed from stream:${streamId}`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`[WebSocket] ${user.email} disconnected: ${reason}`);
    });
}

function checkStreamAccess(user, streamId) {
    if (user.role === 'admin') return true;
    const streams = PermissionModel.getUserAccessibleStreams(user.id);
    return streams.some(s => s.id === streamId);
}
