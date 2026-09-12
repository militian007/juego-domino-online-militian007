import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as Tienda from '../models/Tienda.js';

const router = express.Router();

/** El catalogo, con lo que ya tenes y cuanto te queda (§141). */
router.get('/', authMiddleware, async (req, res) => {
  try {
    res.json(await Tienda.vitrina(req.userId));
  } catch (err) {
    console.error('Error leyendo la tienda:', err.message);
    res.status(500).json({ error: 'No se pudo cargar la tienda' });
  }
});

/**
 * Comprar un articulo.
 *
 * El navegador manda QUE quiere, nunca cuanto cuesta: el precio lo pone el
 * servidor (CLAUDE.md regla 8).
 */
router.post('/comprar', authMiddleware, async (req, res) => {
  try {
    const r = await Tienda.comprar(req.userId, String(req.body?.clave ?? ''));
    if (!r.ok) return res.status(400).json(r);
    res.json(r);
  } catch (err) {
    console.error('Error comprando:', err.message);
    res.status(500).json({ ok: false, error: 'No se pudo completar la compra' });
  }
});

export default router;
