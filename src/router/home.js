const homeRouter = (req, res) => {

    // Una página HTML sencilla para probar
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <head><title>ESP32-CAM Proxy</title></head>
        <body style="background:#111; color:#eee; text-align:center;">
          <h1>ESP32-CAM vía Node (puerto 3001)</h1>
          <p>Si todo está bien, deberías ver el video abajo:</p>
          <img src="/stream" style="max-width:90%; border:2px solid #444;" />
        </body>
      </html>
    `);
}

export default homeRouter