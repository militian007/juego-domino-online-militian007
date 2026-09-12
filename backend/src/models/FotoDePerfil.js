import { query } from '../config/database.js';

/**
 * La foto que se sube en el perfil (§147).
 *
 * ## Lo que hace el navegador y lo que NO se le cree
 *
 * La pantalla recorta la foto a un cuadrado, la baja a 256x256 y la manda en
 * JPEG. Eso esta bien para que la subida sea rapida, pero **no se le cree
 * nada**: cualquiera puede saltarse la pantalla y llamar a la ruta a mano con
 * lo que se le antoje (CLAUDE.md regla 8). Aqui se vuelve a comprobar todo:
 *
 * - que venga como `data:image/jpeg;base64,...` y nada mas;
 * - que pesado ya descifrado no pase de `MAX_BYTES`;
 * - que los bytes EMPIECEN y TERMINEN como un JPEG de verdad, no que lo diga
 *   la etiqueta: un archivo puede llamarse .jpg y ser cualquier cosa;
 * - que el tamano leido de la cabecera del propio JPEG no pase de `MAX_LADO`.
 *
 * Esa ultima es la que importa de verdad. Un JPEG de 40 KB puede declarar
 * 30000x30000 y reventar la memoria de cualquiera que lo abra: es la bomba de
 * descompresion de toda la vida. Por eso se mira la cabecera y no el peso.
 *
 * ## Por que JPEG y no PNG ni SVG
 *
 * SVG **jamas**: es un documento, puede traer `<script>` dentro y se ejecuta al
 * mostrarlo. PNG se deja fuera porque no aporta nada aqui —una foto de persona
 * pesa menos en JPEG— y cada formato que se acepta es una puerta mas que hay
 * que vigilar.
 *
 * ## El EXIF
 *
 * Una foto sacada con el telefono lleva dentro la fecha, el modelo y **donde se
 * tomo**. Redibujarla en un lienzo, que es lo que hace la pantalla, tira todo
 * eso: lo que llega aqui son pixeles pelados. No es un efecto secundario
 * simpatico, es la razon de que el recorte se haga ahi y no se suba el archivo
 * original.
 */

/** Lo maximo que puede pesar la foto ya descifrada. */
const MAX_BYTES = 40 * 1024;

/**
 * El lado maximo que puede declarar la imagen.
 *
 * La pantalla manda 256. Se deja 320 de margen por si algun telefono redondea
 * distinto, pero no mas: el hueco entre lo que se manda y lo que se acepta es
 * justo por donde se cuela el que quiere abusar.
 */
const MAX_LADO = 320;

const CABECERA = 'data:image/jpeg;base64,';

/**
 * El ancho y el alto, leidos de la cabecera del JPEG.
 *
 * Un JPEG es una lista de marcadores: cada uno empieza con 0xFF, sigue con su
 * numero, y salvo unos pocos trae dos bytes diciendo cuanto ocupa. El tamano de
 * la imagen vive en el marcador SOF, que es cualquiera del 0xC0 al 0xCF menos
 * tres que son otra cosa.
 *
 * Devuelve null si no se encuentra, y no encontrarlo es motivo de rechazo: si
 * no se puede leer el tamano, no se puede saber que no es una bomba.
 */
function medidasJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }

    const marcador = b[i + 1];

    // Los que no llevan carga: relleno, reinicio y el propio inicio.
    if (marcador === 0xff || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd8)) {
      i += 2;
      continue;
    }
    if (marcador === 0xd9) break;

    const largo = (b[i + 2] << 8) | b[i + 3];
    if (largo < 2) return null;

    const esSOF = marcador >= 0xc0 && marcador <= 0xcf
      && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;

    if (esSOF) {
      return { alto: (b[i + 5] << 8) | b[i + 6], ancho: (b[i + 7] << 8) | b[i + 8] };
    }

    i += 2 + largo;
  }
  return null;
}

/**
 * Revisa la foto. Devuelve `{ ok: true }` o el motivo del rechazo.
 *
 * Va aparte para poder probarla sola, sin base de datos.
 */
export function revisar(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(CABECERA)) {
    return { ok: false, error: 'La foto tiene que ser una imagen JPEG' };
  }

  const base64 = dataUrl.slice(CABECERA.length);

  // El tope se mira ANTES de descifrar. Descifrar para despues decir que era
  // muy grande es hacer justo el trabajo que el que abusa queria que hicieras.
  if (base64.length > Math.ceil(MAX_BYTES / 3) * 4 + 4) {
    return { ok: false, error: 'La foto pesa demasiado' };
  }

  let bytes;
  try {
    bytes = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: 'La foto está dañada' };
  }

  if (bytes.length === 0) return { ok: false, error: 'La foto está vacía' };
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'La foto pesa demasiado' };

  // Un JPEG de verdad empieza con FFD8 y termina con FFD9. Que la etiqueta
  // diga "image/jpeg" no prueba nada: la escribe quien sube el archivo.
  const arranca = bytes[0] === 0xff && bytes[1] === 0xd8;
  const cierra = bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (!arranca || !cierra) {
    return { ok: false, error: 'Ese archivo no es una imagen JPEG' };
  }

  const medidas = medidasJpeg(bytes);
  if (!medidas || !medidas.ancho || !medidas.alto) {
    return { ok: false, error: 'No se pudo leer la imagen' };
  }
  if (medidas.ancho > MAX_LADO || medidas.alto > MAX_LADO) {
    return { ok: false, error: 'La foto es demasiado grande' };
  }

  return { ok: true, bytes: bytes.length, ...medidas };
}

/** La foto de una persona, o null. */
export const de = async (userId) => {
  const r = await query('SELECT foto FROM fotos_de_perfil WHERE user_id = ?', [userId]);
  return r.rows[0]?.foto ?? null;
};

/**
 * Las fotos de varias personas de un tirón, por id.
 *
 * La usa la mesa: cuatro consultas sueltas por partida, con la gente entrando y
 * saliendo, es trabajo regalado.
 */
export const deVarios = async (ids) => {
  const limpios = [...new Set((ids ?? []).map(Number).filter(Number.isInteger))];
  if (limpios.length === 0) return {};

  // Los ids ya estan pasados por Number, asi que no hay texto que pueda
  // inyectarse; aun asi van por parametro y no pegados en el SQL.
  const huecos = limpios.map(() => '?').join(', ');
  const r = await query(
    `SELECT user_id, foto FROM fotos_de_perfil WHERE user_id IN (${huecos})`,
    limpios
  );

  const salida = {};
  for (const fila of r.rows) salida[fila.user_id] = fila.foto;
  return salida;
};

/**
 * Guarda la foto, si pasa la revisión.
 *
 * No hace falta limitar cuantas veces se cambia: la tabla lleva una sola fila
 * por cuenta y la nueva pisa a la vieja, asi que por mucho que alguien suba y
 * vuelva a subir, lo guardado no crece.
 */
export const poner = async (userId, dataUrl) => {
  const revision = revisar(dataUrl);
  if (!revision.ok) return revision;

  const ahora = new Date().toISOString();
  const existe = await query('SELECT user_id FROM fotos_de_perfil WHERE user_id = ?', [userId]);

  if (existe.rows.length > 0) {
    await query(
      'UPDATE fotos_de_perfil SET foto = ?, actualizada_en = ? WHERE user_id = ?',
      [dataUrl, ahora, userId]
    );
  } else {
    await query(
      'INSERT INTO fotos_de_perfil (user_id, foto, actualizada_en) VALUES (?, ?, ?)',
      [userId, dataUrl, ahora]
    );
  }

  return { ok: true, foto: dataUrl };
};

/**
 * Quita la foto.
 *
 * La usa el propio dueño desde su perfil, y es tambien la palanca para bajar
 * una foto que no deberia estar: la cuenta se queda con su retrato dibujado y
 * no pasa nada mas.
 */
export const quitar = async (userId) => {
  await query('DELETE FROM fotos_de_perfil WHERE user_id = ?', [userId]);
  return { ok: true };
};

export const LIMITES = { MAX_BYTES, MAX_LADO };
