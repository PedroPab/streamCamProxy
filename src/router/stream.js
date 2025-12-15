import { espReq, espRes, espHeaders } from '../controller/initData.js';
import clients from '../controller/clients.js';
import connectToCamera from '../controller/connectToCamera.js';
const streamRouter = (req, res) => {


    // Usamos el Content-Type original de la cámara si ya lo conocemos
    const contentType =
        (espHeaders && espHeaders['content-type']) ||
        'multipart/x-mixed-replace; boundary=frame';

    res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        Connection: 'close',
    });

    clients.add(res);
    console.log('Cliente conectado a /stream. Total clientes:', clients.size);

    // Aseguramos que haya conexión a la cámara
    connectToCamera();

    // Cuando el navegador se cierra o recarga, quitamos el cliente
    req.on('close', () => {
        clients.delete(res);
        console.log('Cliente desconectado. Total clientes:', clients.size);

        // Si ya no quedan clientes, podemos cerrar la conexión con la cámara
        if (clients.size === 0 && espRes) {
            console.log('No hay clientes, cerrando stream de la cámara.');
            try {
                espReq && espReq.destroy();
                espRes && espRes.destroy();
            } catch (e) {
                console.error('Error cerrando conexiones:', e.message);
            }
            espReq = null;
            espRes = null;
        }
    });
}

export default streamRouter