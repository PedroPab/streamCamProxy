import express from 'express';
import {
    login,
    register,
    refreshToken,
    logout,
    getCurrentUser,
    changePassword
} from '../../auth/auth.controller.js';
import { authenticate, authenticateLocal } from '../../auth/middleware/authenticate.js';

const router = express.Router();

router.post('/login', authenticateLocal, login);

router.post('/register', register);

router.post('/refresh', refreshToken);

router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getCurrentUser);

router.put('/password', authenticate, changePassword);

export default router;
