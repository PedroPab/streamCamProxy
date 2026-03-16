import express from 'express';
import {
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    createUser
} from '../../user/user.controller.js';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { authorize } from '../../auth/middleware/authorize.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listUsers);

router.post('/', createUser);

router.get('/:id', getUser);

router.put('/:id', updateUser);

router.delete('/:id', deleteUser);

export default router;
