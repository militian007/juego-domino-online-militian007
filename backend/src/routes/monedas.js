import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as Moneda from '../models/Moneda.js';

const router = express.Router();

/**
 * El saldo y los ultimos movimientos de quien tiene la sesion abierta (§133).
 *
 * Van juntos a proposito: un saldo suelto no se puede explicar, y cuando
 * alguien pregunte "¿y mis monedas?" la respuesta tiene que estar en la misma
 * pantalla y no a dos toques de distancia.
 *
 * Pide sesion porque un invitado no tiene donde guardar nada.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [saldo, movimientos] = await Promise.all([
      Moneda.de(req.userId),
      Moneda.movimientos(req.userId, 20)
    ]);
    res.json({ ...saldo, movimientos, tarifas: Moneda.TARIFAS });
  } catch (err) {
    console.error('Error leyendo las monedas:', err.message);
    res.status(500).json({ error: 'No se pudo cargar' });
  }
});

export default router;
