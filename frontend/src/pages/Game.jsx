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
import MesaIcono from '../components/MesaIcono.jsx';
import { Seccion, Fila } from '../components/SelectorModos.jsx';
import PlayerInfo from '../components/game/PlayerInfo.jsx';
import Avatar from '../components/game/Avatar.jsx';
import Tablero from '../components/game/Tablero.jsx';
import Scoreboard from '../components/game/Scoreboard.jsx';
import SidePicker from '../components/game/SidePicker.jsx';
import AdSidebar from '../components/AdSidebar.jsx';
import TopBanner from '../components/TopBanner.jsx';
import { connectSocket } from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { playTileSound, playDrawSound, estaSilenciado, alternarSilencio } from '../utils/soundEffects.js';
import { ChevronRight, LogOut } from 'lucide-react';
import IconoColor from '../components/IconoColor.jsx';
import { salirPantallaCompleta } from '../utils/pantalla.js';
import RelojDeTurno from '../components/game/RelojDeTurno.jsx';
import AvisoDeAusente from '../components/game/AvisoDeAusente.jsx';
import AvisoDeSalto from '../components/game/AvisoDeSalto.jsx';

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

function BotonMesa({ titulo, activo = false, onClick, icono }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
        activo
          ? 'border-domino-accent bg-domino-felt shadow-[0_0_10px_rgba(212,175,55,0.45)]'
          : 'border-domino-accent/40 bg-black/60 hover:border-domino-accent hover:bg-domino-felt/80'
      }`}
      style={{ boxShadow: activo ? undefined : '0 2px 6px rgba(0,0,0,.6)' }}
    >
      <IconoColor nombre={icono} tamano={24} className="drop-shadow-[0_1px_2px_rgba(0,0,0,.7)]" />
    </button>
  );
}

/**
 * El jugador en su borde de la mesa: retrato, debajo el nombre y debajo la
 * cantidad de fichas, todo en horizontal.
 *
 * Sin caja alrededor y de ancho fijo. Antes iba en un rectangulo que cambiaba
 * de tamaño segun lo largo del nombre y con el texto de costado, que era
 * justo lo que el usuario no queria.
 */
function PlacaAsiento({ jugador, fichas, enTurno, esCompanero, className = '' }) {
  if (!jugador) return null;
  return (
    <div
      className={`pointer-events-none absolute z-20 flex w-[58px] flex-col items-center gap-0.5 text-center ${className}`}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,.95)' }}
    >
      <div className="relative">
        <Avatar semilla={jugador.avatar || jugador.username} tamano={38} />
        {enTurno && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-black/70 bg-emerald-400" />
        )}
      </div>
      <span
        className={`w-full truncate text-[10px] font-bold leading-tight ${
          enTurno ? 'text-emerald-300' : esCompanero ? 'text-sky-200' : 'text-domino-cream'
        }`}
      >
        {jugador.username}
      </span>
      <span className="text-[9px] leading-tight text-domino-cream/60">
        {fichas ?? 0} {esCompanero ? '· compa' : 'fichas'}
      </span>
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
// Cuanto se le quita al paño por cada lado para que quepan las placas de los
// jugadores. La cadena vive dentro de lo que queda y no se sale de ahi.
// Cuanto se le reserva a cada borde de la mesa, en pixeles.
//
// El de arriba estaba en 62 y la placa del jugador de enfrente termina a 34:
// habia 28 px de aire que no usaba nadie. Y ese borde es el que MANDA: la
// escala sale del lado mas corto de la mesa, que en cualquier pantalla normal
// es el vertical. Cada pixel que se devuelve ahi agranda TODAS las fichas.
//
// Ojo: esto NO toca la garantia de la seccion 82. La cantidad de celdas que se
// ven (21,5) sale de ZOOM_FICHAS y no cambia; lo unico que cambia es cuantos
// pixeles mide cada celda. Mas alto = fichas mas grandes, mismas celdas.
const MARGEN_MESA = { arriba: 44, abajo: 8, lados: 60, borde: 8 };

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
  // Se escribe a mano junto con el estado. Con un `useEffect` iba un render
  // atrasado y al soltar rapido se enviaba la jugada con datos viejos: unas
  // veces la posicion anterior ("Colocacion invalida") y otras sin el enganche
  // marcado, y entonces no pasaba nada.
  const draggedTileRef = useRef(null);
  const anotarArrastre = (siguiente) => {
    draggedTileRef.current = siguiente;
    setDraggedTile(siguiente);
  };

  // Candado contra doble envio en el mismo tick. `isPlacing` no alcanza porque
  // se lee del closure y dos llamadas seguidas ven el mismo valor viejo.
  const enviandoRef = useRef(false);

  // Sala activa en un ref: el manejador de reconexion corre fuera del render.
  const salaActivaRef = useRef(null);
  useEffect(() => {
    salaActivaRef.current = actualRoomCode;
  }, [actualRoomCode]);

  const handleDragStart = (index, tile, clientX, clientY) => {
    anotarArrastre({
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
    const previo = draggedTileRef.current;
    if (!previo) return;
    anotarArrastre({ ...previo, currentX: clientX, currentY: clientY });
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
    const previo = draggedTileRef.current;
    if (!previo) return;
    if (previo.isSnapped === isSnapped && previo.activePlacement === activePlacement) return;
    anotarArrastre({ ...previo, isSnapped, activePlacement });
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

  // La mano se apoya sobre el paño. Se mide para reservarle sitio a la cadena.
  const manoRef = useRef(null);
  const [altoMano, setAltoMano] = useState(190);
  useEffect(() => {
    const el = manoRef.current;
    if (!el) return;
    const medir = () => setAltoMano(el.offsetHeight || 190);
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  });
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

  // Con colocacion libre hay varias posiciones por extremo, asi que se manda la
  // que eligio el jugador. El ref del arrastre se escribe a mano (ver arriba):
  // con el `useEffect` iba atrasado y se enviaba la posicion anterior.
  const playTile = (tileIndex, side, placement = null) => {
    if (!socket || !actualRoomCode || isPlacing || enviandoRef.current) return;
    enviandoRef.current = true;
    setError('');
    setIsPlacing(true);

    // Si la respuesta nunca llega, la mano no puede quedar apagada para siempre.
    const rescate = setTimeout(() => {
      enviandoRef.current = false;
      setIsPlacing(false);
    }, 6000);

    const payload = { code: actualRoomCode, tileIndex, side };
    if (placement) {
      payload.x = placement.x;
      payload.y = placement.y;
      payload.x2 = placement.x2;
      payload.y2 = placement.y2;
      payload.orientation = placement.orientation;
    }

    socket.emit('game:play', payload, (res) => {
      clearTimeout(rescate);
      enviandoRef.current = false;
      if (!res?.ok) {
        setError(res?.error || 'No se pudo jugar esa ficha');
        setIsPlacing(false);
      }
    });
  };

  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [solapa, setSolapa] = useState(false);
  const [silencio, setSilencio] = useState(() => estaSilenciado());

  // Salir de verdad: el servidor saca al jugador de la sala y se olvida la
  // partida guardada. El boton de antes solo navegaba, asi que al volver se
  // reentraba a la misma mesa (esa memoria existe para cuando te vas sin
  // querer, ver seccion 39).
  const salirDeLaPartida = () => {
    salirPantallaCompleta();
    if (socket && actualRoomCode) socket.emit('room:leave', { code: actualRoomCode });
    olvidarPartida();
    // El dashboard pide cuenta: a un invitado lo rebotaba a /login.
    navigate(user ? '/dashboard' : '/');
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
    const asientos = mode === '2v2' ? 4 : 2;
    const vacias = asientos - 1;
    return (
      <div className="flex min-h-[100svh] flex-col bg-domino-dark text-domino-cream">
        <Navbar />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-6 pt-4 sm:max-w-lg">
          <div className="mb-5 px-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-domino-accent/70">
              {asientos === 4 ? 'Equipos' : 'Duelo'}
            </p>
            <h1 className="text-2xl font-bold tracking-wide text-domino-cream">
              {asientos === 4 ? '2 vs 2' : '1 vs 1'} con gente
            </h1>
          </div>

          <Seccion titulo="Cómo buscar" pie={`faltan ${vacias}`}>
            <Fila
              icono={<MesaIcono asientos={asientos} vacias={vacias} tamano={54} />}
              titulo="Emparejamiento rápido"
              texto="Te sentamos con quien aparezca."
              onClick={() => setPlayModeOption('matchmaking')}
            />
            <Fila
              icono={<MesaIcono asientos={asientos} vacias={vacias} codigo tamano={54} />}
              titulo="Sala privada"
              texto="Te damos un código para pasarle."
              onClick={() => setPlayModeOption('private')}
            />
          </Seccion>

          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="mt-2 self-center text-[11px] uppercase tracking-[0.2em] text-domino-cream/35 transition hover:text-domino-accent"
          >
            ← Volver
          </button>
        </main>
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
  // El marcador se rotula segun TU equipo, no segun el numero de equipo: si
  // entras de segundo sos el equipo 2, y "Vos" mostraba los puntos del rival.
  const miEquipo = miJugador?.team ?? 1;
  const equipoRival = miEquipo === 1 ? 2 : 1;

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

      {/* El salir va arriba del todo a la izquierda, separado de los controles
          de la mesa: es lo unico que no tiene vuelta atras. */}
      <div className="relative flex shrink-0 items-start gap-1 px-1 pt-1.5">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setConfirmandoSalida((v) => !v)}
            title="Salir de la partida"
            aria-label="Salir de la partida"
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              confirmandoSalida
                ? 'border-domino-crimson bg-domino-crimson/25 text-domino-cream'
                : 'border-domino-accent/35 bg-black/50 text-domino-cream-dim hover:border-domino-crimson/80 hover:text-domino-cream'
            }`}
          >
            <LogOut size={18} strokeWidth={1.9} />
          </button>

          {confirmandoSalida && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setConfirmandoSalida(false)} />
              <div className="absolute left-0 top-11 z-50 w-52 rounded-xl border border-domino-crimson/40 bg-domino-felt/95 p-3 shadow-2xl backdrop-blur">
                <p className="mb-2 text-[11px] leading-snug text-domino-cream">
                  ¿Salir? La mesa se cierra y perdés lo jugado.
                </p>
                <button
                  type="button"
                  onClick={salirDeLaPartida}
                  className="mb-1.5 w-full rounded-lg bg-domino-crimson/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-domino-crimson"
                >
                  Sí, salir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoSalida(false)}
                  className="w-full rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-400"
                >
                  Seguir jugando
                </button>
              </div>
            </>
          )}
        </div>

        <Tablero
          mios={gameState.teamScores?.[miEquipo] ?? 0}
          suyos={gameState.teamScores?.[equipoRival] ?? 0}
          ronda={gameState.round}
          objetivo={gameState.targetPoints ?? 100}
          pozo={gameState.hasPool ? gameState.poolCount : null}
          sala={gameState.roomCode}
        />
      </div>

      <div className="relative min-h-0 w-full flex-1">
        <div className="relative h-full w-full">
          <div className="absolute inset-0">
            <div className="relative h-full w-full">
              <div className="absolute inset-0">
                <div className="relative h-full w-full">
                <Board
                  margenes={{
                    arriba: MARGEN_MESA.arriba,
                    derecha: seatRight ? MARGEN_MESA.lados : MARGEN_MESA.borde,
                    abajo: altoMano + MARGEN_MESA.abajo,
                    izquierda: seatLeft ? MARGEN_MESA.lados : MARGEN_MESA.borde
                  }}
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

                {/* La cuenta atras del turno, en el centro de la mesa. Aparece
                    sola en los ultimos diez segundos. */}
                <RelojDeTurno
                  restanteMs={gameState.turnRestanteMs}
                  turnoId={gameState.turnoId}
                  total={gameState.turnMs}
                  esMiTurno={myTurn}
                  nombre={gameState.players?.find((p) => p.id === gameState.currentPlayerId)?.username}
                />

                {/* "Fulano se desconecto, tiene 60 segundos para volver". */}
                <AvisoDeAusente ausentes={gameState.ausentes} />

                {/* "A Fulano se le paso el turno", cuando se le acaba el tiempo. */}
                <AvisoDeSalto salto={gameState.saltadoPorTiempo} />
                {/* Cada uno en su lado de la mesa. Las placas se apoyan en el
                    borde y el rectangulo de juego (los margenes que recibe
                    Board) empieza justo por dentro, asi que la cadena nunca les
                    crece encima. */}
                <PlacaAsiento
                  jugador={seatTop}
                  fichas={gameState.handCounts[seatTop?.id]}
                  enTurno={gameState.currentPlayerId === seatTop?.id}
                  esCompanero={esCompanero(seatTop)}
                  className="left-1/2 top-2 -translate-x-1/2"
                />
                <PlacaAsiento
                  jugador={seatLeft}
                  fichas={gameState.handCounts[seatLeft?.id]}
                  enTurno={gameState.currentPlayerId === seatLeft?.id}
                  esCompanero={esCompanero(seatLeft)}
                  className="left-0.5 top-1/2 -translate-y-1/2"
                />
                <PlacaAsiento
                  jugador={seatRight}
                  fichas={gameState.handCounts[seatRight?.id]}
                  enTurno={gameState.currentPlayerId === seatRight?.id}
                  esCompanero={esCompanero(seatRight)}
                  className="right-0.5 top-1/2 -translate-y-1/2"
                />

                {/* La solapa de controles. La pestaña va POR DETRAS de los
                    botones (z menor) y es alargada, para que se lea como una
                    lengueta que los saca de debajo del borde. */}
                <div className="absolute left-0 top-3 z-40 flex items-start">
                  <div className="relative flex items-start">
                    <button
                      type="button"
                      onClick={() => { setSolapa((v) => !v); setAbierto(null); }}
                      title={solapa ? 'Ocultar los controles' : 'Mostrar los controles'}
                      aria-label={solapa ? 'Ocultar los controles' : 'Mostrar los controles'}
                      aria-expanded={solapa}
                      className={`absolute left-0 top-0 z-0 flex w-4 items-end justify-center rounded-r-lg border border-l-0 border-domino-accent/40 bg-black/45 pb-2 text-domino-accent/70 transition-all hover:bg-black/65 hover:text-domino-accent ${
                        solapa ? 'h-[172px]' : 'h-[76px]'
                      }`}
                    >
                      <ChevronRight
                        size={13}
                        className={`transition-transform ${solapa ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      className={`relative z-10 flex flex-col gap-2 overflow-hidden transition-all duration-200 ${
                        solapa ? 'ml-1 max-w-[52px] opacity-100' : 'ml-0 max-w-0 opacity-0'
                      }`}
                    >
                      <BotonMesa
                        titulo={silencio ? 'Activar el sonido' : 'Silenciar'}
                        activo={!silencio}
                        icono={silencio ? 'silencio' : 'sonido'}
                        onClick={() => setSilencio(alternarSilencio())}
                      />
                      <BotonMesa
                        titulo="Color de la mesa"
                        activo={abierto === 'pano'}
                        icono="paleta"
                        onClick={() => setAbierto((v) => (v === 'pano' ? null : 'pano'))}
                      />
                      <BotonMesa
                        titulo="Enviar un gesto"
                        activo={showReactionMenu}
                        icono="gesto"
                        onClick={() => { setAbierto(null); setShowReactionMenu((v) => !v); }}
                      />
                    </div>
                  </div>

                  {solapa && abierto === 'pano' && (
                    <>
                      <div className="fixed inset-0 -z-10" onClick={() => setAbierto(null)} />
                      <div className="ml-1.5 w-52 rounded-xl border border-domino-accent/25 bg-domino-felt/95 p-3 shadow-2xl backdrop-blur">
                        <MesaThemePicker tema={tema} setTema={setTema} enMenu />
                      </div>
                    </>
                  )}
                </div>

                {lastAction && myTurn && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-slate-200 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-slate-700">
                    {lastAction}
                  </div>
                )}

                {/* REACCIONES FLOTANTES EN LA MESA */}
                {Object.entries(reactions).map(([pId, val]) => {
                  let posClass = "";
                  let estilo = undefined;
                  const pIdStr = String(pId);
                  if (pIdStr === String(myPlayerId)) {
                    // Sobre la mano hay una banda oscura: el gesto propio tiene
                    // que quedar por encima de ella o no se ve.
                    posClass = "left-1/2 -translate-x-1/2";
                    estilo = { bottom: altoMano + 16 };
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
                      style={estilo}
                      className={`absolute ${posClass} flex flex-col items-center justify-center animate-bounce z-40`}
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

              <div ref={manoRef} className="absolute inset-x-0 bottom-0 z-30 px-2 pb-2 pt-3"
                style={{
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.90) 62%, rgba(0,0,0,0.55) 84%, rgba(0,0,0,0) 100%)'
                }}>
                <div className="mb-1 flex items-center justify-between gap-2 px-1 text-[10px] uppercase tracking-widest">
                  <span className="text-domino-cream/50">
                    tu mano · {gameState.myHand?.length ?? 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={myTurn ? 'font-bold text-emerald-300' : 'text-domino-cream/40'}>
                      {myTurn ? 'tu turno' : 'esperando'}
                    </span>
                  </div>
                </div>

                {showReactionMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowReactionMenu(false)} />
                    <div className="absolute bottom-full left-1/2 z-50 mb-2 grid -translate-x-1/2 grid-cols-6 gap-2 rounded-2xl border-2 border-domino-accent/50 bg-domino-felt p-3 shadow-2xl">
                      {['😎', '😂', '🤣', '😆', '😭', '😡', '🤬', '🥱', '🤔', '😒', '😮'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleSendReaction(emoji)}
                          className="flex cursor-pointer items-center justify-center p-0.5 text-2xl transition hover:scale-125 active:scale-95 sm:text-3xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* La mano ocupa todo el ancho: el boton de gestos vive ahora en
                    el menu de la mesa, arriba a la izquierda. */}
                <div className="flex w-full items-center">
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
                  myTurn && gameState.canDraw ? (
                    <div className="mt-2">
                      <Pool
                        cantidad={gameState.poolCount}
                        activo
                        robando={isPlacing}
                        onRobar={handleDraw}
                      />
                    </div>
                  ) : null
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

          <div className="hidden">
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
                  : gameState.endReason === 'forfeit'
                    ? `${gameState.players?.[gameState.forfeitedSeat]?.username ?? 'Un jugador'} dejó la partida`
                    : 'El juego se trancó'}
              </p>

              {/* En un abandono no hay ronda cerrada: no hay puntos que sumar
                  ni manos que revelar. Mostrar "+0 puntos" y un desglose vacio
                  haria parecer que algo fallo. */}
              {gameState.endReason !== 'forfeit' && (
                <>
                  <p className="text-3xl font-black text-domino-accent mb-4">
                    +{gameState.roundPoints} puntos
                  </p>

                  <RoundBreakdown
                    manos={gameState.revealedHands}
                    equipoGanador={gameState.winningTeam}
                    motivo={gameState.endReason}
                    puntos={gameState.roundPoints}
                  />
                </>
              )}

              <div className="my-4">
                <TopBanner />
              </div>

              <div className="space-y-2">
                {gameState.status === 'round-end' && gameState.winningTeam !== 0 && (
                  <button onClick={handleNextRound} className="btn-primary w-full">
                    Siguiente ronda
                  </button>
                )}
                <button onClick={salirDeLaPartida} className="btn-secondary w-full">
                  Salir de la partida
                </button>
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