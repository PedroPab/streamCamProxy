import express from 'express';
import { GroupModel } from '../../models/group.model.js';
import { PermissionModel } from '../../models/permission.model.js';
import { UserModel } from '../../user/user.model.js';

const router = express.Router();

// GET /admin/groups - Listar todos los grupos
router.get('/', (req, res) => {
    try {
        const groups = GroupModel.findAll();
        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Error listando grupos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar grupos'
        });
    }
});

// POST /admin/groups - Crear grupo
router.post('/', (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Nombre es requerido'
            });
        }

        // Verificar nombre único
        const existing = GroupModel.findByName(name);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe un grupo con ese nombre'
            });
        }

        const group = GroupModel.create({
            name,
            description,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: group
        });
    } catch (error) {
        console.error('Error creando grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear grupo'
        });
    }
});

// GET /admin/groups/:id - Obtener grupo con usuarios
router.get('/:id', (req, res) => {
    try {
        const group = GroupModel.findById(req.params.id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        const users = GroupModel.getUsers(req.params.id);
        const permissions = PermissionModel.getByGroup(req.params.id);

        res.json({
            success: true,
            data: {
                ...group,
                users,
                permissions
            }
        });
    } catch (error) {
        console.error('Error obteniendo grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener grupo'
        });
    }
});

// PUT /admin/groups/:id - Actualizar grupo
router.put('/:id', (req, res) => {
    try {
        const group = GroupModel.findById(req.params.id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        const { name, description } = req.body;

        // Verificar nombre único si cambió
        if (name && name !== group.name) {
            const existing = GroupModel.findByName(name);
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Ya existe un grupo con ese nombre'
                });
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        const updated = GroupModel.update(req.params.id, updates);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('Error actualizando grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar grupo'
        });
    }
});

// DELETE /admin/groups/:id - Eliminar grupo
router.delete('/:id', (req, res) => {
    try {
        const group = GroupModel.findById(req.params.id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        // No permitir eliminar grupo "default"
        if (group.name === 'default') {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar el grupo default'
            });
        }

        GroupModel.delete(req.params.id);

        res.json({
            success: true,
            message: 'Grupo eliminado'
        });
    } catch (error) {
        console.error('Error eliminando grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar grupo'
        });
    }
});

// POST /admin/groups/:id/users - Agregar usuario a grupo
router.post('/:id/users', (req, res) => {
    try {
        const group = GroupModel.findById(req.params.id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }

        const user = UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        GroupModel.addUser(req.params.id, userId, req.user.id);

        res.json({
            success: true,
            message: `Usuario ${user.username} agregado al grupo ${group.name}`
        });
    } catch (error) {
        console.error('Error agregando usuario a grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al agregar usuario al grupo'
        });
    }
});

// GET /admin/users/:userId/groups - Obtener grupos de un usuario
router.get('/user/:userId/groups', (req, res) => {
    try {
        const user = UserModel.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const groups = GroupModel.getUserGroups(req.params.userId);

        res.json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Error obteniendo grupos del usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener grupos del usuario'
        });
    }
});

// DELETE /admin/groups/:id/users/:userId - Quitar usuario de grupo
router.delete('/:id/users/:userId', (req, res) => {
    try {
        const group = GroupModel.findById(req.params.id);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        GroupModel.removeUser(req.params.id, req.params.userId);

        res.json({
            success: true,
            message: 'Usuario removido del grupo'
        });
    } catch (error) {
        console.error('Error removiendo usuario de grupo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al remover usuario del grupo'
        });
    }
});

export default router;
