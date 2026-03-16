import { UserModel } from './user.model.js';

export function listUsers(req, res) {
    try {
        const users = UserModel.findAll();
        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuarios'
        });
    }
}

export function getUser(req, res) {
    try {
        const { id } = req.params;
        const user = UserModel.findById(parseInt(id));

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuario'
        });
    }
}

export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = UserModel.findById(parseInt(id));

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const updatedUser = await UserModel.update(parseInt(id), updates);

        res.json({
            success: true,
            message: 'Usuario actualizado',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar usuario'
        });
    }
}

export function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        if (req.user.id === userId) {
            return res.status(400).json({
                success: false,
                error: 'No puedes eliminar tu propia cuenta'
            });
        }

        const user = UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        UserModel.delete(userId);

        res.json({
            success: true,
            message: 'Usuario eliminado',
            deleted: user
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar usuario'
        });
    }
}

export async function createUser(req, res) {
    try {
        const { email, password, username, role = 'user' } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({
                success: false,
                error: 'Email, password y username son requeridos'
            });
        }

        const existingUser = UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe un usuario con ese email'
            });
        }

        const newUser = await UserModel.create({
            email,
            password,
            username,
            role
        });

        res.status(201).json({
            success: true,
            message: 'Usuario creado',
            user: newUser
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear usuario'
        });
    }
}

export default {
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    createUser
};
