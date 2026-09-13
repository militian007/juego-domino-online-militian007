/**
 * EL VIGILANTE DEL DIBUJO (seccion 171).
 *
 * Raul vio otra vez dos fichas montadas, ahora en una mesa 1 contra 1 con un
 * amigo. El vigilante del servidor (seccion 169) no anoto nada: en las
 * coordenadas del motor esas dos fichas no se pisan, y el rastreo de miles de
 * turnos y de seis rondas en el navegador tampoco dio nada. Asi que lo que se
 * monta es el DIBUJO, no la mesa: alguna animacion o algun nodo que se queda
 * donde no va.
 *
 * Este vigilante mira el dibujo de verdad, en el navegador de cada jugador:
 * un rato despues de cada cambio de la mesa mide las fichas puestas y, si dos
 * se pisan mas de un quinto, manda al servidor la mesa, las medidas, las clases
 * y el transform de cada nodo, para reproducir el caso exacto. Solo en
 * desarrollo, y nunca toca el juego.
 */
const RUTA = `${import.meta.env.VITE_API_URL || ''}/api/diag/montada`;
let ultimoReporte = '';

function solape(a, b) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.min(a.width * a.height, b.width * b.height);
}

const redondear = (r) => ({
  left: Math.round(r.left * 10) / 10,
  top: Math.round(r.top * 10) / 10,
  width: Math.round(r.width * 10) / 10,
  height: Math.round(r.height * 10) / 10
});

export function vigilarDibujo(pano, board, offsets, escala) {
  try {
    if (!pano || !board || board.length < 2) return null;
    const nodos = [...pano.querySelectorAll('[data-ficha-mesa]')];
    if (nodos.length < 2) return null;
    const rects = nodos.map((n) => n.getBoundingClientRect());
    let hallada = null;
    for (let i = 0; i < nodos.length && !hallada; i += 1) {
      for (let k = i + 1; k < nodos.length; k += 1) {
        const s = solape(rects[i], rects[k]);
        if (s > 0.2) { hallada = { i, k, solape: Math.round(s * 100) }; break; }
      }
    }
    if (!hallada) return null;

    const firma = `${board.length}:${hallada.i}:${hallada.k}`;
    if (firma === ultimoReporte) return hallada;
    ultimoReporte = firma;

    const camara = pano.querySelector('.camara-de-mesa');
    const detalle = (idx) => ({
      indice: nodos[idx].dataset.fichaMesa,
      rect: redondear(rects[idx]),
      clases: nodos[idx].className,
      transform: getComputedStyle(nodos[idx]).transform,
      estilo: nodos[idx].getAttribute('style')
    });
    const reporte = {
      montada: hallada,
      fichas: [detalle(hallada.i), detalle(hallada.k)],
      nodos: nodos.length,
      board,
      offsets,
      escala,
      camara: camara ? camara.style.transform : null,
      pano: { ancho: pano.clientWidth, alto: pano.clientHeight },
      visibilidad: document.visibilityState,
      navegador: navigator.userAgent
    };
    fetch(RUTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reporte),
      keepalive: true
    }).catch(() => {});
    console.warn(`[dibujo] fichas ${hallada.i} y ${hallada.k} se pisan ${hallada.solape}% en pantalla: anotado en el servidor`);
    return hallada;
  } catch {
    return null;
  }
}
