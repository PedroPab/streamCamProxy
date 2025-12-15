
const ESP32_HOST = process.env.ESP32_HOST || '192.168.1.6';
const ESP32_PORT = process.env.ESP32_PORT || 81;
const ESP32_PATH = process.env.ESP32_PATH || '/stream';
const PORT_external = process.env.PORT || 3001;

const ESP32_URL = `http://${ESP32_HOST}:${ESP32_PORT}${ESP32_PATH}`;
console.log('URL de la ESP32-CAM:', ESP32_URL);


class flags {
    constructor(value = false) {
        this.value = value;
    }

    set(value) {
        this.value = value;
    }

    get() {
        return this.value;
    }
}

const connecting = new flags(false);
const espHeaders = new flags(null)
const espReq = new flags(null)
const espRes = new flags(null)

export {
    ESP32_HOST,
    ESP32_PORT,
    ESP32_PATH,
    ESP32_URL,
    PORT_external,
    espReq,
    espRes,
    espHeaders,
    connecting
}