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
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        const dismiss = () => {
            if (toast.classList.contains('removing')) return;
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        };

        toast.addEventListener('click', dismiss);
        setTimeout(dismiss, 4000);
    }

    showConfirm(message, targetName = '') {
        return new Promise((resolve) => {
            let modal = document.getElementById('cyber-confirm');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cyber-confirm';
                modal.className = 'cyber-confirm';
                modal.innerHTML = `
                    <div class="cyber-confirm-box">
                        <div class="cyber-confirm-header">
                            <span class="confirm-icon">[!]</span>
                            <span>CONFIRM_ACTION</span>
                        </div>
                        <div class="cyber-confirm-body">
                            <p class="cyber-confirm-message"></p>
                            <p class="cyber-confirm-target"></p>
                        </div>
                        <div class="cyber-confirm-actions">
                            <button class="cyber-btn" data-action="cancel">CANCEL</button>
                            <button class="cyber-btn danger" data-action="confirm">CONFIRM</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const messageEl = modal.querySelector('.cyber-confirm-message');
            const targetEl = modal.querySelector('.cyber-confirm-target');

            messageEl.textContent = message;
            if (targetName) {
                targetEl.textContent = targetName;
                targetEl.style.display = 'inline-block';
            } else {
                targetEl.style.display = 'none';
            }

            modal.classList.add('active');

            const cleanup = () => {
                modal.classList.remove('active');
                modal.removeEventListener('click', handleClick);
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleClick = (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    cleanup();
                    resolve(action === 'confirm');
                }
            };

            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                } else if (e.key === 'Enter') {
                    cleanup();
                    resolve(true);
                }
            };

            modal.addEventListener('click', handleClick);
            document.addEventListener('keydown', handleKeydown);
        });
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default AdminPanel;
