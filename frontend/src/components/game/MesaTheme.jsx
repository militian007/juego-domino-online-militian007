import { useEffect, useState } from 'react';

export const PANOS = [
  { id: 'tela', nombre: 'Paño de tela', clase: 'felt-tela' },
  { id: 'verde', nombre: 'Verde casino', clase: 'felt-verde' },
  { id: 'oscuro', nombre: 'Verde profundo', clase: 'felt-oscuro' },
  { id: 'torneo', nombre: 'Torneo', clase: 'felt-torneo' },
  { id: 'vino', nombre: 'Borgoña', clase: 'felt-vino' },
  { id: 'negro', nombre: 'Negro', clase: 'felt-negro' }
];

// Solo queda la baranda que usamos. Las de cuero eran de la epoca del CSS
// (§55) y ninguna se acerca a la foto de nogal: solo ensuciaban el selector.
export const BARANDAS = [
  { id: 'foto', nombre: 'Nogal y latón', clase: 'rail-foto' }
];

/**
 * Las pintas de las fichas.
 *
 * `clasica` es el arte que ya tenia el juego: fichas oscuras con marco y puntos
 * dorados, recortadas a mano.
 *
 * `hueso` NO es arte nuevo. Es **la misma imagen recoloreada** con un filtro,
 * para no dibujar fichas a mano (regla de oro 1.1) y sin credito de IA de
 * imagen para generarlas. Queda una ficha color hueso con el marco y los puntos
 * en gris oscuro. **No es el blanco hueso tradicional de puntos negros**: eso
 * necesita 28 imagenes nuevas, y esta anotado como pendiente.
 */
export const FICHAS = [
  { id: 'clasica', nombre: 'Clásicas', clase: '' },
  { id: 'hueso', nombre: 'Blanco hueso', clase: 'fichas-hueso' }
];

const DEFECTO = { pano: 'tela', baranda: 'foto', fichas: 'clasica' };
const CLAVE = 'mesa-tema';

// Se sube cuando entra una mesa nueva que vale la pena mostrarle a todos. Sin
// esto, quien ya habia elegido mesa se quedaba con la vieja para siempre: el
// valor por defecto solo aplica a quien no tiene nada guardado.
const CATALOGO = 3;

function leer() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (!guardado || guardado.catalogo !== CATALOGO) return DEFECTO;
    return {
      pano: PANOS.some((p) => p.id === guardado.pano) ? guardado.pano : DEFECTO.pano,
      baranda: BARANDAS.some((b) => b.id === guardado.baranda) ? guardado.baranda : DEFECTO.baranda,
      fichas: FICHAS.some((f) => f.id === guardado.fichas) ? guardado.fichas : DEFECTO.fichas
    };
  } catch {
    return DEFECTO;
  }
}

export function useMesaTheme() {
  const [tema, setTema] = useState(leer);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...tema, catalogo: CATALOGO }));
    } catch {
      /* si no hay localStorage, el tema simplemente no persiste */
    }
  }, [tema]);

  const clasePano = PANOS.find((p) => p.id === tema.pano)?.clase ?? PANOS[0].clase;
  const claseBaranda = BARANDAS.find((b) => b.id === tema.baranda)?.clase ?? BARANDAS[0].clase;
  const claseFichas = FICHAS.find((f) => f.id === tema.fichas)?.clase ?? FICHAS[0].clase;

  return {
    tema,
    setTema,
    clasePano,
    claseBaranda,
    claseFichas
  };
}

function Muestra({ clase, activo, titulo, onClick, alto = 'h-9' }) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`${clase} ${alto} w-full rounded-md border transition-all ${
        activo
          ? 'border-domino-accent ring-2 ring-domino-accent/50 scale-105'
          : 'border-black/50 hover:border-domino-accent/60'
      }`}
    >
      <span className="sr-only">{titulo}</span>
    </button>
  );
}

/**
 * El selector de paño. Con `enMenu` se dibuja plano, para vivir dentro del
 * menu de la mesa; sin el, lleva su propio boton y su ventanita.
 */
export default function MesaThemePicker({ tema, setTema, enMenu = false }) {
  const [abierto, setAbierto] = useState(false);

  const cuerpo = (
    <>
      <div className="mb-2 text-[10px] uppercase tracking-widest text-domino-accent/70">Paño</div>
      <div className="grid grid-cols-6 gap-1.5">
        {PANOS.map((p) => (
          <Muestra
            key={p.id}
            clase={p.clase}
            titulo={p.nombre}
            activo={tema.pano === p.id}
            onClick={() => setTema((t) => ({ ...t, pano: p.id }))}
          />
        ))}
      </div>
      <div className="mb-2 mt-3 text-[10px] uppercase tracking-widest text-domino-accent/70">
        Fichas
      </div>
      <div className="grid grid-cols-2 gap-2">
        {FICHAS.map((f) => (
          <button
            key={f.id}
            type="button"
            title={f.nombre}
            onClick={() => setTema((t) => ({ ...t, fichas: f.id }))}
            className={`flex flex-col items-center gap-1 rounded-md border p-1.5 transition-all ${
              tema.fichas === f.id
                ? 'border-domino-accent ring-2 ring-domino-accent/50'
                : 'border-black/50 hover:border-domino-accent/60'
            }`}
          >
            {/* La muestra es una ficha de verdad, no un cuadrito de color: asi
                se ve exactamente lo que se va a elegir. El `data-muestra` la
                saca del filtro de la mesa, para que cada una se vea como lo que
                representa y no como lo que hay elegido. */}
            <img
              src="/tiles/tile_6_6.png"
              alt=""
              data-muestra={f.id}
              className="h-6 w-12 rounded-sm"
            />
            <span className="text-[9px] text-domino-cream-dim">{f.nombre}</span>
          </button>
        ))}
      </div>

      {BARANDAS.length > 1 && (
        <>
          <div className="mb-2 mt-3 text-[10px] uppercase tracking-widest text-domino-accent/70">
            Baranda
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {BARANDAS.map((b) => (
              <Muestra
                key={b.id}
                clase={b.clase}
                titulo={b.nombre}
                activo={tema.baranda === b.id}
                onClick={() => setTema((t) => ({ ...t, baranda: b.id }))}
              />
            ))}
          </div>
        </>
      )}
    </>
  );

  if (enMenu) return <div>{cuerpo}</div>;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Cambiar el paño"
        aria-label="Cambiar el paño"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-domino-accent/25 bg-black/45 text-domino-cream-dim transition-colors hover:border-domino-accent/70 hover:text-domino-cream"
      >
        <span className="h-3.5 w-3.5 rounded-full border border-black/60 bg-gradient-to-br from-emerald-600 to-amber-700" />
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute bottom-10 left-0 z-50 w-60 rounded-xl border border-domino-accent/25 bg-domino-felt/95 p-4 shadow-2xl backdrop-blur">
            {cuerpo}
          </div>
        </>
      )}
    </div>
  );
}
