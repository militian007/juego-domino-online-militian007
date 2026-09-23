import { Router } from 'express';
import * as pam from '../services/pam.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * LA PUERTA DEL CLUB (seccion 203).
 *
 *   GET  /api/pam          -> con que cuentas corre el domino y donde esta el club
 *   POST /api/pam/entrar   -> canjea la ficha del lanzador por la llave del domino
 *   GET  /api/pam/saldo    -> el saldo de verdad (solo para enseñarlo)
 */
const router = Router();

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ modo: pam.modo(), club: pam.urlDelClub(), operador: process.env.VENTANILLA_OPERADOR ?? null });
});

const DE_LA_PUERTA = { SIN_PAM: 503, FICHA_MALA: 401, BLOQUEADO: 403, PAM_CAIDA: 503 };

router.post('/entrar', async (req, res) => {
  const ficha = String(req.body?.launchToken ?? req.body?.ficha ?? '');
  if (ficha.length < 8) return res.status(400).json({ error: 'DATO_MALO' });
  const r = await pam.entrar(ficha);
  if (r.error) return res.status(DE_LA_PUERTA[r.error] ?? 503).json({ error: r.error });
  res.set('Cache-Control', 'no-store');
  res.json(r);
});

router.get('/saldo', authMiddleware, async (req, res) => {
  const r = await pam.saldo(req.user.id);
  if (r.error) return res.status(r.error === 'SESION_VENCIDA' ? 401 : 503).json({ error: r.error });
  res.set('Cache-Control', 'no-store');
  res.json(r);
});

export default router;
