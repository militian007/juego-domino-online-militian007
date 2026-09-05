/**
 * La insignia del rango.
 *
 * Un solo componente para todos lados (cabecera, perfil, tabla de posiciones)
 * para que el mismo rango se vea siempre igual. Si cada pantalla lo pintara a
 * su manera, "Maestro" seria de un color en el menu y de otro en el perfil.
 *
 * Los colores suben como sube la escalera: apagado abajo, dorado arriba. El
 * dorado se reserva para Retador y no se usa en ningun otro rango, para que se
 * note de lejos quien llego.
 */

const COLORES = {
  'Novato': 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  'Aficionado': 'border-amber-700/45 bg-amber-700/10 text-amber-600',
  'Jugador de Club': 'border-slate-300/40 bg-slate-300/10 text-slate-200',
  'Veterano': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'Maestro': 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  'Gran Maestro': 'border-violet-400/45 bg-violet-400/10 text-violet-300',
  'Retador': 'border-domino-accent/60 bg-domino-accent/15 text-domino-accent'
};

const TAMANOS = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
};

export default function Rango({ rango, distincion = null, tamano = 'md', className = '' }) {
  if (!rango) return null;

  const color = COLORES[rango] ?? COLORES['Novato'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold tracking-wider ${color} ${TAMANOS[tamano]} ${className}`}
    >
      {rango === 'Retador' && <span aria-hidden="true">👑</span>}
      {rango.toUpperCase()}
      {/* La distincion solo existe para Retador: Top 100, Top 500, o el numero. */}
      {distincion && (
        <span className="rounded-full bg-black/40 px-1.5 py-px text-[0.85em] font-bold">
          {distincion}
        </span>
      )}
    </span>
  );
}
