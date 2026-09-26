import { Router } from 'express';
import * as Torneo from '../models/Torneo.js';
import * as torneos from '../services/torneos.js';
import { serializar } from '../services/torneos/vitrina.js';

/**
 * LOS TORNEOS DEL SOCIO (seccion 211), detras de la llave de siempre
 * (`DOMINO_BUZON_LLAVE`, por ?llave=, por el cuerpo o por X-Llave).
 *
 *   GET  /api/socio/torneos                                todos, con su conteo
 *   POST /api/socio/torneos                                crear un torneo «como tal»
 *   POST /api/socio/torneos/:id/cancel                     cancelar
 *   POST /api/socio/torneos/:id/fill-bots                  rellenar con la casa
 *   POST /api/socio/torneos/:id/postpone                   correr la hora
 *   POST /api/socio/torneos/:id/matches/:matchId/walkover  pase a mano
 *   POST /api/socio/torneos/:id/matches/:matchId/relaunch  mesa nueva
 *   GET  /api/socio/torneos/relampago                      la grilla
 *   PUT  /api/socio/torneos/relampago                      prenderla / moverla
 */
const router = Router();

const LLAVE = process.env.DOMINO_BUZON_LLAVE || '';
const esSocio = (req) => Boolean(LLAVE) && String(req.query.llave || req.body?.llave || req.get('x-llave') || '') === LLAVE;
router.use((req, res, next) => (esSocio(req) ? next() : res.status(403).json({ error: 'Solo un socio' })));

const responder = (res, r) => (r?.error ? res.status(r.status || 400).json({ error: r.error }) : res.json(r));
const envolver = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('Socio/torneos:', err.message);
    res.status(500).json({ error: err.message || 'No se pudo' });
  }
};

router.get('/relampago', envolver(async (_req, res) => {
  res.json({ relampago: await torneos.configRelampago() });
}));

router.put('/relampago', envolver(async (req, res) => {
  const { llave, ...cambios } = req.body ?? {};
  res.json({ ok: true, relampago: await torneos.guardarRelampago(cambios) });
}));

router.get('/', envolver(async (req, res) => {
  const lista = await Torneo.ultimos(req.query.cuantos);
  const conteos = await Torneo.conteos(lista.map((t) => t.id));
  res.json({ torneos: lista.map((t) => serializar(t, conteos.get(t.id))) });
}));

router.post('/', envolver(async (req, res) => {
  const { llave, ...datos } = req.body ?? {};
  const r = await torneos.crearTorneo(datos);
  if (r.error) return responder(res, r);
  res.status(201).json({ ok: true, torneo: serializar(r.torneo) });
}));

router.post('/:id/cancel', envolver(async (req, res) => {
  const r = await torneos.cancelarTorneo(req.params.id);
  if (r.error) return responder(res, r);
  res.json({ ok: true, torneo: serializar(r.torneo) });
}));

router.post('/:id/fill-bots', envolver(async (req, res) => {
  responder(res, await torneos.rellenarConBots(req.params.id, req.body?.cuantos ?? req.body?.count));
}));

router.post('/:id/postpone', envolver(async (req, res) => {
  responder(res, await torneos.posponer(req.params.id, req.body?.minutos ?? req.body?.minutes));
}));

router.post('/:id/matches/:matchId/walkover', envolver(async (req, res) => {
  responder(res, await torneos.walkoverDelSocio(req.params.id, req.params.matchId, req.body?.ganadorId ?? req.body?.winnerUserId));
}));

router.post('/:id/matches/:matchId/relaunch', envolver(async (req, res) => {
  responder(res, await torneos.relanzarCruce(req.params.id, req.params.matchId));
}));

export default router;
