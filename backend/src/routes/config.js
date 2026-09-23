import { Router } from 'express';
import * as Config from '../models/Config.js';
import * as guardianes from '../services/guardianes.js';
import * as libreta from '../services/libreta.js';
import { setCasaTorpeza } from '@privoytruco/domino-engine';

/**
 * EL CUARTO DEL SOCIO (seccion 201). Todo detras de la misma llave del buzon
 * (`DOMINO_BUZON_LLAVE`): el domino todavia no tiene cuentas, asi que la llave
 * es la puerta.
 *
 *   GET  /api/config?llave=...            -> las perillas con su valor
 *   PUT  /api/config?llave=...            -> guardar una  { clave, valor }
 *   GET  /api/config/guardianes?llave=... -> las alarmas encendidas
 *   GET  /api/config/libretas?llave=...   -> las ultimas partidas
 *   GET  /api/config/libreta/:code?llave= -> una libreta + su reporte copiable
 */
const router = Router();

const LLAVE = process.env.DOMINO_BUZON_LLAVE || '';
const esSocio = (req) => Boolean(LLAVE) && String(req.query.llave || req.body?.llave || '') === LLAVE;
const puerta = (req, res, next) => (esSocio(req) ? next() : res.status(403).json({ error: 'Solo un socio' }));

router.get('/', puerta, (_req, res) => {
  res.json({ perillas: Config.todas() });
});

router.put('/', puerta, async (req, res) => {
  const { clave, valor } = req.body ?? {};
  try {
    const r = await Config.guardar(String(clave), valor);
    if (r.error) return res.status(400).json(r);
    // La torpeza de la casa vive en el motor: se le avisa al momento.
    if (clave === 'casa.torpeza') setCasaTorpeza(Number(r.valor) / 100);
    res.json({ ok: true, clave, valor: r.valor });
  } catch (err) {
    console.error('Config: no se pudo guardar:', err.message);
    res.status(503).json({ error: 'No se pudo guardar' });
  }
});

router.get('/guardianes', puerta, (_req, res) => {
  res.json({ alarmas: guardianes.listar(), palabras: guardianes.PALABRAS_DE_LA_TANDA });
});

router.get('/libretas', puerta, (_req, res) => {
  res.json({ partidas: libreta.listar() });
});

router.get('/libreta/:code', puerta, (req, res) => {
  const l = libreta.de(req.params.code);
  if (!l) return res.status(404).json({ error: 'Esa partida ya no está en la libreta' });
  res.json({ libreta: l, reporte: libreta.reporte(req.params.code) });
});

export default router;
