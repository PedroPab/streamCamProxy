/**
 * URLRouter - Maneja el enrutamiento basado en URL para compartir streams
 * Permite que la URL refleje el stream actual y se pueda compartir
 */
export class URLRouter {
    /**
     * Obtiene el ID del stream desde los parámetros de la URL
     * @returns {number|null} ID del stream o null si no existe
     */
    static getStreamIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        const streamId = params.get('stream');
        return streamId ? parseInt(streamId, 10) : null;
    }

    /**
     * Actualiza la URL con el stream actual sin recargar la página
     * @param {number|null} streamId - ID del stream a establecer en la URL
     */
    static updateURL(streamId) {
        const url = new URL(window.location);
        if (streamId) {
            url.searchParams.set('stream', streamId);
        } else {
            url.searchParams.delete('stream');
        }
        window.history.pushState({ streamId }, '', url);
    }

    /**
     * Escucha cambios en el historial del navegador (botones atrás/adelante)
     * @param {Function} callback - Función a llamar cuando cambia el stream en la URL
     */
    static onPopState(callback) {
        window.addEventListener('popstate', (event) => {
            const streamId = URLRouter.getStreamIdFromURL();
            callback(streamId);
        });
    }
}
