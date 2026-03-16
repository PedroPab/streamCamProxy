export class PermissionManager {
    constructor(adminPanel) {
        this.panel = adminPanel;
        this.groups = [];
        this.streams = [];
        this.matrix = [];
        this.changes = new Map(); // Track changes
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-save-permissions')?.addEventListener('click', () => {
            this.saveAllPermissions();
        });
    }

    async load() {
        const thead = document.getElementById('permissions-thead');
        const tbody = document.getElementById('permissions-tbody');

        if (!thead || !tbody) return;

        thead.innerHTML = '<tr><th>Loading...</th></tr>';
        tbody.innerHTML = '<tr><td class="loading">Loading...</td></tr>';

        try {
            const result = await this.panel.fetch('/admin/permissions');
            if (result?.success) {
                this.groups = result.data.groups || [];
                this.streams = result.data.streams || [];
                this.matrix = result.data.matrix || [];
                this.renderMatrix();
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td class="loading">Error loading permissions</td></tr>';
        }
    }

    renderMatrix() {
        const thead = document.getElementById('permissions-thead');
        const tbody = document.getElementById('permissions-tbody');

        if (!thead || !tbody) return;

        if (this.groups.length === 0 || this.streams.length === 0) {
            thead.innerHTML = '<tr><th>No data</th></tr>';
            tbody.innerHTML = '<tr><td class="loading">Create groups and streams first</td></tr>';
            return;
        }

        // Header row
        thead.innerHTML = `
            <tr>
                <th class="group-header">GROUP / STREAM</th>
                ${this.streams.map(s => `
                    <th class="stream-header">${this.panel.escapeHtml(s.name)}</th>
                `).join('')}
            </tr>
        `;

        // Body rows
        tbody.innerHTML = this.groups.map(group => {
            return `
                <tr data-group-id="${group.id}">
                    <th class="group-header">${this.panel.escapeHtml(group.name)}</th>
                    ${this.streams.map(stream => {
                        const perms = this.getPermissions(group.id, stream.id);
                        return `
                            <td>
                                <div class="perm-cell">
                                    ${this.renderPermCheckbox(group.id, stream.id, 'view', perms.canView, 'V')}
                                    ${this.renderPermCheckbox(group.id, stream.id, 'capture', perms.canCapture, 'C')}
                                    ${this.renderPermCheckbox(group.id, stream.id, 'record', perms.canRecord, 'R')}
                                    ${this.renderPermCheckbox(group.id, stream.id, 'admin', perms.canAdmin, 'A')}
                                </div>
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        }).join('');

        // Setup checkbox clicks
        tbody.querySelectorAll('.perm-checkbox').forEach(cb => {
            cb.addEventListener('click', () => this.togglePermission(cb));
        });
    }

    renderPermCheckbox(groupId, streamId, type, value, label) {
        const checked = value ? 'checked' : '';
        return `
            <button class="perm-checkbox ${type} ${checked}"
                    data-group-id="${groupId}"
                    data-stream-id="${streamId}"
                    data-type="${type}"
                    data-value="${value ? 1 : 0}"
                    title="${type.toUpperCase()}">
                ${label}
            </button>
        `;
    }

    getPermissions(groupId, streamId) {
        const entry = this.matrix.find(m =>
            m.groupId === groupId && m.streamId === streamId
        );

        return {
            canView: entry?.canView || 0,
            canCapture: entry?.canCapture || 0,
            canRecord: entry?.canRecord || 0,
            canAdmin: entry?.canAdmin || 0
        };
    }

    togglePermission(checkbox) {
        const groupId = parseInt(checkbox.dataset.groupId);
        const streamId = parseInt(checkbox.dataset.streamId);
        const type = checkbox.dataset.type;
        const currentValue = parseInt(checkbox.dataset.value);
        const newValue = currentValue ? 0 : 1;

        // Update UI
        checkbox.dataset.value = newValue;
        checkbox.classList.toggle('checked', newValue === 1);

        // Track change
        const key = `${groupId}-${streamId}`;
        if (!this.changes.has(key)) {
            this.changes.set(key, {
                groupId,
                streamId,
                canView: this.getCheckboxValue(groupId, streamId, 'view'),
                canCapture: this.getCheckboxValue(groupId, streamId, 'capture'),
                canRecord: this.getCheckboxValue(groupId, streamId, 'record'),
                canAdmin: this.getCheckboxValue(groupId, streamId, 'admin')
            });
        }

        // Update tracked change
        const change = this.changes.get(key);
        switch (type) {
            case 'view': change.canView = newValue; break;
            case 'capture': change.canCapture = newValue; break;
            case 'record': change.canRecord = newValue; break;
            case 'admin': change.canAdmin = newValue; break;
        }
    }

    getCheckboxValue(groupId, streamId, type) {
        const cb = document.querySelector(
            `.perm-checkbox[data-group-id="${groupId}"][data-stream-id="${streamId}"][data-type="${type}"]`
        );
        return cb ? parseInt(cb.dataset.value) : 0;
    }

    async saveAllPermissions() {
        if (this.changes.size === 0) {
            this.panel.showNotification('No changes to save', 'info');
            return;
        }

        const permissions = Array.from(this.changes.values());

        const result = await this.panel.fetch('/admin/permissions/batch', {
            method: 'POST',
            body: JSON.stringify({ permissions })
        });

        if (result?.success) {
            this.changes.clear();
            this.panel.showNotification('Permissions saved successfully', 'success');
            this.load(); // Reload to get fresh data
        } else {
            this.panel.showNotification(result?.error || 'Error saving permissions', 'error');
        }
    }
}

export default PermissionManager;
