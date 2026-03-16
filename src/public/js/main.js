import { AuthManager } from './AuthManager.js';
import { SurveillanceNode } from './SurveillanceNode.js';
import { StreamSelector } from './StreamSelector.js';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = new AuthManager();

    const isAuthenticated = await auth.checkAuth();

    if (!isAuthenticated) {
        window.location.href = '/login.html';
        return;
    }

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

    // Crear SurveillanceNode
    const surveillanceNode = new SurveillanceNode(auth);
    window.surveillanceNode = surveillanceNode;

    // Crear StreamSelector con callback para cambiar stream
    const streamSelector = new StreamSelector(auth, (stream) => {
        surveillanceNode.changeStream(stream);
    });
    window.streamSelector = streamSelector;
});

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
