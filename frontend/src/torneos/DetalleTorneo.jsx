import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { torneos, escuchar, EVENTOS, miId, modoDemo, mensajeDeError, rutaDeMesa } from './api.js';
import {
  CuartoVitrina, Hoja, Renglon, Mensaje, Banda, Etiqueta, PancartaMini,
  papel, util, BODY, fmtClock
} from './utileria.jsx';
import LaPizarra from './LaPizarra.jsx';
import CaminoDelTorneo, { hayPrevia, nombreDeRonda } from './CaminoDelTorneo.jsx';
import PodioDelTorneo from './PodioDelTorneo.jsx';
import EstampaCampeon from './EstampaCampeon.jsx';
import { avisar, mesasYaEntradas } from './Avisos.jsx';
import NecesitaCuenta from './NecesitaCuenta.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';
import { sonar } from '../utils/soundEffects.js';

/**
 * EL TORNEO COMO EVENTO, copia del truco (`TournamentDetailScreen.tsx`): la
 * cuenta regresiva, la llave con marcadores EN VIVO (la pizarra primero, la
 * lista para quien prefiere leer), el plazo de presentarse, la vista del que
 * sigue vivo y del eliminado, tu camino, el podio y la puerta a mirar mesas.
 *
 * El auto-entrar vive aqui y en el vigilante de toda la app, con el mismo
 * candado POR MESA: cada mesa nueva entra una vez, la misma no se repite.
 */

const MATCH_STATUS_LABEL = { pending: 'Por definir', ready: 'Lista', playing: 'En juego', completed: 'Terminada', bye: 'Pasa libre' };
const DEFAULT_GAME_SECONDS = 7 * 60;

const fmtMinutes = (seconds) => `~${Math.max(1, Math.round(seconds / 60))} min`;

function STATUS_TEXT(status) {
  if (status === 'registration') return 'Inscripción abierta';
  if (status === 'live') return 'En juego';
  if (status === 'completed') return 'Finalizado';
  if (status === 'cancelled') return 'Cancelado';
  return status;
}

function premiosEnPalabras(t) {
  const p = t.premiosPuntos ?? [];
  return p.length > 0 ? `La copa y ${p.join(' · ')} pts · entrada gratis` : 'Por la copa · entrada gratis';
}

export default function DetalleTorneo() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const yo = miId(user);
  const demo = modoDemo();
  const [detail, setDetail] = useState(null);
  const [liveState, setLiveState] = useState(null);
  const [llaveVista, setLlaveVista] = useState('mapa');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pidiendo, setPidiendo] = useState(false);
  const [verEstampa, setVerEstampa] = useState(false);
  const enteredRef = useRef(null);

  const entrarALaMesa = useCallback((tableId) => {
    if (demo) { avisar({ tipo: 'info', titulo: 'En la muestra no hay mesa de verdad', detalle: 'Con el servidor, aquí te sienta en tu mesa del torneo.' }); return; }
    mesasYaEntradas.add(String(tableId).toUpperCase());
    navigate(rutaDeMesa(tableId));
  }, [demo, navigate, tournamentId]);

  const load = useCallback(async () => {
    try {
      const res = await torneos.detalle(tournamentId);
      setDetail(res);
      setError(null);
      if (res.tournament.status === 'live') {
        try { setLiveState(await torneos.vivo(tournamentId)); } catch { setLiveState((x) => x ?? { tables: [] }); }
      }
      const miMesa = res.me.tableId;
      if (miMesa && enteredRef.current !== miMesa && !mesasYaEntradas.has(String(miMesa).toUpperCase()) && !demo) {
        enteredRef.current = miMesa;
        entrarALaMesa(miMesa);
      }
    } catch (err) {
      const msg = err?.response?.status === 401
        ? '¿Te llegó esta invitación y no tienes nombre en el club? Ponte uno: es un momento y participas.'
        : mensajeDeError(err, 'No se pudo cargar el torneo');
      setDetail((prev) => { if (!prev) setError(msg); return prev; });
    }
  }, [tournamentId, demo, entrarALaMesa]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const alVolver = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const alCambiar = (p) => { if (String(p?.tournamentId) === String(tournamentId)) load(); };
    const offs = [escuchar(EVENTOS.actualizado, alCambiar), escuchar(EVENTOS.armando, alCambiar)];
    return () => offs.forEach((off) => off());
  }, [tournamentId, load]);

  // La estampa se abre sola al campeon la primera vez que ve su torneo terminado.
  useEffect(() => {
    if (!detail || detail.tournament.status !== 'completed') return;
    const campeon = detail.payouts.find((p) => p.place === 1);
    if (!campeon || String(campeon.userId) !== String(yo)) return;
    const llave = `estampa-vista:${tournamentId}`;
    try {
      if (localStorage.getItem(llave)) return;
      localStorage.setItem(llave, '1');
    } catch { /* sin almacenamiento: se muestra igual */ }
    setVerEstampa(true);
  }, [detail, yo, tournamentId]);

  // Solo con cuenta (Raul, 26-sep): el invitado mira, pero para jugar se crea la cuenta.
  const puedeAnotarse = demo || (haySesion() && user);

  const register = async () => {
    if (!puedeAnotarse) { setPidiendo(true); return; }
    setBusy(true);
    try {
      await torneos.anotarme(tournamentId);
      avisar({ tipo: 'exito', titulo: '¡Anotado! Te avisamos cuando arranque.' });
      await load();
    } catch (err) {
      avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo inscribir') });
    } finally {
      setBusy(false);
    }
  };

  const unregister = async () => {
    setBusy(true);
    try {
      await torneos.borrarme(tournamentId);
      avisar({ tipo: 'info', titulo: 'Te diste de baja' });
      await load();
    } catch (err) {
      avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo dar de baja') });
    } finally {
      setBusy(false);
    }
  };

  const entrarTarde = async () => {
    setBusy(true);
    try {
      const r = await torneos.entrarTarde(tournamentId);
      if (r?.ok === false && r.error) avisar({ tipo: 'error', titulo: r.error });
      else {
        avisar({ tipo: 'exito', titulo: '¡Entraste! Tu mesa sale en un momento.' });
        try { sonar('teToca'); } catch { /* audio bloqueado */ }
      }
    } catch (err) {
      avisar({ tipo: 'error', titulo: mensajeDeError(err, 'No se pudo entrar') });
    } finally {
      setBusy(false);
      load();
    }
  };

  const volver = () => navigate('/torneos');

  if (!detail) {
    return (
      <CuartoVitrina titulo="Torneo" onVolver={volver}>
        <div className="flex flex-col items-center gap-4 pt-16">
          <p style={{ fontFamily: BODY, fontSize: 14, lineHeight: 1.45, margin: 0, color: error ? '#F0A9A9' : 'rgba(245,240,232,0.75)', textAlign: 'center', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>{error ?? 'Cargando…'}</p>
          {error && (
            <button type="button" onClick={() => { setError(null); load(); }} className="rounded-full border border-domino-accent/50 bg-black/50 px-5 py-2.5 text-[13px] font-bold text-domino-cream">
              Reintentar
            </button>
          )}
        </div>
      </CuartoVitrina>
    );
  }

  const t = detail.tournament;
  const open = t.status === 'registration';
  const live = t.status === 'live';
  const completed = t.status === 'completed';
  const startInMs = new Date(t.startAt).getTime() - nowMs;
  const nameOf = (uid) => (uid ? detail.players.find((p) => p.userId === uid)?.displayName ?? 'Jugador' : '—');

  const rounds = new Map();
  for (const m of detail.bracket) {
    const arr = rounds.get(m.round) ?? [];
    arr.push(m);
    rounds.set(m.round, arr);
  }
  const sortedRounds = [...rounds.entries()].sort((a, b) => a[0] - b[0]);
  const liveByMatch = new Map((liveState?.tables ?? []).map((x) => [x.matchId, x]));
  const avgSeconds = liveState?.avgGameSeconds ?? DEFAULT_GAME_SECONDS;

  const myMatches = detail.bracket.filter((m) => m.playerAUserId === yo || m.playerBUserId === yo);
  const myOpen = myMatches.find((m) => m.winnerUserId == null);
  const perdiUna = myMatches.some((m) => m.winnerUserId != null && m.winnerUserId !== yo);
  const iWasEliminated = detail.me.registered !== false && myMatches.length > 0 && !myOpen && perdiUna;
  const eliminatedRound = iWasEliminated ? Math.max(...myMatches.filter((m) => m.winnerUserId && m.winnerUserId !== yo).map((m) => m.round)) : null;

  let feederOfMine = null;
  if (myOpen && (myOpen.playerAUserId == null || myOpen.playerBUserId == null)) {
    feederOfMine = detail.bracket.find((m) => m.nextMatchId === myOpen.id && m.winnerUserId == null && m.id !== myOpen.id && m.playerAUserId !== yo && m.playerBUserId !== yo) ?? null;
  }

  let etaSeconds = null;
  if (live) {
    const openMatches = detail.bracket.filter((m) => m.winnerUserId == null && m.status !== 'bye');
    const minRound = Math.min(...openMatches.map((m) => m.round));
    const current = openMatches.filter((m) => m.round === minRound && m.playerAUserId && m.playerBUserId);
    if (current.length > 0) {
      let worst = 0;
      for (const m of current) {
        const lv = liveByMatch.get(m.id);
        if (lv?.started && lv.tableCreatedAt) {
          const elapsed = (nowMs - new Date(lv.tableCreatedAt).getTime()) / 1000;
          worst = Math.max(worst, Math.min(avgSeconds, Math.max(60, avgSeconds - elapsed)));
        } else {
          worst = Math.max(worst, avgSeconds);
        }
      }
      etaSeconds = worst;
    }
  }

  const totalRondas = detail.bracket.reduce((mx, m) => Math.max(mx, m.round), 0);
  const conPrevia = hayPrevia(detail.bracket);
  const rondaMia = myOpen?.round ?? null;
  const faltanRondas = rondaMia != null && totalRondas > 0 ? totalRondas - rondaMia + 1 : null;
  const quedanDePie = faltanRondas != null && !(conPrevia && rondaMia === 1) ? 2 ** faltanRondas : null;
  const esTerceroMio = !!myOpen?.tercerPuesto;
  const esFinalMia = faltanRondas === 1 && !esTerceroMio;
  const esSemiMia = faltanRondas === 2;
  const bandaDeMiMesa = esTerceroMio ? 'Jugar por el 3.er puesto' : esFinalMia ? 'Ir a la final' : esSemiMia ? 'Jugar la semifinal' : rondaMia === 1 ? 'Entrar a tu primera mesa' : 'Entrar a tu mesa';

  const champion = completed ? detail.payouts.find((p) => p.place === 1) : null;
  const soyElCampeon = !!champion && String(champion.userId) === String(yo);
  const capacidad = t.inscripcionTope ?? t.capacity;

  const mirar = (m, tableId) => navigate(`/torneos/${tournamentId}/mirar/${m.id}?mesa=${encodeURIComponent(tableId)}`);

  return (
    <CuartoVitrina
      titulo={t.name}
      subtitulo={
        detail.anotados != null && detail.anotados > detail.registeredCount
          ? `${detail.anotados} anotados · ${detail.registeredCount} sentados · ${STATUS_TEXT(t.status)}`
          : `${detail.registeredCount} de ${capacidad} inscritos · ${STATUS_TEXT(t.status)}`
      }
      onVolver={volver}
      testid="detalle-torneo"
    >
      {open && detail.armado?.abierto && (
        <Mensaje
          grande
          titulo="Arrancando — siéntate ya"
          destacado={detail.armado.hasta ? fmtClock(Math.max(0, new Date(detail.armado.hasta).getTime() - nowMs)) : undefined}
          detalle={detail.me.registered ? 'Estás conectado: entras al cuadro. No cierres la app ni cambies de pantalla.' : 'El cuadro se arma solo con los que estén conectados cuando llegue a cero.'}
        />
      )}
      {open && !detail.armado?.abierto && (
        <Mensaje
          titulo={startInMs > 0 ? 'Empieza en' : 'Arrancando…'}
          destacado={startInMs > 0 ? fmtClock(startInMs) : undefined}
          detalle={
            <>
              {premiosEnPalabras(t)} · a {t.targetPoints} puntos
              {capacidad - detail.registeredCount > 0 ? ` · quedan ${capacidad - detail.registeredCount} cupos` : ' · cuadro lleno'}
            </>
          }
        />
      )}

      {completed && detail.payouts.length > 0 && (
        <PodioDelTorneo
          detail={detail}
          miUserId={yo}
          pie={soyElCampeon ? (
            <div className="flex justify-center">
              <Etiqueta onClick={() => setVerEstampa(true)} testid="button-ver-estampa">Ver mi estampa</Etiqueta>
            </div>
          ) : undefined}
        />
      )}

      {live && detail.me.puertaHasta && new Date(detail.me.puertaHasta).getTime() > nowMs && (
        <Mensaje grande titulo="¡Todavía puedes entrar!" destacado={fmtClock(Math.max(0, new Date(detail.me.puertaHasta).getTime() - nowMs))} detalle="El torneo ya arrancó, pero queda puesto en la primera ronda. Toca y juegas ya.">
          <button type="button" onClick={entrarTarde} disabled={busy} data-testid="button-entrar-tarde" style={{ ...papel.boton, width: '100%', marginTop: 12 }}>
            {busy ? 'Entrando…' : 'Entrar ahora'}
          </button>
        </Mensaje>
      )}
      {live && detail.me.tableId && <Banda onClick={() => entrarALaMesa(detail.me.tableId)} testid="button-enter-table">{bandaDeMiMesa}</Banda>}

      {live && !detail.me.tableId && (
        <Hoja testid="tournament-wait-info">
          {iWasEliminated ? (
            <p style={{ ...papel.texto, textAlign: 'center' }}>Quedaste eliminado en {nombreDeRonda(eliminatedRound, totalRondas, conPrevia).toLowerCase()}. Quédate a ver cómo termina: la llave se mueve sola.</p>
          ) : myOpen ? (
            <>
              <p style={{ ...papel.fuerte, textAlign: 'center', fontSize: 15 }}>
                {esTerceroMio ? 'Vas por el 3.er puesto' : esFinalMia ? 'Estás en la final' : esSemiMia ? 'Estás entre los cuatro' : quedanDePie ? `Quedan ${quedanDePie} de pie` : 'Sigues en el cuadro'}
              </p>
              <p style={{ ...papel.texto, textAlign: 'center', marginTop: 5 }}>
                {feederOfMine ? `Tu rival sale de ${nameOf(feederOfMine.playerAUserId)} vs ${nameOf(feederOfMine.playerBUserId)}.` : 'Esperando que se arme tu próxima mesa.'}
                {etaSeconds != null ? ` Esa mesa cierra en ${fmtMinutes(etaSeconds)}.` : ''}
              </p>
              <p style={{ ...papel.texto, textAlign: 'center', marginTop: 5, fontSize: 11 }}>Te avisamos con sonido. Deja la app abierta.</p>
            </>
          ) : (
            etaSeconds != null && <p style={{ ...papel.texto, textAlign: 'center' }}>La ronda cierra en {fmtMinutes(etaSeconds)}</p>
          )}
        </Hoja>
      )}

      {live && myMatches.length > 0 && <CaminoDelTorneo detail={detail} userId={yo} />}

      {open && detail.me.registered && <YaEstasAdentro detail={detail} tournamentId={tournamentId} />}

      {open && (detail.me.registered ? (
        <Etiqueta onClick={unregister} disabled={busy} testid="button-unregister" style={{ alignSelf: 'center' }}>Darme de baja</Etiqueta>
      ) : (
        <Banda onClick={register} disabled={busy} testid="button-register">Inscribirme</Banda>
      ))}

      {detail.bracket.length > 0 && (
        <Hoja>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 9 }}>
            <h2 style={papel.titulo}>Llave</h2>
            <div className="flex" style={{ gap: 5 }}>
              {[['mapa', 'Pizarra'], ['lista', 'Lista']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setLlaveVista(key)} data-testid={`bracket-view-${key}`} style={llaveVista === key ? papel.fichaOn : papel.ficha}>{label}</button>
              ))}
            </div>
          </div>
          {llaveVista === 'mapa' && <LaPizarra detail={detail} live={liveState} onSpectate={mirar} />}
          {llaveVista === 'lista' && sortedRounds.map(([round, matches]) => (
            <div key={round} className="flex flex-col gap-2">
              <span style={{ ...papel.seccion, marginTop: 6 }}>{matches.every((m) => m.tercerPuesto) ? 'Por el 3.er puesto' : nombreDeRonda(round, totalRondas, conPrevia)}</span>
              {[...matches].sort((a, b) => a.slot - b.slot).map((m) => {
                const lv = liveByMatch.get(m.id);
                const deadlineMs = m.presentationDeadlineAt ? new Date(m.presentationDeadlineAt).getTime() - nowMs : null;
                const waitingToShow = m.status === 'playing' && lv != null && !lv.started;
                return (
                  <div key={m.id} style={waitingToShow || lv?.started ? papel.bloqueVivo : papel.bloque} data-testid={`match-${m.id}`}>
                    {m.tercerPuesto && <p style={{ ...papel.seccion, fontSize: 9, marginBottom: 3 }}>Por el 3.er puesto</p>}
                    <MatchRow name={nameOf(m.playerAUserId)} isWinner={!!m.winnerUserId && m.winnerUserId === m.playerAUserId} isMe={m.playerAUserId === yo} score={lv?.started ? lv.scores?.[0] ?? null : m.finalScores?.[0] ?? null} />
                    <div className="my-1" style={{ height: 1, background: util.tintaLinea }} />
                    <MatchRow name={nameOf(m.playerBUserId)} isWinner={!!m.winnerUserId && m.winnerUserId === m.playerBUserId} isMe={m.playerBUserId === yo} score={lv?.started ? lv.scores?.[1] ?? null : m.finalScores?.[1] ?? null} />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2" style={{ ...papel.texto, fontSize: 10.5 }}>
                      <span>{lv?.started ? `En juego · mano ${lv.roundNumber ?? '…'}` : m.status === 'completed' && !m.finalScores ? 'Pasó sin jugar' : MATCH_STATUS_LABEL[m.status] ?? m.status}</span>
                      {waitingToShow && deadlineMs != null && deadlineMs > 0 && <span style={{ color: util.tinta, fontWeight: 700 }}>presentarse: {fmtClock(deadlineMs)}</span>}
                      {waitingToShow && deadlineMs != null && deadlineMs <= 0 && <span style={{ color: util.urgente, fontWeight: 700 }}>plazo vencido — resolviendo…</span>}
                      {lv?.started && lv.tableId && !m.winnerUserId && (detail.me.registered || round >= totalRondas - 1) && (
                        <button type="button" onClick={() => mirar(m, lv.tableId)} style={{ ...papel.ficha, minHeight: 26, padding: '3px 10px', fontSize: 10.5 }}>Ver en vivo</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Hoja>
      )}

      {detail.bracket.length === 0 && detail.players.length > 0 && (
        <Hoja>
          <h2 style={{ ...papel.titulo, marginBottom: 6 }}>Inscritos</h2>
          {detail.players.filter((j) => j.status === 'registered' || !j.status).map((j, i, lista) => (
            <Renglon key={j.userId} titulo={`${j.displayName}${j.userId === yo ? ' (tú)' : ''}`} ultimo={i === lista.length - 1} />
          ))}
        </Hoja>
      )}

      {verEstampa && champion && (
        <EstampaCampeon nombre={champion.displayName} torneo={t.name} fecha={t.startAt} onCerrar={() => setVerEstampa(false)} />
      )}
      <NecesitaCuenta abierta={pidiendo} onCerrar={() => setPidiendo(false)} />
    </CuartoVitrina>
  );
}

function MatchRow({ name, isWinner, isMe, score }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ fontFamily: BODY, fontSize: 13, fontWeight: isWinner || isMe ? 800 : 500, color: isWinner || isMe ? util.tinta : util.tintaSuave }}>
        {name}{isMe ? ' (tú)' : ''}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {score != null && <span style={{ ...papel.cifra, fontSize: 13 }}>{score}</span>}
        {isWinner && <Check size={14} strokeWidth={3} color={util.enLinea} aria-hidden />}
      </span>
    </div>
  );
}

/**
 * LO QUE PASA JUSTO DESPUES DE ANOTARSE (truco, `TorneoYaEstasAdentro`): traer
 * a los panas por WhatsApp de un tiro. El mensaje dice la hora y que es gratis.
 */
function YaEstasAdentro({ detail, tournamentId }) {
  const t = detail.tournament;
  const invitar = () => {
    const arranca = new Date(t.startAt);
    const hora = arranca.toLocaleString('es-VE', { hour: 'numeric', minute: '2-digit' });
    const esHoy = arranca.toDateString() === new Date().toDateString();
    const cuando = esHoy ? `hoy a las ${hora}` : `el ${arranca.toLocaleString('es-VE', { day: 'numeric', month: 'long' })} a las ${hora}`;
    const libres = Math.max(0, (t.inscripcionTope ?? t.capacity) - detail.registeredCount);
    const cupos = libres > 0 ? `, quedan ${libres} cupos` : '';
    const url = `${window.location.origin}/torneos/${tournamentId}`;
    const texto = `Épale, torneo de dominó ${cuando}: entrada libre${cupos}. Yo ya estoy anotado. Te espero por aquí:`;
    if (navigator.share) {
      navigator.share({ text: texto, url }).catch(() => {});
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, '_blank', 'noopener,noreferrer');
  };
  return (
    <Hoja testid="torneo-ya-estas-adentro">
      <p style={{ ...papel.seccion, margin: '2px 0 4px' }}>Ya estás adentro</p>
      <Renglon
        titulo="Trae a tus panas"
        pie="Mientras más gente entre, más grande es el cuadro."
        dato={<PancartaMini onClick={invitar} testid="button-invitar-whatsapp" ariaLabel="Invitar por WhatsApp">Invitar</PancartaMini>}
        ultimo
      />
    </Hoja>
  );
}
