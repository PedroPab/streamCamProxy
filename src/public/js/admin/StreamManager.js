export class StreamManager {
    constructor(adminPanel) {
        this.panel = adminPanel;
        this.streams = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-add-stream')?.addEventListener('click', () => {
            this.showAddStreamForm();
        });
    }

    async load() {
        const tbody = document.getElementById('streams-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

        try {
            const result = await this.panel.fetch('/admin/streams');
            if (result?.success) {
                this.streams = result.data || [];
                this.renderStreams();
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading streams</td></tr>';
        }
    }

    renderStreams() {
        const tbody = document.getElementById('streams-tbody');
        if (!tbody) return;

        if (this.streams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No streams found</td></tr>';
            return;
        }

        tbody.innerHTML = this.streams.map(stream => {
            const status = stream.status || {};
            const isConnected = status.connected;
            const viewers = status.clients || 0;

            return `
                <tr data-stream-id="${stream.id}">
                    <td>${stream.id}</td>
                    <td>${this.panel.escapeHtml(stream.name)}</td>
                    <td>${this.panel.escapeHtml(stream.host)}:${stream.port}${stream.path}</td>
                    <td><span class="status-badge ${stream.isPublic ? 'active' : 'inactive'}">${stream.isPublic ? 'YES' : 'NO'}</span></td>
                    <td><span class="status-badge ${stream.isActive ? (isConnected ? 'online' : 'active') : 'inactive'}">${stream.isActive ? (isConnected ? 'CONNECTED' : 'ACTIVE') : 'INACTIVE'}</span></td>
                    <td>${viewers}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn test" data-action="test" data-id="${stream.id}">TEST</button>
                            <button class="action-btn" data-action="edit" data-id="${stream.id}">EDIT</button>
                            <button class="action-btn danger" data-action="delete" data-id="${stream.id}">DEL</button>
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
        const stream = this.streams.find(s => s.id === id);
        if (!stream) return;

        switch (action) {
            case 'test':
                this.testStream(stream);
                break;
            case 'edit':
                this.showEditStreamForm(stream);
                break;
            case 'delete':
                this.confirmDeleteStream(stream);
                break;
        }
    }

    showAddStreamForm() {
        const form = `
            <form class="admin-form" id="stream-form">
                <div class="form-group">
                    <label class="form-label">NAME</label>
                    <input type="text" class="cyber-input" name="name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">DESCRIPTION</label>
                    <input type="text" class="cyber-input" name="description">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">HOST</label>
                        <input type="text" class="cyber-input" name="host" placeholder="192.168.1.x" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">PORT</label>
                        <input type="number" class="cyber-input" name="port" value="81" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">PATH</label>
                    <input type="text" class="cyber-input" name="path" value="/stream" required>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" name="isPublic" id="isPublic">
                    <label class="checkbox-label" for="isPublic">PUBLIC (visible to all users)</label>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" name="isActive" id="isActive" checked>
                    <label class="checkbox-label" for="isActive">ACTIVE</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">CREATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[+] ADD STREAM', form);

        document.getElementById('stream-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createStream(new FormData(e.target));
        });
    }

    showEditStreamForm(stream) {
        const form = `
            <form class="admin-form" id="stream-form">
                <div class="form-group">
                    <label class="form-label">NAME</label>
                    <input type="text" class="cyber-input" name="name" value="${this.panel.escapeHtml(stream.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">DESCRIPTION</label>
                    <input type="text" class="cyber-input" name="description" value="${this.panel.escapeHtml(stream.description || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">HOST</label>
                        <input type="text" class="cyber-input" name="host" value="${this.panel.escapeHtml(stream.host)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">PORT</label>
                        <input type="number" class="cyber-input" name="port" value="${stream.port}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">PATH</label>
                    <input type="text" class="cyber-input" name="path" value="${this.panel.escapeHtml(stream.path)}" required>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" name="isPublic" id="isPublic" ${stream.isPublic ? 'checked' : ''}>
                    <label class="checkbox-label" for="isPublic">PUBLIC (visible to all users)</label>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" name="isActive" id="isActive" ${stream.isActive ? 'checked' : ''}>
                    <label class="checkbox-label" for="isActive">ACTIVE</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="cyber-btn" onclick="window.adminPanel.closeModal()">CANCEL</button>
                    <button type="submit" class="cyber-btn">UPDATE</button>
                </div>
            </form>
        `;

        this.panel.openModal('[*] EDIT STREAM', form);

        document.getElementById('stream-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateStream(stream.id, new FormData(e.target));
        });
    }

    async testStream(stream) {
        this.panel.showNotification(`Testing connection to ${stream.host}:${stream.port}...`, 'info');

        const result = await this.panel.fetch(`/admin/streams/${stream.id}/test`, {
            method: 'POST'
        });

        if (result?.success && result.data?.success) {
            this.panel.showNotification(`Connection successful! Status: ${result.data.statusCode}`, 'success');
        } else {
            this.panel.showNotification(`Connection failed: ${result?.error || result?.data?.error || 'Unknown error'}`, 'error');
        }
    }

    async createStream(formData) {
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            host: formData.get('host'),
            port: parseInt(formData.get('port')),
            path: formData.get('path'),
            isPublic: formData.get('isPublic') === 'on',
            isActive: formData.get('isActive') === 'on'
        };

        const result = await this.panel.fetch('/admin/streams', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('Stream created successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error creating stream', 'error');
        }
    }

    async updateStream(id, formData) {
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            host: formData.get('host'),
            port: parseInt(formData.get('port')),
            path: formData.get('path'),
            isPublic: formData.get('isPublic') === 'on',
            isActive: formData.get('isActive') === 'on'
        };

        const result = await this.panel.fetch(`/admin/streams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (result?.success) {
            this.panel.closeModal();
            this.panel.showNotification('Stream updated successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error updating stream', 'error');
        }
    }

    confirmDeleteStream(stream) {
        if (confirm(`Are you sure you want to delete stream "${stream.name}"?`)) {
            this.deleteStream(stream.id);
        }
    }

    async deleteStream(id) {
        const result = await this.panel.fetch(`/admin/streams/${id}`, {
            method: 'DELETE'
        });

        if (result?.success) {
            this.panel.showNotification('Stream deleted successfully', 'success');
            this.load();
        } else {
            this.panel.showNotification(result?.error || 'Error deleting stream', 'error');
        }
    }
}

export default StreamManager;
