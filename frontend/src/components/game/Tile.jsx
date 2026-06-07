export default function Tile({
  tile,
  orientation = 'horizontal',
  selected = false,
  dim = false,
  size = 'md',
  small = false,
  onClick,
  className = '',
  isNewest = false
}) {
  if (!tile) return null;
  const [a, b] = tile;

  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const imgSrc = `/tiles/tile_${min}_${max}.png`;

  const finalSize = size === 'md' && small ? 'sm' : size;

  const dims = {
    sm: { w: 'w-16 h-8', wv: 'w-8 h-16' },
    md: { w: 'w-20 h-10 sm:w-24 sm:h-12', wv: 'w-10 h-20 sm:w-12 sm:h-24' },
    lg: { w: 'w-24 h-12 sm:w-28 sm:h-14', wv: 'w-12 h-24 sm:w-14 sm:h-28' }
  };
  const d = dims[finalSize] || dims.md;

  const sizeClasses = orientation === 'horizontal' ? d.w : d.wv;

  // Rotation calculation:
  // For Horizontal:
  // - a <= b: rotate(0deg) -> min is on left, max is on right.
  // - a > b: rotate(180deg) -> min goes to right, max goes to left.
  // For Vertical:
  // - a <= b: rotate(90deg) -> min goes to top, max goes to bottom.
  // - a > b: rotate(270deg) -> min goes to bottom, max goes to top.
  let angle = 0;
  if (orientation === 'horizontal') {
    angle = a <= b ? 0 : 180;
  } else {
    angle = a <= b ? 90 : 270;
  }

  // Highlight/glow effect for the newest placed tile
  const newestShadow = isNewest
    ? 'shadow-[0_0_18px_rgba(212,175,55,0.95)] ring-2 ring-domino-accent/60 z-10 scale-105'
    : '';

  const baseClasses = `transition-all duration-300 select-none relative rounded ${newestShadow}`;

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:shadow-[0_0_12px_rgba(212,175,55,0.4)] active:scale-95 hover:scale-105'
    : '';

  const stateClasses = selected ? 'ring-4 ring-domino-accent -translate-y-2' : '';
  const dimClasses = dim ? 'opacity-60 brightness-50' : '';

  // Dynamic inline style for image sizing, centering and rotation.
  // In horizontal mode, the image fills the container.
  // In vertical mode, the container is visual aspect ratio 1:2. The image before transform is 2:1.
  // We size the image as 200% width and 50% height (so H x W relative to container W x H),
  // center it, and rotate around its center.
  const imgStyle = orientation === 'horizontal'
    ? {
        width: '100%',
        height: '100%',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        pointerEvents: 'none'
      }
    : {
        width: '200%',
        height: '50%',
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        pointerEvents: 'none'
      };

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${interactiveClasses} ${stateClasses} ${dimClasses} overflow-visible ${className}`}
    >
      <img
        src={imgSrc}
        alt={`tile [${a}|${b}]`}
        style={imgStyle}
        className="max-w-none"
      />
    </div>
  );
}

