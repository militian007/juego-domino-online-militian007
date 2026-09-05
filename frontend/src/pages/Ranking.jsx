import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { rankingApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * La clasificacion, hecha igual a la de PrivoyTruco.
 *
 * Tres vistas, podio de tres arriba con el primero en el centro y mas alto, y
 * debajo la lista corrida sobre un panel claro. Es la plataforma donde va a
 * vivir el motor, asi que el domino se ve como ella y no al reves.
 *
 * Se puede ver SIN cuenta: el que entra de visita tiene que poder ver quienes
 * son los mejores.
 *
 * Solo cuentan las partidas entre personas. Contra la maquina no suma nada.
 */

const VISTAS = [
  { id: 'general', etiqueta: 'General' },
  { id: 'semana', etiqueta: 'Esta semana' },
  { id: 'torneos', etiqueta: 'Torneos' }
];

const BAJADA = {
  general: (n) => `${n} ${n === 1 ? 'jugador clasificado' : 'jugadores clasificados'}`,
  semana: () => 'Arranca de cero cada lunes — cualquiera puede ganarla',
  torneos: () => 'Los campeones y sus copas'
};

/** El numero grande de cada uno, que cambia segun la vista. */
const marcador = (f, vista) =>
  vista === 'semana'
    ? `${f.puntos > 0 ? '+' : ''}${f.puntos}`
    : `${f.puntos}`;

/** El renglon chico de abajo, tambien distinto en cada vista. */
const detalle = (f, vista) =>
  vista === 'semana'
    ? `${f.victorias} ${f.victorias === 1 ? 'victoria' : 'victorias'} esta semana`
    : `${f.ganadas} ${f.ganadas === 1 ? 'victoria' : 'victorias'} · ${f.partidas} ${f.partidas === 1 ? 'jugada' : 'jugadas'} · ${f.porcentaje}%`;

export default function Ranking() {
  const { user } = useAuth();
  const [vista, setVista] = useState('general');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    setError(null);

    rankingApi
      .tabla(vista)
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setError('No se pudo cargar la clasificación'); });

    return () => { vivo = false; };
  }, [vista]);

  const tabla = datos?.tabla ?? [];
  const podio = tabla.slice(0, 3);
  const resto = tabla.slice(3);

  // El del medio es el primero: asi lo pone PrivoyTruco, y asi se lee de una
  // quien gano sin tener que buscar el numero.
  const ordenDelPodio = [podio[1], podio[0], podio[2]];

  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">
          ←
        </Link>
        <span className="text-[11px] font-semibold tracking-[0.3em] text-domino-cream/50">
          EL CUADRO DE HONOR
        </span>
        <span className="w-4" />
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-8">
        <h1 className="mt-5 text-3xl font-black tracking-tight text-domino-accent sm:text-4xl">
          CLASIFICACIÓN
        </h1>
        <p className="mt-1 text-sm text-domino-cream/55">
          {BAJADA[vista](datos?.clasificados ?? 0)}
        </p>

        <div className="mt-4 flex gap-2">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                vista === v.id
                  ? 'border-domino-accent bg-domino-accent text-black'
                  : 'border-domino-accent/25 bg-black/30 text-domino-cream/70 hover:border-domino-accent/60'
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
        {!datos && !error && <p className="mt-6 text-sm text-domino-cream/50">Cargando...</p>}

        {datos && vista === 'torneos' && (
          <p className="mt-6 rounded-xl border border-domino-accent/15 bg-black/30 p-4 text-sm leading-relaxed text-domino-cream/60">
            Todavía no hay torneos en el dominó, así que no hay copas que repartir. Cuando
            los haya, los campeones van a aparecer acá.
          </p>
        )}

        {datos && vista !== 'torneos' && tabla.length === 0 && (
          <p className="mt-6 rounded-xl border border-domino-accent/15 bg-black/30 p-4 text-sm leading-relaxed text-domino-cream/60">
            {vista === 'semana'
              ? 'Esta semana todavía no jugó nadie. El primero que gane una partida encabeza la tabla.'
              : 'Todavía no hay nadie clasificado. Se entra jugando una partida contra otra persona.'}
          </p>
        )}

        {datos && vista !== 'torneos' && tabla.length > 0 && (
          <>
            <div className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-3">
              {ordenDelPodio.map((f, i) =>
                f ? (
                  <Plaqueta
                    key={f.userId}
                    jugador={f}
                    vista={vista}
                    primero={i === 1}
                    soyYo={Number(f.userId) === Number(user?.id)}
                  />
                ) : (
                  <span key={`hueco-${i}`} />
                )
              )}
            </div>

            {resto.length > 0 && (
              <ul className="mt-5 divide-y divide-black/10 rounded-2xl bg-domino-cream/95 px-1 py-1 text-domino-dark shadow-2xl">
                {resto.map((f) => {
                  const soyYo = Number(f.userId) === Number(user?.id);
                  return (
                    <li
                      key={f.userId}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                        soyYo ? 'bg-domino-accent/25' : ''
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-domino-dark/45">
                        {f.puesto}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {f.username}
                          {soyYo && <span className="ml-1.5 text-[10px] font-semibold opacity-60">vos</span>}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-domino-dark/55">
                          {detalle(f, vista)}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {marcador(f, vista)}
                        <span className="ml-1 text-[11px] font-semibold text-domino-dark/50">
                          {vista === 'semana' ? '' : 'pts'}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Una de las tres placas del podio. */
function Plaqueta({ jugador, vista, primero, soyYo }) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-b from-domino-accent/25 to-black/40 px-2 pb-3 text-center shadow-xl ${
        primero
          ? 'border-domino-accent/70 pt-4'
          : 'border-domino-accent/30 pt-3'
      } ${soyYo ? 'ring-2 ring-domino-accent' : ''}`}
    >
      <div className="flex items-center justify-center gap-1">
        {primero && <Crown size={14} className="text-domino-accent" aria-hidden="true" />}
        <span
          className={`font-bold tabular-nums ${
            primero ? 'text-base text-domino-accent' : 'text-sm text-domino-cream/70'
          }`}
        >
          {jugador.puesto}
        </span>
      </div>

      <p
        className={`mt-1.5 truncate font-bold ${
          primero ? 'text-sm text-domino-cream' : 'text-xs text-domino-cream/90'
        }`}
      >
        {jugador.username}
      </p>

      <p
        className={`mt-1 font-black tabular-nums text-domino-accent ${
          primero ? 'text-2xl' : 'text-xl'
        }`}
      >
        {marcador(jugador, vista)}
      </p>
      {vista !== 'semana' && (
        <p className="text-[9px] font-bold tracking-widest text-domino-accent/70">PTS</p>
      )}

      <p className="mt-1.5 text-[9px] leading-tight text-domino-cream/50">
        {detalle(jugador, vista)}
      </p>
    </div>
  );
}
