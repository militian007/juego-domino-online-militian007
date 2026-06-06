export default function Scoreboard({ teamScores, mode, round, winningTeam, endReason }) {
  return (
    <div className="card p-3 sm:p-4 mb-3 sm:mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm sm:text-base">Ronda {round}</h3>
        {endReason && (
          <span className="text-[10px] sm:text-xs text-slate-400 italic">
            {endReason === 'domino' ? 'Dominó' : 'Trancado'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`p-2 sm:p-3 rounded-lg border-2 ${
            winningTeam === 1
              ? 'border-domino-accent bg-amber-500/10'
              : 'border-blue-500/50'
          }`}
        >
          <div className="text-[10px] sm:text-xs text-slate-400">Equipo 1</div>
          <div className="text-lg sm:text-2xl font-black text-blue-400">
            {teamScores[1] || 0}
          </div>
        </div>
        <div
          className={`p-2 sm:p-3 rounded-lg border-2 ${
            winningTeam === 2
              ? 'border-domino-accent bg-amber-500/10'
              : 'border-red-500/50'
          }`}
        >
          <div className="text-[10px] sm:text-xs text-slate-400">Equipo 2</div>
          <div className="text-lg sm:text-2xl font-black text-red-400">
            {teamScores[2] || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
