import {
    connected,
} from '../controller/initData.js';
import clients from './clients.js';

const findStatus = () => {
    return {
        connected: connected.get(),
        clients: clients.size,
        error: null,
    }
}

export { findStatus };