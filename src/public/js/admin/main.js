import { AuthManager } from '../AuthManager.js';
import { AdminPanel } from './AdminPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = new AuthManager();

    const isAuthenticated = await auth.checkAuth();

    if (!isAuthenticated) {
        window.location.href = '/login.html';
        return;
    }

    const user = auth.getUser();

    // Verificar que es admin
    if (!user || user.role !== 'admin') {
        sessionStorage.setItem('accessDenied', 'Admin role required to access this page.');
        window.location.href = '/';
        return;
    }

    // Actualizar UI de usuario
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = user.email;
    }

    // Configurar logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.logout();
            window.location.href = '/login.html';
        });
    }

    // Iniciar reloj
    startClock();

    // Iniciar contador de sesión
    startSessionCounter();

    // Iniciar panel de administración
    window.authManager = auth;
    window.adminPanel = new AdminPanel(auth);
});

function startClock() {
    const updateClock = () => {
        const now = new Date();
        const time = now.toLocaleTimeString('es-ES', { hour12: false });
        const el = document.getElementById('system-time');
        if (el) el.textContent = time;
    };
    updateClock();
    setInterval(updateClock, 1000);
}

function startSessionCounter() {
    const startTime = Date.now();
    const updateSession = () => {
        const elapsed = Date.now() - startTime;
        const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        const el = document.getElementById('uptime');
        if (el) el.textContent = `SESSION: ${hours}:${minutes}:${seconds}`;
    };
    updateSession();
    setInterval(updateSession, 1000);
}
