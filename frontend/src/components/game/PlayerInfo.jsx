export default function PlayerInfo({ player, count, isTurn, isWinner, team }) {
  if (!player) return null;

  const teamColor =
    team === 1 ? 'border-blue-500' : team === 2 ? 'border-red-500' : 'border-slate-500';

  return (
    <div
      className={`flex flex-col items-center gap-1 px-2 ${
        isTurn ? 'animate-pulse' : ''
      }`}
    >
      <div
        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border-2 ${teamColor} bg-domino-card/80 text-center min-w-[100px] sm:min-w-[140px] ${
          isWinner ? 'ring-4 ring-domino-accent' : ''
        }`}
      >
        <div className="text-xs sm:text-sm font-bold truncate max-w-[120px] sm:max-w-[160px]">
          {player.username}
          {player.isBot && ' 🤖'}
        </div>
        <div className="text-[10px] sm:text-xs text-slate-400">
          {count} ficha{count !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
