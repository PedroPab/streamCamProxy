import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { authorize } from '../../auth/middleware/authorize.js';

import streamsRouter from './streams.js';
import groupsRouter from './groups.js';
import permissionsRouter from './permissions.js';

const router = express.Router();

// Todas las rutas de admin requieren autenticación y rol admin
router.use(authenticate);
router.use(authorize('admin'));

// Sub-routers
router.use('/streams', streamsRouter);
router.use('/groups', groupsRouter);
router.use('/permissions', permissionsRouter);

export default router;
