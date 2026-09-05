import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as pase from '../services/pase.js';
import * as Desbloqueo from '../models/Desbloqueo.js';
import * as Preferencia from '../models/Preferencia.js';
import { TITULOS, esTitulo } from '../models/Titulo.js';

const router = express.Router();

/**
 * Todo lo del pase de quien tiene la sesion abierta: nivel, experiencia,
 * misiones del dia, la escalera de premios y sus panas.
 *
 * La escalera viaja desde aqui en vez de estar copiada en el frontend para que
 * haya UNA sola verdad. Si mañana un nivel cambia de premio, cambia en un solo
 * sitio y la pantalla se entera sola.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const estado = await pase.estadoPara(req.userId);
    res.json({
      ...estado,
      codigo: req.username,
      titulos: TITULOS,
      mios: await Desbloqueo.de(req.userId),
      tituloElegido: await Preferencia.leer(req.userId, Preferencia.TITULO)
    });
  } catch (err) {
    console.error('Error leyendo el pase:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el pase' });
  }
});

/**
 * Elige cual titulo mostrar. Mandar null lo quita.
 *
 * Se comprueba contra los desbloqueos: si alguien manda la peticion a mano
 * pidiendo un titulo que no gano, se le dice que no.
 */
router.post('/titulo', authMiddleware, async (req, res) => {
  try {
    const clave = req.body?.clave ?? null;

    if (clave === null) {
      await Preferencia.guardar(req.userId, Preferencia.TITULO, null);
      return res.json({ titulo: null });
    }

    if (!esTitulo(clave)) return res.status(400).json({ error: 'Ese título no existe' });
    if (!(await Desbloqueo.tiene(req.userId, clave))) {
      return res.status(403).json({ error: 'Todavía no ganaste ese título' });
    }

    await Preferencia.guardar(req.userId, Preferencia.TITULO, clave);
    res.json({ titulo: clave });
  } catch (err) {
    console.error('Error guardando el título:', err.message);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

export default router;
