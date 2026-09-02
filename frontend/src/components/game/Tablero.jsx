/**
 * El marcador de la mesa: una placa de nogal atornillada a la baranda.
 *
 * La madera sale recortada de la misma imagen de la mesa, asi que es el mismo
 * material y no uno parecido. Lo que la hace ver placa y no tabla pegada son
 * tres cosas: los numeros van en cartuchos hundidos, hay un filo de laton por
 * dentro, y la sombra la separa del paño.
 */

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
      {/* Cartucho hundido: el numero se lee porque esta sobre madera oscura,
          no sobre la veta clara. */}
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

export default function Tablero({ mios, suyos, ronda, objetivo, pozo, sala }) {
  return (
    <div className="pointer-events-none min-w-0 flex-1 pb-1">
    <div
      className="rounded-[10px]"
      style={{
        backgroundImage: "url('/placa-marcador.webp')",
        backgroundSize: '100% 100%',
        boxShadow:
          '0 14px 26px -8px rgba(0,0,0,.95), 0 2px 0 rgba(0,0,0,.6), inset 0 1px 0 rgba(255,231,190,.28)'
      }}
    >
      {/* Filo de laton por dentro, como el de la baranda */}
      <div
        className="relative rounded-[10px] px-3 py-2"
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,.55), inset 0 0 0 2px rgba(206,168,86,.5), inset 0 0 14px rgba(0,0,0,.45)'
        }}
      >
        <Tornillo className="left-[5px] top-[5px]" />
        <Tornillo className="right-[5px] top-[5px]" />
        <Tornillo className="bottom-[5px] left-[5px]" />
        <Tornillo className="bottom-[5px] right-[5px]" />

        <div className="flex items-center">
          <Puntaje etiqueta="Vos" valor={mios} tono="text-sky-100" />

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

            {pozo != null ? (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-[1px] text-[10px] font-bold tracking-wider text-amber-100"
                style={{
                  background: 'linear-gradient(180deg, rgba(30,18,6,.85), rgba(52,34,14,.85))',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.8), 0 1px 0 rgba(255,225,180,.18)'
                }}
              >
                <svg viewBox="0 0 10 16" className="h-[11px] w-[7px]" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="9" height="15" rx="1.6" fill="#20160c" stroke="#c9a24a" strokeWidth="1" />
                  <line x1="1.4" y1="8" x2="8.6" y2="8" stroke="#c9a24a" strokeWidth="0.9" />
                  <circle cx="5" cy="4.3" r="1.1" fill="#e8c974" />
                  <circle cx="5" cy="11.7" r="1.1" fill="#e8c974" />
                </svg>
                {pozo}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-amber-100/45">sin pozo</span>
            )}

          </div>

          <Puntaje etiqueta="Ellos" valor={suyos} tono="text-rose-100" />
        </div>
      </div>
    </div>

    <div
      className="mt-0.5 text-center font-mono text-[9px] tracking-[0.22em] text-amber-100/35"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,.9)' }}
    >
      {sala}
    </div>
    </div>
  );
}
