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

  // Un 10% mas grandes que antes, a pedido del usuario.
  const dims = {
    xs: { w: 'w-[53px] h-[26px]', wv: 'w-[26px] h-[53px]' },
    sm: { w: 'w-[70px] h-[35px]', wv: 'w-[35px] h-[70px]' },
    md: { w: 'w-[88px] h-[44px] sm:w-[106px] sm:h-[53px]', wv: 'w-[44px] h-[88px] sm:w-[53px] sm:h-[106px]' },
    lg: { w: 'w-[106px] h-[53px] sm:w-[123px] sm:h-[62px]', wv: 'w-[53px] h-[106px] sm:w-[62px] sm:h-[123px]' }
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

  const reliefClass = onClick ? 'tile-hand' : 'tile-3d';
  const baseClasses = `transition-all duration-300 select-none relative rounded ${reliefClass} ${newestShadow}`;

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
      <span className="tile-edge" aria-hidden="true" />
      <img
        src={imgSrc}
        alt={`tile [${a}|${b}]`}
        style={imgStyle}
        className="max-w-none"
      />
      <span className="tile-sheen" aria-hidden="true" />
    </div>
  );
}

