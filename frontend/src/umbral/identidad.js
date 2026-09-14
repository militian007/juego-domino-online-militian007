/**
 * LA IDENTIDAD LIGERA (seccion 177)
 *
 * Como en el Ludo: el juego no tiene cuentas. La gente elige un nombre para la
 * mesa y un retrato, y eso vive en su telefono. Las cuentas, la banca y el
 * KYC los pone la plataforma cuando el juego se conecte por la ventanilla.
 */
const LLAVE = 'domino-identidad';

export const RETRATOS = [
  'catire', 'chela', 'chuo', 'comadre', 'juana', 'musiu',
  'nano', 'pancho', 'paula', 'tigre', 'yubi', 'zurda'
];

export function limpiarNombre(texto) {
  return String(texto || '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 14);
}

export function identidad() {
  try {
    const guardada = JSON.parse(localStorage.getItem(LLAVE) || 'null');
    if (guardada && limpiarNombre(guardada.nombre).length >= 2) {
      return {
        nombre: limpiarNombre(guardada.nombre),
        retrato: RETRATOS.includes(guardada.retrato) ? guardada.retrato : RETRATOS[0]
      };
    }
  } catch {
    // sin almacenamiento: no hay identidad guardada
  }
  return null;
}

export function guardarIdentidad({ nombre, retrato }) {
  const limpia = {
    nombre: limpiarNombre(nombre),
    retrato: RETRATOS.includes(retrato) ? retrato : RETRATOS[0]
  };
  if (limpia.nombre.length < 2) return null;
  try {
    localStorage.setItem(LLAVE, JSON.stringify(limpia));
  } catch {
    // ignorado
  }
  return limpia;
}

export function retratoUrl(retrato) {
  return `/avatares/${RETRATOS.includes(retrato) ? retrato : RETRATOS[0]}.svg`;
}
