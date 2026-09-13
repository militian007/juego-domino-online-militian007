import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Diagnostico del cliente (seccion 171): el vigilante del dibujo del
 * navegador manda aqui las fichas que se ven montadas en pantalla, con la
 * mesa y las medidas de cada nodo. Se guarda en `backend/montadas-cliente.log`
 * (fuera de git) para reproducir el caso exacto. No toca el juego.
 */
const router = express.Router();
const ARCHIVO = path.resolve(process.cwd(), 'montadas-cliente.log');

router.post('/montada', (req, res) => {
  try {
    const linea = JSON.stringify({ cuando: new Date().toISOString(), ...req.body });
    fs.appendFileSync(ARCHIVO, linea + '\n');
    console.warn('[dibujo] montada anotada en montadas-cliente.log');
  } catch {
    // el diagnostico nunca tumba nada
  }
  res.json({ ok: true });
});

export default router;
