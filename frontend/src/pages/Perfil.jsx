import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { perfilApi } from '../services/api.js';

/**
 * El perfil: quien sos y como te fue.
 *
 * Solo se cuentan las partidas entre personas. Las que son contra la maquina no
 * entran, por decision de Jonathan: un record que las incluye se infla solo y
 * deja de servir para comparar. Por eso, si alguien jugo diez contra el bot y
 * ninguna contra gente, aca va a ver cero, y el texto se lo explica en vez de
 * dejarlo pensando que se perdio algo.
 */

const NOMBRE_DEL_MODO = {
  '1v1': '1 vs 1',
  '2v2': '2 vs 2'
};

const MOTIVO = {
  blocked: 'trancado',
  timeout: 'sin tiempo',
  domino: 'dominó',
  forfeit: 'abandono'
};

export default function Perfil() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;

    perfilApi
      .mio()
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setError('No se pudo cargar el perfil'); });

    return () => { vivo = false; };
  }, []);

  const fecha = (cuando) => {
    const d = new Date(cuando);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">
          ← Volver
        </Link>
        <span className="text-xs font-semibold tracking-widest text-domino-accent sm:text-sm">
          MI PERFIL
        </span>
        <span className="w-14" />
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!datos && !error && <p className="text-sm text-domino-cream/50">Cargando...</p>}

        {datos && (
          <>
            <h1 className="text-2xl font-semibold sm:text-3xl">{datos.usuario.username}</h1>
            {/* Se pregunta por la fecha YA FORMATEADA: si lo que vino de la
                base no es una fecha valida, no se pinta el renglon en vez de
                dejar un "En el club desde el" colgado sin nada. */}
            {fecha(datos.usuario.desde) && (
              <p className="mt-1 text-xs text-domino-cream/50">
                En el club desde el {fecha(datos.usuario.desde)}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Numero valor={datos.resumen.jugadas} etiqueta="jugadas" />
              <Numero valor={datos.resumen.ganadas} etiqueta="ganadas" acento />
              <Numero valor={datos.resumen.perdidas} etiqueta="perdidas" />
            </div>

            {datos.resumen.porcentaje !== null && (
              <p className="mt-3 text-center text-sm text-domino-cream/60">
                Ganás el <span className="font-semibold text-domino-accent">{datos.resumen.porcentaje}%</span> de
                las que jugás
              </p>
            )}

            <h2 className="mt-8 text-xs font-semibold tracking-widest text-domino-cream/50">
              ÚLTIMAS PARTIDAS
            </h2>

            {datos.historial.length === 0 ? (
              <p className="mt-3 rounded-lg border border-domino-accent/15 bg-black/30 p-4 text-sm leading-relaxed text-domino-cream/60">
                Todavía no jugaste ninguna partida contra otra persona. Las partidas contra la
                máquina no cuentan para el récord, para que el número signifique algo.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {datos.historial.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-domino-accent/15 bg-black/30 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <span
                        className={`text-sm font-semibold ${p.gano ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {p.gano ? 'Ganaste' : 'Perdiste'}
                      </span>
                      <span className="ml-2 text-xs text-domino-cream/50">
                        {NOMBRE_DEL_MODO[p.modo] ?? p.modo}
                        {MOTIVO[p.motivo] ? ` · ${MOTIVO[p.motivo]}` : ''}
                      </span>
                      {p.contra.length > 0 && (
                        <p className="truncate text-xs text-domino-cream/45">
                          contra {p.contra.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {p.misPuntos} - {p.susPuntos}
                      </div>
                      <div className="text-[10px] text-domino-cream/40">{fecha(p.jugadaEl)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Numero({ valor, etiqueta, acento = false }) {
  return (
    <div className="rounded-lg border border-domino-accent/15 bg-black/30 py-4 text-center">
      <div className={`text-2xl font-semibold tabular-nums ${acento ? 'text-domino-accent' : ''}`}>
        {valor}
      </div>
      <div className="mt-0.5 text-[10px] tracking-widest text-domino-cream/45">
        {etiqueta.toUpperCase()}
      </div>
    </div>
  );
}
