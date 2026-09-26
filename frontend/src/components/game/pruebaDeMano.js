// LA MANO DE ANTES, PARA COMPARAR (seccion 208). Desde el 26-sep la mano y la
// mesa copian las medidas del juego de las capturas de Raul (mano 50x100 en una
// sola fila, ficha de la mesa hasta 94 px). `?mano=hoy` enseña como era antes;
// `?mano=0` vuelve a la nueva. Se borra cuando Raul la de por buena.
const VARIANTES = {
  hoy: { letra: 'ANTES', maximo: 58, compacta: false, dosFilas: true, mesaMaxima: 0.11 }
};
const LLAVE = 'domino-mano-prueba';

export function varianteDeMano() {
  try {
    const q = new URLSearchParams(window.location.search).get('mano');
    if (q) {
      if (VARIANTES[q.toLowerCase()]) localStorage.setItem(LLAVE, q.toLowerCase());
      else localStorage.removeItem(LLAVE);
    }
    return VARIANTES[localStorage.getItem(LLAVE)] || null;
  } catch {
    return null;
  }
}
