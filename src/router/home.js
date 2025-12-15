/**
 * Renderiza la página HTML principal con el stream embebido
 * @param {express.Request} req - Request de Express
 * @param {express.Response} res - Response de Express
 */
const homeRouter = (req, res) => {
    res.status(200).type('html').send(htmlPage);
};

const htmlPage = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ESP32-CAM Proxy</title>
    <style>
        body {
            background: #111;
            color: #eee;
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
        }
        h1 {
            color: #4CAF50;
            margin-bottom: 10px;
        }
        p {
            color: #aaa;
            margin-bottom: 30px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        img {
            max-width: 90%;
            border: 2px solid #444;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: #222;
            border-radius: 8px;
            display: inline-block;
        }
        .info p {
            margin: 5px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎥 ESP32-CAM Stream Proxy</h1>
        <p>Stream MJPEG en tiempo real desde tu ESP32-CAM</p>
        <img src="/stream" alt="ESP32-CAM Stream" />
        <div class="info">
            <p><strong>Estado:</strong> Conectado</p>
            <p><strong>Puerto:</strong> 3001</p>
            <p><strong>Endpoint:</strong> /stream</p>
        </div>
    </div>
</body>
</html>
`;


export default homeRouter;
