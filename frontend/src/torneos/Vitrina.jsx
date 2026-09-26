import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Trophy, Zap, Spade } from 'lucide-react';
import { torneos, escuchar, EVENTOS, mensajeDeError, modoDemo } from './api.js';
import {
  CuartoVitrina, Hoja, Renglon, PancartaMini, Etiqueta, MedallasPuntos, Retrato,
  papel, util, BODY, formatStart, horaChip, horaLarga, haceCuanto, PUESTO
} from './utileria.jsx';
import { avisar } from './Avisos.jsx';
import PuertasDeLaCasa from '../casa/PuertasDeLaCasa.jsx';
import NecesitaCuenta from './NecesitaCuenta.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';

/**
 * LA VITRINA DE TORNEOS, copia del truco (`TournamentsScreen.tsx`): la lista
 * en UNA hoja, la serie del Relampago agrupada en una tarjeta con su tira de
 * horas, el palmares con el podio y la clasificacion a un toque.
 *
 * La unica diferencia de fondo: aqui no hay plata. Donde el truco dice el pozo
 * o la entrada, aqui dice GRATIS y la copa con los puntos de cada puesto.
 */

const inscritoStyle = {
  flex: 'none',
  minWidth: 74,
  textAlign: 'center',
  fontFamily: BODY,
  fontSize: 11.5,
  fontWeight: 700,
  color: '#1D5233',
  border: '1.5px dashed rgba(44,107,69,0.5)',
  borderRadius: 9,
  padding: '8px 11px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4
};

const CHIPS_MAX = 8;

function cadenciaSerie(serie) {
  const proximos = serie.filter((t) => t.status === 'registration');
  if (proximos.length < 2) return null;
  const gaps = new Set();
  for (let i = 1; i < proximos.length; i++) {
    gaps.add(Math.round((new Date(proximos[i].startAt) - new Date(proximos[i - 1].startAt)) / 60000));
  }
  if (gaps.size !== 1) return null;
  const g = [...gaps][0];
  if (g === 30) return 'cada media hora';
  if (g === 60) return 'cada hora';
  return `cada ${g} min`;
}

/** El cuadro vigente, no el techo: 3 de 128 se leia como salon muerto. */
function cuadroVigente(t) {
  const gente = Math.max(t.minPlayers, t.registeredCount, 2);
  return Math.min(2 ** Math.ceil(Math.log2(gente)), t.capacity);
}

/** Lo que da el torneo, dicho corto y siempre. */
function premioTorneo(t) {
  const p = t.premiosPuntos ?? [];
  return p.length > 0 ? `gratis · la copa y ${p[0]} pts al campeón` : 'gratis · por la copa';
}

function pieTorneo(t) {
  const mins = Math.round((new Date(t.startAt).getTime() - Date.now()) / 60000);
  const cuando = t.status === 'registration' && mins > 0 && mins <= 120 ? `en ${mins} min` : formatStart(t.startAt);
  const n = t.registeredCount;
  const gente = t.status === 'live' ? `${n} jugando` : n === 0 ? 'sé el primero' : `${n} ${n === 1 ? 'inscrito' : 'inscritos'} · cuadro de ${cuadroVigente(t)}`;
  return `${gente} · ${premioTorneo(t)} · ${cuando}`;
}

function compararVivos(a, b) {
  if (a.status !== b.status) return a.status === 'live' ? -1 : 1;
  const ta = new Date(a.startAt).getTime();
  const tb = new Date(b.startAt).getTime();
  return a.status === 'registration' ? ta - tb : tb - ta;
}

/**
 * LA SERIE DEL RELAMPAGO EN UNA TARJETA (Raul, 16-ago): once torneos listados
 * de a uno enterraban a los de verdad. Una puerta: la cadencia, el proximo, las
 * medallas y la tira de horas tocable. La pancarta anota en el PROXIMO con cupo.
 */
function SerieRelampago({ serie, ultimo, onAbrir, onEntrar }) {
  const ahora = Date.now();
  const enJuego = serie.find((t) => t.status === 'live') ?? null;
  const arrancando = (t) => t.status === 'registration' && !!t.armandoHasta && new Date(t.startAt).getTime() <= ahora && new Date(t.armandoHasta).getTime() > ahora;
  const enVentana = serie.find(arrancando) ?? null;
  const lleno = (t) => t.registeredCount >= (t.inscripcionTope ?? t.capacity) && !t.anotado;
  const masCercano = serie.find((t) => t.status === 'registration' && !arrancando(t)) ?? null;
  const proximo = serie.find((t) => t.status === 'registration' && !arrancando(t) && !lleno(t)) ?? null;
  const saltoElLleno = !!masCercano && !!proximo && masCercano.id !== proximo.id;
  const cad = cadenciaSerie(serie);

  let lineaProximo = null;
  if (proximo) {
    const mins = Math.round((new Date(proximo.startAt).getTime() - ahora) / 60000);
    const faltan = mins > 0 && mins <= 120 ? (mins === 1 ? ', falta 1 min' : `, faltan ${mins} min`) : '';
    const n = proximo.registeredCount;
    const anotados = n > 0 ? ` · ${n} ${n === 1 ? 'anotado' : 'anotados'}` : '';
    lineaProximo = saltoElLleno
      ? `el de las ${horaLarga(masCercano.startAt)} está lleno · el próximo con cupo a las ${horaLarga(proximo.startAt)}${faltan}${anotados}`
      : `el próximo a las ${horaLarga(proximo.startAt)}${faltan}${anotados}`;
  } else if (masCercano) {
    lineaProximo = `el de las ${horaLarga(masCercano.startAt)} está lleno · el siguiente abre pronto`;
  }
  if (enVentana) {
    lineaProximo = `el de las ${horaLarga(enVentana.startAt)} está arrancando: ${enVentana.anotado ? 'abre la app y quédate' : 'el cuadro se arma con los que están'}` + (lineaProximo ? ` · ${lineaProximo}` : '');
  }

  const referencia = proximo ?? enJuego;
  const puntos = referencia?.premiosPuntos?.length ? referencia.premiosPuntos : null;
  const pieLinea1 = [cad, 'gratis', referencia ? `a ${referencia.targetPoints} puntos` : null].filter(Boolean).join(' · ');

  const chipVivo = { ...papel.fichaOn, background: 'linear-gradient(180deg, #A8452C 0%, #8E3A24 100%)', border: '1.5px solid #7C3520' };

  const pancarta = proximo ? (
    proximo.anotado ? (
      <span style={inscritoStyle} data-testid="relampago-inscrito">Inscrito <Check size={13} strokeWidth={3} /></span>
    ) : (
      <span className="relative inline-block">
        <span className="tor-late inline-block">
          <PancartaMini onClick={() => onEntrar(proximo)} testid="relampago-entrar" ariaLabel={`Entrar a ${proximo.name}`}>Entrar</PancartaMini>
        </span>
        <img src="/umbral/manito.webp" alt="" aria-hidden className="tor-manito pointer-events-none absolute" style={{ right: -4, bottom: -12, height: 30, width: 'auto', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))' }} />
      </span>
    )
  ) : enJuego ? (
    <PancartaMini roja vivo onClick={() => onAbrir(enJuego.id)} testid="relampago-ver" ariaLabel={`Ver el mapa de ${enJuego.name}`}>En juego</PancartaMini>
  ) : undefined;

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      {pancarta && <span style={{ position: 'absolute', right: -4, top: -4, zIndex: 2 }}>{pancarta}</span>}
      <Renglon
        titulo={<span className="inline-flex items-center gap-1"><Zap size={15} strokeWidth={2.6} fill="#E0A32E" color="#8a5a12" aria-hidden />El Relámpago</span>}
        testid="card-relampago"
        ultimo={ultimo}
        pie={
          <>
            <span style={{ display: 'block', paddingRight: 104 }}>{pieLinea1}</span>
            {puntos && (
              <span style={{ display: 'block', marginTop: 22 }}>
                <MedallasPuntos puntos={puntos} />
              </span>
            )}
            {lineaProximo ? (
              <span style={{ display: 'block', marginTop: 6, fontWeight: 600, color: util.tinta }} data-testid="relampago-proximo">{lineaProximo}</span>
            ) : enJuego ? (
              <span style={{ display: 'block', marginTop: 6 }}>en juego ahorita</span>
            ) : null}
            <span className="flex flex-wrap items-center" style={{ gap: 5, marginTop: 7 }}>
              {serie.slice(0, CHIPS_MAX).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAbrir(t.id); }}
                  data-testid={`relampago-chip-${t.id}`}
                  aria-label={`Ver ${t.name}`}
                  style={t.status === 'live' || arrancando(t) ? chipVivo : t.anotado ? papel.fichaOn : papel.ficha}
                >
                  {t.status === 'live'
                    ? `${horaChip(t.startAt)} · en juego`
                    : arrancando(t)
                      ? `${horaChip(t.startAt)} · arrancando`
                      : t.anotado
                        ? <span className="inline-flex items-center gap-1">{horaChip(t.startAt)}<Check size={11} strokeWidth={3} /></span>
                        : lleno(t)
                          ? `${horaChip(t.startAt)} · lleno`
                          : horaChip(t.startAt)}
                </button>
              ))}
              {serie.length > CHIPS_MAX && (
                <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, color: '#7A6A55', whiteSpace: 'nowrap' }}>y {serie.length - CHIPS_MAX} más</span>
              )}
            </span>
          </>
        }
      />
    </span>
  );
}

function ListaCargando() {
  return (
    <div className="flex flex-col gap-2 py-1" data-testid="torneos-cargando">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg" style={{ height: 54, background: 'rgba(46,28,8,0.08)' }} />
      ))}
    </div>
  );
}

const PODIO_CHIP = {
  1: { background: 'linear-gradient(180deg,#FBE8B0,#E2BE68)', color: '#3b2a08' },
  2: { background: 'linear-gradient(180deg,#f1f2f4,#c9ced5)', color: '#2a2e35' },
  3: { background: 'linear-gradient(180deg,#e7b98b,#b8783f)', color: '#3a1f08' }
};

export default function Vitrina() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lista, setLista] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [porEntrar, setPorEntrar] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [palmares, setPalmares] = useState([]);
  const [palmaresHasMore, setPalmaresHasMore] = useState(false);
  const [palmaresAbierto, setPalmaresAbierto] = useState(false);
  const demo = modoDemo();

  const cargar = useCallback(async () => {
    try {
      setLista(await torneos.lista());
      setFallo(null);
    } catch (err) {
      setFallo(mensajeDeError(err, 'No se pudieron cargar los torneos'));
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 6000);
    const off = escuchar(EVENTOS.actualizado, cargar);
    return () => { clearInterval(id); off(); };
  }, [cargar]);

  const cargarPalmares = useCallback(async (offset = 0) => {
    try {
      const r = await torneos.palmares({ days: 7, limit: 8, offset });
      setPalmares((prev) => (offset === 0 ? r.items : [...prev, ...r.items]));
      setPalmaresHasMore(Boolean(r.hasMore));
    } catch {
      /* el palmares es adorno: si falla, la vitrina sigue */
    }
  }, []);
  useEffect(() => { cargarPalmares(); }, [cargarPalmares]);

  const abrir = (id) => navigate(`/torneos/${id}`);

  const entrar = async () => {
    const t = porEntrar;
    if (!t) return;
    if (!demo && !(haySesion() && user)) {
      setPorEntrar(null);
      setPidiendo(true);
      return;
    }
    setEntrando(true);
    try {
      await torneos.anotarme(t.id);
      setPorEntrar(null);
      abrir(t.id);
    } catch (err) {
      avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo anotar') });
    } finally {
      setEntrando(false);
    }
  };

  const vivos = (lista ?? []).filter((t) => t.status === 'live' || t.status === 'registration');
  const serie = vivos.filter((t) => t.esRelampago).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  const items = vivos.filter((t) => !t.esRelampago).sort(compararVivos);
  const serieRep = serie.find((t) => t.status === 'live') ?? serie[0] ?? null;
  const entradas = [
    ...items.map((t) => ({ esSerie: false, t })),
    ...(serieRep ? [{ esSerie: true, t: serieRep }] : [])
  ].sort((a, b) => compararVivos(a.t, b.t));

  return (
    <CuartoVitrina
      titulo="Torneos"
      subtitulo="Entra, gana la llave y llévate la copa"
      onVolver={() => navigate('/')}
      dock={<PuertasDeLaCasa activa="torneo" />}
      testid="vitrina-torneos"
    >
      <Hoja>
        {lista === null && !fallo ? (
          <ListaCargando />
        ) : fallo && !lista ? (
          <div className="py-3 text-center" data-testid="torneos-fallo">
            <p style={papel.texto}>{fallo}</p>
            <button type="button" onClick={cargar} style={{ ...papel.botonFantasma, marginTop: 10 }}>Reintentar</button>
          </div>
        ) : entradas.length === 0 ? (
          <div data-testid="text-no-tournaments" style={{ textAlign: 'center', padding: '18px 4px 12px' }}>
            <p style={papel.titulo}>La vitrina está vacía</p>
            <p style={{ ...papel.texto, marginTop: 7 }}>No hay torneos por ahora. Vuelve más tarde.</p>
          </div>
        ) : (
          entradas.map((e, i) =>
            e.esSerie ? (
              <SerieRelampago key="serie-relampago" serie={serie} ultimo={i === entradas.length - 1} onAbrir={abrir} onEntrar={setPorEntrar} />
            ) : (
              <Renglon
                key={e.t.id}
                titulo={e.t.name}
                pie={pieTorneo(e.t)}
                dato={
                  e.t.status === 'live' ? (
                    <PancartaMini roja vivo onClick={() => abrir(e.t.id)} testid={`ver-torneo-${e.t.id}`} ariaLabel={`Ver el mapa de ${e.t.name}`}>En juego</PancartaMini>
                  ) : e.t.anotado ? (
                    <span style={inscritoStyle} data-testid={`inscrito-${e.t.id}`}>Inscrito <Check size={13} strokeWidth={3} /></span>
                  ) : (
                    <PancartaMini onClick={() => (demo || (haySesion() && user) ? setPorEntrar(e.t) : setPidiendo(true))} testid={`entrar-torneo-${e.t.id}`} ariaLabel={`Entrar a ${e.t.name}`}>Entrar</PancartaMini>
                  )
                }
                onClick={() => abrir(e.t.id)}
                testid={`card-tournament-${e.t.id}`}
                ultimo={i === entradas.length - 1}
              />
            )
          )
        )}
      </Hoja>

      {palmares.length > 0 && (
        <Hoja testid="palmares">
          <p style={{ ...papel.seccion, margin: '2px 0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trophy size={12} strokeWidth={2.6} aria-hidden /> El palmarés
          </p>
          {(palmaresAbierto ? palmares : palmares.slice(0, 3)).map((p, i, arr) => (
            <Renglon
              key={p.id}
              icono={
                <span style={{ width: 38, height: 38, borderRadius: 999, padding: 2, background: 'conic-gradient(from 0deg, #F8E3A8, #9A7A2E, #F8E3A8, #9A7A2E, #F8E3A8)', display: 'grid', placeItems: 'center', marginRight: 4 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 999, overflow: 'hidden', background: '#2a1a10', display: 'grid', placeItems: 'center' }}>
                    <Retrato jugador={{ retrato: p.championRetrato, displayName: p.champion }} tamano={34} />
                  </span>
                </span>
              }
              titulo={p.championIsBot ? <span className="inline-flex items-center gap-1"><Spade size={12} aria-hidden /> la casa · {p.champion}</span> : p.champion}
              pie={
                <>
                  {`${p.name} · ${haceCuanto(p.endedAt)}`}
                  {p.podio?.length > 1 && (
                    <span className="flex flex-wrap items-center" style={{ gap: 4, marginTop: 5 }} data-testid={`palmares-podio-${p.id}`}>
                      {p.podio.map((q) => (
                        <span key={q.place} style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap', ...PODIO_CHIP[q.place] }}>
                          {q.place}.º {q.isBot && <Spade size={9} strokeWidth={2.6} className="-mt-px inline" aria-label="la casa" />} {q.name}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              }
              dato={
                <span style={{ color: '#1f6b3e', fontWeight: 800, whiteSpace: 'nowrap', textAlign: 'right', display: 'block' }}>
                  +{p.puntos} pts
                  <span style={{ display: 'block', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A6A55', fontWeight: 700 }}>y la copa</span>
                </span>
              }
              testid={`palmares-${p.id}`}
              ultimo={i === arr.length - 1}
            />
          ))}
          {(palmares.length > 3 || palmaresHasMore) && (
            <button
              type="button"
              data-testid="button-palmares-more"
              onClick={() => (!palmaresAbierto ? setPalmaresAbierto(true) : palmaresHasMore && cargarPalmares(palmares.length))}
              style={{ ...papel.botonFantasma, width: '100%', marginTop: 6 }}
            >
              {palmaresAbierto ? (palmaresHasMore ? 'Más campeones' : 'Eso es todo por esta semana') : 'Ver el palmarés completo'}
            </button>
          )}
        </Hoja>
      )}

      <Etiqueta onClick={() => navigate('/ranking')} testid="button-open-leaderboard" style={{ alignSelf: 'center' }}>
        Ver la clasificación
      </Etiqueta>

      {porEntrar && (
        <div onClick={() => !entrando && setPorEntrar(null)} className="fixed inset-0 z-[60] flex items-center justify-center p-[22px]" style={{ background: 'rgba(10,7,4,0.72)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 330 }}>
            <Hoja>
              <div style={{ textAlign: 'center', padding: '4px 2px 2px' }}>
                <p style={papel.titulo}>Es gratis y te llevas la copa</p>
                <p style={{ ...papel.texto, marginTop: 8 }}>{detalleEntrar(porEntrar)}</p>
                <p style={{ ...papel.texto, marginTop: 8 }}>
                  Empieza {formatStart(porEntrar.startAt)} · a {porEntrar.targetPoints} puntos, una sola partida.
                </p>
                <button type="button" disabled={entrando} onClick={entrar} data-testid="button-confirmar-entrar" style={{ ...papel.boton, width: '100%', marginTop: 13, opacity: entrando ? 0.6 : 1 }}>
                  {entrando ? 'Anotando…' : 'Sí, anótame'}
                </button>
                <button type="button" disabled={entrando} onClick={() => setPorEntrar(null)} style={{ ...papel.botonFantasma, width: '100%', marginTop: 7 }}>
                  Mejor no
                </button>
              </div>
            </Hoja>
          </div>
        </div>
      )}

      <NecesitaCuenta abierta={pidiendo} onCerrar={() => setPidiendo(false)} />
    </CuartoVitrina>
  );
}

function detalleEntrar(t) {
  const p = t.premiosPuntos ?? [];
  if (p.length === 0) return 'No pagas nada por entrar. Se juega por la copa y por el honor.';
  const partes = p.slice(0, 3).map((n, i) => `${n} al ${PUESTO[i]}`);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0];
  return `No pagas nada por entrar. El campeón se lleva la copa, y los puntos de la clasificación son ${lista}.`;
}
