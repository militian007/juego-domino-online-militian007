import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { DEFAULT_LAYOUT } from '@privoytruco/domino-engine';
import Board from '../components/game/Board.jsx';
import Tablero from '../components/game/Tablero.jsx';
import PlacaAsiento from '../components/game/PlacaAsiento.jsx';
import { useMesaTheme, ContextoFichas } from '../components/game/MesaTheme.jsx';
import { torneos, mirarMesa } from './api.js';
import { BODY } from './utileria.jsx';

/**
 * MIRAR UNA MESA DEL TORNEO, copia del truco (`SpectatorView.tsx` +
 * `useSpectate.ts`): la mesa de verdad —el mismo Board, las mismas placas de
 * asiento y el mismo marcador que la partida— en SOLO LECTURA. El servidor
 * manda el tablero con las dos manos tapadas; aqui no hay un solo control de
 * juego. Arriba, la tira EN VIVO con el Volver fuera de la muesca.
 *
 * Al terminar la partida se sigue viendo un minuto (el resumen de la ultima
 * mano) y despues se vuelve solo a la llave.
 */

const AUTO_EXIT_SECONDS = 60;
const MARGEN = { arriba: 92, abajo: 92, izquierda: 8, derecha: 8 };

/** La vista del espectador, venga del motor (`spectatorView`) o del estado de la mesa del servidor. */
function normalizarVista(v, nombres) {
  const lista = Array.isArray(v?.players) ? v.players : [];
  const jugadores = [0, 1].map((seat) => {
    const p = lista.find((x) => (x.seat ?? lista.indexOf(x)) === seat) ?? lista[seat] ?? {};
    const username = p.username ?? p.name ?? p.displayName ?? nombres?.find((n) => n.seat === seat)?.displayName ?? `Jugador ${seat + 1}`;
    return { ...p, seat, id: p.id ?? `s${seat}`, username, avatar: p.avatar ?? p.retrato ?? username };
  });
  const fichas = (j) => (Array.isArray(v.handCounts) ? v.handCounts[j.seat] : v.handCounts?.[j.id]) ?? 0;
  const puntos = v.teamScores ?? v.scores ?? {};
  const enTurno = (j) => (v.turn != null ? v.turn === j.seat : v.currentPlayerId === j.id);
  const termino = v.phase === 'game_over' || v.status === 'game-over';
  return {
    board: v.board ?? [],
    ends: v.ends ?? null,
    layout: v.layout ?? DEFAULT_LAYOUT,
    jugadores,
    fichas,
    enTurno,
    mios: puntos[1] ?? 0,
    suyos: puntos[2] ?? 0,
    ronda: v.round ?? 1,
    objetivo: v.targetPoints ?? 24,
    pozo: v.hasPool ? v.poolCount ?? null : null,
    modalidad: v.modalidad ?? 'pozo',
    termino
  };
}

const mismaFicha = (a, b) => a && b && ((a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]));

export default function MirarMesa() {
  const { id: tournamentId, matchId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clasePano, claseBaranda, carpetaFichas } = useMesaTheme();
  const [mesa, setMesa] = useState(params.get('mesa'));
  const [crudo, setCrudo] = useState(null);
  const [nombres, setNombres] = useState(null);
  const [cruce, setCruce] = useState('');
  const [error, setError] = useState(null);
  const [ultima, setUltima] = useState(null);
  const tablaAnterior = useRef([]);
  const volver = () => navigate(`/torneos/${tournamentId}`);

  // El nombre del cruce y, si el enlace no trae la mesa, cual es.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await torneos.detalle(tournamentId);
        const m = d.bracket.find((x) => String(x.id) === String(matchId));
        const nombre = (uid) => d.players.find((p) => p.userId === uid)?.displayName ?? '—';
        if (vivo && m) setCruce(`${nombre(m.playerAUserId)} vs ${nombre(m.playerBUserId)}`);
        if (!mesa) {
          const lv = await torneos.vivo(tournamentId);
          const t = lv.tables?.find((x) => String(x.matchId) === String(matchId));
          if (vivo) { if (t?.tableId) setMesa(t.tableId); else setError('Esta mesa ya no se está jugando.'); }
        }
      } catch {
        if (vivo && !mesa) setError('No se pudo encontrar la mesa.');
      }
    })();
    return () => { vivo = false; };
  }, [tournamentId, matchId, mesa]);

  useEffect(() => {
    if (!mesa) return undefined;
    setCrudo(null);
    return mirarMesa(mesa, {
      alEstado: (estado, jugadores) => {
        const nueva = (estado.board ?? []).find((t) => !tablaAnterior.current.some((a) => mismaFicha(a.tile, t.tile)));
        if (nueva && tablaAnterior.current.length > 0) setUltima({ type: 'play', tile: nueva.tile });
        tablaAnterior.current = estado.board ?? [];
        setCrudo(estado);
        if (jugadores) setNombres(jugadores);
        setError(null);
      },
      alError: setError
    });
  }, [mesa]);

  const vista = useMemo(() => (crudo ? normalizarVista(crudo, nombres) : null), [crudo, nombres]);
  const termino = Boolean(vista?.termino);

  const [quedan, setQuedan] = useState(AUTO_EXIT_SECONDS);
  const volverRef = useRef(volver);
  volverRef.current = volver;
  useEffect(() => {
    if (!termino) { setQuedan(AUTO_EXIT_SECONDS); return undefined; }
    const salir = setTimeout(() => volverRef.current(), AUTO_EXIT_SECONDS * 1000);
    const tic = setInterval(() => setQuedan((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => { clearTimeout(salir); clearInterval(tic); };
  }, [termino]);

  const [abajo, arriba] = vista?.jugadores ?? [];
  const corto = (n) => (n && n.length > 9 ? `${n.slice(0, 9)}…` : n);

  return (
    <ContextoFichas.Provider value={carpetaFichas}>
      <div className="fixed inset-0 z-50 flex flex-col bg-black" data-testid="mirar-mesa">
        <div className="flex flex-none items-center gap-2 pl-2.5 pr-3" data-testid="tira-en-vivo" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 6px)', paddingBottom: 6, background: 'linear-gradient(180deg, rgba(0,0,0,0.82), rgba(0,0,0,0.5))', borderBottom: '1px solid rgba(197,160,40,0.35)', fontFamily: BODY }}>
          <button type="button" onClick={volver} data-testid="button-volver-espectador" aria-label="Volver a la llave" className="flex min-h-[44px] min-w-[44px] flex-none items-center justify-center px-1 transition-transform active:scale-95">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#F5F0E8]" style={{ background: 'rgba(8,13,10,0.72)', border: '1px solid rgba(229,194,106,0.5)' }}>
              <ArrowLeft size={14} strokeWidth={2.4} aria-hidden /> Volver
            </span>
          </button>
          <span className="flex flex-none items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FF4A3D]">
            <span aria-hidden className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF4A3D]" style={{ boxShadow: '0 0 8px #FF4A3D' }} />
            En vivo
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-[12px] font-semibold text-[#F5F0E8]/85" title={cruce}>{cruce}</span>
        </div>

        {vista ? (
          <>
            <div className="relative shrink-0 py-1.5">
              <Tablero
                mios={vista.mios}
                suyos={vista.suyos}
                ronda={vista.ronda}
                objetivo={vista.objetivo}
                pozo={vista.pozo}
                sala="MIRANDO"
                modalidad={vista.modalidad}
                myLabel={corto(abajo?.username)}
                theirLabel={corto(arriba?.username)}
              />
            </div>
            <div className="relative min-h-0 w-full flex-1">
              <div className="absolute inset-0">
                <Board
                  layout={vista.layout}
                  margenes={MARGEN}
                  clasePano={clasePano}
                  claseBaranda={claseBaranda}
                  board={vista.board}
                  ends={vista.ends}
                  myTurn={false}
                  lastAction={crudo?.lastAction ?? ultima}
                />
                <PlacaAsiento jugador={arriba} fichas={vista.fichas(arriba)} enTurno={!termino && vista.enTurno(arriba)} className="left-1/2 top-2 -translate-x-1/2" />
                <PlacaAsiento jugador={abajo} fichas={vista.fichas(abajo)} enTurno={!termino && vista.enTurno(abajo)} className="bottom-5 left-1/2 -translate-x-1/2" />
              </div>
            </div>
            <div className="flex flex-none items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-[#F5F0E8]/60" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)', fontFamily: BODY }}>
              <EyeOff size={13} aria-hidden /> Solo miras: las fichas de los dos van tapadas
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-[#F5F0E8]/70">
            {error ?? 'Conectando a la mesa…'}
          </div>
        )}

        {termino && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-center text-[12.5px] font-semibold text-[#F5F0E8]" style={{ background: 'rgba(8,13,10,0.85)', border: '1px solid rgba(229,194,106,0.5)' }}>
            Partida terminada · volviendo en {quedan}s
          </div>
        )}
      </div>
    </ContextoFichas.Provider>
  );
}
