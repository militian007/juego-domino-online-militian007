import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Eye, Hourglass, Maximize2, Medal, Minus, Plus, Spade, Trophy } from 'lucide-react';
import { BODY, SERIF } from './utileria.jsx';
import { hayPrevia } from './CaminoDelTorneo.jsx';

/**
 * LA PIZARRA — el mapa del torneo, copia del truco (`TournamentBracketMap.tsx`,
 * direccion B de Raul, 29-jul). El arbol a tiza sobre la pizarra del club, en
 * un lienzo libre: se arrastra, se acerca con la rueda o el pellizco, y tiene
 * botones para el que no descubre los gestos. Cuando alguien gana, su nombre
 * AVANZA a la caja siguiente: el conector se dibuja a tiza, el nombre entra
 * deslizandose y suelta un polvito.
 *
 * Los conectores se miden con offsetLeft/offsetTop (coordenadas de layout,
 * inmunes al scale), y un arrastre no es un toque: si la mano se movio mas de
 * 6 px, el click que baja a la caja se traga.
 */

const TIZA = 'rgba(238,234,220,0.92)';
const TIZA_SUAVE = 'rgba(238,234,220,0.55)';
const TIZA_APAGADA = 'rgba(238,234,220,0.34)';
const TIZA_ORO = '#F2D479';
const TIZA_VERDE = '#9FE8BC';
const MADERA_ARRIBA = '#5C3A1C';
const MADERA_ABAJO = '#3E2611';
const ESCALA_MIN = 0.35;
const ESCALA_MAX = 2.6;

function secondsLeft(iso, now) {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - now) / 1000);
}

export function isStuckMatch(m, liveByMatch) {
  if (m.winnerUserId || (m.status !== 'ready' && m.status !== 'playing')) return false;
  if (!m.playerAUserId || !m.playerBUserId) return false;
  const lv = m.playingTableId ? liveByMatch.get(m.id) : undefined;
  return !(lv?.started ?? false);
}

function PolvoDeTiza() {
  return (
    <span aria-hidden style={{ position: 'absolute', left: 8, top: '50%' }}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="tor-polvo"
          style={{ position: 'absolute', width: 3, height: 3, borderRadius: 99, background: TIZA_SUAVE, '--dx': `${-6 - i * 5}px`, '--dy': `${10 + (i % 2) * 8}px`, animationDuration: `${0.9 + i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export default function LaPizarra({ detail, live, onSpectate, height = 'min(62vh, 520px)' }) {
  const now = Date.now();
  const nameOf = useMemo(() => new Map(detail.players.map((p) => [p.userId, p.displayName])), [detail.players]);
  const botIds = useMemo(() => new Set(detail.players.filter((p) => p.isBot).map((p) => p.userId)), [detail.players]);
  const liveByMatch = useMemo(() => new Map((live?.tables ?? []).map((t) => [t.matchId, t])), [live]);

  const rounds = useMemo(() => {
    const byRound = new Map();
    for (const m of detail.bracket) {
      const l = byRound.get(m.round) ?? [];
      l.push(m);
      byRound.set(m.round, l);
    }
    return [...byRound.entries()].sort((a, b) => a[0] - b[0]).map(([round, ms]) => ({ round, matches: [...ms].sort((a, b) => a.slot - b.slot) }));
  }, [detail.bracket]);
  const lastRound = rounds.length > 0 ? rounds[rounds.length - 1].round : 0;
  const conPrevia = hayPrevia(detail.bracket);

  const ocupantes = useMemo(() => {
    const m = new Map();
    for (const x of detail.bracket) {
      if (x.playerAUserId) m.set(`${x.id}:a`, x.playerAUserId);
      if (x.playerBUserId) m.set(`${x.id}:b`, x.playerBUserId);
    }
    return m;
  }, [detail.bracket]);
  const prevOcupantes = useRef(null);
  const recienLlegados = useMemo(() => {
    const s = new Set();
    const prev = prevOcupantes.current;
    if (prev) for (const [slot, uid] of ocupantes) if (!prev.has(slot) && uid) s.add(slot);
    return s;
  }, [ocupantes]);
  useEffect(() => { prevOcupantes.current = ocupantes; }, [ocupantes]);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const visorRef = useRef(null);
  const lienzoRef = useRef(null);
  const vista = useRef({ x: 16, y: 16, s: 1 });
  const punteros = useRef(new Map());
  const pinchBase = useRef(null);
  const seMovio = useRef(false);
  const cajaRefs = useRef(new Map());
  const [nivelZoom, setNivelZoom] = useState(100);

  const acotar = () => {
    const visor = visorRef.current;
    const lienzo = lienzoRef.current;
    if (!visor || !lienzo) return;
    const v = vista.current;
    const vw = visor.clientWidth;
    const vh = visor.clientHeight;
    const cw = lienzo.scrollWidth * v.s;
    const ch = lienzo.scrollHeight * v.s;
    const respiro = 24;
    v.x = cw <= vw ? (vw - cw) / 2 : Math.min(respiro, Math.max(vw - cw - respiro, v.x));
    v.y = ch <= vh ? (vh - ch) / 2 : Math.min(respiro, Math.max(vh - ch - respiro, v.y));
  };

  const aplicar = () => {
    acotar();
    const { x, y, s } = vista.current;
    if (lienzoRef.current) lienzoRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    setNivelZoom(Math.round(s * 100));
  };

  const zoomHacia = (px, py, factor) => {
    const v = vista.current;
    const s = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.s * factor));
    const k = s / v.s;
    v.x = px - (px - v.x) * k;
    v.y = py - (py - v.y) * k;
    v.s = s;
    aplicar();
  };

  const posEnLienzo = (el) => {
    const lienzo = lienzoRef.current;
    let x = 0;
    let y = 0;
    let n = el;
    while (n && n !== lienzo) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  const encajar = () => {
    const visor = visorRef.current;
    const lienzo = lienzoRef.current;
    if (!visor || !lienzo) return;
    const vw = visor.clientWidth;
    const vh = visor.clientHeight;
    const cw = lienzo.scrollWidth;
    const ch = lienzo.scrollHeight;
    if (!cw || !ch) return;
    const s = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Math.min((vw - 24) / cw, (vh - 24) / ch)));
    vista.current = { x: (vw - cw * s) / 2, y: (vh - ch * s) / 2, s };
    aplicar();
  };

  /** La primera mirada: legible y centrada en lo que importa (la mesa en vivo, o la final). */
  const vistaInicial = () => {
    const visor = visorRef.current;
    const lienzo = lienzoRef.current;
    if (!visor || !lienzo) return;
    const vw = visor.clientWidth;
    const vh = visor.clientHeight;
    const cw = lienzo.scrollWidth;
    if (!cw) return;
    const s = Math.min(1.05, Math.max(0.72, (vw - 24) / cw));
    const enVivo = detail.bracket.find((m) => liveByMatch.get(m.id)?.started && !m.winnerUserId);
    const final = rounds.length > 0 ? rounds[rounds.length - 1].matches[0] : undefined;
    const foco = cajaRefs.current.get((enVivo ?? final)?.id ?? '');
    if (foco) {
      const p = posEnLienzo(foco);
      vista.current = { x: vw / 2 - (p.x + p.w / 2) * s, y: vh / 2 - (p.y + p.h / 2) * s, s };
    } else {
      vista.current = { x: (vw - cw * s) / 2, y: 16, s };
    }
    aplicar();
  };

  // La primera mirada espera a los marcadores si el torneo esta en juego: sin
  // ellos no se sabe donde esta la mesa viva y se abria mirando la final vacia.
  const encajado = useRef(false);
  const listoParaMirar = rounds.length > 0 && (detail.tournament?.status !== 'live' || live != null);
  useLayoutEffect(() => {
    if (!encajado.current && listoParaMirar) {
      encajado.current = true;
      requestAnimationFrame(vistaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listoParaMirar]);

  useEffect(() => {
    const visor = visorRef.current;
    if (!visor) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = visor.getBoundingClientRect();
      zoomHacia(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    };
    visor.addEventListener('wheel', onWheel, { passive: false });
    return () => visor.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    e.target.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      pinchBase.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: vista.current.s };
    }
    seMovio.current = false;
  };

  const onPointerMove = (e) => {
    const prev = punteros.current.get(e.pointerId);
    if (!prev) return;
    const actual = { x: e.clientX, y: e.clientY };
    punteros.current.set(e.pointerId, actual);
    if (punteros.current.size === 2 && pinchBase.current) {
      const [a, b] = [...punteros.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const visor = visorRef.current;
      if (visor && pinchBase.current.dist > 0) {
        const r = visor.getBoundingClientRect();
        const objetivo = pinchBase.current.s * (dist / pinchBase.current.dist);
        zoomHacia((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, objetivo / vista.current.s);
      }
      seMovio.current = true;
      return;
    }
    const dx = actual.x - prev.x;
    const dy = actual.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 0) {
      vista.current.x += dx;
      vista.current.y += dy;
      if (Math.abs(dx) + Math.abs(dy) > 6) seMovio.current = true;
      aplicar();
    }
  };

  const onPointerUp = (e) => {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) pinchBase.current = null;
  };

  const [trazos, setTrazos] = useState([]);
  const [tamLienzo, setTamLienzo] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const nuevos = [];
    for (let i = 1; i < rounds.length; i++) {
      const rondaPrev = rounds[i - 1];
      for (const destino of rounds[i].matches) {
        if (destino.tercerPuesto) continue;
        const cajaD = cajaRefs.current.get(destino.id);
        if (!cajaD) continue;
        const pd = posEnLienzo(cajaD);
        const fuentes = rondaPrev.matches.filter((f) => !f.tercerPuesto && (f.slot === destino.slot * 2 || f.slot === destino.slot * 2 + 1));
        for (const fuente of fuentes) {
          const cajaF = cajaRefs.current.get(fuente.id);
          if (!cajaF) continue;
          const pf = posEnLienzo(cajaF);
          const x1 = pf.x + pf.w;
          const y1 = pf.y + pf.h / 2;
          const x2 = pd.x;
          const y2 = pd.y + pd.h / 2;
          const xm = (x1 + x2) / 2;
          const ganadorAvanzo = !!fuente.winnerUserId && (fuente.winnerUserId === destino.playerAUserId || fuente.winnerUserId === destino.playerBUserId);
          const slotDestino = fuente.winnerUserId === destino.playerAUserId ? `${destino.id}:a` : `${destino.id}:b`;
          nuevos.push({
            id: `${fuente.id}->${destino.id}`,
            d: `M ${x1} ${y1} L ${xm} ${y1} L ${xm} ${y2} L ${x2} ${y2}`,
            dibujado: ganadorAvanzo,
            recien: ganadorAvanzo && recienLlegados.has(slotDestino)
          });
        }
      }
    }
    setTrazos(nuevos);
    setTamLienzo({ w: lienzo.scrollWidth, h: lienzo.scrollHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, recienLlegados]);

  const botonPizarra = {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: '1px solid rgba(238,234,220,0.35)',
    background: 'rgba(10,14,12,0.72)',
    color: TIZA,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer'
  };

  return (
    <div
      data-testid="la-pizarra"
      style={{
        position: 'relative',
        height,
        borderRadius: 14,
        overflow: 'hidden',
        border: '6px solid transparent',
        backgroundImage: `linear-gradient(${MADERA_ARRIBA}, ${MADERA_ABAJO})`,
        backgroundOrigin: 'border-box',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.55), 0 12px 30px rgba(0,0,0,0.45)'
      }}
    >
      <div
        ref={visorRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={encajar}
        onClickCapture={(e) => { if (seMovio.current) { e.stopPropagation(); e.preventDefault(); } }}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none', cursor: 'grab', backgroundImage: 'url(/torneos/pizarra.webp)', backgroundSize: 512, backgroundColor: '#26332d' }}
      >
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.34) 100%)' }} />
        <div ref={lienzoRef} style={{ position: 'relative', display: 'inline-block', transformOrigin: '0 0', padding: '26px 30px' }}>
          <svg aria-hidden width={Math.max(tamLienzo.w, 1)} height={Math.max(tamLienzo.h, 1)} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {trazos.map((t) => (
              <path
                key={t.id}
                d={t.d}
                pathLength={1}
                fill="none"
                stroke={t.dibujado ? TIZA_SUAVE : TIZA_APAGADA}
                strokeWidth={t.dibujado ? 2.4 : 1.4}
                strokeLinecap="round"
                strokeDasharray={t.dibujado ? '1' : '0.035 0.02'}
                strokeDashoffset={t.recien && !reduceMotion ? 1 : 0}
                style={t.recien && !reduceMotion ? { animation: 'tor-trazo 0.8s ease-out forwards' } : undefined}
              />
            ))}
          </svg>

          <div className="flex" style={{ gap: 44 }}>
            {rounds.map(({ round, matches }) => (
              <div key={round} className="flex flex-col" style={{ gap: 14, minWidth: 168, justifyContent: 'space-around' }}>
                <p style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: TIZA_SUAVE, textAlign: 'center', borderBottom: `1px dashed ${TIZA_APAGADA}`, paddingBottom: 4, margin: 0 }}>
                  {round === lastRound && rounds.length > 1 ? 'La Final' : conPrevia && round === 1 ? 'La Previa' : `Ronda ${conPrevia ? round - 1 : round}`}
                </p>
                {matches.map((m) => {
                  const lv = liveByMatch.get(m.id);
                  const enVivo = !!lv?.started && !m.winnerUserId;
                  const trancado = isStuckMatch(m, liveByMatch);
                  const left = secondsLeft(m.presentationDeadlineAt, now);
                  const scores = enVivo ? lv?.scores : m.finalScores?.length >= 2 ? m.finalScores : null;
                  const tbd = !m.playerAUserId && !m.playerBUserId;
                  const esTercero = !!m.tercerPuesto;
                  const esFinal = m.round === lastRound && rounds.length > 1 && !esTercero;
                  const borde = trancado ? 'rgba(240,176,138,0.75)' : enVivo ? 'rgba(159,232,188,0.7)' : 'rgba(238,234,220,0.4)';
                  return (
                    <div
                      key={m.id}
                      ref={(el) => { if (el) cajaRefs.current.set(m.id, el); else cajaRefs.current.delete(m.id); }}
                      data-testid={`map-match-${m.id}`}
                      style={{
                        position: 'relative',
                        background: 'rgba(8,12,10,0.30)',
                        border: `1.6px solid ${borde}`,
                        borderRadius: 7,
                        padding: '6px 9px',
                        boxShadow: enVivo ? '0 0 14px rgba(159,232,188,0.25)' : 'none',
                        opacity: tbd || m.status === 'bye' ? 0.5 : 1
                      }}
                    >
                      {esTercero && (
                        <p style={{ fontFamily: SERIF, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: TIZA_SUAVE, margin: '0 0 3px' }} data-testid="map-tercer-puesto">Por el 3.er puesto</p>
                      )}
                      {enVivo && (
                        <span className={reduceMotion ? undefined : 'tor-latido'} style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: 999, background: TIZA_VERDE, boxShadow: `0 0 8px ${TIZA_VERDE}` }} />
                      )}
                      {tbd ? (
                        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, color: TIZA_APAGADA, textAlign: 'center', padding: '5px 0', margin: 0 }}>por definir</p>
                      ) : (
                        [
                          [m.playerAUserId, 0, 'a'],
                          [m.playerBUserId, 1, 'b']
                        ].map(([uid, idx, lado]) => {
                          const ganador = !!m.winnerUserId && m.winnerUserId === uid;
                          const walkover = ganador && !m.finalScores && m.status === 'completed';
                          const esCasa = !!uid && botIds.has(uid);
                          const llegando = !reduceMotion && !!uid && recienLlegados.has(`${m.id}:${lado}`);
                          const campeon = ganador && esFinal;
                          const tercero = ganador && esTercero;
                          return (
                            <p
                              key={idx}
                              className={`flex justify-between gap-1.5 ${llegando ? 'tor-llega' : ''}`}
                              style={{
                                position: 'relative',
                                fontFamily: SERIF,
                                fontSize: 12.5,
                                lineHeight: 1.75,
                                margin: 0,
                                color: ganador ? TIZA_ORO : esCasa ? 'rgba(226,196,138,0.9)' : uid ? TIZA : TIZA_APAGADA,
                                fontWeight: ganador ? 700 : 500,
                                fontStyle: esCasa ? 'italic' : 'normal',
                                textShadow: campeon ? '0 0 10px rgba(242,212,121,0.55)' : 'none',
                                borderBottom: ganador ? '1.5px dashed rgba(242,212,121,0.6)' : '1.5px dashed transparent'
                              }}
                            >
                              {llegando && <PolvoDeTiza />}
                              <span className="flex min-w-0 items-center truncate">
                                {campeon && <Trophy size={12} strokeWidth={2.4} className="mr-1 flex-none" aria-hidden />}
                                {tercero && <Medal size={12} strokeWidth={2.4} className="mr-1 flex-none" aria-hidden />}
                                {esCasa && <Spade size={11} strokeWidth={2.4} className="mr-1 flex-none" style={{ color: 'rgba(226,196,138,0.8)' }} aria-label="la casa" />}
                                <span className="truncate">{uid ? nameOf.get(uid) ?? '…' : '—'}</span>
                              </span>
                              <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: SERIF }}>
                                {walkover ? 'W.O.' : scores ? scores[idx] : m.status === 'bye' ? (ganador ? 'pasa' : '') : '–'}
                              </span>
                            </p>
                          );
                        })
                      )}
                      {enVivo && onSpectate && lv?.tableId && (detail.me?.registered || m.round >= lastRound - 1) && (
                        <button
                          type="button"
                          data-testid={`spectate-${m.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (seMovio.current) return;
                            onSpectate(m, lv.tableId);
                          }}
                          className="flex w-full items-center justify-center gap-1 transition-transform active:scale-95"
                          style={{ marginTop: 5, background: 'rgba(238,234,220,0.9)', color: '#22302a', border: 'none', borderRadius: 7, padding: '4px 8px', fontFamily: BODY, fontSize: 10.5, fontWeight: 800 }}
                        >
                          <Eye size={12} strokeWidth={2.6} aria-hidden /> Ver en vivo
                        </button>
                      )}
                      {trancado && left != null && left > -3600 && (
                        <p className="flex items-center justify-center gap-1" style={{ marginTop: 4, fontFamily: BODY, fontSize: 9.5, textAlign: 'center', color: '#F0B08A', borderTop: '1px dashed rgba(240,176,138,0.4)', paddingTop: 3, marginBottom: 0 }}>
                          <Hourglass size={10} aria-hidden /> presentación: {left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'venciendo…'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col" style={{ position: 'absolute', right: 10, top: 10, gap: 6 }}>
        <button type="button" aria-label="Acercar" data-testid="bracket-zoom-in" style={botonPizarra} onClick={() => { const v = visorRef.current; if (v) zoomHacia(v.clientWidth / 2, v.clientHeight / 2, 1.25); }}>
          <Plus size={17} strokeWidth={2.4} />
        </button>
        <button type="button" aria-label="Alejar" data-testid="bracket-zoom-out" style={botonPizarra} onClick={() => { const v = visorRef.current; if (v) zoomHacia(v.clientWidth / 2, v.clientHeight / 2, 0.8); }}>
          <Minus size={17} strokeWidth={2.4} />
        </button>
        <button type="button" aria-label="Ver el mapa entero" data-testid="bracket-zoom-fit" style={botonPizarra} onClick={encajar}>
          <Maximize2 size={15} strokeWidth={2.4} />
        </button>
      </div>

      <span aria-hidden style={{ position: 'absolute', left: 12, bottom: 10, fontFamily: BODY, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: TIZA_SUAVE, background: 'rgba(10,14,12,0.6)', borderRadius: 6, padding: '2px 7px', pointerEvents: 'none' }}>
        {nivelZoom}% · arrastra y acerca
      </span>
    </div>
  );
}
