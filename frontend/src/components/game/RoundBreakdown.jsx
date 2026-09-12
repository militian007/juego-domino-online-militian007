import Tile from './Tile.jsx';

/**
 * Las manos que quedaron al cerrar la ronda, con sus pips.
 * Está para que el puntaje se pueda verificar a ojo y no haya que creerle
 * al servidor.
 */
export default function RoundBreakdown({ manos, equipoGanador, motivo, puntos }) {
  if (!manos || manos.length === 0) return null;

  const suman = manos.filter((m) =>
    motivo === 'domino' ? m.team !== equipoGanador : m.team !== equipoGanador
  );
  const totalQueSuma = suman.reduce((acc, m) => acc + m.pips, 0);

  return (
    <div className="mb-5 rounded-xl border border-slate-700/60 bg-black/25 p-3 text-left">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-domino-cream-dim">
        Fichas que quedaron
      </div>

      <div className="space-y-2.5">
        {manos.map((m) => {
          const ganador = m.team === equipoGanador;
          return (
            <div key={m.id}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className={ganador ? 'font-medium text-domino-accent' : 'font-medium text-domino-cream'}>
                  {m.username}
                  {ganador && ' · ganó'}
                </span>
                {/* Los pips del que PERDIO son los que suman, y son los que
                    salen volando hasta el total (§123). El marcador lo lee
                    `PuntosQueVuelan` por este atributo. */}
                <span
                  data-pips-volando={ganador ? undefined : ''}
                  className={ganador ? 'font-medium text-domino-cream-dim' : 'font-bold text-domino-accent'}
                >
                  {m.pips} pips
                </span>
              </div>

              {m.tiles.length === 0 ? (
                <div className="text-[11px] font-medium italic text-domino-cream-dim">se quedó sin fichas</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {m.tiles.map((t, i) => (
                    <Tile key={`${m.id}-${i}`} tile={t} orientation="horizontal" size="sm" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {equipoGanador ? (
        <div className="mt-3 border-t border-slate-700/60 pt-2 text-[11px] font-medium text-domino-cream-dim">
          {suman.map((m) => m.pips).join(' + ')} = <b className="text-domino-accent">{totalQueSuma}</b>
          {totalQueSuma !== puntos && (
            <span className="ml-2 text-red-400">
              (el servidor otorgó {puntos} — avisá si no coincide)
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-700/60 pt-2 text-[11px] font-medium text-domino-cream-dim">
          Empate de pips: no suma nadie.
        </div>
      )}
    </div>
  );
}
