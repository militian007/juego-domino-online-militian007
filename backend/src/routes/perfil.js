import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { miPerfil } from '../controllers/perfilController.js';

const router = express.Router();

router.get('/', authMiddleware, miPerfil);

export default router;
