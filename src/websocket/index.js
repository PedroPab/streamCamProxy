import { Server } from 'socket.io';
import { authenticateSocket } from './auth.js';
import { registerHandlers } from './handlers.js';
import { setIO } from './emitter.js';

export function initializeWebSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    setIO(io);

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.user.email}`);
        registerHandlers(io, socket);
    });

    return io;
}
