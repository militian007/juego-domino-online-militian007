export default function OpponentHand({ count = 0, position = 'top' }) {
  const tilesToShow = Math.min(count, 7);

  if (position === 'top') {
    return (
      <div className="flex items-start justify-center gap-0.5 px-2">
        {Array.from({ length: tilesToShow }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-8 sm:w-5 sm:h-10 bg-domino-card border border-slate-600 rounded shadow"
            style={{ marginLeft: i > 0 ? '-4px' : 0 }}
          />
        ))}
        {count > 0 && (
          <span className="ml-2 text-xs text-slate-400 self-center">({count})</span>
        )}
      </div>
    );
  }

  if (position === 'left') {
    return (
      <div className="flex flex-col items-center gap-0.5 py-2">
        {Array.from({ length: tilesToShow }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-4 sm:w-10 sm:h-5 bg-domino-card border border-slate-600 rounded shadow"
            style={{ marginTop: i > 0 ? '-4px' : 0 }}
          />
        ))}
        {count > 0 && (
          <span className="mt-1 text-xs text-slate-400">{count}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center gap-0.5 px-2">
      {Array.from({ length: tilesToShow }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-8 sm:w-5 sm:h-10 bg-domino-card border border-slate-600 rounded shadow"
          style={{ marginLeft: i > 0 ? '-4px' : 0 }}
        />
      ))}
      {count > 0 && (
        <span className="ml-2 text-xs text-slate-400 self-center">({count})</span>
      )}
    </div>
  );
}
