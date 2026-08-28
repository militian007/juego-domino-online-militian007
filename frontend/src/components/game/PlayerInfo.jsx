import Avatar, { Estrellas } from './Avatar.jsx';

export default function PlayerInfo({ player, count, isTurn, isWinner, team }) {
  if (!player) return null;

  const borde =
    team === 1 ? 'border-sky-500/70' : team === 2 ? 'border-rose-500/70' : 'border-slate-600';

  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div
        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${borde} bg-domino-card/80 transition-all ${
          isTurn ? 'ring-2 ring-domino-accent/60 shadow-lg shadow-black/40' : ''
        } ${isWinner ? 'ring-4 ring-domino-accent' : ''}`}
      >
        <div className="relative shrink-0">
          <Avatar semilla={player.avatar || player.username} tamano={34} />
          {isTurn && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-domino-card bg-emerald-400" />
          )}
        </div>

        <div className="min-w-0 text-left">
          <div className="max-w-[130px] truncate text-xs font-bold sm:max-w-[170px] sm:text-sm">
            {player.username}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 sm:text-xs">
              {count} ficha{count !== 1 ? 's' : ''}
            </span>
            {player.estrellas ? <Estrellas cantidad={player.estrellas} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
