import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export function generateAccessToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'streamcam-api',
        audience: 'streamcam-client'
    });
}

export function generateRefreshToken(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'streamcam-api'
    });
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'streamcam-api',
            audience: 'streamcam-client'
        });
    } catch (error) {
        return null;
    }
}

export function verifyRefreshToken(token) {
    try {
        const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
            issuer: 'streamcam-api'
        });

        if (payload.type !== 'refresh') {
            return null;
        }

        return payload;
    } catch (error) {
        return null;
    }
}

export function generateTokenPair(user) {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
        expiresIn: JWT_EXPIRES_IN,
        tokenType: 'Bearer'
    };
}

export default {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
