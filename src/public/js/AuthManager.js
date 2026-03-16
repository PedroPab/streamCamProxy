export class AuthManager {
    constructor() {
        this.tokenKey = 'streamcam_access_token';
        this.refreshKey = 'streamcam_refresh_token';
        this.userKey = 'streamcam_user';
        this.refreshTimeout = null;
    }

    saveTokens(accessToken, refreshToken, user) {
        localStorage.setItem(this.tokenKey, accessToken);
        localStorage.setItem(this.refreshKey, refreshToken);
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.scheduleTokenRefresh();
    }

    getAccessToken() {
        return localStorage.getItem(this.tokenKey);
    }

    getRefreshToken() {
        return localStorage.getItem(this.refreshKey);
    }

    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    clearTokens() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshKey);
        localStorage.removeItem(this.userKey);
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
    }

    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            const now = Date.now() / 1000;
            return payload.exp > now;
        } catch {
            return false;
        }
    }

    decodeToken(token) {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token');
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    }

    getAuthHeaders() {
        const token = this.getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    getStreamUrl(baseUrl = '/stream') {
        const token = this.getAccessToken();
        return token ? `${baseUrl}?token=${token}` : baseUrl;
    }

    async login(email, password) {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al iniciar sesion');
        }

        this.saveTokens(data.accessToken, data.refreshToken, data.user);
        return data;
    }

    async register(email, password, username) {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al registrar usuario');
        }

        this.saveTokens(data.accessToken, data.refreshToken, data.user);
        return data;
    }

    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token');
        }

        const response = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (!response.ok) {
            this.clearTokens();
            throw new Error(data.message || 'Error al renovar token');
        }

        const user = this.getUser();
        this.saveTokens(data.accessToken, data.refreshToken, user);
        return data;
    }

    async logout() {
        const token = this.getAccessToken();
        if (token) {
            try {
                await fetch('/auth/logout', {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            } catch (e) {
                console.error('Logout error:', e);
            }
        }
        this.clearTokens();
    }

    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        const token = this.getAccessToken();
        if (!token) return;

        try {
            const payload = this.decodeToken(token);
            const now = Date.now() / 1000;
            const expiresIn = payload.exp - now;
            const refreshIn = Math.max((expiresIn - 60) * 1000, 10000);

            this.refreshTimeout = setTimeout(async () => {
                try {
                    await this.refreshToken();
                    console.log('[AUTH] Token refreshed');
                } catch (e) {
                    console.error('[AUTH] Token refresh failed:', e);
                    window.location.href = '/login.html';
                }
            }, refreshIn);
        } catch (e) {
            console.error('[AUTH] Error scheduling refresh:', e);
        }
    }

    async checkAuth() {
        if (!this.getAccessToken()) {
            return false;
        }

        if (this.isAuthenticated()) {
            this.scheduleTokenRefresh();
            return true;
        }

        try {
            await this.refreshToken();
            return true;
        } catch {
            return false;
        }
    }
}

export default AuthManager;
