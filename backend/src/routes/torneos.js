import express from 'express';
import jwt from 'jsonwebtoken';
import * as torneos from '../services/torneos.js';
import * as vitrina from '../services/torneos/vitrina.js';

/**
 * LOS TORNEOS PARA EL JUGADOR (seccion 211). El contrato completo esta en
 * contexto/API-TORNEOS.md.
 *
 *   GET  /api/torneos                   la vitrina (+ la serie del Relampago)
 *   GET  /api/torneos/palmares          campeones de los ultimos dias
 *   GET  /api/torneos/mis-titulos       los que gane yo
 *   GET  /api/torneos/mios              en cuales estoy
 *   GET  /api/torneos/mesas-en-vivo     mesas de torneo para mirar
 *   GET  /api/torneos/:id               detalle + cuadro + lo mio
 *   GET  /api/torneos/:id/vivo          solo marcadores
 *   POST /api/torneos/:id/register      anotarme
 *   POST /api/torneos/:id/unregister    borrarme
 *   POST /api/torneos/:id/voy           «guardenme el puesto»
 *   POST /api/torneos/:id/no-voy        cedo el cruce
 *   POST /api/torneos/:id/entrar-tarde  la puerta abierta
 *
 * QUIEN SOY: la cuenta con su JWT (Authorization: Bearer), o el invitado con
 * su identidad ligera (X-Guest-Id + X-Guest-Name, los mismos del socket). Es
 * la misma confianza que el socket le da al invitado: su id es su llave.
 */
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ID_ESTABLE = /^guest-[a-z0-9]{6,40}$/i;
const RETRATOS = ['catire', 'chela', 'chuo', 'comadre', 'juana', 'musiu', 'nano', 'pancho', 'paula', 'tigre', 'yubi', 'zurda'];
const INVITADOS = process.env.DOMINO_INVITADOS_EN_LINEA !== '0';

export function quienSoy(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const d = jwt.verify(auth.slice(7), JWT_SECRET);
      return { id: Number(d.id), nombre: d.username, avatar: null, cuenta: true };
    } catch {
      return null;
    }
  }
  const id = String(req.get('x-guest-id') || req.body?.guestId || req.query.guestId || '');
  if (!INVITADOS || !ID_ESTABLE.test(id)) return null;
  const nombre = String(req.get('x-guest-name') || req.body?.guestName || req.query.guestName || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 14);
  const retrato = String(req.get('x-guest-retrato') || req.body?.guestRetrato || '');
  return { id, nombre: nombre.length >= 2 ? nombre : null, avatar: RETRATOS.includes(retrato) ? retrato : null, cuenta: false };
}

const conIdentidad = (req, res, next) => {
  const yo = quienSoy(req);
  if (!yo) return res.status(401).json({ error: 'Entra con tu cuenta o ponte un nombre en el umbral', code: 'sin_identidad' });
  req.yo = yo;
  next();
};

const responder = (res, r) => (r?.error ? res.status(r.status || 400).json({ error: r.error, code: r.code, pendienteId: r.pendienteId }) : res.json(r));
const entero = (v, def, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : def;
};
const idValido = (req, res, next) => (/^\d+$/.test(req.params.id) ? next() : res.status(404).json({ error: 'Torneo no encontrado' }));

router.get('/', async (req, res) => {
  try {
    res.json(await vitrina.vitrina(quienSoy(req)?.id ?? null));
  } catch (err) {
    console.error('Torneos: vitrina:', err.message);
    res.status(500).json({ error: 'No se pudieron cargar los torneos' });
  }
});

router.get('/palmares', async (req, res) => {
  try {
    res.json(await vitrina.palmares({ dias: entero(req.query.dias, 7, 1, 30), limite: entero(req.query.limite, 20, 1, 100), desde: entero(req.query.desde, 0, 0, 100000) }));
  } catch (err) {
    console.error('Torneos: palmarés:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el palmarés' });
  }
});

router.get('/mis-titulos', conIdentidad, async (req, res) => {
  try {
    res.json(await vitrina.misTitulos(req.yo.id, { limite: entero(req.query.limite, 24, 1, 60), desde: entero(req.query.desde, 0, 0, 100000) }));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron cargar tus títulos' });
  }
});

router.get('/mios', conIdentidad, async (req, res) => {
  try {
    res.json(await vitrina.misTorneos(req.yo.id));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo cargar' });
  }
});

router.get('/mesas-en-vivo', async (_req, res) => {
  try {
    res.json({ mesas: await vitrina.mesasEnVivo() });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron listar las mesas en vivo' });
  }
});

router.get('/:id', idValido, async (req, res) => {
  try {
    const d = await vitrina.detalle(req.params.id, quienSoy(req)?.id ?? null);
    if (!d) return res.status(404).json({ error: 'Torneo no encontrado' });
    res.json(d);
  } catch (err) {
    console.error('Torneos: detalle:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el torneo' });
  }
});

router.get('/:id/vivo', idValido, async (req, res) => {
  try {
    const v = await vitrina.vivo(req.params.id);
    if (!v) return res.status(404).json({ error: 'Torneo no encontrado' });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo cargar el estado en vivo' });
  }
});

router.post('/:id/register', idValido, conIdentidad, async (req, res) => {
  // Solo con cuenta (Raul, 26-sep): el invitado ve los torneos, pero para jugarlos
  // se crea la cuenta. En el club, la cuenta es la de privoytruco.com.
  if (!req.yo.cuenta) return res.status(403).json({ error: 'Los torneos se juegan con tu cuenta. Entra con tu cuenta para anotarte.', code: 'necesita_cuenta' });
  if (!req.yo.nombre) return res.status(400).json({ error: 'Ponte un nombre en el umbral para anotarte', code: 'sin_nombre' });
  try {
    const r = await torneos.inscribirse(req.params.id, req.yo);
    if (r.error) return responder(res, r);
    res.status(201).json(r);
  } catch (err) {
    console.error('Torneos: inscribir:', err.message);
    res.status(500).json({ error: 'No se pudo inscribir en el torneo' });
  }
});

router.post('/:id/unregister', idValido, conIdentidad, async (req, res) => {
  try {
    responder(res, await torneos.borrarse(req.params.id, req.yo.id));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo borrar del torneo' });
  }
});

router.post('/:id/voy', idValido, conIdentidad, async (req, res) => {
  try {
    responder(res, await torneos.decirQueVoy(req.params.id, req.yo.id));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar tu puesto' });
  }
});

router.post('/:id/no-voy', idValido, conIdentidad, async (req, res) => {
  try {
    responder(res, await torneos.decirQueNoVoy(req.params.id, req.yo.id));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo ceder el cruce' });
  }
});

router.post('/:id/entrar-tarde', idValido, conIdentidad, async (req, res) => {
  try {
    const r = await torneos.entrarPorLaPuerta(req.params.id, req.yo.id);
    if (!r.ok) return res.status(r.codigo === 'ya_estas' ? 200 : 409).json({ ok: false, error: r.motivo, codigo: r.codigo });
    res.json(r);
  } catch (err) {
    console.error('Torneos: entrar tarde:', err.message);
    res.status(500).json({ error: 'No se pudo entrar' });
  }
});

export default router;
