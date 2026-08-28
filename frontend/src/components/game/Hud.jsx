import Avatar, { Estrellas } from './Avatar.jsx';

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-domino-accent/15 bg-black/30 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function Rotulo({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{children}</div>
  );
}

/** Marcador: las dos barras avanzan hacia el objetivo. */
export function Marcador({ equipo1 = 0, equipo2 = 0, objetivo = 100, ronda = 1, miEquipo = 1 }) {
  const barra = (puntos) => Math.min(100, (puntos / objetivo) * 100);

  return (
    <Panel className="p-3">
      <div className="mb-2.5 flex items-baseline justify-between">
        <Rotulo>Ronda {ronda}</Rotulo>
        <span className="text-[10px] text-slate-500">a {objetivo}</span>
      </div>

      {[
        { n: 1, puntos: equipo1, color: 'bg-sky-400', texto: 'text-sky-300' },
        { n: 2, puntos: equipo2, color: 'bg-rose-400', texto: 'text-rose-300' }
      ].map((e) => (
        <div key={e.n} className="mb-2 last:mb-0">
          <div className="mb-1 flex items-baseline justify-between">
            <span className={`text-[11px] ${e.texto}`}>
              Equipo {e.n}
              {miEquipo === e.n && <span className="ml-1 text-slate-500">· vos</span>}
            </span>
            <span className={`font-mono text-lg font-bold leading-none ${e.texto}`}>{e.puntos}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
            <div
              className={`h-full rounded-full ${e.color} transition-all duration-500`}
              style={{ width: `${barra(e.puntos)}%` }}
            />
          </div>
        </div>
      ))}
    </Panel>
  );
}

/** Tarjeta de un jugador: retrato, nombre, dificultad y fichas en mano. */
export function Jugador({ jugador, fichas = 0, enTurno = false, esRival = false }) {
  if (!jugador) return null;

  return (
    <Panel className={`p-3 transition-colors ${enTurno ? 'border-domino-accent/70 bg-domino-accent/5' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar semilla={jugador.avatar || jugador.username} tamano={46} />
          {enTurno && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-domino-dark bg-emerald-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-domino-cream">{jugador.username}</div>
          {jugador.estrellas ? (
            <div className="mt-0.5 flex items-center gap-1.5">
              <Estrellas cantidad={jugador.estrellas} />
              <span className="text-[10px] capitalize text-slate-500">{jugador.difficulty}</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">{esRival ? 'Rival' : 'Vos'}</div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-bold leading-none text-domino-accent">{fichas}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500">fichas</div>
        </div>
      </div>

      {fichas > 0 && (
        <div className="mt-2.5 flex gap-[3px]">
          {Array.from({ length: Math.min(fichas, 14) }, (_, i) => (
            <span key={i} className="h-4 flex-1 rounded-[2px] bg-gradient-to-b from-[#2c1c0f] to-[#0d0805] ring-1 ring-domino-accent/20" />
          ))}
        </div>
      )}

      {jugador.frase && enTurno && (
        <p className="mt-2 text-[10px] italic leading-tight text-slate-500">"{jugador.frase}"</p>
      )}
    </Panel>
  );
}

/** Datos de la mesa: sala y pozo. */
export function Mesa({ sala, pozo = null }) {
  return (
    <Panel className="p-3">
      <Rotulo>Sala</Rotulo>
      <div className="mt-0.5 font-mono text-base font-bold tracking-[0.2em] text-domino-accent">
        {sala || '······'}
      </div>

      {pozo !== null && (
        <div className="mt-3 border-t border-slate-700/50 pt-2.5">
          <div className="flex items-baseline justify-between">
            <Rotulo>Pozo</Rotulo>
            <span className="font-mono text-base font-bold text-domino-cream">{pozo}</span>
          </div>
          <div className="mt-1.5 flex gap-[2px]">
            {Array.from({ length: 14 }, (_, i) => (
              <span
                key={i}
                className={`h-3 flex-1 rounded-[1px] ${
                  i < pozo
                    ? 'bg-gradient-to-b from-[#2c1c0f] to-[#0d0805] ring-1 ring-domino-accent/20'
                    : 'bg-black/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
