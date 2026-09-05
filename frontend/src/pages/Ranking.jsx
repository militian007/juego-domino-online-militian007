import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rankingApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Rango from '../components/ranking/Rango.jsx';

/**
 * La tabla de posiciones del club.
 *
 * Se puede ver SIN cuenta: el que entra de visita tiene que poder ver quienes
 * son los mejores. Es la mitad de la gracia de tener ranking.
 *
 * Solo cuentan las partidas entre personas. Contra la maquina no suma nada, por
 * decision de Jonathan: un record que incluye partidas contra bots se infla
 * solo y deja de servir para comparar.
 */
export default function Ranking() {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    rankingApi
      .tabla()
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setError('No se pudo cargar el ranking'); });
    return () => { vivo = false; };
  }, []);

  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">
          ← Volver
        </Link>
        <span className="text-xs font-semibold tracking-widest text-domino-accent sm:text-sm">
          RANKING
        </span>
        <span className="w-14" />
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!datos && !error && <p className="text-sm text-domino-cream/50">Cargando...</p>}

        {datos && (
          <>
            <p className="text-xs leading-relaxed text-domino-cream/50">
              Solo cuentan las partidas contra otra persona. Los puntos se mueven según
              quién sea el rival: ganarle a alguien mejor da más.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-domino-accent/20 bg-black/30 px-4 py-3">
              <Rango rango="Retador" tamano="sm" />
              <span className="text-xs text-domino-cream/60">
                {datos.retadores === 0
                  ? `Nadie llegó todavía. Se entra con ${datos.puntosDeRetador} puntos.`
                  : `${datos.retadores} ${datos.retadores === 1 ? 'jugador llegó' : 'jugadores llegaron'}. Se entra con ${datos.puntosDeRetador} puntos.`}
              </span>
            </div>

            {datos.tabla.length === 0 ? (
              <p className="mt-6 rounded-lg border border-domino-accent/15 bg-black/30 p-4 text-sm leading-relaxed text-domino-cream/60">
                Todavía no hay nadie en la tabla. Se entra jugando una partida contra otra
                persona: la primera que termine ya te pone acá.
              </p>
            ) : (
              <ul className="mt-4 space-y-1.5">
                {datos.tabla.map((f) => {
                  const soyYo = Number(f.userId) === Number(user?.id);
                  return (
                    <li
                      key={f.userId}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                        soyYo
                          ? 'border-domino-accent/45 bg-domino-accent/10'
                          : 'border-domino-accent/12 bg-black/30'
                      }`}
                    >
                      <span
                        className={`w-8 shrink-0 text-center text-sm font-bold tabular-nums ${
                          f.puesto <= 3 ? 'text-domino-accent' : 'text-domino-cream/40'
                        }`}
                      >
                        {f.puesto}
                      </span>

                      {/* El nombre arriba con todo el ancho y la insignia
                          debajo. En una sola linea, en un telefono de 375, la
                          insignia le comia el espacio y los nombres salian
                          cortados: "ElNeg...", "Mam...". */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-domino-cream">
                          {f.username}
                          {soyYo && <span className="ml-1.5 text-[10px] text-domino-accent">vos</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Rango rango={f.rango} distincion={f.distincion} tamano="sm" />
                          <span className="text-[11px] text-domino-cream/40">
                            {f.ganadas} de {f.partidas} {f.partidas === 1 ? 'partida' : 'partidas'}
                          </span>
                        </div>
                      </div>

                      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-domino-cream/85">
                        {f.puntos}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <h2 className="mt-8 text-xs font-semibold tracking-widest text-domino-cream/50">
              LA ESCALERA
            </h2>
            <ul className="mt-3 space-y-1.5">
              {[...datos.rangos].reverse().map((r) => (
                <li
                  key={r.nombre}
                  className="flex items-center justify-between rounded-lg border border-domino-accent/12 bg-black/25 px-3 py-2"
                >
                  <Rango rango={r.nombre} tamano="sm" />
                  <span className="text-xs tabular-nums text-domino-cream/50">
                    {r.desde === 0 ? 'hasta 999' : `desde ${r.desde}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
