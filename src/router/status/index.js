import express from 'express';
import { findStatus } from '../../controller/status.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.json(findStatus());
});

export default router;