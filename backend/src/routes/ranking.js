import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tablaDePosiciones, miRango } from '../controllers/rankingController.js';

const router = express.Router();

router.get('/', tablaDePosiciones);
router.get('/mio', authMiddleware, miRango);

export default router;
