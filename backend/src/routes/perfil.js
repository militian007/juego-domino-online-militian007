import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { miPerfil } from '../controllers/perfilController.js';
import * as Foto from '../models/FotoDePerfil.js';

const router = express.Router();

router.get('/', authMiddleware, miPerfil);

/**
 * Poner o cambiar la foto del perfil (§147).
 *
 * El id sale del token, NO del cuerpo: si viniera por parametro, cualquiera le
 * cambiaria la foto a otro.
 */
router.put('/foto', authMiddleware, async (req, res) => {
  try {
    const r = await Foto.poner(req.userId, req.body?.foto);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ foto: r.foto });
  } catch (err) {
    console.error('Error guardando la foto del perfil:', err.message);
    res.status(500).json({ error: 'No se pudo guardar la foto' });
  }
});

/**
 * Las fotos de varias cuentas a la vez, por id.
 *
 * La pide la mesa para poner la cara de cada uno. Va por una ruta aparte y NO
 * dentro del estado de la partida a proposito: el estado se manda entero en
 * cada jugada, y una foto son unos veinte kilos. Cuatro jugadores serian
 * ochenta kilos por cada ficha que alguien pone. Aqui se piden una vez y el
 * navegador las guarda.
 *
 * Solo devuelve la foto, que es justo lo que ya se ve en la mesa: ni el nombre,
 * ni el correo, ni nada que no estuviera a la vista.
 */
router.get('/fotos', authMiddleware, async (req, res) => {
  try {
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter(Number.isInteger)
      // Un tope por si alguien pide diez mil de una: son cuatro en una mesa.
      .slice(0, 12);

    res.json(await Foto.deVarios(ids));
  } catch (err) {
    console.error('Error leyendo fotos de perfil:', err.message);
    res.status(500).json({ error: 'No se pudieron cargar las fotos' });
  }
});

/** Quitarla y volver al retrato dibujado. */
router.delete('/foto', authMiddleware, async (req, res) => {
  try {
    await Foto.quitar(req.userId);
    res.json({ foto: null });
  } catch (err) {
    console.error('Error quitando la foto del perfil:', err.message);
    res.status(500).json({ error: 'No se pudo quitar la foto' });
  }
});

export default router;
