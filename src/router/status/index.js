import express from 'express';
import { findStatus } from '../../controller/status.js';

const router = express.Router();

router.get('/', async (req, res) => {
    res.json(await findStatus());
});

export default router;