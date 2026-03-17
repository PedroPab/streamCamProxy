import jwt from 'jsonwebtoken';
import { UserModel } from '../user/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token
                || socket.handshake.query?.token
                || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET, {
            issuer: 'streamcam-api',
            audience: 'streamcam-client',
            algorithms: ['HS256']
        });

        if (payload.type !== 'access') {
            return next(new Error('Invalid token type'));
        }

        const user = UserModel.findById(payload.sub);
        if (!user || !user.isActive) {
            return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        next();

    } catch (error) {
        next(new Error('Invalid or expired token'));
    }
}
