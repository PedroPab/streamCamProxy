import { connected } from '../controller/initData.js';
import clients from './clients.js';
import { videoRecorder } from './videoRecorder.js';
import { getMetadata } from './storage.js';

const findStatus = async () => {
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

    return {
        connected: connected.get(),
        clients: clients.size,
        error: null,
        recording: videoRecorder.getStatus(),
        media: mediaStats
    };
};

export { findStatus };
