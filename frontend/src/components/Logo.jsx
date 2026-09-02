/**
 * El logo del juego: dos fichas cruzadas sobre el nombre.
 *
 * Las fichas son el arte real del juego (`public/tiles/`), no un dibujo aparte:
 * el logo y la mesa hablan del mismo material. La tipografia es Cormorant
 * Garamond, la que ya usa la marca. Regla de oro, CLAUDE.md 1.1.
 *
 * Dos variantes porque un logo apilado no sirve en una cabecera:
 *  - `titulo`: fichas grandes cruzadas encima del nombre. Para la portada.
 *  - `linea`:  las mismas fichas chiquitas al lado del nombre. Para el menu.
 */

const ORO = 'linear-gradient(180deg,#f7e7a8 0%,#d4af37 48%,#9a7620 100%)';

function Nombre({ className = '', tamanoSub = 'text-[9px]' }) {
  return (
    <>
      <span
        className={`block font-serif font-semibold leading-[0.95] tracking-[0.06em] ${className}`}
        style={{
          backgroundImage: ORO,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.75))'
        }}
      >
        DOMINÓ
      </span>
      <span className={`block ${tamanoSub} tracking-[0.42em] text-domino-accent/75`}>
        CLUB PREMIER
      </span>
    </>
  );
}

function Fichas({ ancho, separacion }) {
  const sombra = 'drop-shadow(0 7px 13px rgba(0,0,0,.85))';
  return (
    <span
      className="relative block"
      style={{ width: ancho * 1.7, height: ancho * 0.62 }}
      aria-hidden="true"
    >
      <img
        src="/tiles/tile_6_6.png"
        alt=""
        className="absolute left-1/2 top-1/2"
        style={{
          width: ancho,
          transform: `translate(-50%,-50%) rotate(-20deg) translateX(${-separacion}px)`,
          filter: sombra
        }}
      />
      <img
        src="/tiles/tile_3_6.png"
        alt=""
        className="absolute left-1/2 top-1/2"
        style={{
          width: ancho,
          transform: `translate(-50%,-50%) rotate(16deg) translateX(${separacion}px)`,
          filter: sombra
        }}
      />
    </span>
  );
}

export default function Logo({ variante = 'titulo', className = '' }) {
  if (variante === 'linea') {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label="Dominó Club Premier">
        <Fichas ancho={46} separacion={9} />
        <span className="text-left">
          <Nombre className="text-[26px]" tamanoSub="text-[7px] mt-0.5" />
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-col items-center ${className}`} role="img" aria-label="Dominó Club Premier">
      <Fichas ancho={112} separacion={23} />
      <span className="mt-2 text-center">
        <Nombre className="text-[44px] sm:text-[56px]" tamanoSub="text-[9px] sm:text-[10px] mt-1" />
      </span>
    </span>
  );
}
