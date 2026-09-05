import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { vitrina, misTorneos } from '../controllers/torneosController.js';

const router = express.Router();

router.get('/', vitrina);
router.get('/mios', authMiddleware, misTorneos);

export default router;
