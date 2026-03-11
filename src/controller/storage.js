import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

// Rutas de almacenamiento
const STORAGE_BASE = process.env.STORAGE_PATH || join(PROJECT_ROOT, 'storage');
const PHOTOS_DIR = join(STORAGE_BASE, 'photos');
const VIDEOS_DIR = join(STORAGE_BASE, 'videos');
const METADATA_FILE = join(STORAGE_BASE, 'metadata.json');

// Estructura por defecto de metadatos
const defaultMetadata = {
    photos: [],
    videos: []
};

// Inicializar almacenamiento
async function initStorage() {
    try {
        await fs.mkdir(PHOTOS_DIR, { recursive: true });
        await fs.mkdir(VIDEOS_DIR, { recursive: true });

        try {
            await fs.access(METADATA_FILE);
        } catch {
            await fs.writeFile(METADATA_FILE, JSON.stringify(defaultMetadata, null, 2));
        }

        console.log('Storage inicializado en:', STORAGE_BASE);
    } catch (error) {
        console.error('Error inicializando storage:', error);
        throw error;
    }
}

// Leer metadatos
async function getMetadata() {
    try {
        const data = await fs.readFile(METADATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { ...defaultMetadata };
    }
}

// Guardar metadatos
async function saveMetadata(metadata) {
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Generar ID único simple
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Formatear timestamp para nombre de archivo
function formatTimestamp(date = new Date()) {
    return date.toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .slice(0, 19);
}

// Guardar foto
async function savePhoto(frameBuffer) {
    const id = generateId();
    const timestamp = new Date();
    const filename = `photo_${formatTimestamp(timestamp)}.jpg`;
    const filepath = join(PHOTOS_DIR, filename);

    await fs.writeFile(filepath, frameBuffer);

    const stats = await fs.stat(filepath);
    const photoEntry = {
        id,
        filename,
        timestamp: timestamp.toISOString(),
        size: stats.size
    };

    const metadata = await getMetadata();
    metadata.photos.unshift(photoEntry);
    await saveMetadata(metadata);

    return photoEntry;
}

// Guardar video
async function saveVideo(filename, duration, frameCount) {
    const filepath = join(VIDEOS_DIR, filename);
    const stats = await fs.stat(filepath);

    const id = generateId();
    const videoEntry = {
        id,
        filename,
        timestamp: new Date().toISOString(),
        duration,
        frames: frameCount,
        size: stats.size
    };

    const metadata = await getMetadata();
    metadata.videos.unshift(videoEntry);
    await saveMetadata(metadata);

    return videoEntry;
}

// Obtener lista de media
async function getMediaList() {
    const metadata = await getMetadata();
    return {
        photos: metadata.photos,
        videos: metadata.videos,
        photoCount: metadata.photos.length,
        videoCount: metadata.videos.length
    };
}

// Eliminar foto
async function deletePhoto(id) {
    const metadata = await getMetadata();
    const photoIndex = metadata.photos.findIndex(p => p.id === id);

    if (photoIndex === -1) {
        throw new Error('Photo not found');
    }

    const photo = metadata.photos[photoIndex];
    const filepath = join(PHOTOS_DIR, photo.filename);

    await fs.unlink(filepath);
    metadata.photos.splice(photoIndex, 1);
    await saveMetadata(metadata);

    return photo;
}

// Eliminar video
async function deleteVideo(id) {
    const metadata = await getMetadata();
    const videoIndex = metadata.videos.findIndex(v => v.id === id);

    if (videoIndex === -1) {
        throw new Error('Video not found');
    }

    const video = metadata.videos[videoIndex];
    const filepath = join(VIDEOS_DIR, video.filename);

    await fs.unlink(filepath);
    metadata.videos.splice(videoIndex, 1);
    await saveMetadata(metadata);

    return video;
}

export {
    STORAGE_BASE,
    PHOTOS_DIR,
    VIDEOS_DIR,
    initStorage,
    getMetadata,
    savePhoto,
    saveVideo,
    getMediaList,
    deletePhoto,
    deleteVideo,
    formatTimestamp
};
