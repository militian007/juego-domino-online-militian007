import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rankingApi, haySesion } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/game/Avatar.jsx';
import MesaConSillas from '../antesala/MesaConSillas.jsx';
import { identidad } from '../umbral/identidad.js';
import PuertasDeLaCasa from '../casa/PuertasDeLaCasa.jsx';

/**
 * EL CUADRO DE HONOR, vestido de club (seccion 193, ficha 4.1 de la plantilla).
 *
 * Raul escogio, entre tres, "el podio de bronce": la estructura que ya habia
 * (podio de tres y lista, tres vistas) con la piel de Paño y Madera. Paño de
 * fondo, Cinzel en el titulo y los numeros, retratos en aro de bronce, y al
 * pie el cierre de la semana: los puntos semanales arrancan de cero cada
 * lunes a medianoche, hora de Caracas.
 *
 * Se puede ver SIN cuenta: el que entra de visita tiene que poder ver quienes
 * son los mejores. Solo cuentan las partidas entre personas.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

const VISTAS = [
  { id: 'semana', etiqueta: 'ESTA SEMANA' },
  { id: 'general', etiqueta: 'SIEMPRE' },
  { id: 'torneos', etiqueta: 'TORNEOS' }
];

const marcador = (f, vista) => {
  if (vista === 'semana') return `${f.puntos > 0 ? '+' : ''}${f.puntos}`;
  if (vista === 'torneos') return `${f.copas}`;
  return `${f.puntos}`;
};

const unidad = (vista, f) => {
  if (vista === 'semana') return 'PTS';
  if (vista === 'torneos') return f?.copas === 1 ? 'COPA' : 'COPAS';
  return 'PTS';
};

const detalle = (f, vista) => {
  if (vista === 'semana') return `${f.victorias} ${f.victorias === 1 ? 'victoria' : 'victorias'} esta semana`;
  if (vista === 'torneos') return `${f.ganadas} ${f.ganadas === 1 ? 'victoria' : 'victorias'} de vida`;
  return `${f.ganadas} ${f.ganadas === 1 ? 'victoria' : 'victorias'} · ${f.partidas} ${f.partidas === 1 ? 'jugada' : 'jugadas'} · ${f.porcentaje}%`;
};

/**
 * Cuanto falta para el lunes a medianoche de Caracas (UTC-4, sin horario de
 * verano). Se calcula en Caracas y no en el reloj del telefono para que un
 * jugador en Madrid vea el mismo cierre que uno en Maracay.
 */
function faltaParaElLunes(ahora = new Date()) {
  const caracas = new Date(ahora.getTime() - 4 * 3600 * 1000);
  const dia = caracas.getUTCDay(); // 0 domingo ... 1 lunes
  const hastaLunes = (8 - dia) % 7 || 7;
  const cierre = Date.UTC(caracas.getUTCFullYear(), caracas.getUTCMonth(), caracas.getUTCDate() + hastaLunes);
  const ms = cierre - caracas.getTime();
  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor((ms % 86400000) / 3600000);
  if (dias >= 1) return `FALTAN ${dias} ${dias === 1 ? 'DÍA' : 'DÍAS'}`;
  return `FALTAN ${Math.max(1, horas)} ${horas === 1 ? 'HORA' : 'HORAS'}`;
}

function Retrato({ jugador, tamano }) {
  if (jugador.foto) return <Avatar semilla={jugador.username} foto={jugador.foto} tamano={tamano} />;
  return <MesaConSillas.Retrato avatar={jugador.avatar || jugador.username} tamano={tamano} />;
}

export default function Ranking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const yo = identidad();
  const [vista, setVista] = useState('semana');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    setError(null);
    rankingApi
      .tabla(vista)
      .then((d) => { if (vivo) setDatos(d); })
      .catch(() => { if (vivo) setError('No se pudo cargar el cuadro'); });
    return () => { vivo = false; };
  }, [vista]);

  const tabla = datos?.tabla ?? [];
  const podio = tabla.slice(0, 3);
  const resto = tabla.slice(3);
  const ordenDelPodio = [podio[1], podio[0], podio[2]];
  const soyYo = (f) => user && Number(f.userId) === Number(user.id);
  const conCuenta = haySesion() && user;

  const pie = vista === 'semana'
    ? `LA SEMANA CIERRA EL LUNES A MEDIANOCHE · ${faltaParaElLunes()}`
    : vista === 'torneos'
      ? 'LOS CAMPEONES Y SUS COPAS'
      : `${datos?.clasificados ?? 0} ${datos?.clasificados === 1 ? 'JUGADOR CLASIFICADO' : 'JUGADORES CLASIFICADOS'}`;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#08120c] text-domino-cream">
      <div className="felt-tela absolute inset-0 opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#08120c]/65 to-[#08120c]" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} aria-label="Volver" className="text-3xl leading-none text-domino-accent">‹</button>
          <span className="whitespace-nowrap text-[10px] font-bold tracking-[0.3em] text-domino-accent/90">EL CUADRO DE HONOR</span>
          {conCuenta || yo ? (
            <span className="flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/40 py-1 pl-1 pr-3 text-sm font-bold">
              <MesaConSillas.Retrato avatar={conCuenta ? user.username : yo.retrato} tamano={26} />
              <span className="max-w-[88px] truncate">{conCuenta ? user.username : yo.nombre}</span>
            </span>
          ) : <span className="w-6" />}
        </header>

        <h1 className="mt-3 text-[32px] font-bold leading-none text-domino-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ fontFamily: SERIF }}>
          Cuadro de Honor
        </h1>

        <div className="mt-3 flex w-max overflow-hidden rounded-full border border-domino-accent/60">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              className={`px-3.5 py-2 text-[11px] font-extrabold tracking-[0.18em] ${vista === v.id ? 'bg-domino-accent text-domino-dark' : 'text-domino-accent'}`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-sm font-semibold text-red-300">{error}</p>}
        {!datos && !error && <p className="mt-6 text-sm font-semibold text-domino-cream/60">Cargando...</p>}

        {datos && tabla.length === 0 && (
          <p className="mt-6 rounded-xl border border-domino-accent/30 bg-black/35 p-4 text-sm font-semibold leading-relaxed text-domino-cream/80">
            {vista === 'semana'
              ? 'Esta semana todavía no ha jugado nadie. El primero que gane una partida encabeza el cuadro.'
              : vista === 'torneos'
                ? 'Todavía no hay campeones. El primero que gane un torneo queda aquí.'
                : 'Todavía no hay nadie clasificado. Se entra jugando una partida contra otra persona.'}
          </p>
        )}

        {datos && tabla.length > 0 && (
          <>
            <div className="mt-4 flex items-end justify-center gap-2">
              {ordenDelPodio.map((f, i) => (f ? (
                <Plaqueta key={f.userId} jugador={f} vista={vista} primero={i === 1} soyYo={soyYo(f)} />
              ) : (
                <span key={`hueco-${i}`} className="w-[27%]" />
              )))}
            </div>

            {resto.length > 0 && (
              <ul className="mt-3">
                {resto.map((f) => (
                  <li
                    key={f.userId}
                    className={`flex items-center gap-2.5 border-b border-domino-accent/15 px-1 py-2 ${soyYo(f) ? 'rounded-lg bg-domino-accent/10' : ''}`}
                  >
                    <b className="w-6 text-[15px] text-domino-accent" style={{ fontFamily: SERIF }}>{f.puesto}</b>
                    <Retrato jugador={f} tamano={34} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-bold ${soyYo(f) ? 'text-domino-accent' : ''}`}>
                        {f.username}{soyYo(f) && <span className="ml-1.5 text-[10px] font-semibold opacity-70">tú</span>}
                      </span>
                      <span className="block truncate text-[10px] font-semibold text-domino-cream/60">{detalle(f, vista)}</span>
                    </span>
                    <span className="flex flex-col items-end leading-none">
                      <span className="text-[17px] text-domino-cream tabular-nums" style={{ fontFamily: SERIF }}>{marcador(f, vista)}</span>
                      <span className="text-[8px] font-bold tracking-[0.2em] text-domino-cream/60">{unidad(vista, f)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-auto border-t border-domino-accent/40 pt-3 text-center text-[10px] font-extrabold tracking-[0.22em] text-domino-accent/85">
          {pie}
        </p>
        {!conCuenta && (
          <Link to="/mesa" className="mt-3 text-center text-[11px] font-bold tracking-[0.2em] text-domino-cream/60">
            ARMA TU MESA
          </Link>
        )}
      </div>
      <PuertasDeLaCasa activa="" />
    </div>
  );
}

/** Una de las tres placas del podio: retrato en aro de bronce, puesto y numero en Cinzel. */
function Plaqueta({ jugador, vista, primero, soyYo }) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-t-xl rounded-b border px-2 pb-2 text-center ${
        primero ? 'w-[34%] border-domino-accent pt-4 shadow-[0_0_0_1px_rgba(216,180,92,.25),0_10px_30px_rgba(0,0,0,.6)]' : 'w-[28%] border-domino-accent/35 pt-3'
      } ${soyYo ? 'ring-2 ring-domino-accent/70' : ''}`}
      style={{ background: 'linear-gradient(180deg, #0f2a1d, #08160f)' }}
    >
      <Retrato jugador={jugador} tamano={primero ? 64 : 50} />
      <b className={`${primero ? 'text-[26px]' : 'text-[18px]'} leading-none text-domino-accent`} style={{ fontFamily: SERIF }}>{jugador.puesto}</b>
      <span className="max-w-full truncate text-[11px] font-bold">{jugador.username}</span>
      <span className={`${primero ? 'text-[20px]' : 'text-[16px]'} leading-none tabular-nums text-domino-cream`} style={{ fontFamily: SERIF }}>{marcador(jugador, vista)}</span>
      <span className="text-[8px] font-bold tracking-[0.2em] text-domino-cream/60">{unidad(vista, jugador)}</span>
    </div>
  );
}
