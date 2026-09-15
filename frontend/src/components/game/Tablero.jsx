/**
 * El marcador de la mesa.
 *
 * La de siempre es una placa de nogal atornillada a la baranda (la madera sale
 * recortada de la misma imagen de la mesa). Raul, 15 de septiembre: "la parte
 * de arriba no me gusta como se ve, creo que podemos mejorarla mucho". Van
 * tres direcciones para elegir (A la banda de paño, B el tablero del club,
 * C al aire; seccion 180) y eligio B "totalmente": laca casi negra, los dos
 * numeros grandes lado a lado con un punto de bronce en medio, y debajo una
 * linea de bronce con ronda, meta, pozo y codigo. Es la de siempre desde la
 * seccion 181. La placa de nogal de Jonathan sigue con `?marcador=nogal`,
 * para el informe.
 */

const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const BRONCE = '#D8B45C';

const Tornillo = ({ className }) => (
  <span
    className={`pointer-events-none absolute h-[7px] w-[7px] rounded-full ${className}`}
    style={{
      background: 'radial-gradient(circle at 34% 30%, #f0dda2, #a8862f 58%, #4a3a12)',
      boxShadow: '0 1px 1px rgba(0,0,0,.75), inset 0 -1px 1px rgba(0,0,0,.5)'
    }}
  />
);

function Puntaje({ etiqueta, valor, tono }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span
        className={`text-[9px] font-bold uppercase tracking-[0.22em] ${tono}`}
        style={{ textShadow: '0 1px 0 rgba(0,0,0,.7), 0 -1px 0 rgba(255,225,170,.18)' }}
      >
        {etiqueta}
      </span>
      <span
        className="flex min-w-[52px] items-center justify-center rounded-[5px] px-2 py-0.5 font-serif text-[26px] font-black leading-none text-amber-50"
        style={{
          background: 'linear-gradient(180deg, #241708, #3a2612)',
          boxShadow:
            'inset 0 2px 4px rgba(0,0,0,.9), inset 0 -1px 0 rgba(255,214,150,.14), 0 1px 0 rgba(255,225,180,.22)',
          textShadow: '0 2px 3px rgba(0,0,0,.9), 0 0 12px rgba(255,196,92,.35)'
        }}
      >
        {valor}
      </span>
    </div>
  );
}

/** Como se llama la modalidad en la placa. `pozo` es la de siempre y no se rotula. */
const ROTULO = { tranca: 'Tranca', cinco: 'Cinco' };

const IconoPozo = ({ className = 'h-[11px] w-[7px]' }) => (
  <svg viewBox="0 0 10 16" className={className} aria-hidden="true">
    <rect x="0.5" y="0.5" width="9" height="15" rx="1.6" fill="#20160c" stroke="#c9a24a" strokeWidth="1" />
    <line x1="1.4" y1="8" x2="8.6" y2="8" stroke="#c9a24a" strokeWidth="0.9" />
    <circle cx="5" cy="4.3" r="1.1" fill="#e8c974" />
    <circle cx="5" cy="11.7" r="1.1" fill="#e8c974" />
  </svg>
);

/* ------------------------------------------------------------------------- */
/* La placa de nogal (la de siempre)                                           */
/* ------------------------------------------------------------------------- */
function PlacaDeNogal({ mios, suyos, ronda, objetivo, pozo, sala, modalidad, myLabel, theirLabel }) {
  return (
    <div className="pointer-events-none">
    <div
      className="rounded-[10px]"
      style={{
        backgroundImage: "url('/placa-marcador.webp')",
        backgroundSize: '100% 100%',
        boxShadow:
          '0 14px 26px -8px rgba(0,0,0,.95), 0 2px 0 rgba(0,0,0,.6), inset 0 1px 0 rgba(255,231,190,.28)'
      }}
    >
      <div
        className="relative rounded-[10px] px-3 pb-3 pt-2"
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,.55), inset 0 0 0 2px rgba(206,168,86,.5), inset 0 0 14px rgba(0,0,0,.45)'
        }}
      >
        <Tornillo className="left-[5px] top-[5px]" />
        <Tornillo className="right-[5px] top-[5px]" />
        <Tornillo className="bottom-[5px] left-[5px]" />
        <Tornillo className="bottom-[5px] right-[5px]" />

        <div className="flex items-center px-7">
          <Puntaje etiqueta={myLabel} valor={mios} tono="text-sky-100" />

          <div className="flex flex-col items-center gap-[3px] px-2">
            <span
              className="rounded-full px-2 py-[1px] text-[9px] font-bold uppercase tracking-[0.14em] text-amber-100"
              style={{
                background: 'linear-gradient(180deg, rgba(30,18,6,.85), rgba(52,34,14,.85))',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,225,180,.18)'
              }}
            >
              Ronda {ronda} · a {objetivo}
            </span>

            {ROTULO[modalidad] && (
              <span
                className="rounded-full px-2 py-[1px] text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100"
                style={{
                  background: 'linear-gradient(180deg, rgba(6,30,18,.9), rgba(12,52,30,.9))',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(180,255,210,.18)'
                }}
              >
                {ROTULO[modalidad]}
              </span>
            )}

            {pozo != null ? (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-[1px] text-[10px] font-bold tracking-wider text-amber-100"
                style={{
                  background: 'linear-gradient(180deg, rgba(30,18,6,.85), rgba(52,34,14,.85))',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,225,180,.18)'
                }}
              >
                <IconoPozo />
                {pozo}
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-100/85">sin pozo</span>
            )}

            <span
              className="rounded-full px-2 font-mono text-[9px] font-bold tracking-[0.24em] text-domino-accent-bright"
              style={{
                background: 'linear-gradient(180deg, rgba(30,18,6,.85), rgba(52,34,14,.85))',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,225,180,.18)',
                textShadow: '0 1px 2px rgba(0,0,0,.9)'
              }}
            >
              {sala}
            </span>
          </div>

          <Puntaje etiqueta={theirLabel} valor={suyos} tono="text-rose-100" />
        </div>
      </div>
    </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* B. El tablero del club                                                      */
/* ------------------------------------------------------------------------- */
function TableroDelClub({ mios, suyos, ronda, objetivo, pozo, sala, modalidad, myLabel, theirLabel }) {
  const Numero = ({ valor, vaGanando }) => (
    <span
      className="min-w-[64px] text-center text-[40px] font-bold leading-none"
      style={{
        fontFamily: SERIF,
        color: vaGanando ? BRONCE : '#EFE8D6',
        textShadow: '0 3px 8px rgba(0,0,0,.9)',
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {valor}
    </span>
  );
  return (
    <div
      className="pointer-events-none relative mx-2 overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #0c1a14 0%, #060d0a 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(216,180,92,.5), 0 12px 24px -10px rgba(0,0,0,.95)'
      }}
    >
      <div className="flex items-end justify-center gap-4 px-4 pt-2">
        <div className="flex flex-col items-center">
          <Numero valor={mios} vaGanando={mios > suyos} />
          <span className="mt-1 max-w-[110px] truncate text-[9px] font-bold uppercase tracking-[0.26em] text-domino-cream/75">{myLabel}</span>
        </div>
        <span className="mb-5 h-[6px] w-[6px] rounded-full" style={{ background: BRONCE, boxShadow: `0 0 8px ${BRONCE}` }} />
        <div className="flex flex-col items-center">
          <Numero valor={suyos} vaGanando={suyos > mios} />
          <span className="mt-1 max-w-[110px] truncate text-[9px] font-bold uppercase tracking-[0.26em] text-domino-cream/75">{theirLabel}</span>
        </div>
      </div>
      <div
        className="mt-1.5 flex items-center justify-center gap-2 px-3 py-[5px] text-[9px] font-bold uppercase tracking-[0.22em] text-[#1D2A22]"
        style={{ background: `linear-gradient(90deg, #b8923f, ${BRONCE} 50%, #b8923f)` }}
      >
        <span>Ronda {ronda}</span><span className="opacity-60">·</span>
        <span>a {objetivo}</span><span className="opacity-60">·</span>
        {ROTULO[modalidad] && (<><span>{ROTULO[modalidad]}</span><span className="opacity-60">·</span></>)}
        <span>{pozo != null ? `Pozo ${pozo}` : 'Sin pozo'}</span><span className="opacity-60">·</span>
        <span className="font-mono tracking-[0.18em]">{sala}</span>
      </div>
    </div>
  );
}

const VARIANTES = { b: TableroDelClub, nogal: PlacaDeNogal };

export default function Tablero({ variante, ...props }) {
  const Elegida = VARIANTES[variante] || TableroDelClub;
  return <Elegida {...props} />;
}
