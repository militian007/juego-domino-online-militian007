import { query } from '../config/database.js';

/**
 * LAS PERILLAS DE LA CASA (seccion 201, ficha 8.1 de la plantilla).
 *
 * Regla de Raul: toda perilla con su boton Guardar. Aqui vive el catalogo: cada
 * numero que se quiera mover sin programar, con su nombre en criollo, su ayuda,
 * sus topes y lo que trae de fabrica.
 *
 * El patron es el del truco: llave en la tabla `config` + lectura cacheada 30 s
 * (para no pegarle a la base en cada turno) + siembra + `PUT /api/config`. Lo
 * que se lee es SIEMPRE el ultimo valor conocido: si la base se cae, la mesa
 * sigue con el que tenia.
 */
export const PERILLAS = [
  {
    clave: 'reloj.turnoMs',
    grupo: 'El reloj de la mesa',
    nombre: 'Tiempo por turno',
    ayuda: 'Cuánto tiene cada quien para jugar su ficha. Solo corre en mesas entre personas.',
    tipo: 'segundos',
    min: 5000,
    max: 120000,
    porDefecto: 25000
  },
  {
    clave: 'reloj.cortoMs',
    grupo: 'El reloj de la mesa',
    nombre: 'Reloj corto',
    ayuda: 'El tiempo que le queda al que ya dejó correr el reloj una vez.',
    tipo: 'segundos',
    min: 3000,
    max: 60000,
    porDefecto: 15000
  },
  {
    clave: 'reloj.graciaMs',
    grupo: 'El reloj de la mesa',
    nombre: 'Gracia sin conexión',
    ayuda: 'Cuánto espera la mesa al que se le cayó el internet antes de darlo por ido.',
    tipo: 'segundos',
    min: 5000,
    max: 300000,
    porDefecto: 70000
  },
  {
    clave: 'reloj.strikes',
    grupo: 'El reloj de la mesa',
    nombre: 'Vencimientos que cuestan la partida',
    ayuda: 'En cero, la mesa juega por el ausente y la partida sigue. Con plata se pone en 3.',
    tipo: 'numero',
    min: 0,
    max: 10,
    porDefecto: 0
  },
  {
    clave: 'chat.vidaMinutos',
    grupo: 'El salón',
    nombre: 'Vida de los mensajes',
    ayuda: 'Cuánto dura un mensaje del salón antes de borrarse solo.',
    tipo: 'minutos',
    min: 1,
    max: 1440,
    porDefecto: 120
  },
  {
    clave: 'chatMesa.activo',
    grupo: 'El chat de la mesa',
    nombre: 'Chat en la mesa',
    ayuda: 'Apagado, nadie habla durante la partida.',
    tipo: 'si-no',
    porDefecto: true
  },
  {
    clave: 'chatMesa.paraTodos',
    grupo: 'El chat de la mesa',
    nombre: 'Abrirlo a todos',
    ayuda: 'Con la llave puesta escribe cualquiera sentado en la mesa. Sin ella, solo los que tienen cuenta.',
    tipo: 'si-no',
    porDefecto: true
  },
  {
    clave: 'chatMesa.burbujaMs',
    grupo: 'El chat de la mesa',
    nombre: 'Cuánto dura la burbuja',
    ayuda: 'Lo que se queda en pantalla lo que alguien acaba de decir.',
    tipo: 'segundos',
    min: 2000,
    max: 20000,
    porDefecto: 6000
  },
  {
    clave: 'guardianes.activo',
    grupo: 'Los guardianes',
    nombre: 'Guardianes de la tanda',
    ayuda: 'El termómetro que avisa cuando el chat se desordena o la gente se queja.',
    tipo: 'si-no',
    porDefecto: true
  },
  {
    clave: 'casa.torpeza',
    grupo: 'La casa',
    nombre: 'Torpeza de la casa',
    ayuda: 'De cada 100 fichas, cuántas juega mal a propósito. Medido: 65 deja a la persona ganando 7 de cada 10.',
    tipo: 'numero',
    min: 0,
    max: 100,
    porDefecto: 65
  }
];

const PORCLAVE = new Map(PERILLAS.map((p) => [p.clave, p]));

const CACHE_MS = 30_000;
const snapshot = new Map(PERILLAS.map((p) => [p.clave, p.porDefecto]));
let ultimaLectura = 0;
let leyendo = false;

const aValor = (perilla, crudo) => {
  if (crudo == null) return perilla.porDefecto;
  if (perilla.tipo === 'si-no') return crudo === '1' || crudo === 'true' || crudo === true;
  const n = Number(crudo);
  if (!Number.isFinite(n)) return perilla.porDefecto;
  return Math.min(perilla.max, Math.max(perilla.min, Math.round(n)));
};

export async function refrescar() {
  try {
    const { rows } = await query('SELECT clave, valor FROM config', []);
    for (const r of rows) {
      const perilla = PORCLAVE.get(r.clave);
      if (perilla) snapshot.set(r.clave, aValor(perilla, r.valor));
    }
  } catch (err) {
    // Sin tabla todavia, o base caida: se queda el ultimo valor conocido.
  }
  ultimaLectura = Date.now();
  return snapshot;
}

/** El valor vigente, sin esperar. Refresca sola en segundo plano cada 30 s. */
export function valor(clave) {
  if (Date.now() - ultimaLectura > CACHE_MS && !leyendo) {
    leyendo = true;
    refrescar().finally(() => { leyendo = false; });
  }
  return snapshot.has(clave) ? snapshot.get(clave) : PORCLAVE.get(clave)?.porDefecto;
}

/** Todas, para la pantalla del socio. */
export function todas() {
  return PERILLAS.map((p) => ({ ...p, valor: valor(p.clave) }));
}

/** Guarda una perilla. Devuelve el valor que quedo, ya recortado a sus topes. */
export async function guardar(clave, crudo) {
  const perilla = PORCLAVE.get(clave);
  if (!perilla) return { error: 'Esa perilla no existe' };
  const limpio = aValor(perilla, crudo);
  const texto = perilla.tipo === 'si-no' ? (limpio ? '1' : '0') : String(limpio);
  await query(
    'INSERT INTO config (clave, valor, actualizado_en) VALUES (?, ?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en',
    [clave, texto, new Date().toISOString()]
  );
  snapshot.set(clave, limpio);
  return { valor: limpio };
}

/** Siembra lo que falte (idempotente) y deja la cache lista. */
export async function sembrar() {
  for (const p of PERILLAS) {
    const texto = p.tipo === 'si-no' ? (p.porDefecto ? '1' : '0') : String(p.porDefecto);
    await query('INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO NOTHING', [p.clave, texto]).catch(() => {});
  }
  await refrescar();
}

export function __ponerParaPruebas(clave, v) {
  snapshot.set(clave, v);
  ultimaLectura = Date.now();
}
