# ESP32-CAM Proxy Server

## ¿Qué es?

Un servidor proxy HTTP desarrollado en Node.js que actúa como intermediario entre una ESP32-CAM y múltiples clientes web.

## Descripción

Este proxy recibe el stream MJPEG de una ESP32-CAM y lo redistribuye a múltiples navegadores simultáneamente. En lugar de que cada cliente se conecte directamente a la ESP32-CAM, todos se conectan al proxy, que mantiene una única conexión con la cámara.

## ¿Para qué sirve?

La ESP32-CAM tiene recursos limitados y puede saturarse fácilmente cuando múltiples clientes intentan conectarse directamente a su stream de video. Este proxy soluciona ese problema:

- **Evita la saturación** del servidor ESP32-CAM
- **Permite múltiples conexiones simultáneas** sin afectar el rendimiento de la cámara
- **Optimiza el ancho de banda** al mantener una sola conexión con la ESP32-CAM
- **Gestión automática de clientes** conectando y desconectando
- **Seguridad** al controlar quien se conecta

## Configuración

Crea un archivo `.env` en la raíz del proyecto:

```bash
ESP32_HOST=192.168.1.68
ESP32_PORT=81
ESP32_PATH=/stream
PORT=3001
```

## Comandos Disponibles

### `npm start`

Inicia el servidor en modo producción.

```bash
npm start
```

Este comando ejecuta: `node --env-file=.env server.js`

**Úsalo cuando:**

- Quieras ejecutar el servidor de forma estable
- Estés en producción o pruebas finales

---

### `npm run dev`

Inicia el servidor en modo desarrollo con auto-recarga.

```bash
npm run dev
```

Este comando ejecuta: `node --env-file=.env --watch server.js`

**Úsalo cuando:**

- Estés desarrollando o modificando el código
- Quieras que el servidor se reinicie automáticamente al guardar cambios
- Necesites iterar rápidamente sin reiniciar manualmente

---

## Uso

Una vez iniciado el servidor:

- **Página de prueba:** `http://localhost:3001/`
- **Stream directo:** `http://localhost:3001/stream`

## Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `ESP32_HOST` | IP de tu ESP32-CAM | `192.168.1.68` |
| `ESP32_PORT` | Puerto del stream | `81` |
| `ESP32_PATH` | Ruta del stream | `/stream` |
| `PORT` | Puerto del servidor proxy | `3001` |

## Características

✅ Sin dependencias externas  
✅ Conexión única a la ESP32-CAM  
✅ Soporte para múltiples clientes simultáneos  
✅ Reconexión automática  
✅ Desconexión inteligente cuando no hay clientes  
✅ Página de prueba incluida  
✅ Configuración mediante variables de entorno  
✅ Modo desarrollo con auto-recarga
