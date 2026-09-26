import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import * as anuncios from '../services/anuncios.js';

/**
 * LOS ANUNCIOS DE LA CASA (seccion 214) — las rutas, como las del truco.
 *
 * El jugador:
 *   GET  /api/anuncios/vigente   lo que le toca AHORA, o null. Con cuenta, las
 *                                marcas salen de la base; el invitado manda las
 *                                suyas (?visto=&recordado=) desde su telefono.
 *   POST /api/anuncios/visto     { id, tipo } al CERRARLO (solo con cuenta).
 *
 * El socio (llave DOMINO_BUZON_LLAVE, por ?llave=, el cuerpo o X-Llave):
 *   GET    /api/socio/anuncios            el guardado y si esta vigente
 *   GET    /api/socio/anuncios/historial  los ultimos 30 con su estado
 *   POST   /api/socio/anuncios            publicar (reemplaza al anterior)
 *   DELETE /api/socio/anuncios            bajarlo
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/** El id de la cuenta si el token sirve; si no hay o no sirve, es un invitado. */
function cuentaDe(req) {
  const token = String(req.headers.authorization || '').split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET).id ?? null;
  } catch {
    return null;
  }
}

const marcaValida = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null);

export const jugador = Router();

jugador.get('/vigente', async (req, res) => {
  try {
    const a = await anuncios.anuncioGuardado();
    if (!a) return res.json({ anuncio: null });
    const userId = cuentaDe(req);
    const marcas = userId
      ? await anuncios.marcasDe(userId)
      : { visto: marcaValida(req.query.visto), recordado: marcaValida(req.query.recordado) };
    res.json({ anuncio: anuncios.loQueLeToca(a, { invitado: !userId, ...marcas }) });
  } catch (err) {
    console.error('Anuncios: no se pudo leer el vigente:', err.message);
    // Un anuncio que falla no puede trancar la entrada.
    res.json({ anuncio: null });
  }
});

jugador.post('/visto', authMiddleware, async (req, res) => {
  const id = marcaValida(req.body?.id);
  const tipo = req.body?.tipo === 'recordatorio' ? 'recordatorio' : 'vista';
  if (!id) return res.status(400).json({ error: 'datos inválidos' });
  try {
    await anuncios.marcarVisto(req.userId, id, tipo);
    res.json({ ok: true });
  } catch (err) {
    console.error('Anuncios: no se pudo marcar visto:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

const LLAVE = process.env.DOMINO_BUZON_LLAVE || '';
const esSocio = (req) => Boolean(LLAVE) && String(req.query.llave || req.body?.llave || req.get('x-llave') || '') === LLAVE;

export const socio = Router();
socio.use((req, res, next) => (esSocio(req) ? next() : res.status(403).json({ error: 'Solo un socio' })));

socio.get('/', async (_req, res) => {
  const a = await anuncios.anuncioGuardado();
  res.json({ anuncio: a, vigente: a ? anuncios.estaVigente(a) : false });
});

socio.get('/historial', async (_req, res) => {
  res.json({ anuncios: await anuncios.historialDeAnuncios() });
});

socio.post('/', async (req, res) => {
  const v = anuncios.validar(req.body ?? {});
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const anuncio = await anuncios.publicarAnuncio(v.datos, 'socio');
    console.log(`Anuncios: publicado ${anuncio.id} (${anuncio.forma}, ${anuncio.publico}, ${anuncio.veces})`);
    res.status(201).json({ anuncio });
  } catch (err) {
    console.error('Anuncios: no se pudo publicar:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

socio.delete('/', async (_req, res) => {
  try {
    const previo = await anuncios.bajarAnuncio('socio');
    console.log(`Anuncios: bajado ${previo?.id ?? '(no habia)'}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Anuncios: no se pudo bajar:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});
