import { query } from '../../config/database.js';

/**
 * EL RELAMPAGO: el interruptor y el calendario (seccion 211). Copia de
 * `lib/relampago/config.ts` del truco, SIN LA PLATA: no hay modo, ni pozo por
 * cabeza, ni techo, ni reparto. Aqui el Relampago siempre es de gloria.
 *
 * La grilla NACE APAGADA y la prende el socio desde su cuarto (detras de la
 * llave). Con el interruptor apagado no se publica nada; lo ya publicado
 * sigue. Reemplaza al programador viejo que publicaba uno cada media hora las
 * 24 horas (services/torneos.js de antes): ese no se podia apagar.
 *
 * Vive como JSON en `copa_ajustes` (igual que el app_config del truco): se
 * prende y se apaga una noche cualquiera, desde el telefono, sin reiniciar.
 */

export const RELAMPAGO_KEY = 'relampago';
/** Marca de agua en el nombre: con el dia, es lo que hace idempotente a la grilla. */
export const RELAMPAGO_PREFIJO = 'El Relámpago';
/** La noche es la de Venezuela, no la del servidor. */
export const RELAMPAGO_TZ = 'America/Caracas';
/** A cuantos puntos se puede jugar un torneo (el dueno: 24, 50, 100, 150 o 200). */
export const PUNTOS_DE_TORNEO = [24, 50, 100, 150, 200];
/** Con que fuerza juegan los bots de relleno: cada uno la suya, o todos una. */
export const NIVELES_DE_BOT = ['persona', 'casa', 'novato', 'facil', 'normal', 'dificil', 'maestro'];

/**
 * De fabrica: APAGADO. `modo` queda fijo en gloria (no hay plata que elegir).
 * Los puntos por puesto NO van aqui: son perillas de la casa
 * (`relampago.premioCampeon`...), con su boton, en models/Config.js.
 */
export const RELAMPAGO_DEFAULT = {
  on: false,
  modo: 'gloria',
  prendidoPor: null,
  prendidoEn: null,
  desdeFecha: null,
  hastaFecha: null,
  desdeHora: 18,
  hastaHora: 23,
  desdeMinuto: 0,
  hastaMinuto: 0,
  cadaMinutos: 30,
  anticipacionHoras: 48,
  cuadroMinimo: 16,
  puntos: 24,
  capacidad: 256,
  // «Que los bots no les ganen siempre a la gente» (Raul, 26-sep): el nivel de la
  // casa, el medido en la seccion 199 (la persona le gana 7 de cada 10).
  botNivel: 'casa'
};

function entero(v, min, max, def) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return def;
  return n;
}

/** `YYYY-MM-DD` valido, o null. Una fecha rota no se adivina. */
function fecha(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? s : null;
}

/**
 * Normaliza lo guardado contra los defaults, campo por campo. Un valor roto
 * cae a su default; `on` NO se rescata: si no es exactamente true, apagado.
 */
export function normalizarRelampago(guardado) {
  const s = guardado && typeof guardado === 'object' ? guardado : {};
  const d = RELAMPAGO_DEFAULT;
  const desdeHora = entero(s.desdeHora, 0, 23, d.desdeHora);
  const desdeMinuto = entero(s.desdeMinuto, 0, 59, d.desdeMinuto);
  const hastaHoraCruda = entero(s.hastaHora, 0, 23, d.hastaHora);
  const hastaMinutoCrudo = entero(s.hastaMinuto, 0, 59, d.hastaMinuto);
  const alReves = hastaHoraCruda * 60 + hastaMinutoCrudo < desdeHora * 60 + desdeMinuto;
  const cadaCruda = entero(s.cadaMinutos, 5, 240, d.cadaMinutos);
  const capacidad = entero(s.capacidad, 2, 1000, d.capacidad);
  const desdeFecha = fecha(s.desdeFecha);
  const hastaFechaCruda = fecha(s.hastaFecha);
  return {
    on: s.on === true,
    modo: 'gloria',
    prendidoPor: typeof s.prendidoPor === 'string' ? s.prendidoPor : null,
    prendidoEn: typeof s.prendidoEn === 'string' ? s.prendidoEn : null,
    desdeFecha,
    // Una temporada al reves se descarta entera, no a medias.
    hastaFecha: hastaFechaCruda && desdeFecha && hastaFechaCruda < desdeFecha ? null : hastaFechaCruda,
    desdeHora,
    hastaHora: alReves ? d.hastaHora : hastaHoraCruda,
    desdeMinuto,
    hastaMinuto: alReves ? d.hastaMinuto : hastaMinutoCrudo,
    // Tiene que dividir el DIA exacto o las franjas se desfasan de un dia al otro.
    cadaMinutos: 1440 % cadaCruda === 0 ? cadaCruda : d.cadaMinutos,
    anticipacionHoras: entero(s.anticipacionHoras, 1, 24 * 30, d.anticipacionHoras),
    cuadroMinimo: entero(s.cuadroMinimo, 2, capacidad, Math.min(d.cuadroMinimo, capacidad)),
    puntos: PUNTOS_DE_TORNEO.includes(Number(s.puntos)) ? Number(s.puntos) : d.puntos,
    capacidad,
    botNivel: NIVELES_DE_BOT.includes(s.botNivel) ? s.botNivel : d.botNivel
  };
}

export async function getRelampago() {
  try {
    const { rows } = await query('SELECT valor FROM copa_ajustes WHERE clave = ?', [RELAMPAGO_KEY]);
    return normalizarRelampago(rows[0]?.valor ? JSON.parse(rows[0].valor) : null);
  } catch {
    return normalizarRelampago(null);
  }
}

/** Guarda un cambio parcial sobre lo que ya esta y devuelve lo que quedo. */
export async function setRelampago(cambios) {
  const actual = await getRelampago();
  const nueva = normalizarRelampago({ ...actual, ...cambios });
  await query(
    'INSERT INTO copa_ajustes (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor',
    [RELAMPAGO_KEY, JSON.stringify(nueva)]
  );
  return nueva;
}

// ------------------------------------------------------------ el calendario

function enCaracas(d) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: RELAMPAGO_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const get = (t) => Number(partes.find((p) => p.type === t)?.value ?? '0');
  return { anio: get('year'), mes: get('month'), dia: get('day'), hora: get('hour') % 24, minuto: get('minute') };
}

/** El instante que en Venezuela es esa fecha y hora (el desfase se mide, no se asume). */
function instanteEnCaracas(anio, mes, dia, hora, minuto) {
  const ingenuo = Date.UTC(anio, mes - 1, dia, hora, minuto, 0, 0);
  let candidato = new Date(ingenuo);
  for (let i = 0; i < 2; i++) {
    const v = enCaracas(candidato);
    const error = Date.UTC(v.anio, v.mes - 1, v.dia, v.hora, v.minuto, 0, 0) - ingenuo;
    if (error === 0) break;
    candidato = new Date(candidato.getTime() - error);
  }
  return candidato;
}

/** La medianoche venezolana del dia de `ahora`. */
export function inicioDelDiaEnCaracas(ahora) {
  const hoy = enCaracas(ahora);
  return instanteEnCaracas(hoy.anio, hoy.mes, hoy.dia, 0, 0);
}

export function dentroDeTemporada(cfg, dia) {
  if (cfg.desdeFecha && dia < cfg.desdeFecha) return false;
  if (cfg.hastaFecha && dia > cfg.hastaFecha) return false;
  return true;
}

function franjasDelDia(cfg, anio, mes, dia) {
  const salida = [];
  const desde = cfg.desdeHora * 60 + cfg.desdeMinuto;
  const hasta = cfg.hastaHora * 60 + cfg.hastaMinuto;
  for (let m = desde; m <= hasta; m += cfg.cadaMinutos) {
    salida.push(instanteEnCaracas(anio, mes, dia, Math.floor(m / 60), m % 60));
  }
  return salida;
}

/**
 * Las franjas que caen entre `ahora` (exclusive) y `hasta` (inclusive),
 * respetando la temporada. Recorre dia por dia EN VENEZUELA y cruza la
 * medianoche: con 48 h de anticipacion publica las noches que vienen.
 */
export function franjasEntre(cfg, ahora, hasta) {
  const salida = [];
  const desdeMs = ahora.getTime();
  const hastaMs = hasta.getTime();
  if (hastaMs <= desdeMs) return salida;
  let cursor = ahora;
  for (let i = 0; i <= 62; i++) {
    const d = enCaracas(cursor);
    const dia = `${d.anio}-${String(d.mes).padStart(2, '0')}-${String(d.dia).padStart(2, '0')}`;
    if (dentroDeTemporada(cfg, dia)) {
      for (const f of franjasDelDia(cfg, d.anio, d.mes, d.dia)) {
        const t = f.getTime();
        if (t > desdeMs && t <= hastaMs) salida.push(f);
      }
    }
    cursor = new Date(instanteEnCaracas(d.anio, d.mes, d.dia, 12, 0).getTime() + 24 * 3600_000);
    if (cursor.getTime() > hastaMs + 24 * 3600_000) break;
  }
  return salida.sort((a, b) => a - b);
}

/** El nombre del torneo de una franja: «El Relámpago 8:30 p. m.». */
export function nombreDeFranja(franja) {
  const txt = new Intl.DateTimeFormat('es-VE', { timeZone: RELAMPAGO_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(franja)
    .replace(/\s+/g, ' ')
    .trim();
  return `${RELAMPAGO_PREFIJO} ${txt}`;
}

/** «El Relámpago 7:00 p. m.» → «el de las 7:00 p. m.» para el mensaje de uno-a-la-vez. */
export function comoSeLlama(nombre) {
  const hora = String(nombre || '').slice(RELAMPAGO_PREFIJO.length).trim();
  return hora ? `el de las ${hora}` : 'el otro Relámpago';
}
