import { UserManager } from './UserManager.js';
import { GroupManager } from './GroupManager.js';
import { StreamManager } from './StreamManager.js';
import { PermissionManager } from './PermissionManager.js';

export class AdminPanel {
    constructor(authManager) {
        this.auth = authManager;
        this.currentTab = 'users';

        this.managers = {
            users: null,
            groups: null,
            streams: null,
            permissions: null
        };

        this.init();
    }

    init() {
        this.setupTabs();
        this.setupModal();
        this.initManagers();
        this.loadCurrentTab();
    }

    setupTabs() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Actualizar tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Actualizar panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tabName}`);
        });

        // Cargar datos del tab
        this.loadCurrentTab();
    }

    loadCurrentTab() {
        const manager = this.managers[this.currentTab];
        if (manager && typeof manager.load === 'function') {
            manager.load();
        }
    }

    initManagers() {
        this.managers.users = new UserManager(this);
        this.managers.groups = new GroupManager(this);
        this.managers.streams = new StreamManager(this);
        this.managers.permissions = new PermissionManager(this);
    }

    setupModal() {
        const modal = document.getElementById('admin-modal');
        const closeBtn = document.getElementById('modal-close');
        const backdrop = modal?.querySelector('.modal-backdrop');

        closeBtn?.addEventListener('click', () => this.closeModal());
        backdrop?.addEventListener('click', () => this.closeModal());

        // ESC para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    openModal(title, content) {
        const modal = document.getElementById('admin-modal');
        const titleEl = document.getElementById('modal-title');
        const contentEl = document.getElementById('modal-content');

        if (titleEl) titleEl.textContent = title;
        if (contentEl) contentEl.innerHTML = content;
        modal?.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('admin-modal');
        modal?.classList.remove('active');
    }

    getAuthHeaders() {
        return this.auth ? this.auth.getAuthHeaders() : {};
    }

    async fetch(url, options = {}) {
        const headers = {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return null;
        }

        return response.json();
    }

    showNotification(message, type = 'info') {
        // Simple notification
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default AdminPanel;
