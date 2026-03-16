export class GroupManager {
    constructor(adminPanel) {
        this.panel = adminPanel;
        this.groups = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-add-group')?.addEventListener('click', () => {
            this.showAddGroupForm();
        });
    }

    async load() {
        const tbody = document.getElementById('groups-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';

        try {
            const result = await this.panel.fetch('/admin/groups');
            if (result?.success) {
                this.groups = result.data || [];
                this.renderGroups();
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Error loading groups</td></tr>';
        }
    }

    renderGroups() {
        const tbody = document.getElementById('groups-tbody');
        if (!tbody) return;

        if (this.groups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No groups found</td></tr>';
            return;
        }

        tbody.innerHTML = this.groups.map(group => {
            const createdDate = new Date(group.createdAt).toLocaleDateString('es-ES');
            return `
                <tr data-group-id="${group.id}">
                    <td>${group.id}</td>
                    <td>${this.panel.escapeHtml(group.name)}</td>
                    <td>${this.panel.escapeHtml(group.description || '-')}</td>
                    <td>${group.userCount || 0}</td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn" data-action="edit" data-id="${group.id}">EDIT</button>
                            <button class="action-btn" data-action="users" data-id="${group.id}">USERS</button>
                            <button class="action-btn danger" data-action="delete" data-id="${group.id}" ${group.name === 'default' ? 'disabled' : ''}>DEL</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Setup action buttons
        tbody.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id);
                this.handleAction(action, id);
            });
        });
    }

    handleAction(action, id) {
        const group = this.groups.find(g => g.id === id);
        if (!group) return;

        switch (action) {
            case 'edit':
                this.showEditGroupForm(group);
                break;
            case 'users':
                this.showGroupUsers(group);
                break;
            case 'delete':
                this.confirmDeleteGroup(group);
                break;
        }
    }

    showAddGroupForm() {
        const form = `
            <form class="admin-form" id="group-form">
                <div class="form-group">
                    <label class="form-label">NAME</label>
                    <input type="text" class="cyber-input" name="name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">DESCRIPTION</label>
                    <input type="text" class="cyber-input" name="description">
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">CREATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[+] ADD GROUP', form);

        document.getElementById('group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createGroup(new FormData(e.target));
        });
    }

    showEditGroupForm(group) {
        const form = `
            <form class="admin-form" id="group-form">
                <div class="form-group">
                    <label class="form-label">NAME</label>
                    <input type="text" class="cyber-input" name="name" value="${this.panel.escapeHtml(group.name)}" ${group.name === 'default' ? 'disabled' : ''} required>
                </div>
                <div class="form-group">
                    <label class="form-label">DESCRIPTION</label>
                    <input type="text" class="cyber-input" name="description" value="${this.panel.escapeHtml(group.description || '')}">
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">UPDATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[*] EDIT GROUP', form);

        document.getElementById('group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateGroup(group.id, new FormData(e.target));
        });
    }

    async showGroupUsers(group) {
        const result = await this.panel.fetch(`/admin/groups/${group.id}`);

        if (!result?.success) {
            this.panel.showNotification('Error loading group users', 'error');
            return;
        }

        const users = result.data.users || [];

        const content = `
            <div style="margin-bottom: 15px;">
                <strong style="color: var(--text-cyan);">${this.panel.escapeHtml(group.name)}</strong>
                <span style="color: var(--text-dim);"> - ${users.length} users</span>
            </div>
            ${users.length > 0 ? `
                <div style="max-height: 300px; overflow-y: auto;">
                    ${users.map(user => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color);">
                            <span>${this.panel.escapeHtml(user.username)} (${this.panel.escapeHtml(user.email)})</span>
                            <button class="action-btn danger remove-user-btn" data-user-id="${user.id}">REMOVE</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: var(--text-dim);">No users in this group</p>'}
            <div class="form-actions" style="margin-top: 15px;">
                <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CLOSE</button>
            </div>
        `;

        this.panel.openModal('[U] GROUP USERS', content);

        // Setup remove buttons
        document.querySelectorAll('.remove-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                await this.removeUserFromGroup(group.id, userId);
                this.showGroupUsers(group); // Refresh
            });
        });
    }

    async createGroup(formData) {
        const data = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        const result = await this.panel.fetch('/admin/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('Group created successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error creating group', 'error');
        }
    }

    async updateGroup(id, formData) {
        const data = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        const result = await this.panel.fetch(`/admin/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('Group updated successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error updating group', 'error');
        }
    }

    async removeUserFromGroup(groupId, userId) {
        const result = await this.panel.fetch(`/admin/groups/${groupId}/users/${userId}`, {
            method: 'DELETE'
        });

        if (result?.success) {
            this.panel.showNotification('User removed from group', 'success');
        } else {
            this.panel.showNotification(result?.error || 'Error removing user', 'error');
        }
    }

    confirmDeleteGroup(group) {
        if (group.name === 'default') {
            this.panel.showNotification('Cannot delete default group', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete group "${group.name}"?`)) {
            this.deleteGroup(group.id);
        }
    }

    async deleteGroup(id) {
        const result = await this.panel.fetch(`/admin/groups/${id}`, {
            method: 'DELETE'
        });

        if (result?.success) {
            this.panel.showNotification('Group deleted successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error deleting group', 'error');
        }
    }
}

export default GroupManager;
