export class UserManager {
    constructor(adminPanel) {
        this.panel = adminPanel;
        this.users = [];
        this.groups = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-add-user')?.addEventListener('click', () => {
            this.showAddUserForm();
        });
    }

    async load() {
        await Promise.all([
            this.loadUsers(),
            this.loadGroups()
        ]);
    }

    async loadUsers() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

        try {
            const result = await this.panel.fetch('/users');
            if (result?.success) {
                this.users = result.users || [];
                this.renderUsers();
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading users</td></tr>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading users</td></tr>';
        }
    }

    async loadGroups() {
        try {
            const result = await this.panel.fetch('/admin/groups');
            if (result?.success) {
                this.groups = result.data || [];
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    renderUsers() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr data-user-id="${user.id}">
                <td>${user.id}</td>
                <td>${this.panel.escapeHtml(user.email)}</td>
                <td>${this.panel.escapeHtml(user.username)}</td>
                <td><span class="role-badge ${user.role}">${user.role.toUpperCase()}</span></td>
                <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td class="user-groups-cell" data-user-id="${user.id}">
                    <span class="loading">...</span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" data-action="edit" data-id="${user.id}">EDIT</button>
                        <button class="action-btn" data-action="groups" data-id="${user.id}">GROUPS</button>
                        <button class="action-btn danger" data-action="delete" data-id="${user.id}">DEL</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Cargar grupos de cada usuario
        this.users.forEach(user => this.loadUserGroups(user.id));

        // Setup action buttons
        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id);
                this.handleAction(action, id);
            });
        });
    }

    async loadUserGroups(userId) {
        const cell = document.querySelector(`.user-groups-cell[data-user-id="${userId}"]`);
        if (!cell) return;

        try {
            const result = await this.panel.fetch(`/admin/groups/user/${userId}/groups`);
            if (result?.success && result.data?.length > 0) {
                cell.innerHTML = result.data
                    .map(g => `<span class="group-tag">${this.panel.escapeHtml(g.name)}</span>`)
                    .join(' ');
            } else {
                cell.innerHTML = '<span class="no-groups">-</span>';
            }
        } catch {
            cell.innerHTML = '-';
        }
    }

    handleAction(action, id) {
        const user = this.users.find(u => u.id === id);
        if (!user) return;

        switch (action) {
            case 'edit':
                this.showEditUserForm(user);
                break;
            case 'groups':
                this.showManageGroupsForm(user);
                break;
            case 'delete':
                this.confirmDeleteUser(user);
                break;
        }
    }

    showAddUserForm() {
        const form = `
            <form class="admin-form" id="user-form">
                <div class="form-group">
                    <label class="form-label">EMAIL</label>
                    <input type="email" class="cyber-input" name="email" required>
                </div>
                <div class="form-group">
                    <label class="form-label">USERNAME</label>
                    <input type="text" class="cyber-input" name="username" required>
                </div>
                <div class="form-group">
                    <label class="form-label">PASSWORD</label>
                    <input type="password" class="cyber-input" name="password" required>
                </div>
                <div class="form-group">
                    <label class="form-label">ROLE</label>
                    <select name="role" class="cyber-input">
                        <option value="user">USER</option>
                        <option value="admin">ADMIN</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">CREATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[+] ADD USER', form);

        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createUser(new FormData(e.target));
        });
    }

    showEditUserForm(user) {
        const form = `
            <form class="admin-form" id="user-form">
                <div class="form-group">
                    <label class="form-label">EMAIL</label>
                    <input type="email" class="cyber-input" value="${this.panel.escapeHtml(user.email)}" disabled>
                </div>
                <div class="form-group">
                    <label class="form-label">USERNAME</label>
                    <input type="text" class="cyber-input" name="username" value="${this.panel.escapeHtml(user.username)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">ROLE</label>
                    <select name="role" class="cyber-input">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>USER</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ADMIN</option>
                    </select>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" name="isActive" id="isActive" ${user.isActive ? 'checked' : ''}>
                    <label class="checkbox-label" for="isActive">ACTIVE</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">UPDATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[*] EDIT USER', form);

        document.getElementById('user-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateUser(user.id, new FormData(e.target));
        });
    }

    async showManageGroupsForm(user) {
        // Cargar grupos actuales del usuario
        let userGroupIds = [];
        try {
            const result = await this.panel.fetch(`/admin/groups/user/${user.id}/groups`);
            if (result?.success) {
                userGroupIds = result.data.map(g => g.id);
            }
        } catch (error) {
            console.error('Error loading user groups:', error);
        }

        const form = `
            <form class="admin-form" id="groups-form">
                <p style="color: var(--text-dim); margin-bottom: 15px;">
                    Select groups for ${this.panel.escapeHtml(user.username)}:
                </p>
                <div class="form-group">
                    ${this.groups.map(group => `
                        <div class="checkbox-group">
                            <input type="checkbox" name="groups" value="${group.id}" id="group-${group.id}"
                                   ${userGroupIds.includes(group.id) ? 'checked' : ''}>
                            <label class="checkbox-label" for="group-${group.id}">${this.panel.escapeHtml(group.name)}</label>
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">SAVE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[G] MANAGE GROUPS', form);

        document.getElementById('groups-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateUserGroups(user.id, userGroupIds, e.target);
        });
    }

    async updateUserGroups(userId, currentGroupIds, form) {
        const formData = new FormData(form);
        const selectedGroupIds = formData.getAll('groups').map(id => parseInt(id));

        // Grupos a agregar (están seleccionados pero no estaban antes)
        const toAdd = selectedGroupIds.filter(id => !currentGroupIds.includes(id));
        // Grupos a quitar (estaban antes pero ya no están seleccionados)
        const toRemove = currentGroupIds.filter(id => !selectedGroupIds.includes(id));

        let hasError = false;

        // Agregar a nuevos grupos
        for (const groupId of toAdd) {
            const result = await this.panel.fetch(`/admin/groups/${groupId}/users`, {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
            if (!result?.success) {
                hasError = true;
            }
        }

        // Quitar de grupos
        for (const groupId of toRemove) {
            const result = await this.panel.fetch(`/admin/groups/${groupId}/users/${userId}`, {
                method: 'DELETE'
            });
            if (!result?.success) {
                hasError = true;
            }
        }

        if (hasError) {
            this.panel.showNotification('Some group changes failed', 'error');
        } else {
            this.panel.showNotification('Groups updated successfully', 'success');
        }

        this.panel.closeModal();
        this.load();
    }

    async createUser(formData) {
        const data = {
            email: formData.get('email'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role')
        };

        const result = await this.panel.fetch('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('User created successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error creating user', 'error');
        }
    }

    async updateUser(id, formData) {
        const data = {
            username: formData.get('username'),
            role: formData.get('role'),
            isActive: formData.get('isActive') === 'on' ? 1 : 0
        };

        const result = await this.panel.fetch(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('User updated successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error updating user', 'error');
        }
    }

    async confirmDeleteUser(user) {
        const confirmed = await this.panel.showConfirm(
            'Are you sure you want to delete this user?',
            user.email
        );
        if (confirmed) {
            this.deleteUser(user.id);
        }
    }

    async deleteUser(id) {
        const result = await this.panel.fetch(`/users/${id}`, {
            method: 'DELETE'
        });

        if (result?.success) {
            this.panel.showNotification('User deleted successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error deleting user', 'error');
        }
    }
}

export default UserManager;
