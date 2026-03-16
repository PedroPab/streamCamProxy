import { UserModel } from '../user/user.model.js';
import { generateTokenPair, verifyRefreshToken } from './jwt.js';

export async function login(req, res) {
    try {
        const user = req.user;

        const tokens = generateTokenPair(user);

        UserModel.saveRefreshToken(user.id, tokens.refreshToken);

        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            ...tokens
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor',
            details: error.message
        });
    }
}

export async function register(req, res) {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos',
                message: 'Email, password y username son obligatorios'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email invalido',
                message: 'El formato del email no es valido'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password muy corto',
                message: 'El password debe tener al menos 6 caracteres'
            });
        }

        const existingUser = UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email en uso',
                message: 'Ya existe una cuenta con este email'
            });
        }

        const newUser = await UserModel.create({
            email,
            password,
            username,
            role: 'user'
        });

        const tokens = generateTokenPair(newUser);

        UserModel.saveRefreshToken(newUser.id, tokens.refreshToken);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                role: newUser.role
            },
            ...tokens
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor',
            details: error.message
        });
    }
}

export async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token requerido'
            });
        }

        const payload = verifyRefreshToken(refreshToken);

        if (!payload) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token invalido o expirado'
            });
        }

        const isValid = UserModel.verifyRefreshToken(payload.sub, refreshToken);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token revocado'
            });
        }

        const user = UserModel.findById(payload.sub);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado o inactivo'
            });
        }

        const tokens = generateTokenPair(user);

        UserModel.saveRefreshToken(user.id, tokens.refreshToken);

        res.json({
            success: true,
            message: 'Tokens renovados',
            ...tokens
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
}

export function logout(req, res) {
    try {
        const user = req.user;

        UserModel.clearRefreshToken(user.id);

        res.json({
            success: true,
            message: 'Sesion cerrada exitosamente'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
}

export function getCurrentUser(req, res) {
    const user = req.user;

    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }
    });
}

export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords requeridos',
                message: 'Debes proporcionar la contrasena actual y la nueva'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password muy corto',
                message: 'La nueva contrasena debe tener al menos 6 caracteres'
            });
        }

        const fullUser = UserModel.findByEmail(user.email);

        const isValidPassword = await UserModel.verifyPassword(currentPassword, fullUser.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Contrasena incorrecta',
                message: 'La contrasena actual no es correcta'
            });
        }

        await UserModel.changePassword(user.id, newPassword);

        UserModel.clearRefreshToken(user.id);

        res.json({
            success: true,
            message: 'Contrasena actualizada. Por favor inicia sesion nuevamente.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
}

export default {
    login,
    register,
    refreshToken,
    logout,
    getCurrentUser,
    changePassword
};
