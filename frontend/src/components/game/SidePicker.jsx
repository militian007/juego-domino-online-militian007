import Tile from './Tile.jsx';

export default function SidePicker({ tile, onSelect, onCancel, leftEnd, rightEnd }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="card p-6 sm:p-8 max-w-sm w-full">
        <h3 className="text-lg sm:text-xl font-bold mb-2 text-center">
          ¿Dónde colocar la ficha?
        </h3>
        <p className="text-slate-400 text-center text-sm mb-6">
          La ficha encaja en ambos extremos. Elige dónde.
        </p>

        <div className="flex items-center justify-around gap-4 mb-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">Izquierda ({leftEnd})</span>
            <button
              onClick={() => onSelect('left')}
              className="hover:scale-110 transition"
            >
              <Tile tile={tile} orientation="horizontal" small />
            </button>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-slate-400">Derecha ({rightEnd})</span>
            <button
              onClick={() => onSelect('right')}
              className="hover:scale-110 transition"
            >
              <Tile tile={tile} orientation="horizontal" small />
            </button>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="btn-secondary w-full"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
