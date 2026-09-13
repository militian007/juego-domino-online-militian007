import { useEffect, useRef, useState } from 'react';

/**
 * LA CEREMONIA DE FIN DE RONDA.
 *
 * Punto 5 del plan de Domino Legends (§123): primero el grito sobre la mesa,
 * y recien cuando se va, el panel con las cuentas. Si salieran juntos, el panel
 * taparia la jugada que acaba de cerrar la ronda.
 *
 * Segunda vuelta (§162), a pedido de Raul: las letras grandes dicen GANASTE o
 * PERDISTE (GANAMOS / PERDIMOS en parejas), no el nombre de la jugada; la
 * jugada va debajo, en una linea. Y la fiesta es de verdad: destello, rayos,
 * dos cañones de confeti tricolor mas lluvia, chispas alrededor del cartel y
 * el cartel entrando de un golpe. Al perder no hay fiesta: el cartel de plata
 * baja con un rebote corto y la mesa se oscurece un poco. Respeto al que perdio.
 *
 * El confeti va con la Web Animations API (`element.animate`) y no con estado
 * de React: corre una vez al montar y cada papelito se borra solo al terminar.
 * Es lo mismo que hace la ceremonia de fin de partida del truco de la casa.
 *
 * Nada dibujado a mano: las letras son arte generado con la referencia de
 * Jonathan, los rayos son un gradiente y las chispas y el confeti son efectos.
 */

/** Cuanto dura la ceremonia antes de dar paso al panel. */
export const MS_GRITO = 2600;

/** Confeti tricolor mas destello crema: la paleta aprobada del club. */
const COLORES_CONFETI = ['#F7D002', '#003DA5', '#CE1126', '#F7D002', '#F4E2A8', '#D4AF37'];

/**
 * Que dice el cartel, segun como cerro la ronda y como te fue.
 *
 * `arte` es el cartel pintado (GANASTE, GANAMOS, PERDISTE, PERDIMOS). `texto`
 * es lo que se lee si el arte no carga. `quien` es la linea de abajo: la
 * jugada que cerro y, al perder, quien gano.
 */
export function tituloDeRonda({ motivo, equipoGanador, miEquipo, players = [] }) {
  if (equipoGanador === 0 || equipoGanador == null) {
    return { texto: '¡Empate!', gane: false, arte: null, quien: 'Nadie suma' };
  }
  const gane = equipoGanador === miEquipo;
  const enParejas = players.length === 4;
  const ganadores = players.filter((p) => p.team === equipoGanador).map((p) => p.username);
  const nombres = ganadores.length > 1
    ? `${ganadores.slice(0, -1).join(', ')} y ${ganadores[ganadores.length - 1]}`
    : ganadores[0] ?? 'el rival';
  const jugada = motivo === 'blocked' ? '¡Tranca!' : motivo === 'forfeit' ? 'Se fue' : '¡Dominó!';

  if (gane) {
    return {
      texto: enParejas ? '¡Ganamos!' : '¡Ganaste!',
      gane,
      arte: enParejas ? 'ganamos' : 'ganaste',
      quien: motivo === 'forfeit' ? `Se fue ${nombres === 'el rival' ? 'el rival' : 'el otro'}` : jugada
    };
  }
  return {
    texto: enParejas ? '¡Perdimos!' : '¡Perdiste!',
    gane,
    arte: enParejas ? 'perdimos' : 'perdiste',
    quien: motivo === 'blocked' ? `Tranca: ganó ${nombres}` : motivo === 'forfeit' ? 'Ronda cerrada' : `Ganó ${nombres}`
  };
}

/**
 * El cartel: pintado si existe, y si no, la tipografia de siempre.
 *
 * El dibujo se pide por `<img>` (WebP, y PNG si no carga) y si no esta se cae
 * solo al texto. Asi el juego nunca depende de que el arte este puesto.
 */
export function Cartel({ arte, texto, gane, className = '' }) {
  const [sinArte, setSinArte] = useState(false);
  const [formato, setFormato] = useState('webp');

  if (arte && !sinArte) {
    return (
      <img
        src={`/carteles/${arte}.${formato}`}
        alt={texto}
        onError={() => (formato === 'webp' ? setFormato('png') : setSinArte(true))}
        className={`mx-auto h-auto ${gane ? 'w-[min(86vw,420px)]' : 'w-[min(74vw,350px)]'} drop-shadow-[0_8px_20px_rgba(0,0,0,.85)] ${className}`}
      />
    );
  }

  return (
    <h2
      className={`text-[13vw] font-black leading-none tracking-tight sm:text-6xl ${
        gane ? 'text-domino-accent' : 'text-domino-cream/85'
      }`}
      style={{
        textShadow: gane
          ? '0 0 24px rgba(212,175,55,.55), 0 4px 0 rgba(0,0,0,.75), 0 10px 26px rgba(0,0,0,.9)'
          : '0 3px 0 rgba(0,0,0,.75), 0 8px 20px rgba(0,0,0,.9)'
      }}
    >
      {texto}
    </h2>
  );
}

/**
 * Un numero que sube en vez de saltar.
 *
 * `+19 puntos` apareciendo de golpe es un dato; subiendo de a poco es lo que te
 * hace mirarlo. Se apoya en `requestAnimationFrame`, y si el navegador no esta
 * dibujando (pestaña de fondo) el `setTimeout` de respaldo lo deja en su valor
 * final: nunca se queda a mitad.
 */
export function useNumeroQueSube(objetivo, activo, ms = 900) {
  const [valor, setValor] = useState(0);
  const cuadro = useRef(null);
  const respaldo = useRef(null);

  useEffect(() => {
    if (!activo || !objetivo) {
      setValor(objetivo || 0);
      return;
    }

    setValor(0);
    const desde = performance.now();

    const paso = (ahora) => {
      const t = Math.min(1, (ahora - desde) / ms);
      setValor(Math.round(objetivo * (1 - Math.pow(1 - t, 3))));
      if (t < 1) cuadro.current = requestAnimationFrame(paso);
    };
    cuadro.current = requestAnimationFrame(paso);
    respaldo.current = setTimeout(() => setValor(objetivo), ms + 200);

    return () => {
      if (cuadro.current) cancelAnimationFrame(cuadro.current);
      if (respaldo.current) clearTimeout(respaldo.current);
    };
  }, [objetivo, activo, ms]);

  return valor;
}

/**
 * Un cañon de confeti (o la lluvia, sin `desde`). Cada papelito es un div con
 * su propia animacion y se borra al terminar.
 */
function lanzarConfeti(host, cantidad, { desde = null, demora = 0 } = {}) {
  const W = host.clientWidth;
  const H = host.clientHeight;
  for (let i = 0; i < cantidad; i += 1) {
    const el = document.createElement('span');
    const ancho = 6 + Math.random() * 5;
    el.style.cssText = `position:absolute;width:${ancho}px;height:${ancho * 1.6}px;pointer-events:none;opacity:0;top:0;left:0;` +
      `background:${COLORES_CONFETI[i % COLORES_CONFETI.length]};border-radius:${i % 3 === 0 ? '50%' : '2px'}`;
    let x0, y0, dx, dy;
    if (desde === 'izquierda') {
      x0 = 6; y0 = H - 6; dx = 40 + Math.random() * W * 0.7; dy = -(H * 0.45 + Math.random() * H * 0.45);
    } else if (desde === 'derecha') {
      x0 = W - 6; y0 = H - 6; dx = -(40 + Math.random() * W * 0.7); dy = -(H * 0.45 + Math.random() * H * 0.45);
    } else {
      x0 = W * 0.1 + Math.random() * W * 0.8; y0 = -12; dx = (Math.random() - 0.5) * 120; dy = H + 40;
    }
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;
    host.appendChild(el);
    const giro = 360 + Math.random() * 540;
    const anim = el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.8}px,${desde ? dy : dy * 0.55}px) rotate(${giro * 0.6}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${desde ? dy * 0.3 : dy}px) rotate(${giro}deg)`, opacity: 0 }
      ],
      {
        duration: 1500 + Math.random() * 900,
        delay: demora + Math.random() * 240,
        easing: desde ? 'cubic-bezier(0.15,0.6,0.4,1)' : 'cubic-bezier(0.3,0.2,0.6,1)',
        fill: 'forwards'
      }
    );
    anim.onfinish = () => el.remove();
  }
}

/** Chispas de oro alrededor del cartel: puntos que titilan, sorteados una vez. */
function Chispas() {
  const [chispas] = useState(() =>
    Array.from({ length: 14 }).map((_, i) => ({
      i,
      x: 4 + Math.random() * 92,
      y: 8 + Math.random() * 84,
      tamano: 5 + Math.random() * 8,
      demora: Math.random() * 1200,
      duracion: 900 + Math.random() * 700
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {chispas.map((c) => (
        <span
          key={c.i}
          className="cere-chispa"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.tamano}px`,
            height: `${c.tamano}px`,
            animationDelay: `${c.demora}ms`,
            animationDuration: `${c.duracion}ms`
          }}
        />
      ))}
    </div>
  );
}

function Fiesta() {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lanzarConfeti(el, 60, { desde: 'izquierda', demora: 120 });
    lanzarConfeti(el, 60, { desde: 'derecha', demora: 120 });
    lanzarConfeti(el, 70, { demora: 450 });
  }, []);
  return <div ref={host} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />;
}

export default function CelebracionDeRonda({ activa, titulo, quien = '', gane, puntos, arte = null }) {
  if (!activa) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {gane ? (
        <>
          <div className="cere-destello absolute inset-0" aria-hidden="true" />
          <div className="rayos-de-sol cere-rayos absolute h-[160vmax] w-[160vmax] rounded-full" aria-hidden="true" />
          <Fiesta />
        </>
      ) : (
        <div className="cere-velo absolute inset-0" aria-hidden="true" />
      )}

      <div className={`relative px-4 text-center ${gane ? 'cere-golpe' : 'cere-cae'}`}>
        <div className="relative">
          {gane && <Chispas />}
          <Cartel arte={arte} texto={titulo} gane={gane} />
        </div>
        {quien && (
          <p
            className={`cere-linea mt-3 text-2xl font-extrabold drop-shadow-[0_3px_6px_rgba(0,0,0,.9)] ${
              gane ? 'text-domino-accent-bright' : 'text-domino-cream'
            }`}
          >
            {quien}
          </p>
        )}
        {puntos > 0 && (
          <p className="cere-puntos mt-1 text-3xl font-black tabular-nums text-domino-cream drop-shadow-[0_3px_6px_rgba(0,0,0,.9)]">
            +{puntos}
          </p>
        )}
      </div>
    </div>
  );
}
