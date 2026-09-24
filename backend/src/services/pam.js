import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { crearVentanilla, VentanillaError } from './ventanilla.js';

/**
 * LA PAM: LAS CUENTAS (seccion 203, Piso 1 de la plantilla).
 *
 * Raul, 23-sep: «podemos ir conectandonos a la PAM, solo que nadie va a tener
 * el link, pero asi dejamos funcionando los usuarios y hacemos las pruebas».
 * Eso es esto y nada mas: EL JUGADOR ENTRA CON SU CUENTA DE PRIVOYTRUCO.COM.
 *
 * Como funciona, igual que en el ludo:
 *   1. El club lo manda al domino con una FICHA de un solo uso en la URL
 *      (`?ficha=...`, el `launchToken` del contrato).
 *   2. El domino la canjea con `authenticate` firmando como operador.
 *   3. Se guarda el ESPEJO: una fila en `users` con el uuid de la PAM. El
 *      domino conoce al jugador por ese uuid, NUNCA por su clave del club.
 *   4. Se le da la llave de siempre del domino (el JWT), asi que todo lo que
 *      ya andaba «con cuenta» empieza a andar sin tocar nada mas.
 *
 * ⚠️ NADA DE PLATA EN ESTA TANDA. El `playerToken` se guarda en memoria para
 * poder preguntar el saldo, y hasta ahi: bet/win/rollback son del Piso 3 y
 * esperan a que el ludo cierre su R5.
 *
 * REGLA DE ORO: registro, login, clave, saldo, KYC y depositos los da la PAM.
 * Si esta tanda se descubre escribiendo alguno de esos, para.
 */

export const GAME_ID = 'domino';

export const ventanillaConfigurada = () =>
  Boolean(process.env.VENTANILLA_URL && process.env.VENTANILLA_OPERADOR && process.env.VENTANILLA_SECRETO);

/** `pam` = las cuentas vienen del club. `propio` = como hasta hoy (identidad ligera). */
export function modo() {
  const crudo = String(process.env.DOMINO_CUENTAS ?? '').toLowerCase();
  if (crudo === 'pam' || crudo === 'propio') return crudo;
  return ventanillaConfigurada() ? 'pam' : 'propio';
}

/** La raiz del club, para los enlaces «entra con tu cuenta». */
export const urlDelClub = () => (process.env.PAM_URL ?? 'https://privoytruco.com').replace(/\/+$/, '');

let clienteDePrueba = null;
export function __ponerClienteParaPruebas(c) {
  clienteDePrueba = c;
}

export function cliente() {
  if (clienteDePrueba) return clienteDePrueba;
  if (!ventanillaConfigurada()) return null;
  return crearVentanilla({
    baseUrl: process.env.VENTANILLA_URL.replace(/\/+$/, ''),
    operatorId: process.env.VENTANILLA_OPERADOR,
    secretoHmac: process.env.VENTANILLA_SECRETO
  });
}

/**
 * El pase del jugador en la PAM, en memoria (como el ludo). No se guarda en la
 * base a proposito: es una sesion, se cae con el servidor y se renueva con la
 * proxima ficha.
 */
const pases = new Map();
export const paseDe = (userId) => pases.get(String(userId)) ?? null;
export const __limpiarPasesParaPruebas = () => pases.clear();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const llaveDelDomino = (user) => jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

/** Un nombre de mesa a partir del del club: letras, numeros y espacios, 2 a 14. */
const nombreDeMesa = (crudo) => String(crudo || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 14);

/**
 * El espejo: la fila de `users` que representa a esa cuenta del club.
 * Si el nombre ya esta tomado por otro, se le pega un numerito: dos cuentas
 * distintas del club no pueden pisarse el nombre en la mesa.
 */
async function espejo({ playerId, displayName }) {
  const { rows } = await query('SELECT * FROM users WHERE pam_uuid = ?', [playerId]);
  const ya = rows[0];
  const base = nombreDeMesa(displayName) || 'Jugador';

  if (ya) {
    if (base && base !== ya.username) {
      // Se cambio el nombre en el club: se sigue. Si choca, se deja el viejo.
      const { rows: chocan } = await query('SELECT id FROM users WHERE username = ? AND (pam_uuid IS NULL OR pam_uuid <> ?)', [base, playerId]);
      if (chocan.length === 0) {
        await query('UPDATE users SET username = ? WHERE id = ?', [base, ya.id]);
        return { ...ya, username: base };
      }
    }
    return ya;
  }

  let nombre = base;
  for (let i = 2; i <= 99; i += 1) {
    const { rows: tomado } = await query('SELECT id FROM users WHERE username = ?', [nombre]);
    if (tomado.length === 0) break;
    nombre = `${base.slice(0, 11)} ${i}`;
  }
  // La clave no existe: a esta cuenta se entra por el club, no por aqui.
  const sinClave = crypto.randomBytes(24).toString('hex');
  const { rows: creado } = await query(
    'INSERT INTO users (username, email, password_hash, pam_uuid) VALUES (?, ?, ?, ?) RETURNING id, username, email',
    [nombre, `${playerId}@pam.local`, `pam:${sinClave}`, playerId]
  );
  return creado[0];
}

/**
 * Canjea la ficha del lanzador y devuelve la llave del domino.
 * Errores: SIN_PAM · FICHA_MALA · BLOQUEADO · PAM_CAIDA.
 */
export async function entrar(launchToken) {
  const c = cliente();
  if (!c) return { error: 'SIN_PAM' };
  let auth;
  try {
    auth = await c.authenticate(launchToken);
  } catch (err) {
    if (err instanceof VentanillaError && err.code === 'INVALID_TOKEN') return { error: 'FICHA_MALA' };
    if (err instanceof VentanillaError && err.code === 'PLAYER_BLOCKED') return { error: 'BLOQUEADO' };
    console.error('[pam] entrar falló:', err.message);
    return { error: 'PAM_CAIDA' };
  }
  const user = await espejo(auth);
  pases.set(String(user.id), { token: auth.playerToken, playerId: auth.playerId, moneda: auth.currency });
  return {
    token: llaveDelDomino(user),
    user: { id: user.id, username: user.username, email: user.email },
    saldo: auth.balance.toString(),
    moneda: auth.currency
  };
}

/** El saldo de verdad, por la ventanilla. Solo para enseñarlo: aqui no se cobra. */
export async function saldo(userId) {
  const c = cliente();
  const pase = paseDe(userId);
  if (!c || !pase) return { error: 'SESION_VENCIDA' };
  try {
    const b = await c.balance(pase.token);
    return { saldo: b.balance.toString(), moneda: b.currency };
  } catch (err) {
    if (err instanceof VentanillaError && (err.code === 'INVALID_TOKEN' || err.code === 'UNKNOWN_PLAYER')) {
      return { error: 'SESION_VENCIDA' };
    }
    return { error: 'PAM_CAIDA' };
  }
}
