import { AuthManager } from './AuthManager.js';
import { SurveillanceNode } from './SurveillanceNode.js';
import { StreamSelector } from './StreamSelector.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si hay mensaje de acceso denegado
    const accessDenied = sessionStorage.getItem('accessDenied');
    if (accessDenied) {
        sessionStorage.removeItem('accessDenied');
        showToast(accessDenied, 'error');
    }

    const auth = new AuthManager();
    const isAuthenticated = await auth.checkAuth();

    // Variable global para modo público
    window.isPublicMode = !isAuthenticated;
    window.authManager = isAuthenticated ? auth : null;

    if (isAuthenticated) {
        // Usuario autenticado - flujo normal
        setupAuthenticatedUser(auth);
    } else {
        // Usuario anónimo - modo público
        setupPublicMode();
    }

    // Crear SurveillanceNode (funciona en ambos modos)
    const surveillanceNode = new SurveillanceNode(auth, isAuthenticated);
    window.surveillanceNode = surveillanceNode;

    // Crear StreamSelector con callback para cambiar stream
    const streamSelector = new StreamSelector(
        auth,
        (stream) => surveillanceNode.changeStream(stream),
        isAuthenticated ? surveillanceNode.socketManager : null,
        !isAuthenticated // isPublicMode
    );
    window.streamSelector = streamSelector;

    // Inicializar modal de información
    initInfoModal();
});

function setupAuthenticatedUser(auth) {
    const user = auth.getUser();
    if (user) {
        const userRole = document.getElementById('user-role');
        const userName = document.getElementById('user-name');

        if (userRole) {
            userRole.textContent = `[${user.role.toUpperCase()}]`;
            if (user.role === 'admin') {
                userRole.classList.add('admin');
            }
        }

        if (userName) {
            userName.textContent = user.email;
        }

        // Agregar link a admin si es admin
        if (user.role === 'admin') {
            addAdminLink();
        }
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.logout();
            window.location.href = '/login.html';
        });
    }

    window.authManager = auth;
}

function setupPublicMode() {
    // Reemplazar user-info con botones de login/registro
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <a href="/login.html" class="cyber-btn login-link">[LOGIN]</a>
            <a href="/login.html#register" class="cyber-btn register-link">[REGISTER]</a>
        `;
    }

    // Mostrar banner de invitación a registrarse
    showPublicBanner();
}

function showPublicBanner() {
    const banner = document.createElement('div');
    banner.className = 'public-access-banner';
    banner.innerHTML = `
        <span class="banner-icon">[i]</span>
        <span class="banner-text">MODO PUBLICO: Registrate para capturar, grabar y acceder a mas streams</span>
        <a href="/login.html#register" class="cyber-btn banner-btn">[REGISTRARSE]</a>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
}

function initInfoModal() {
    const btnInfo = document.getElementById('btn-info');
    const infoModal = document.getElementById('info-modal');
    const btnCloseInfo = document.getElementById('btn-close-info');
    const btnCopyUrl = document.getElementById('btn-copy-url');

    if (btnInfo && infoModal) {
        btnInfo.addEventListener('click', () => {
            infoModal.classList.add('active');
        });

        btnCloseInfo?.addEventListener('click', () => {
            infoModal.classList.remove('active');
        });

        // Cerrar al hacer click en backdrop
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.remove('active');
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && infoModal.classList.contains('active')) {
                infoModal.classList.remove('active');
            }
        });
    }

    // Botón copiar URL
    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                btnCopyUrl.innerHTML = '<span>[OK]</span> COPIADO!';
                setTimeout(() => {
                    btnCopyUrl.innerHTML = '<span>[#]</span> COPIAR_URL';
                }, 2000);
            } catch (err) {
                console.error('Error copiando URL:', err);
            }
        });
    }
}

function addAdminLink() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        const adminLink = document.createElement('a');
        adminLink.href = '/admin.html';
        adminLink.className = 'cyber-btn admin-link';
        adminLink.textContent = '[ADMIN]';
        userInfo.insertBefore(adminLink, userInfo.querySelector('#btn-logout'));
    }
}

function showToast(message, type = 'info') {
    const icons = {
        success: '[OK]',
        error: '[X]',
        warning: '[!]',
        info: '[i]'
    };

    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    const dismiss = () => {
        if (toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    };

    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, 5000);
}
