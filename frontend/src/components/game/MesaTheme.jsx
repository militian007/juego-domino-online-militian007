import { createContext, useContext, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { desbloqueosApi } from '../../services/api.js';

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
 * Las pintas de las fichas. Cada una es una CARPETA de imagenes.
 *
 * - `clasica`: el arte que ya tenia el juego, fichas oscuras con marco y puntos
 *   dorados, recortadas a mano.
 * - `hueso`: el blanco hueso tradicional, puntos negros. Se arma con
 *   `scripts/generar-fichas-hueso.mjs` a partir de dos imagenes que genero
 *   Jonathan con Gemini: la ficha vacia y un punto.
 *
 * Hubo un intento anterior que recoloreaba la ficha clasica con un filtro CSS.
 * Se saco en cuanto hubo imagenes de verdad: el filtro dejaba los puntos grises
 * en vez de negros y conservaba el marco ornamentado, que una ficha de hueso no
 * tiene.
 */
export const FICHAS = [
  { id: 'clasica', nombre: 'Clásicas', carpeta: '/tiles' },
  { id: 'hueso', nombre: 'Blanco hueso', carpeta: '/tiles-hueso' },
  {
    id: 'oro',
    nombre: 'Negro y oro',
    carpeta: '/tiles-oro',
    // Esta no se elige: se gana. La `clave` es lo que el pase de batalla va a
    // escribir en la tabla de desbloqueos el dia que alguien llegue al nivel.
    clave: 'fichas:oro',
    comoSeGana: 'Premio del pase de batalla'
  }
];

/**
 * De que carpeta salen las fichas.
 *
 * Va por contexto y no por propiedad porque `Tile` se usa en cinco sitios
 * distintos (mesa, mano, pozo, desglose, selector de punta) y pasarles la
 * carpeta a todos seria arrastrarla por media aplicacion.
 */
export const ContextoFichas = createContext('/tiles');

/**
 * Se sube cuando cambia el DIBUJO de alguna ficha sin cambiar su nombre.
 *
 * Los archivos se llaman siempre igual (`tile_6_6.png`), asi que el navegador
 * se queda con el que ya tenia guardado y no ve el nuevo. Este numero viaja
 * pegado a la direccion y lo obliga a pedirlo otra vez.
 *
 * 2 = se rehicieron las blanco hueso: la primera tanda salio con el borde
 *     izquierdo cortado y las esquinas mordidas.
 */
export const VERSION_FICHAS = 2;

export const useCarpetaDeFichas = () => useContext(ContextoFichas);

const DEFECTO = { pano: 'tela', baranda: 'foto', fichas: 'clasica' };
const CLAVE = 'mesa-tema';

// Se sube cuando entra una mesa nueva que vale la pena mostrarle a todos. Sin
// esto, quien ya habia elegido mesa se quedaba con la vieja para siempre: el
// valor por defecto solo aplica a quien no tiene nada guardado.
const CATALOGO = 4;

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

  // Lo que este jugador tiene ganado. Se pregunta al SERVIDOR: guardado en el
  // telefono, cualquiera se regalaria los premios editando su navegador.
  const [desbloqueadas, setDesbloqueadas] = useState([]);

  useEffect(() => {
    let vivo = true;
    desbloqueosApi.mios()
      .then((r) => { if (vivo) setDesbloqueadas(r.claves ?? []); })
      // Sin sesion la peticion falla, y esta bien: un invitado no tiene nada.
      .catch(() => { if (vivo) setDesbloqueadas([]); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...tema, catalogo: CATALOGO }));
    } catch {
      /* si no hay localStorage, el tema simplemente no persiste */
    }
  }, [tema]);

  const clasePano = PANOS.find((p) => p.id === tema.pano)?.clase ?? PANOS[0].clase;
  const claseBaranda = BARANDAS.find((b) => b.id === tema.baranda)?.clase ?? BARANDAS[0].clase;
  const puedeUsar = (f) => !f.clave || desbloqueadas.includes(f.clave);

  // Si tiene elegida una pinta que no le corresponde, se cae a las clasicas.
  // Puede pasar si la gano, se le quito, o si tocara los datos de su navegador.
  const fichaElegida = FICHAS.find((f) => f.id === tema.fichas);
  const fichaValida = fichaElegida && puedeUsar(fichaElegida) ? fichaElegida : FICHAS[0];
  const carpetaFichas = fichaValida.carpeta;

  return {
    tema,
    setTema,
    clasePano,
    claseBaranda,
    carpetaFichas,
    desbloqueadas,
    puedeUsar
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
/**
 * @param puedeUsar dice si una pinta esta desbloqueada. Viene del hook y no se
 *   calcula aqui: quien sabe lo que el jugador tiene ganado es `useMesaTheme`,
 *   que es el que le pregunta al servidor. Por defecto, todo abierto, para que
 *   el selector siga funcionando si alguien lo usa suelto.
 */
export default function MesaThemePicker({ tema, setTema, enMenu = false, puedeUsar = () => true }) {
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
      <div className="grid grid-cols-3 gap-1.5">
        {FICHAS.map((f) => {
          const abierta = puedeUsar(f);
          return (
            <button
              key={f.id}
              type="button"
              disabled={!abierta}
              title={abierta ? f.nombre : `${f.nombre} — ${f.comoSeGana}`}
              onClick={() => abierta && setTema((t) => ({ ...t, fichas: f.id }))}
              className={`relative flex flex-col items-center gap-1 rounded-md border p-1.5 transition-all ${
                tema.fichas === f.id && abierta
                  ? 'border-domino-accent ring-2 ring-domino-accent/50'
                  : 'border-black/50'
              } ${abierta ? 'hover:border-domino-accent/60' : 'cursor-not-allowed'}`}
            >
              {/* La muestra es la ficha de verdad de cada carpeta: se ve
                  exactamente lo que se va a elegir. La bloqueada se muestra
                  igual, apagada: hay que ver lo que uno se esta perdiendo, si
                  no el premio no motiva a nadie. */}
              <span className="relative block h-6 w-12 rounded-sm bg-black/40">
                {/* Si la pinta todavia no tiene sus imagenes, la muestra se
                    esconde sola y queda el candado sobre el hueco oscuro. Sin
                    esto se veria el icono de imagen rota. */}
                <img
                  src={`${f.carpeta}/tile_6_6.png`}
                  alt=""
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                  className={`h-6 w-12 rounded-sm ${abierta ? '' : 'opacity-30 grayscale'}`}
                />
                {!abierta && (
                  <Lock
                    size={12}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-domino-accent drop-shadow"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className={`text-[8px] leading-tight ${abierta ? 'text-domino-cream-dim' : 'text-domino-cream-dim/50'}`}>
                {f.nombre}
              </span>
            </button>
          );
        })}
      </div>

      {FICHAS.some((f) => !puedeUsar(f)) && (
        <p className="mt-1.5 text-[9px] leading-tight text-domino-cream-dim/60">
          Las que tienen candado se ganan en el pase de batalla.
        </p>
      )}

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
