/**
 * El pozo, boca abajo y elegible.
 *
 * El azar ya ocurrió: el orden del pozo lo fijó la seed al repartir y no vuelve
 * a cambiar en toda la mano. Elegir una posición no mejora ni empeora las
 * probabilidades, pero la decisión es del jugador y no del servidor.
 */
export default function Pool({ cantidad = 0, activo = false, onRobar, robando = false }) {
  if (!cantidad) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-black/25 px-3 py-2 text-center">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Pozo</div>
        <div className="mt-1 text-xs italic text-slate-500">vacío</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 transition-colors ${
        activo ? 'border-domino-accent/60 bg-black/35' : 'border-slate-700/60 bg-black/20'
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">
          Pozo <span className="text-domino-accent">{cantidad}</span>
        </span>
        {activo && (
          <span className="text-[10px] italic text-domino-accent">elegí una</span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: cantidad }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!activo || robando}
            onClick={() => activo && !robando && onRobar?.(i)}
            title={activo ? `Levantar la ficha ${i + 1}` : `${cantidad} fichas en el pozo`}
            className={`pool-tile h-11 w-6 rounded-[3px] transition-all ${
              activo && !robando
                ? 'cursor-pointer hover:-translate-y-1 hover:brightness-125 hover:ring-2 hover:ring-domino-accent/70'
                : 'cursor-default opacity-70'
            }`}
          >
            <span className="sr-only">Ficha {i + 1} del pozo</span>
          </button>
        ))}
      </div>

      {activo && (
        <p className="mt-2 text-center text-[10px] leading-tight text-slate-400">
          No podés jugar. Levantá una ficha del pozo.
        </p>
      )}
    </div>
  );
}
