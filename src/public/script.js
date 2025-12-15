// ESP32-CAM Stream Proxy - Client Script

document.addEventListener('DOMContentLoaded', function() {
    const streamImg = document.getElementById('stream-img');
    const statusElement = document.getElementById('status');

    // Verificar conexión del stream
    if (streamImg) {
        streamImg.addEventListener('load', function() {
            if (statusElement) {
                statusElement.textContent = 'Conectado';
            }
        });

        streamImg.addEventListener('error', function() {
            if (statusElement) {
                statusElement.textContent = 'Desconectado';
            }
        });
    }
});
