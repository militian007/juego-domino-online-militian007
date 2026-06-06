const PIP_POSITIONS = {
  0: [],
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
};

function Pips({ value, size = 'sm' }) {
  const positions = PIP_POSITIONS[value] || [];
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5 sm:w-3 sm:h-3';
  return (
    <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-0 p-[2px]">
      {Array.from({ length: 9 }).map((_, i) => {
        const x = i % 3;
        const y = Math.floor(i / 3);
        const show = positions.some(([px, py]) => px === x && py === y);
        return (
          <div key={i} className="flex items-center justify-center">
            {show && <div className={`rounded-full bg-domino-dark ${dotSize}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function Tile({
  tile,
  orientation = 'horizontal',
  selected = false,
  dim = false,
  size = 'md',
  onClick,
  className = ''
}) {
  if (!tile) return null;
  const [a, b] = tile;

  const dims = {
    sm: { w: 'w-16 h-8', wv: 'w-8 h-16' },
    md: { w: 'w-20 h-10 sm:w-24 sm:h-12', wv: 'w-10 h-20 sm:w-12 sm:h-24' },
    lg: { w: 'w-24 h-12 sm:w-28 sm:h-14', wv: 'w-12 h-24 sm:w-14 sm:h-28' }
  };
  const d = dims[size] || dims.md;

  const sizeClasses = orientation === 'horizontal' ? d.w : d.wv;
  const pipsSize = size === 'sm' ? 'sm' : 'lg';

  const baseClasses =
    'bg-domino-cream border-2 border-domino-dark rounded shadow-md transition select-none';

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-lg active:scale-95'
    : '';

  const stateClasses = selected ? 'ring-4 ring-domino-accent -translate-y-2' : '';
  const dimClasses = dim ? 'opacity-40' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${interactiveClasses} ${stateClasses} ${dimClasses} ${className}`}
    >
      <div
        className={`w-full h-full flex ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}
      >
        <div
          className={`flex-1 relative ${
            orientation === 'horizontal' ? 'border-r-2' : 'border-b-2'
          } border-domino-dark`}
        >
          <Pips value={a} size={pipsSize} />
        </div>
        <div className="flex-1 relative">
          <Pips value={b} size={pipsSize} />
        </div>
      </div>
    </div>
  );
}
