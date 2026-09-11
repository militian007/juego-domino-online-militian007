import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * El grito de fin de ronda: "¡DOMINÓ!", los rayos y el confeti.
 *
 * Punto 5 del plan de Domino Legends (§123). Ellos cierran la ronda con un
 * texto dorado enorme, rayos de sol detras y confeti, y recien despues baja el
 * panel con las cuentas. Nosotros pasabamos de la ultima ficha a un cuadro con
 * numeros, sin respirar.
 *
 * ## Por que va ANTES del panel y no encima
 *
 * El panel tapa la mesa entera. Si el grito sale al mismo tiempo, no se ve la
 * jugada que acaba de cerrar la ronda —que es justo lo que uno quiere mirar—.
 * Asi que primero el grito sobre la mesa (1,8 s), y cuando se va, entra el
 * panel con las cuentas.
 *
 * ## Nada dibujado a mano
 *
 * Los rayos son un `conic-gradient` y el confeti son rectangulos de color: son
 * EFECTOS, no ilustraciones. Ningun icono ni figura se dibuja aca (regla 1.1).
 */

/** Cuanto dura el grito antes de dar paso al panel. */
export const MS_GRITO = 1800;

/** Cuantos papelitos. Mas que esto no se distingue y cuesta en telefono viejo. */
const PAPELITOS = 36;

const COLORES = ['#d4af37', '#f6e6bd', '#e0684f', '#5fa8d3', '#7bc47f', '#e8c974'];

/**
 * Que dice el cartel, segun como cerro la ronda y como te fue.
 *
 * `arte` es el cartel PINTADO que le corresponde, si lo hay (§130). Solo los de
 * ganar lo tienen: un banner pintado para "Tranca perdida" seria celebrar que
 * perdiste. Los de perder se quedan en tipografia sobria, a proposito.
 */
export function tituloDeRonda({ motivo, equipoGanador, miEquipo }) {
  if (equipoGanador === 0 || equipoGanador == null) {
    return { texto: '¡Empate!', gane: false, arte: null };
  }
  const gane = equipoGanador === miEquipo;
  if (motivo === 'blocked') {
    return { texto: gane ? '¡Tranca ganada!' : 'Tranca perdida', gane, arte: gane ? 'tranca' : null };
  }
  if (motivo === 'forfeit') {
    return { texto: gane ? 'Ronda ganada' : 'Ronda perdida', gane, arte: null };
  }
  return { texto: gane ? '¡Dominó!' : 'Se quedó sin fichas', gane, arte: gane ? 'domino' : null };
}

/**
 * El cartel: pintado si existe, y si no, la tipografia de siempre.
 *
 * El dibujo se pide por `<img>` y si no esta —todavia no lo generamos, o fallo
 * la descarga— se cae solo al texto. Asi el juego nunca depende de que el arte
 * este puesto, que es la unica forma de poder soltarlo cuando llegue sin tocar
 * codigo.
 */
export function Cartel({ arte, texto, gane, className = '' }) {
  const [sinArte, setSinArte] = useState(false);

  if (arte && !sinArte) {
    return (
      <img
        src={`/carteles/${arte}.png`}
        alt={texto}
        onError={() => setSinArte(true)}
        className={`mx-auto h-auto w-[min(86vw,420px)] drop-shadow-[0_8px_20px_rgba(0,0,0,.85)] ${className}`}
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
      // Frena al final, como un contador mecanico.
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

function Confeti() {
  // Los papelitos se sortean UNA vez: si se recalcularan en cada render,
  // saltarian de sitio a mitad de la caida.
  const papeles = useMemo(
    () =>
      Array.from({ length: PAPELITOS }).map((_, i) => ({
        i,
        x: Math.random() * 100,
        color: COLORES[i % COLORES.length],
        ancho: 5 + Math.random() * 5,
        alto: 8 + Math.random() * 8,
        demora: Math.random() * 700,
        duracion: 1400 + Math.random() * 1100,
        giro: Math.random() * 360
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {papeles.map((p) => (
        <span
          key={p.i}
          className="confeti absolute top-0 block rounded-[1px]"
          style={{
            left: `${p.x}%`,
            width: `${p.ancho}px`,
            height: `${p.alto}px`,
            background: p.color,
            animationDelay: `${p.demora}ms`,
            animationDuration: `${p.duracion}ms`,
            '--confeti-giro': `${p.giro}deg`
          }}
        />
      ))}
    </div>
  );
}

export default function CelebracionDeRonda({ activa, titulo, gane, puntos, arte = null }) {
  if (!activa) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {gane && <Confeti />}

      {gane && (
        <div
          className="rayos-de-sol absolute h-[160vmax] w-[160vmax] rounded-full opacity-30"
          aria-hidden="true"
        />
      )}

      <div className="grito-entra relative px-6 text-center">
        <Cartel arte={arte} texto={titulo} gane={gane} />
        {puntos > 0 && (
          <p className="mt-2 text-lg font-bold tabular-nums text-domino-cream/90 drop-shadow-[0_3px_6px_rgba(0,0,0,.9)]">
            +{puntos}
          </p>
        )}
      </div>
    </div>
  );
}
