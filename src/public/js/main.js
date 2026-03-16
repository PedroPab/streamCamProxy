import { AuthManager } from './AuthManager.js';
import { SurveillanceNode } from './SurveillanceNode.js';

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
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.logout();
            window.location.href = '/login.html';
        });
    }

    window.authManager = auth;
    window.surveillanceNode = new SurveillanceNode(auth);
});
