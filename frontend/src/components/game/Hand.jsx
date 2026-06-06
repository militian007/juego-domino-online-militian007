import Tile from './Tile.jsx';

export default function Hand({ tiles, validIndices = [], selectedIndex, onSelect, canPlay }) {
  if (!tiles || tiles.length === 0) {
    return (
      <div className="text-center text-slate-400 italic text-sm py-4">
        Sin fichas en mano
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-visible py-3">
      <div
        className="flex items-center justify-center gap-2 px-2 mx-auto"
        style={{ minWidth: 'fit-content' }}
      >
        {tiles.map((tile, i) => {
          const isValid = validIndices.includes(i);
          const isSelected = selectedIndex === i;
          return (
            <div key={i} className="shrink-0">
              <Tile
                tile={tile}
                orientation="vertical"
                size="md"
                selected={isSelected}
                dim={canPlay && !isValid}
                onClick={() => isValid && onSelect && onSelect(i)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
