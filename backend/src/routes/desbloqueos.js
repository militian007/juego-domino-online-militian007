import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as Desbloqueo from '../models/Desbloqueo.js';

const router = express.Router();

/**
 * Lo que tiene desbloqueado quien tiene la sesion abierta.
 *
 * Pide sesion porque un invitado no tiene nada: no hay donde guardarle lo que
 * gane.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    res.json({ claves: await Desbloqueo.de(req.userId) });
  } catch (err) {
    console.error('Error leyendo los desbloqueos:', err.message);
    res.status(500).json({ error: 'No se pudo cargar' });
  }
});

export default router;
