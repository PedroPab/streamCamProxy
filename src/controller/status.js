import { connected } from '../controller/initData.js';
import clients from './clients.js';
import { videoRecorder } from './videoRecorder.js';
import { getMetadata } from './storage.js';

// Cache para limitar peticiones a 1 por segundo
let cachedStatus = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1000;

const findStatus = async () => {
    const now = Date.now();

    // Retornar caché si no ha pasado 1 segundo
    if (cachedStatus && (now - lastFetchTime) < CACHE_TTL_MS) {
        return cachedStatus;
    }

    let mediaStats = { photoCount: 0, videoCount: 0 };

    try {
        const metadata = await getMetadata();
        mediaStats = {
            photoCount: metadata.photos.length,
            videoCount: metadata.videos.length
        };
    } catch {
        // Si falla, usar valores por defecto
    }

    cachedStatus = {
        connected: connected.get(),
        clients: clients.size,
        error: null,
        recording: videoRecorder.getStatus(),
        media: mediaStats
    };
    lastFetchTime = now;

    return cachedStatus;
};

export { findStatus };
