import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { clasificacion, miPuesto } from '../controllers/rankingController.js';

const router = express.Router();

router.get('/', clasificacion);
router.get('/mio', authMiddleware, miPuesto);

export default router;
