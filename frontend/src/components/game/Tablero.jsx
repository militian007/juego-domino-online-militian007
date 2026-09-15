/**
 * El marcador de la mesa.
 *
 * La de siempre es una placa de nogal atornillada a la baranda (la madera sale
 * recortada de la misma imagen de la mesa). Raul, 15 de septiembre: "la parte
 * de arriba no me gusta como se ve, creo que podemos mejorarla mucho". Van
 * tres direcciones mas para que elija, con `?marcador=a|b|c` (queda guardada):
 *
 *  - A "la banda de paño": una franja de paño oscuro con un filo de bronce,
 *    nombres chicos en mayuscula y puntos grandes en Cinzel oro. Sin madera.
 *  - B "el tablero del club": laca casi negra, los dos numeros grandes lado a
 *    lado con un punto de bronce en medio, y debajo una linea con ronda, meta
 *    y pozo. Como un marcador de cancha.
 *  - C "al aire": nada de placa; dos fichas flotando en las esquinas del paño
 *    y la ronda en una pastilla chica al centro. Gana paño la mesa.
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
/* A. La banda de paño                                                         */
/* ------------------------------------------------------------------------- */
function Lado({ etiqueta, valor, alineado = 'left', vaGanando }) {
  const derecha = alineado === 'right';
  return (
    <div className={`flex min-w-0 flex-1 flex-col ${derecha ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-domino-cream/70">{etiqueta}</span>
      <span
        className="text-[30px] font-bold leading-none"
        style={{
          fontFamily: SERIF,
          color: vaGanando ? BRONCE : '#EFE8D6',
          textShadow: '0 2px 6px rgba(0,0,0,.8)'
        }}
      >
        {valor}
      </span>
    </div>
  );
}

function BandaDePano({ mios, suyos, ronda, objetivo, pozo, sala, modalidad, myLabel, theirLabel }) {
  return (
    <div
      className="pointer-events-none relative mx-2 rounded-2xl px-4 py-2"
      style={{
        background: 'linear-gradient(180deg, #16382a 0%, #0e2419 100%)',
        boxShadow: `inset 0 0 0 1px rgba(216,180,92,.55), inset 0 1px 0 rgba(255,235,190,.12), 0 10px 22px -10px rgba(0,0,0,.9)`
      }}
    >
      <div className="flex items-center gap-3 pl-8">
        <Lado etiqueta={myLabel} valor={mios} vaGanando={mios > suyos} />

        <div className="flex shrink-0 flex-col items-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: BRONCE }}>Ronda {ronda}</span>
          <span className="mt-[1px] text-[11px] font-semibold text-domino-cream/85">a {objetivo}</span>
          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-domino-cream/70">
            {ROTULO[modalidad] && <span className="uppercase tracking-[0.14em]">{ROTULO[modalidad]} ·</span>}
            {pozo != null ? (<><IconoPozo className="h-[10px] w-[6px]" /> {pozo}</>) : <span className="uppercase tracking-[0.14em]">sin pozo</span>}
          </span>
        </div>

        <Lado etiqueta={theirLabel} valor={suyos} alineado="right" vaGanando={suyos > mios} />
      </div>
      <span className="absolute bottom-1 right-3 font-mono text-[8px] font-bold tracking-[0.22em] text-domino-cream/35">{sala}</span>
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

/* ------------------------------------------------------------------------- */
/* C. Al aire                                                                  */
/* ------------------------------------------------------------------------- */
function Ficha({ etiqueta, valor, vaGanando, alineado = 'left' }) {
  return (
    <div
      className={`flex min-w-0 max-w-[46%] items-center gap-2 rounded-full py-1 ${alineado === 'right' ? 'flex-row-reverse pl-3 pr-1' : 'pl-1 pr-3'}`}
      style={{
        background: 'rgba(6,14,10,.72)',
        boxShadow: `inset 0 0 0 1px rgba(216,180,92,${vaGanando ? '.75' : '.35'})`,
        backdropFilter: 'blur(4px)'
      }}
    >
      <span
        className="flex h-8 min-w-[32px] items-center justify-center rounded-full px-1.5 text-[18px] font-bold leading-none"
        style={{ fontFamily: SERIF, background: vaGanando ? BRONCE : 'rgba(216,180,92,.18)', color: vaGanando ? '#1D2A22' : '#EFE8D6' }}
      >
        {valor}
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-domino-cream/85">{etiqueta}</span>
    </div>
  );
}

function AlAire({ mios, suyos, ronda, objetivo, pozo, sala, modalidad, myLabel, theirLabel }) {
  return (
    <div className="pointer-events-none flex items-center justify-between gap-1.5 px-2 pl-12">
      <Ficha etiqueta={myLabel} valor={mios} vaGanando={mios > suyos} />
      <div className="flex shrink-0 flex-col items-center">
        <span className="rounded-full px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.26em]" style={{ background: 'rgba(6,14,10,.72)', color: BRONCE, boxShadow: 'inset 0 0 0 1px rgba(216,180,92,.45)' }}>
          Ronda {ronda} · a {objetivo}
        </span>
        <span className="mt-[3px] flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-domino-cream/60">
          {ROTULO[modalidad] && <span>{ROTULO[modalidad]} ·</span>}
          {pozo != null ? (<><IconoPozo className="h-[9px] w-[6px]" /> {pozo} ·</>) : <span>sin pozo ·</span>}
          <span className="font-mono tracking-[0.14em]">{sala}</span>
        </span>
      </div>
      <Ficha etiqueta={theirLabel} valor={suyos} vaGanando={suyos > mios} alineado="right" />
    </div>
  );
}

const VARIANTES = { a: BandaDePano, b: TableroDelClub, c: AlAire };

export default function Tablero({ variante, ...props }) {
  const Elegida = VARIANTES[variante] || PlacaDeNogal;
  return <Elegida {...props} />;
}
