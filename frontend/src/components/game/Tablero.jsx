/**
 * El marcador de la mesa: una placa de nogal con filos de laton, recortada de
 * la misma imagen de la baranda para que sea el mismo material y no uno
 * parecido.
 *
 * Reemplaza a los numeros sueltos en las esquinas: en pantalla ancha quedaban
 * a metros uno del otro y no se leian como un marcador.
 */
export default function Tablero({ mios, suyos, ronda, objetivo, pozo, sala }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-2 z-20 w-[min(84%,330px)] -translate-x-1/2 overflow-hidden rounded-lg shadow-[0_10px_24px_-6px_rgba(0,0,0,0.85)]"
      style={{
        backgroundImage: "url('/placa-marcador.webp')",
        backgroundSize: '100% 100%'
      }}
    >
      <div className="flex items-stretch px-2 py-1.5 text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        <div className="flex-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-200/90">Vos</div>
          <div className="font-serif text-2xl font-black leading-none text-white">{mios}</div>
        </div>

        <div className="flex flex-1 flex-col justify-center border-x border-black/25 px-1">
          <div className="text-[9px] uppercase tracking-[0.14em] text-amber-100/80">
            Ronda {ronda} · a {objetivo}
          </div>
          {pozo != null ? (
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200/90">
              Pozo · {pozo}
            </div>
          ) : (
            <div className="text-[10px] uppercase tracking-[0.12em] text-amber-100/50">Sin pozo</div>
          )}
          <div className="font-mono text-[9px] tracking-[0.12em] text-amber-100/60">{sala}</div>
        </div>

        <div className="flex-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-rose-200/90">Ellos</div>
          <div className="font-serif text-2xl font-black leading-none text-white">{suyos}</div>
        </div>
      </div>
    </div>
  );
}
