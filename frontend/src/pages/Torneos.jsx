import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Zap } from 'lucide-react';
import { torneosApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket } from '../services/socket.js';

/**
 * La vitrina de torneos, con la forma de la de PrivoyTruco.
 *
 * Su pantalla es: cabecera "LA VITRINA", titulo TORNEOS, una tarjeta clara con
 * el torneo (nombre, cada cuanto, si es gratis, el premio, la proxima hora y
 * cuantos anotados, la lista de horarios y el boton ENTRAR), y debajo EL
 * PALMARES con los ultimos campeones.
 *
 * La diferencia con ellos es el premio: alla es un pozo en bolivares, aca son
 * **puntos y una copa**, porque todavia no hay pasarela de pago. Decision de
 * Jonathan.
 */

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const haceCuanto = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const minutos = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} d`;
};

export default function Torneos() {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [anotado, setAnotado] = useState([]);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(() => {
    torneosApi.vitrina()
      .then(setDatos)
      .catch(() => setError('No se pudieron cargar los torneos'));

    if (user) {
      torneosApi.mios()
        .then((r) => setAnotado(r.anotado ?? []))
        .catch(() => setAnotado([]));
    } else {
      setAnotado([]);
    }
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  // Si alguien mas se anota o un torneo arranca, la pantalla se pone al dia
  // sola: un contador de anotados congelado es lo que hace dudar si el torneo
  // esta vivo.
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;
    const alCambiar = () => cargar();
    socket.on('torneo:actualizado', alCambiar);
    socket.on('torneo:campeon', alCambiar);
    return () => {
      socket.off('torneo:actualizado', alCambiar);
      socket.off('torneo:campeon', alCambiar);
    };
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  const proximo = datos?.proximos?.[0] ?? null;
  const estoyAnotado = proximo ? anotado.includes(proximo.id) : false;

  const alternar = () => {
    if (!proximo) return;
    connectSocket()?.emit(
      'torneo:anotarse',
      { torneoId: proximo.id, anotarse: !estoyAnotado },
      (r) => {
        if (r?.ok === false) { setAviso(r.error); return; }
        setAnotado((antes) =>
          r.anotado ? [...new Set([...antes, proximo.id])] : antes.filter((x) => x !== proximo.id)
        );
        setAviso(r.anotado ? '¡Anotado! Te avisamos cuando arranque.' : 'Te borraste del torneo.');
        cargar();
      }
    );
  };

  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">←</Link>
        <span className="text-[11px] font-semibold tracking-[0.3em] text-domino-cream/50">
          LA VITRINA
        </span>
        <span className="w-4" />
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-8">
        <h1 className="mt-5 text-3xl font-black tracking-tight text-domino-accent sm:text-4xl">
          TORNEOS
        </h1>
        <p className="mt-1 text-sm text-domino-cream/55">
          Entrá, ganá la llave y llevate los puntos
        </p>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}
        {!datos && !error && <p className="mt-6 text-sm text-domino-cream/50">Cargando...</p>}

        {datos && (
          <>
            <div className="mt-6 rounded-2xl bg-domino-cream/95 p-5 text-domino-dark shadow-2xl">
              {proximo ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-1.5 text-base font-black">
                        <Zap size={16} aria-hidden="true" />
                        {proximo.nombre}
                      </h2>
                      <p className="mt-1 text-xs text-domino-dark/60">
                        cada media hora · gratis · {proximo.premioPuntos} puntos y una copa
                      </p>
                      <p className="mt-1 text-xs font-semibold text-domino-dark/75">
                        el próximo a las {hora(proximo.empiezaEn)} ·{' '}
                        {proximo.anotados} {proximo.anotados === 1 ? 'anotado' : 'anotados'}
                      </p>
                    </div>

                    {user ? (
                      <button
                        onClick={alternar}
                        className={`shrink-0 rounded-xl px-4 py-3 text-xs font-black tracking-wider shadow-md transition ${
                          estoyAnotado
                            ? 'border border-domino-dark/25 bg-transparent text-domino-dark/70'
                            : 'bg-emerald-700 text-white hover:brightness-110'
                        }`}
                      >
                        {estoyAnotado ? 'ANOTADO' : 'ENTRAR'}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="shrink-0 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-black tracking-wider text-white shadow-md"
                      >
                        ENTRAR
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {datos.proximos.slice(0, 8).map((t) => (
                      <span
                        key={t.id}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold tabular-nums ${
                          anotado.includes(t.id)
                            ? 'border-emerald-700 bg-emerald-700/10 text-emerald-800'
                            : 'border-domino-dark/20 text-domino-dark/70'
                        }`}
                      >
                        {hora(t.empiezaEn)}
                      </span>
                    ))}
                    {datos.proximos.length > 8 && (
                      <span className="px-1 py-1 text-xs text-domino-dark/50">
                        y {datos.proximos.length - 8} más
                      </span>
                    )}
                  </div>

                  {estoyAnotado && (
                    <p className="mt-3 text-[11px] leading-relaxed text-domino-dark/60">
                      Cuando arranque te va a saltar tu mesa. Si no entrás a tiempo, quedás
                      fuera del cuadro.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm leading-relaxed text-domino-dark/70">
                  No hay torneos anunciados en este momento.
                </p>
              )}

              {aviso && (
                <p className="mt-3 rounded-lg bg-domino-dark/10 px-3 py-2 text-xs text-domino-dark/80">
                  {aviso}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-domino-cream/95 p-5 text-domino-dark shadow-2xl">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <Trophy size={15} aria-hidden="true" />
                EL PALMARÉS
              </h2>

              {datos.palmares.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-domino-dark/60">
                  Todavía no hay campeones. El primero que gane un torneo queda acá.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/10">
                  {datos.palmares.map((c) => (
                    <li key={c.torneoId} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{c.campeon}</p>
                        <p className="truncate text-[11px] text-domino-dark/55">
                          {c.nombre} · {haceCuanto(c.terminadoEn)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        +{c.premioPuntos} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 flex justify-center">
              <Link
                to="/ranking"
                className="rounded-full border border-domino-accent/40 bg-black/40 px-5 py-2 text-xs font-semibold tracking-wider text-domino-cream"
              >
                Ver la clasificación
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
