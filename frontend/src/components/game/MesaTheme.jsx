import { createContext, useContext, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { desbloqueosApi } from '../../services/api.js';

/**
 * Los paños de la mesa.
 *
 * Los que llevan `clave` no se eligen: se ganan en el pase de batalla. Los
 * primeros seis siguen abiertos para todo el mundo, como siempre: un premio no
 * puede ser quitarle algo a quien ya lo tenia.
 */
export const PANOS = [
  { id: 'tela', nombre: 'Paño de tela', clase: 'felt-tela' },
  { id: 'verde', nombre: 'Verde casino', clase: 'felt-verde' },
  { id: 'oscuro', nombre: 'Verde profundo', clase: 'felt-oscuro' },
  { id: 'torneo', nombre: 'Torneo', clase: 'felt-torneo' },
  { id: 'vino', nombre: 'Borgoña', clase: 'felt-vino' },
  { id: 'negro', nombre: 'Negro', clase: 'felt-negro' },
  {
    id: 'medianoche',
    nombre: 'Azul medianoche',
    clase: 'felt-medianoche',
    clave: 'pano:medianoche',
    comoSeGana: 'Nivel 10 del pase de batalla'
  },
  {
    id: 'purpura',
    nombre: 'Púrpura real',
    clase: 'felt-purpura',
    clave: 'pano:purpura',
    comoSeGana: 'Nivel 22 del pase de batalla'
  },
  {
    id: 'oroviejo',
    nombre: 'Oro viejo',
    clase: 'felt-oroviejo',
    clave: 'pano:oroviejo',
    comoSeGana: 'Nivel 34 del pase de batalla'
  },

  // Los dos de la tienda (§140). Como las fichas de marmol, jade y madera: NO
  // son premio del pase, se compran con monedas.
  {
    id: 'granate',
    nombre: 'Granate',
    clase: 'felt-granate',
    clave: 'pano:granate',
    comoSeGana: 'Se compra en la tienda'
  },
  {
    id: 'azul',
    nombre: 'Azul noche',
    clase: 'felt-azul',
    clave: 'pano:azul',
    comoSeGana: 'Se compra en la tienda'
  }
];

// Las de cuero eran de la epoca del CSS (§55) y ninguna se acercaba a una foto:
// se sacaron. Quedan las dos que son imagen de verdad, las dos gratis.
export const BARANDAS = [
  { id: 'foto', nombre: 'Nogal y latón', clase: 'rail-foto' },
  { id: 'caoba', nombre: 'Caoba y oro', clase: 'rail-caoba' }
];

/**
 * Las pintas de las fichas. Cada una es una CARPETA de imagenes.
 *
 * - `clasica`: el arte que ya tenia el juego, fichas oscuras con marco y puntos
 *   dorados, recortadas a mano.
 * - `hueso`: el blanco hueso tradicional, puntos negros. Se arma con
 *   `scripts/generar-fichas.mjs` a partir de dos imagenes que genero
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
  },

  // Las tres de la tienda (§139). Estas NO son premio del pase: se compran con
  // monedas. Asi la tienda tiene que vender sin quitarle nada al pase, que era
  // lo que la frenaba.
  {
    id: 'marmol',
    nombre: 'Mármol',
    carpeta: '/tiles-marmol',
    clave: 'fichas:marmol',
    comoSeGana: 'Se compra en la tienda'
  },
  {
    id: 'jade',
    nombre: 'Jade',
    carpeta: '/tiles-jade',
    clave: 'fichas:jade',
    comoSeGana: 'Se compra en la tienda'
  },
  {
    id: 'madera',
    nombre: 'Madera',
    carpeta: '/tiles-madera',
    clave: 'fichas:madera',
    comoSeGana: 'Se compra en la tienda'
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
 * 3 = entraron las negro y oro, y de paso se rehicieron las de hueso con el
 *     script nuevo, que arma las dos pintas con la misma geometria.
 * 4 = entraron marmol, jade y madera.
 * 5 = se rehicieron las tres: el recorte del fondo se estaba comiendo dibujo.
 *     Al jade le mordia el filo palido (saltos de hasta 58 px) y a la madera le
 *     borraba el 52% de la veta, que salia como madera lavada. Ademas el jade
 *     lleva ahora el punto dorado de la pinta de oro: el suyo era un plato.
 */
export const VERSION_FICHAS = 5;

export const useCarpetaDeFichas = () => useContext(ContextoFichas);

/**
 * Con que mesa empieza el que nunca eligio nada.
 *
 * Las fichas por defecto pasaron de `clasica` a `hueso`, a pedido de Jonathan.
 * Es la ficha de domino de toda la vida —blanca, puntos negros— y se lee mucho
 * mejor de lejos que la negra con puntos dorados, que es preciosa pero tiene
 * poco contraste sobre el paño oscuro. La clasica sigue estando, a un toque.
 */
const DEFECTO = { pano: 'tela', baranda: 'foto', fichas: 'hueso' };
const CLAVE = 'mesa-tema';

// Se sube cuando entra una mesa nueva que vale la pena mostrarle a todos. Sin
// esto, quien ya habia elegido mesa se quedaba con la vieja para siempre: el
// valor por defecto solo aplica a quien no tiene nada guardado.
//
// 5 = las blanco hueso pasan a ser las de fabrica. Subirlo devuelve a todos al
//     tema por defecto, incluido el paño; es el precio de que el cambio se vea.
//     Quien tenia algo elegido lo vuelve a elegir en dos toques.
const CATALOGO = 6;

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

  const claseBaranda = BARANDAS.find((b) => b.id === tema.baranda)?.clase ?? BARANDAS[0].clase;
  const puedeUsar = (f) => !f.clave || desbloqueadas.includes(f.clave);

  // Lo mismo que con las fichas: si tiene puesto un paño que no le corresponde,
  // se cae al primero.
  const panoElegido = PANOS.find((p) => p.id === tema.pano);
  const clasePano = (panoElegido && puedeUsar(panoElegido) ? panoElegido : PANOS[0]).clase;

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

function Muestra({ clase, activo, titulo, onClick, alto = 'h-9', abierta = true }) {
  return (
    <button
      type="button"
      title={titulo}
      disabled={!abierta}
      onClick={onClick}
      className={`${clase} ${alto} relative w-full rounded-md border transition-all ${
        activo && abierta
          ? 'border-domino-accent ring-2 ring-domino-accent/50 scale-105'
          : 'border-black/50'
      } ${abierta ? 'hover:border-domino-accent/60' : 'cursor-not-allowed opacity-40'}`}
    >
      <span className="sr-only">{titulo}</span>
      {!abierta && (
        <Lock
          size={12}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-domino-accent drop-shadow"
          aria-hidden="true"
        />
      )}
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
        {PANOS.map((p) => {
          const abierta = puedeUsar(p);
          return (
            <Muestra
              key={p.id}
              clase={p.clase}
              abierta={abierta}
              titulo={abierta ? p.nombre : `${p.nombre} — ${p.comoSeGana}`}
              activo={tema.pano === p.id}
              onClick={() => abierta && setTema((t) => ({ ...t, pano: p.id }))}
            />
          );
        })}
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

      {[...FICHAS, ...PANOS].some((f) => !puedeUsar(f)) && (
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
