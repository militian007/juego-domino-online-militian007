import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Tile from './Tile.jsx';
import Dorso from './Dorso.jsx';
import { playDealSound, playShuffleSound } from '../../utils/soundEffects.js';

/**
 * EL REPARTO (seccion 182)
 *
 * Raul: "el reparto de las piezas tenemos que hacer uno animado y no lo
 * tenemos". Antes la mano aparecia de golpe al empezar la ronda. Ahora las
 * fichas salen del centro de la mesa, boca abajo, una por una y en rueda: una
 * para ti, una para cada rival, otra para ti... Las tuyas se voltean al llegar
 * a tu mano; las de los rivales se encogen sobre su placa. Cada llegada da un
 * toque corto de ficha, y antes del reparto se oye el revoltijo del monton.
 *
 * Como esta armado: es una capa encima de todo. Mide con el DOM donde queda
 * cada ficha de la mano (`data-ficha-mano`) y cada placa de rival
 * (`data-mano-rival`), y dibuja COPIAS que vuelan desde el centro de la mesa
 * (`data-mesa-centro`) hasta ahi. Mientras tanto la mano de verdad esta
 * escondida (misma medida, mismo sitio), asi que cuando la capa se va no se
 * mueve un pixel.
 */
const MS_REVOLTIJO = 650;
const MS_VUELO = 380;

export default function RepartoDeFichas({ tiles = [], rivales = [], onFin }) {
  const [cartas, setCartas] = useState(null);
  const listo = useRef(false);

  useLayoutEffect(() => {
    let vivo = true;
    // Dos cuadros de espera: la mano se acaba de montar y tiene que asentar su medida.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!vivo) return;
      const centroEl = document.querySelector('[data-mesa-centro]');
      const c = centroEl ? centroEl.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const cx = c.left + c.width / 2;
      const cy = c.top + c.height / 2;
      const paso = rivales.length > 1 ? 75 : 95;
      const lista = [];
      const mias = tiles.map((tile, i) => {
        const nodo = document.querySelector(`[data-ficha-mano="${i}"]`);
        const r = nodo ? nodo.getBoundingClientRect() : null;
        return r ? { tipo: 'mia', tile, x: r.left, y: r.top, w: r.width, h: r.height } : null;
      });
      const deRivales = rivales.map((riv) => {
        const nodo = document.querySelector(`[data-mano-rival="${riv.id}"]`);
        const r = nodo ? nodo.getBoundingClientRect() : null;
        return r ? { tipo: 'rival', cantidad: riv.cantidad, x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      }).filter(Boolean);
      const rondas = Math.max(tiles.length, ...deRivales.map((d) => d.cantidad), 0);
      let n = 0;
      for (let k = 0; k < rondas; k += 1) {
        if (mias[k]) lista.push({ ...mias[k], key: `m${k}`, retraso: MS_REVOLTIJO + n * paso }); n += 1;
        for (const d of deRivales) {
          if (k < d.cantidad) { lista.push({ tipo: 'rival', key: `r${d.x}-${k}`, x: d.x - 9, y: d.y - 18, w: 18, h: 36, retraso: MS_REVOLTIJO + n * paso }); n += 1; }
        }
      }
      for (const carta of lista) {
        carta.dx = cx - (carta.x + carta.w / 2);
        carta.dy = cy - (carta.y + carta.h / 2);
      }
      setCartas(lista);
    }));
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [tiles, rivales]);

  useEffect(() => {
    if (!cartas) return undefined;
    playShuffleSound(MS_REVOLTIJO);
    const timers = cartas.map((c) => setTimeout(() => playDealSound(), c.retraso + MS_VUELO - 60));
    // El fin lo marca la ULTIMA animacion al terminar (asi vale aunque el
    // navegador corra las animaciones a otro ritmo); el temporizador es solo
    // un salvavidas por si el navegador nunca avisa.
    const fin = Math.max(0, ...cartas.map((c) => c.retraso)) + MS_VUELO + 380;
    const t = setTimeout(() => terminar(), fin * 3);
    return () => { timers.forEach(clearTimeout); clearTimeout(t); };
  }, [cartas, onFin]);

  const aterrizadas = useRef(0);
  function terminar() {
    if (listo.current) return;
    listo.current = true;
    onFin?.();
  }
  function alTerminarAnimacion(e) {
    if (!e.target.classList.contains('ficha-en-reparto')) return;
    aterrizadas.current += 1;
    if (cartas && aterrizadas.current >= cartas.length) setTimeout(terminar, 320);
  }

  if (!cartas) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true" onAnimationEnd={alTerminarAnimacion}>
      {cartas.map((c) => (
        <div
          key={c.key}
          className={`ficha-en-reparto absolute ${c.tipo === 'mia' ? 'ficha-reparte-mia' : 'ficha-reparte-rival'}`}
          style={{
            left: `${c.x}px`,
            top: `${c.y}px`,
            width: `${c.w}px`,
            height: `${c.h}px`,
            '--dx': `${c.dx}px`,
            '--dy': `${c.dy}px`,
            '--retraso': `${c.retraso}ms`,
            '--vuelo': `${MS_VUELO}ms`
          }}
        >
          <Dorso ancho={c.w} className={`absolute inset-0 ${c.tipo === 'mia' ? 'ficha-reparte-dorso' : ''}`} />
          {c.tipo === 'mia' && (
            <div className="ficha-reparte-cara absolute inset-0">
              <Tile tile={c.tile} orientation="vertical" ancho={c.w} draggable={false} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
