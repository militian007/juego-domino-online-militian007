import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { reconstruirCadena, boardEnds } from '@privoytruco/domino-engine';
import { roomManager } from '../RoomManager.js';

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

/**
 * Provoca un destranque en una sala, para VERLO (seccion 179): vuelve a trazar
 * la cadena con la forma pedida y la manda a todos. Solo fuera de produccion.
 */
router.post('/destrancar', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  const { code, forma = 'recta' } = req.body || {};
  const room = roomManager.rooms.get(String(code || '').toUpperCase());
  if (!room?.game?.state) return res.status(404).json({ error: 'sala no encontrada' });
  const state = room.game.state;
  const board = reconstruirCadena(state.board.map((t) => t.tile), state.config.layout, forma);
  if (!board || board.length !== state.board.length) return res.status(409).json({ error: 'no se pudo trazar' });
  state.board = board;
  state.ends = boardEnds(board);
  roomManager.broadcastState(room);
  res.json({ ok: true, forma, fichas: board.length });
});

export default router;
