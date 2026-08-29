// Trigger Vercel rebuild: 2026-06-11
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Board from '../components/game/Board.jsx';
import MesaThemePicker, { useMesaTheme } from '../components/game/MesaTheme.jsx';
import Pool from '../components/game/Pool.jsx';
import RoundBreakdown from '../components/game/RoundBreakdown.jsx';
import { Marcador, Jugador, Mesa } from '../components/game/Hud.jsx';
import Hand from '../components/game/Hand.jsx';
import OpponentHand from '../components/game/OpponentHand.jsx';
import PlayerInfo from '../components/game/PlayerInfo.jsx';
import Avatar from '../components/game/Avatar.jsx';
import Scoreboard from '../components/game/Scoreboard.jsx';
import SidePicker from '../components/game/SidePicker.jsx';
import AdSidebar from '../components/AdSidebar.jsx';
import TopBanner from '../components/TopBanner.jsx';
import { connectSocket } from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { playTileSound, playDrawSound } from '../utils/soundEffects.js';

// La partida en curso se recuerda en el navegador para poder volver a ella al
// refrescar o al salir a otra app. Solo se olvida cuando la partida termina o
// el jugador se va a proposito.
const CLAVE_PARTIDA = 'domino-partida-activa';

function recordarPartida(code, mode) {
  try {
    if (code) localStorage.setItem(CLAVE_PARTIDA, JSON.stringify({ code, mode, ts: Date.now() }));
  } catch { /* sin localStorage, simplemente no se recuerda */ }
}

function partidaRecordada(mode) {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PARTIDA) || 'null');
    if (!g?.code) return null;
    // se descarta si es de otro modo o si tiene mas de 6 horas
    if (g.mode !== mode) return null;
    if (Date.now() - (g.ts || 0) > 6 * 60 * 60 * 1000) return null;
    return g.code;
  } catch {
    return null;
  }
}

function olvidarPartida() {
  try { localStorage.removeItem(CLAVE_PARTIDA); } catch { /* nada */ }
}

function AsientoFlotante({ jugador, fichas, enTurno, esCompanero, className = '' }) {
  if (!jugador) return null;
  return (
    <div
      className={`pointer-events-none absolute z-20 flex flex-col items-center gap-0.5 text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${className}`}
    >
      <div className="relative">
        <Avatar semilla={jugador.avatar || jugador.username} tamano={38} />
        {enTurno && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-black/60 bg-emerald-400" />
        )}
      </div>
      <span
        className={`max-w-[86px] truncate text-[11px] font-bold leading-none ${
          enTurno ? 'text-emerald-300' : esCompanero ? 'text-sky-200' : 'text-domino-cream'
        }`}
      >
        {jugador.username}
      </span>
      <span className="text-[10px] leading-none text-domino-cream/70">{fichas ?? 0} fichas</span>
      {esCompanero && (
        <span className="text-[8px] uppercase tracking-widest text-sky-300/90">compañero</span>
      )}
    </div>
  );
}

function AsientoLateral({ jugador, fichas, enTurno, esCompanero }) {
  if (!jugador) return null;
  return (
    <div className="card min-w-0 flex-1 p-2 sm:w-[136px] sm:flex-none">
      <PlayerInfo player={jugador} count={fichas} isTurn={enTurno} team={jugador.team} />
      <div className="mt-1 hidden sm:block">
        <OpponentHand count={fichas} position="left" />
      </div>
      {esCompanero && (
        <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-sky-300">
          tu compañero
        </div>
      )}
    </div>
  );
}

const AUTO_START_MODES = ['1v1bot', '2v2bots'];
const GUEST_ALLOWED_MODES = ['1v1bot', '2v2bots'];

export default function Game() {
  const params = useParams();
  const urlRoomCode = params.roomCode;
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || '1v1';
  const joinParam = searchParams.get('join');
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [draggedTile, setDraggedTile] = useState(null); // { index, tile, currentX, currentY, isSnapped, activePlacement }
  const [showSidePicker, setShowSidePicker] = useState(false);
  const [error, setError] = useState('');
  const [actualRoomCode, setActualRoomCode] = useState(urlRoomCode || null);
  const [lastAction, setLastAction] = useState(null);
  const [isPlacing, setIsPlacing] = useState(false);
  
  const [playModeOption, setPlayModeOption] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const [reactions, setReactions] = useState({});
  const [showReactionMenu, setShowReactionMenu] = useState(false);

  const { tema, setTema, clasePano, claseBaranda } = useMesaTheme();
  const [explicacion, setExplicacion] = useState(null);

  // Espejo de draggedTile para poder leerlo desde manejadores que corren fuera
  // del ciclo de render de React.
  const draggedTileRef = useRef(null);
  useEffect(() => {
    draggedTileRef.current = draggedTile;
  }, [draggedTile]);

  // Candado contra doble envio en el mismo tick. `isPlacing` no alcanza porque
  // se lee del closure y dos llamadas seguidas ven el mismo valor viejo.
  const enviandoRef = useRef(false);

  // Sala activa en un ref: el manejador de reconexion corre fuera del render.
  const salaActivaRef = useRef(null);
  useEffect(() => {
    salaActivaRef.current = actualRoomCode;
  }, [actualRoomCode]);

  const handleDragStart = (index, tile, clientX, clientY) => {
    setDraggedTile({
      index,
      tile,
      currentX: clientX,
      currentY: clientY,
      isSnapped: false,
      activePlacement: null
    });
    setSelectedTile({ index, tile });
  };

  const handleDragUpdate = (clientX, clientY) => {
    setDraggedTile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        currentX: clientX,
        currentY: clientY
      };
    });
  };

  const handleDragEnd = () => {
    // El efecto va FUERA del updater: los updaters de React tienen que ser puros
    // y pueden ejecutarse mas de una vez. Ademas, en tactil el `touchend` y el
    // `mouseup` sintetico caen en el mismo tick: si la jugada se emitia dentro
    // del updater, ambos veian el mismo `prev` y se enviaba dos veces, y la
    // segunda volvia con "No es tu turno".
    const arrastre = draggedTileRef.current;
    setDraggedTile(null);
    draggedTileRef.current = null;
    if (arrastre?.isSnapped && arrastre.activePlacement) {
      playTile(arrastre.index, arrastre.activePlacement.side, arrastre.activePlacement);
    }
  };

  const handleSnapChange = (isSnapped, activePlacement) => {
    setDraggedTile((prev) => {
      if (!prev) return null;
      // Solo actualizar si realmente hubo un cambio para evitar re-renders infinitos
      if (prev.isSnapped === isSnapped && prev.activePlacement === activePlacement) {
        return prev;
      }
      return {
        ...prev,
        isSnapped,
        activePlacement
      };
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!user && !GUEST_ALLOWED_MODES.includes(mode)) {
      navigate('/login', { replace: true, state: { from: `/game?mode=${mode}` } });
      return;
    }
    if (!user) return;
    if (urlRoomCode) {
      const stored = localStorage.getItem('token');
      if (!stored) {
        navigate('/login', { replace: true, state: { from: `/game/${urlRoomCode}` } });
      }
    }
  }, [user, loading, mode, urlRoomCode, navigate]);

  const roomInitRef = useRef(false);

  // 1. Conexión de socket y registro de listeners de eventos del juego
  useEffect(() => {
    if (loading) return;
    if (!user && !GUEST_ALLOWED_MODES.includes(mode)) return;
    if (urlRoomCode && !user) return;

    const s = connectSocket();
    setSocket(s);
    setError('');

    const onLobby = (state) => {
      setLobby(state);
      setActualRoomCode(state.code);
      if (state.started) setLobby(null);
    };

    const onGameState = (state) => {
      setGameState((prev) => {
        if (prev && state) {
          const prevBoardLen = prev.board?.length || 0;
          const newBoardLen = state.board?.length || 0;
          const prevPool = prev.poolCount ?? 0;
          const newPool = state.poolCount ?? 0;

          if (newBoardLen > prevBoardLen) {
            playTileSound();
          } else if (newPool < prevPool) {
            playDrawSound();
          }
        }
        return state;
      });
      setActualRoomCode(state.roomCode);
      if (state.status === 'game-over') olvidarPartida();
      else recordarPartida(state.roomCode, mode);
      setLobby(null);
      setSelectedTile(null);
      setDraggedTile(null);
      setShowSidePicker(false);
      setError('');
      setIsPlacing(false);
      enviandoRef.current = false;
    };

    const onConnectError = (err) => {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('token')) {
        setError('Tu sesión expiró o es inválida. Inicia sesión nuevamente.');
        return;
      }
      setError(`Conectando al servidor... (puede tardar 30-50s si está dormido)`);
    };

    const onReaction = ({ playerId, username, emoji }) => {
      const reactionId = Date.now();
      setReactions((prev) => ({
        ...prev,
        [playerId]: { emoji, username, id: reactionId }
      }));

      setTimeout(() => {
        setReactions((prev) => {
          if (prev[playerId]?.id === reactionId) {
            const next = { ...prev };
            delete next[playerId];
            return next;
          }
          return prev;
        });
      }, 3000);
    };

    // Al reconectar (volviste de otra app, se cayo el wifi) el servidor todavia
    // tiene el socketId viejo y no te llega nada. Hay que volver a entrar.
    const onReconnect = () => {
      const code = salaActivaRef.current;
      if (!code) return;
      s.emit('room:join', { code }, (res) => {
        if (!res?.ok) {
          setError('Se perdió la conexión con la mesa. Volvé a entrar.');
          olvidarPartida();
        } else {
          setError('');
        }
      });
    };

    s.on('lobby:update', onLobby);
    s.on('game:state', onGameState);
    s.on('connect_error', onConnectError);
    s.on('game:reaction', onReaction);
    s.on('connect', onReconnect);
    s.io.on('reconnect', onReconnect);

    return () => {
      s.off('lobby:update', onLobby);
      s.off('game:state', onGameState);
      s.off('connect_error', onConnectError);
      s.off('game:reaction', onReaction);
      s.off('connect', onReconnect);
      s.io.off('reconnect', onReconnect);
    };
  }, [loading, user, urlRoomCode, mode]);

  // 2. Control de acciones de sala y matchmaking
  useEffect(() => {
    if (!socket) return;

    const handleAction = () => {
      if (roomInitRef.current) return;

      // Caso A: Se unió directamente con un código en URL o query param
      if (joinParam) {
        roomInitRef.current = true;
        socket.emit('room:join', { code: joinParam }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo unir a la sala');
            roomInitRef.current = false;
            return;
          }
          if (res.room?.code) setActualRoomCode(res.room.code);
        });
        return;
      }

      // Caso B: Modos contra bots (auto-inician)
      if (AUTO_START_MODES.includes(mode)) {
        roomInitRef.current = true;

        // Si habia una partida en curso, se vuelve a ella en vez de empezar otra
        const anterior = partidaRecordada(mode);
        if (anterior) {
          socket.emit('room:join', { code: anterior }, (res) => {
            if (res?.ok) {
              setActualRoomCode(res.room?.code || anterior);
              return;
            }
            // la sala ya no existe: se olvida y se crea una nueva
            olvidarPartida();
            roomInitRef.current = false;
            handleAction();
          });
          return;
        }

        socket.emit('room:create', { mode }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo crear la sala');
            roomInitRef.current = false;
            return;
          }
          if (res.code) setActualRoomCode(res.code);
          socket.emit('room:start', { code: res.code }, (startRes) => {
            if (!startRes?.ok) setError(startRes?.error || 'No se pudo iniciar');
          });
        });
        return;
      }

      // Caso C: El usuario eligió crear una sala privada
      if (playModeOption === 'private') {
        roomInitRef.current = true;
        socket.emit('room:create', { mode }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo crear la sala');
            roomInitRef.current = false;
            setPlayModeOption(null);
            return;
          }
          if (res.code) setActualRoomCode(res.code);
        });
        return;
      }

      // Caso D: El usuario eligió buscar partida (matchmaking)
      if (playModeOption === 'matchmaking') {
        roomInitRef.current = true;
        setIsSearching(true);
        socket.emit('matchmaking:join', { mode }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo unir al emparejamiento');
            roomInitRef.current = false;
            setIsSearching(false);
            setPlayModeOption(null);
          }
        });
        return;
      }
    };

    const onMatchSuccess = ({ code }) => {
      setIsSearching(false);
      setPlayModeOption(null);
      roomInitRef.current = false;
      navigate(`/game?join=${code}`, { replace: true });
    };

    socket.on('matchmaking:success', onMatchSuccess);

    if (socket.connected) {
      handleAction();
    }
    socket.on('connect', handleAction);

    return () => {
      socket.off('connect', handleAction);
      socket.off('matchmaking:success', onMatchSuccess);
    };
  }, [socket, mode, joinParam, playModeOption, navigate]);

  // 3. Temporizador de búsqueda de matchmaking
  useEffect(() => {
    if (!isSearching) {
      setSearchTime(0);
      return;
    }
    const timer = setInterval(() => {
      setSearchTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSearching]);

  const handleCancelSearch = () => {
    if (socket) {
      socket.emit('matchmaking:leave');
    }
    setIsSearching(false);
    setPlayModeOption(null);
    roomInitRef.current = false;
  };

  const myPlayerId = useMemo(() => {
    if (user?.id) return user.id;
    const me = gameState?.players?.find((p) => !p.isBot);
    return me?.id;
  }, [user, gameState]);

  const myPlayer = useMemo(() => {
    if (!gameState || !myPlayerId) return null;
    return gameState.players.find((p) => p.id === myPlayerId);
  }, [gameState, myPlayerId]);

  const myTurn = gameState?.currentPlayerId && myPlayerId
    ? gameState.currentPlayerId === myPlayerId
    : false;
  const manoFirma = (gameState?.myHand || []).map((t) => `${t[0]}${t[1]}`).join(',');
  // IMPORTANTE: este efecto tiene que quedar ARRIBA de todos los `return`
  // tempranos del componente. Si queda abajo, en los renders que salen antes
  // no se ejecuta y React tira el error #310 ("rendered more hooks than
  // during the previous render"), dejando la pantalla en blanco.
  // Cuando no podés jugar, el servidor explica ficha por ficha por qué.
  // Se pide sola, sin que haya que apretar nada.
  useEffect(() => {
    if (!socket || !actualRoomCode) return;
    if (!myTurn || gameState?.canPlay !== false) {
      setExplicacion(null);
      return;
    }
    let vigente = true;
    socket.emit('game:explain', { code: actualRoomCode }, (res) => {
      if (!vigente) return;
      setExplicacion(res?.ok ? res : { error: res?.error || 'No se pudo consultar' });
    });
    return () => {
      vigente = false;
    };
    // `manoFirma` es imprescindible: al robar del pozo la mano crece pero el
    // tablero y `canPlay` no cambian, asi que sin ella el efecto no se repetia
    // y el panel seguia explicando la mano vieja, sin la ficha recien robada.
  }, [socket, actualRoomCode, myTurn, gameState?.canPlay, gameState?.board?.length, manoFirma]);

  const isHost = lobby?.players.find((p) => p.isHost)?.id === myPlayerId;
  const isAutoStart = AUTO_START_MODES.includes(mode);

  const opponents = useMemo(() => {
    if (!gameState || !myPlayerId) return [];
    return gameState.players.filter((p) => p.id !== myPlayerId);
  }, [gameState, myPlayerId]);

  const validIndices = useMemo(() => {
    if (!gameState?.validMoves) return [];
    return gameState.validMoves.map((m) => m.index);
  }, [gameState]);


  const handleTileClick = (index) => {
    if (!myTurn || !gameState || isPlacing || draggedTile) return;
    const movesForTile = gameState.validMoves.filter((m) => m.index === index);
    if (movesForTile.length === 0) return;
    
    if (selectedTile && selectedTile.index === index) {
      setSelectedTile(null);
    } else {
      setSelectedTile({ index, tile: gameState.myHand[index] });
    }
  };

  const playTile = (tileIndex, side, placement = null) => {
    if (!socket || !actualRoomCode || isPlacing || enviandoRef.current) return;
    enviandoRef.current = true;
    setError('');
    setIsPlacing(true);
    const payload = { code: actualRoomCode, tileIndex, side };
    if (placement) {
      payload.x = placement.x;
      payload.y = placement.y;
      payload.x2 = placement.x2;
      payload.y2 = placement.y2;
      payload.orientation = placement.orientation;
    }
    socket.emit('game:play', payload, (res) => {
      enviandoRef.current = false;
      if (!res.ok) {
        setError(res.error);
        setIsPlacing(false);
      }
    });
  };

  const handlePass = () => {
    if (!socket || !actualRoomCode || isPlacing) return;
    setError('');
    setIsPlacing(true);
    socket.emit('game:pass', { code: actualRoomCode }, (res) => {
      if (!res.ok) {
        setError(res.error);
        setIsPlacing(false);
      }
    });
  };

  const handleDraw = (poolIndex = null) => {
    if (!socket || !actualRoomCode || isPlacing) return;
    setError('');
    setIsPlacing(true);
    socket.emit('game:draw', { code: actualRoomCode, poolIndex }, (res) => {
      if (!res.ok) {
        setError(res.error);
        setIsPlacing(false);
      }
    });
  };

  const handleStartGame = () => {
    if (!socket || !lobby) return;
    socket.emit('room:start', { code: lobby.code }, (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const handleNextRound = () => {
    if (!socket || !actualRoomCode) return;
    socket.emit('game:next-round', { code: actualRoomCode }, (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const handleSendReaction = (emoji) => {
    if (!socket || !actualRoomCode) return;
    socket.emit('game:reaction', { code: actualRoomCode, emoji });
    setShowReactionMenu(false);
  };

  if (error && !lobby && !gameState) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="card p-6 sm:p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-2 text-red-400">Error</h2>
            <p className="text-slate-300 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full mb-2"
            >
              🔄 Reintentar
            </button>
            <Link to="/dashboard" className="btn-secondary w-full block">
              Volver al dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="min-h-screen flex flex-col bg-domino-dark text-domino-cream">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-8">
          <div className="hidden w-full max-w-md sm:block">
            <AdSidebar />
          </div>
          <div className="card p-6 sm:p-10 max-w-md w-full border border-domino-accent/30 bg-domino-felt shadow-2xl text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-felt opacity-5 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center py-4">
              <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-domino-accent/20 border-t-domino-accent animate-spin" />
                <div className="text-4xl animate-pulse">🎲</div>
              </div>
              <p className="text-domino-accent text-[10px] tracking-[0.4em] uppercase mb-2">
                Buscando Mesa
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl text-domino-cream font-bold mb-2">
                Buscando oponente...
              </h1>
              <p className="text-slate-400 text-sm max-w-xs mb-6">
                Buscando jugadores activos para un duelo 1 vs 1 en línea.
              </p>
              <div className="bg-domino-dark/50 border border-slate-700/60 rounded-xl px-6 py-3 mb-8 w-full font-mono text-sm flex justify-between items-center">
                <span className="text-slate-500">Tiempo en cola:</span>
                <span className="text-domino-accent font-bold">
                  {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <button
                onClick={handleCancelSearch}
                className="btn-secondary w-full text-sm py-3 hover:bg-domino-crimson/10 hover:text-red-400 hover:border-domino-crimson/50 transition duration-200"
              >
                Cancelar búsqueda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!joinParam && !AUTO_START_MODES.includes(mode) && playModeOption === null && !lobby && !gameState) {
    return (
      <div className="min-h-screen flex flex-col bg-domino-dark text-domino-cream">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="card p-6 sm:p-10 max-w-2xl w-full border border-domino-accent/30 bg-domino-felt shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-felt opacity-5 pointer-events-none" />
            <div className="text-center mb-8 relative z-10">
              <p className="text-domino-accent text-xs tracking-[0.4em] uppercase mb-2">
                Duelo de Caballeros
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-domino-cream font-bold">
                Modalidad <span className="text-domino-accent italic">1 vs 1 Online</span>
              </h1>
              <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
                Elige cómo deseas buscar tu próxima partida de dominó. Puedes emparejarte al azar o crear una sala privada.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-8">
              <button
                onClick={() => setPlayModeOption('matchmaking')}
                className="group p-6 text-left rounded-xl border border-domino-accent/20 hover:border-domino-accent bg-domino-card/40 hover:bg-domino-card/80 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 w-fit">⚡</div>
                  <h3 className="font-bold text-lg text-domino-cream mb-2 group-hover:text-domino-accent transition-colors">
                    Emparejamiento Rápido
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Te conecta automáticamente con otro jugador disponible en línea. ¡Rápido, competitivo y directo!
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-domino-accent font-semibold tracking-wider pt-4 border-t border-domino-accent/10 w-full">
                  <span>JUGAR AHORA</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
              <button
                onClick={() => setPlayModeOption('private')}
                className="group p-6 text-left rounded-xl border border-domino-accent/20 hover:border-domino-accent bg-domino-card/40 hover:bg-domino-card/80 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 w-fit">🗝️</div>
                  <h3 className="font-bold text-lg text-domino-cream mb-2 group-hover:text-domino-accent transition-colors">
                    Crear Sala Privada
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Genera un código único para compartirlo con un amigo. Ideal para partidas personalizadas y revanchas.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-domino-accent font-semibold tracking-wider pt-4 border-t border-domino-accent/10 w-full">
                  <span>CREAR SALA</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            </div>
            <div className="text-center relative z-10">
              <Link to="/dashboard" className="text-slate-500 hover:text-domino-cream text-sm transition">
                ← Volver al dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lobby && !lobby.started && !isAutoStart) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="card p-6 sm:p-8 max-w-lg w-full">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">
              Sala: <span className="text-domino-accent font-mono">{lobby.code}</span>
            </h1>
            <p className="text-slate-400 text-center mb-2 text-sm sm:text-base">
              {lobby.modeLabel} {lobby.hasPool && '· con pozo'}
            </p>
            <p className="text-slate-400 text-center mb-6 text-sm">
              Comparte este código con tus amigos
            </p>

            <div className="bg-domino-dark/50 border-2 border-dashed border-slate-600 rounded-xl p-4 sm:p-6 mb-4">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl font-black text-domino-accent tracking-widest">
                  {lobby.code}
                </div>
              </div>
            </div>

            <h2 className="font-bold mb-3 text-sm sm:text-base">
              Jugadores ({lobby.players.length}/{lobby.maxPlayers})
            </h2>
            <div className="space-y-2 mb-6">
              {lobby.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-domino-dark/50 border border-slate-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3"
                >
                  <span className="font-semibold text-sm sm:text-base truncate">
                    {p.username}
                    {p.isHost && (
                      <span className="ml-2 text-xs text-domino-accent">(anfitrión)</span>
                    )}
                  </span>
                  <span className="text-green-400 text-xs sm:text-sm">✓ Listo</span>
                </div>
              ))}
              {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center bg-domino-dark/30 border border-dashed border-slate-700 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-slate-500 italic text-sm"
                  >
                    Esperando jugador...
                  </div>
                )
              )}
            </div>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={lobby.players.length < lobby.maxPlayers}
                className="btn-primary w-full disabled:opacity-50"
              >
                {lobby.players.length < lobby.maxPlayers
                  ? `Esperando ${lobby.maxPlayers - lobby.players.length} jugador(es)...`
                  : 'Iniciar partida'}
              </button>
            ) : (
              <div className="text-center text-slate-400 italic text-sm">
                Esperando que el anfitrión inicie la partida...
              </div>
            )}

            <Link
              to="/dashboard"
              className="block text-center text-slate-500 hover:text-white text-sm mt-4"
            >
              ← Salir de la sala
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-3 animate-bounce">🎲</div>
            <p className="text-slate-300 mb-2">Preparando la partida...</p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-sm"
            >
              🔄 Reintentar
            </button>
            <div className="mt-4">
              <Link to="/dashboard" className="text-slate-500 hover:text-white text-sm">
                ← Volver al dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const miJugador = gameState?.players?.find((p) => p.id === myPlayerId) || null;
  const is1v1 = opponents.length === 1;
  // En dominó el compañero se sienta enfrente. Antes los rivales se repartían
  // por orden de lista, y en 2v2 el compañero (asiento +2) caía a un costado
  // como si fuera un rival.
  const totalAsientos = gameState.players.length;
  const miAsiento = miJugador?.seat ?? 0;
  const porAsiento = (salto) =>
    gameState.players.find((p) => p.seat === (miAsiento + salto) % totalAsientos) || null;
  const seatTop = totalAsientos === 4 ? porAsiento(2) : opponents[0] || null;
  const seatRight = totalAsientos === 4 ? porAsiento(1) : null;
  const seatLeft = totalAsientos === 4 ? porAsiento(3) : null;
  const esCompanero = (p) => p && miJugador && p.team === miJugador.team;

  // La pantalla de juego no es una pagina con un tablero adentro: es la mesa.
  // Sin barra de navegacion, sin banner y sin scroll, para que lo que se ve
  // grande sea lo que importa.
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black">

      {error && (
        <div className="bg-red-500/20 border-b border-red-500/50 text-red-300 px-4 py-2 text-center text-sm">
          {error}
        </div>
      )}

      <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-2 py-2">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[1fr_260px]">
          <div className="flex min-h-0 gap-2">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                <div className="relative mx-auto h-full w-full min-w-0 max-w-[768px]">
                <Board
                  clasePano={clasePano}
                  claseBaranda={claseBaranda}
                  board={gameState.board}
                  ends={gameState.ends}
                  selectedTile={selectedTile}
                  onPlayTile={(side, placement) => {
                    if (selectedTile) playTile(selectedTile.index, side, placement);
                  }}
                  myTurn={myTurn}
                  lastAction={gameState.lastAction}
                  draggedTile={draggedTile}
                  onSnapChange={handleSnapChange}
                />
                {/* El marcador y los rivales van sobre la madera, sin caja: si todo
                    lleva marco, todo pesa igual y no resalta lo importante. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-2 pt-1">
                  <div className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                    <div className="text-[9px] uppercase tracking-widest text-sky-300/80">Vos</div>
                    <div className="text-xl font-black leading-none text-sky-200">
                      {gameState.teamScores?.[1] ?? 0}
                    </div>
                  </div>
                  <div className="text-center text-[9px] uppercase tracking-widest text-domino-cream/60 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                    <div>Ronda {gameState.round} · a {gameState.targetPoints ?? 100}</div>
                    <div className="font-mono tracking-normal text-domino-cream/40">{gameState.roomCode}</div>
                    {gameState.hasPool && (
                      <div className="text-amber-300/80">pozo {gameState.poolCount}</div>
                    )}
                  </div>
                  <div className="text-right drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                    <div className="text-[9px] uppercase tracking-widest text-rose-300/80">Ellos</div>
                    <div className="text-xl font-black leading-none text-rose-200">
                      {gameState.teamScores?.[2] ?? 0}
                    </div>
                  </div>
                </div>

                <AsientoFlotante
                  jugador={seatTop}
                  fichas={gameState.handCounts[seatTop?.id]}
                  enTurno={gameState.currentPlayerId === seatTop?.id}
                  esCompanero={esCompanero(seatTop)}
                  className="left-1/2 top-7 -translate-x-1/2"
                />
                <AsientoFlotante
                  jugador={seatLeft}
                  fichas={gameState.handCounts[seatLeft?.id]}
                  enTurno={gameState.currentPlayerId === seatLeft?.id}
                  esCompanero={esCompanero(seatLeft)}
                  className="left-1 top-7"
                />
                <AsientoFlotante
                  jugador={seatRight}
                  fichas={gameState.handCounts[seatRight?.id]}
                  enTurno={gameState.currentPlayerId === seatRight?.id}
                  esCompanero={esCompanero(seatRight)}
                  className="right-1 top-7"
                />

                <div className="absolute bottom-1 right-1 z-30">
                  <MesaThemePicker tema={tema} setTema={setTema} />
                </div>

                {lastAction && myTurn && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-slate-200 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-slate-700">
                    {lastAction}
                  </div>
                )}

                {/* REACCIONES FLOTANTES EN LA MESA */}
                {Object.entries(reactions).map(([pId, val]) => {
                  let posClass = "";
                  const pIdStr = String(pId);
                  if (pIdStr === String(myPlayerId)) {
                    posClass = "bottom-8 left-1/2 -translate-x-1/2";
                  } else if (seatTop && pIdStr === String(seatTop.id)) {
                    posClass = "top-8 left-1/2 -translate-x-1/2";
                  } else if (seatLeft && pIdStr === String(seatLeft.id)) {
                    posClass = "left-8 top-1/2 -translate-y-1/2";
                  } else if (seatRight && pIdStr === String(seatRight.id)) {
                    posClass = "right-8 top-1/2 -translate-y-1/2";
                  } else {
                    return null;
                  }

                  return (
                    <div
                      key={`${pId}-${val.id}`}
                      className={`absolute ${posClass} flex flex-col items-center justify-center animate-bounce z-30`}
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-domino-dark/95 border-2 border-domino-accent rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-amber-500/20">
                        {val.emoji}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-domino-accent font-semibold tracking-wider bg-black/70 px-2 py-0.5 rounded-full mt-1 border border-domino-accent/20 max-w-[80px] truncate">
                        {val.username}
                      </span>
                    </div>
                  );
                })}
              </div>
              </div>

              <div className="shrink-0 rounded-xl border border-white/5 bg-black/40 p-2 sm:p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="font-bold text-sm sm:text-base">Tu mano</div>
                    <div className="text-[10px] sm:text-xs text-slate-400">
                      {gameState.myHand?.length ?? 0} fichas
                    </div>
                  </div>
                  <div className="text-right">
                    {myTurn ? (
                      <span className="text-xs sm:text-sm text-green-400 font-bold animate-pulse">
                        🎯 Tu turno
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400">
                        Esperando...
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 w-full">
                  <div className="flex-1 min-w-0">
                    <Hand
                      tiles={gameState.myHand}
                      validIndices={validIndices}
                      selectedIndex={selectedTile?.index}
                      onSelect={handleTileClick}
                      canPlay={myTurn && !isPlacing && !draggedTile}
                      draggedTile={draggedTile}
                      onDragStart={handleDragStart}
                      onDragUpdate={handleDragUpdate}
                      onDragEnd={handleDragEnd}
                    />
                  </div>

                  {/* Icono de Mensaje / Reacción */}
                  <div className="relative shrink-0 pb-3">
                    <button
                      onClick={() => setShowReactionMenu(!showReactionMenu)}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-domino-card hover:bg-domino-card/80 border-2 border-domino-accent/40 hover:border-domino-accent rounded-xl flex items-center justify-center text-domino-accent transition shadow-lg cursor-pointer"
                      title="Enviar gesto o emoji"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 6 6 0 0 0 1.257-2.907C4.228 15.932 3 14.1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                      </svg>
                    </button>

                    {/* Menú emergente de emojis */}
                    {showReactionMenu && (
                      <div className="absolute bottom-16 right-0 bg-domino-felt border-2 border-domino-accent/50 rounded-2xl p-3 shadow-2xl z-50 grid grid-cols-6 gap-2" style={{ minWidth: '240px' }}>
                        {['😎', '😂', '🤣', '😆', '😭', '😡', '🤬', '🥱', '🤔', '😒', '😮'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleSendReaction(emoji)}
                            className="text-2xl sm:text-3xl hover:scale-125 active:scale-95 transition cursor-pointer p-0.5 flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {myTurn && gameState.canPlay && !draggedTile && (
                  <p className="text-center text-[10px] sm:text-xs text-slate-500 italic mt-2">
                    Arrastra una ficha válida a la mesa
                  </p>
                )}

                {myTurn && !gameState.canPlay && (
                  <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-slate-700/60 bg-black/25 p-2 text-left">
                    <p className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                      Por qué no podés jugar
                      {explicacion?.ends
                        ? ` · extremos ${explicacion.ends.left} y ${explicacion.ends.right}`
                        : ''}
                    </p>
                    {!explicacion && (
                      <p className="text-xs italic text-slate-500">revisando tu mano...</p>
                    )}
                    {explicacion?.error && (
                      <p className="text-xs text-red-300">{explicacion.error}</p>
                    )}
                    {explicacion?.fichas?.map((f) => (
                      <p key={f.index} className="text-xs leading-relaxed">
                        <span className="font-mono text-domino-cream">[{f.tile[0]}|{f.tile[1]}]</span>{' '}
                        <span className={f.jugable ? 'text-emerald-400' : 'text-slate-400'}>
                          {f.jugable ? 'se puede jugar' : f.motivo}
                        </span>
                      </p>
                    ))}
                  </div>
                )}

                {gameState.hasPool && gameState.poolCount > 0 && (
                  <div className="mt-3">
                    <Pool
                      cantidad={gameState.poolCount}
                      activo={myTurn && gameState.canDraw}
                      robando={isPlacing}
                      onRobar={handleDraw}
                    />
                  </div>
                )}

                {myTurn && gameState.canPass && (
                  <button onClick={handlePass} className="btn-secondary w-full mt-3 text-sm">
                    Pasar (no puedo jugar)
                  </button>
                )}

                {myTurn && !gameState.canPlay && !gameState.canDraw && !gameState.canPass && (
                  <p className="text-center text-amber-400 text-xs mt-2 italic">
                    Esperando tu jugada...
                  </p>
                )}
              </div>
            </div>

          <div className="hidden lg:block space-y-3">
            <Mesa
              sala={gameState.roomCode}
              pozo={gameState.hasPool ? gameState.poolCount : null}
            />

            <Marcador
              equipo1={gameState.teamScores?.[1] ?? 0}
              equipo2={gameState.teamScores?.[2] ?? 0}
              objetivo={gameState.targetPoints ?? 100}
              ronda={gameState.round}
              miEquipo={miJugador?.team}
            />

            {[seatTop, seatLeft, seatRight]
              .filter(Boolean)
              .map((rival) => (
                <Jugador
                  key={rival.id}
                  jugador={rival}
                  fichas={gameState.handCounts[rival.id] ?? 0}
                  enTurno={gameState.currentPlayerId === rival.id}
                  esRival
                />
              ))}

            {miJugador && (
              <Jugador
                jugador={miJugador}
                fichas={gameState.myHand?.length ?? 0}
                enTurno={myTurn}
              />
            )}
          </div>
        </div>

        {gameState.status === 'round-end' && (
          <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
            <div className="card p-6 sm:p-8 max-w-md w-full text-center max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {gameState.winningTeam
                  ? `¡Ganó el equipo ${gameState.winningTeam}!`
                  : '¡Empate!'}
              </h2>
              <p className="text-slate-400 mb-2">
                {gameState.endReason === 'domino'
                  ? 'Un jugador se quedó sin fichas'
                  : 'El juego se trancó'}
              </p>
              <p className="text-3xl font-black text-domino-accent mb-4">
                +{gameState.roundPoints} puntos
              </p>

              <RoundBreakdown
                manos={gameState.revealedHands}
                equipoGanador={gameState.winningTeam}
                motivo={gameState.endReason}
                puntos={gameState.roundPoints}
              />

              <div className="my-4">
                <TopBanner />
              </div>

              <div className="space-y-2">
                {gameState.status === 'round-end' && gameState.winningTeam !== 0 && (
                  <button onClick={handleNextRound} className="btn-primary w-full">
                    Siguiente ronda
                  </button>
                )}
                <Link to="/dashboard" className="btn-secondary w-full block">
                  Salir al dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {gameState.status === 'game-over' && (
          <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
            <div className="card p-6 sm:p-8 max-w-md w-full text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-domino-accent">
                🏆 ¡Partida terminada!
              </h2>
              <p className="text-slate-300 mb-6">
                {gameState.winningTeam
                  ? `El equipo ${gameState.winningTeam} ganó ${Math.max(
                      gameState.teamScores[1],
                      gameState.teamScores[2]
                    )} a ${Math.min(gameState.teamScores[1], gameState.teamScores[2])}`
                  : 'Empate técnico'}
              </p>
              <Link to="/dashboard" className="btn-primary w-full block">
                Volver al dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}