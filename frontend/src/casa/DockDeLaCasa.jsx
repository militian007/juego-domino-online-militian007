/**
 * EL DOCK DE LA CASA (seccion 197): la barra de abajo con las cinco puertas,
 * la misma que Raul aprobo en el truco y repitio en el ludo (8-sep: «la misma
 * que ya aprobe en el truco»). Vive abajo mientras el jugador esta en la casa;
 * desaparece cuando se sienta a la mesa (jugando no se navega, se juega).
 *
 * Las medallas son de bronce troquelado: la elegida es oro vivo, se levanta y
 * proyecta sombra; las demas son bronce dormido. TORNEO es la losa roja del
 * rayo, la misma de la portada del ludo (Raul, 19-sep). JUGAR es una ficha de
 * verdad (de las recortadas a mano), que a 30 px se lee sola.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

const PUERTAS = [
  { id: 'jugar', texto: 'JUGAR', pieza: '/tiles-hueso/tile_6_6.webp', ficha: true },
  { id: 'torneo', texto: 'TORNEO', pieza: '/umbral/losa-relampago.webp', losa: true },
  { id: 'panas', texto: 'PANAS', pieza: '/umbral/ico-panas.webp' },
  { id: 'caja', texto: 'CAJA', pieza: '/umbral/ico-caja.webp' },
  { id: 'perfil', texto: 'PERFIL', pieza: '/umbral/ico-perfil.webp' }
];

export default function DockDeLaCasa({ activa, onIr, aviso = {} }) {
  return (
    <nav
      aria-label="La casa"
      data-dock
      className="relative flex flex-none border-t border-black/50 px-0.5 pt-1 shadow-[inset_0_1px_0_rgba(255,214,150,0.22),0_-4px_18px_rgba(0,0,0,0.5)]"
      style={{ background: 'linear-gradient(180deg, #1F4A34 0%, #143024 45%, #0F2A1D 100%)', paddingBottom: 'calc(7px + env(safe-area-inset-bottom))' }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(216,180,92,0) 0%, rgba(216,180,92,0.6) 18%, rgba(240,220,166,0.9) 50%, rgba(216,180,92,0.6) 82%, rgba(216,180,92,0) 100%)' }}
      />
      {PUERTAS.map((p) => {
        const on = p.id === activa;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onIr(p.id)}
            aria-label={p.texto}
            aria-current={on ? 'page' : undefined}
            data-puerta={p.id}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-px pb-0.5 pt-2"
          >
            {p.losa ? (
              <span
                className="relative grid h-11 w-11 place-items-center transition-transform duration-200"
                style={{
                  transform: on ? 'translateY(-7px) scale(1.12)' : 'none',
                  filter: on ? 'drop-shadow(0 5px 8px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(230,190,100,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))'
                }}
              >
                <img src={p.pieza} alt="" className="absolute bottom-0 left-0 block h-[52px] w-auto" />
                {aviso[p.id] && !on && <Punto />}
              </span>
            ) : (
              <span
                className={`relative grid h-11 w-11 place-items-center rounded-full transition-transform duration-200 ${on ? 'medalla-encendida' : 'medalla-dormida'}`}
                style={{ transform: on ? 'translateY(-7px) scale(1.06)' : 'none' }}
              >
                {on && <span aria-hidden className="medalla-brillo absolute inset-[2px] rounded-full" />}
                {p.ficha ? (
                  <span className="relative block h-[30px] w-[16px]" style={{ filter: 'drop-shadow(0 1.5px 1px rgba(0,0,0,0.6))', opacity: on ? 1 : 0.9 }}>
                    <img src={p.pieza} alt="" className="absolute left-1/2 top-1/2 h-[16px] w-[30px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90" />
                  </span>
                ) : (
                  <img
                    src={p.pieza}
                    alt=""
                    width={30}
                    height={30}
                    className="relative block"
                    style={{
                      filter: on
                        ? 'brightness(0.3) saturate(1.6) drop-shadow(0 1.5px 0 rgba(255,248,220,0.55))'
                        : 'brightness(1.55) saturate(0.5) drop-shadow(0 1.5px 1px rgba(0,0,0,0.6))',
                      opacity: on ? 0.95 : 0.85
                    }}
                  />
                )}
                {aviso[p.id] && !on && <Punto />}
              </span>
            )}
            <span
              className={`whitespace-nowrap font-black tracking-[0.07em] ${on ? '-mt-px text-[9px] text-[#FFE7A8]' : 'mt-px text-[8.5px] text-domino-cream/60'}`}
              style={on ? { fontFamily: SERIF, textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
            >
              {p.texto}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function Punto() {
  return <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#5a3f1c] bg-domino-accent" />;
}
