import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Board from '../components/game/Board.jsx';
import Hand from '../components/game/Hand.jsx';
import OpponentHand from '../components/game/OpponentHand.jsx';
import PlayerInfo from '../components/game/PlayerInfo.jsx';
import Scoreboard from '../components/game/Scoreboard.jsx';
import SidePicker from '../components/game/SidePicker.jsx';
import AdSidebar from '../components/AdSidebar.jsx';
import TopBanner from '../components/TopBanner.jsx';
import { connectSocket } from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

const AUTO_START_MODES = ['1v1bot'];
const GUEST_ALLOWED_MODES = ['1v1bot'];

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
  const [showSidePicker, setShowSidePicker] = useState(false);
  const [error, setError] = useState('');
  const [actualRoomCode, setActualRoomCode] = useState(urlRoomCode || null);
  const [lastAction, setLastAction] = useState(null);

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
      setGameState(state);
      setActualRoomCode(state.roomCode);
      setLobby(null);
      setSelectedTile(null);
      setShowSidePicker(false);
      setError('');
    };
    const onConnectError = (err) => {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('token')) {
        setError('Tu sesión expiró o es inválida. Inicia sesión nuevamente.');
        return;
      }
      setError(`Error de conexión: ${msg}`);
    };
    const onConnect = () => {
      if (joinParam) {
        s.emit('room:join', { code: joinParam }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo unir a la sala');
            return;
          }
          if (res.room?.code) setActualRoomCode(res.room.code);
        });
      } else {
        s.emit('room:create', { mode }, (res) => {
          if (!res?.ok) {
            setError(res?.error || 'No se pudo crear la sala');
            return;
          }
          if (res.code) setActualRoomCode(res.code);
          if (AUTO_START_MODES.includes(mode)) {
            s.emit('room:start', { code: res.code }, (startRes) => {
              if (!startRes?.ok) setError(startRes?.error || 'No se pudo iniciar');
            });
          }
        });
      }
    };

    s.on('lobby:update', onLobby);
    s.on('game:state', onGameState);
    s.on('connect', onConnect);
    s.on('connect_error', onConnectError);
    if (s.connected) onConnect();

    return () => {
      s.off('lobby:update', onLobby);
      s.off('game:state', onGameState);
      s.off('connect', onConnect);
      s.off('connect_error', onConnectError);
    };
  }, [mode, joinParam]);

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
    if (!myTurn || !gameState) return;
    const movesForTile = gameState.validMoves.filter((m) => m.index === index);
    if (movesForTile.length === 0) return;
    if (movesForTile.length === 1 || !gameState.ends) {
      playTile(index, movesForTile[0].side);
    } else {
      setSelectedTile({ index, tile: gameState.myHand[index] });
      setShowSidePicker(true);
    }
  };

  const playTile = (tileIndex, side) => {
    if (!socket || !actualRoomCode) return;
    setError('');
    socket.emit('game:play', { code: actualRoomCode, tileIndex, side }, (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const handlePass = () => {
    if (!socket || !actualRoomCode) return;
    setError('');
    socket.emit('game:pass', { code: actualRoomCode }, (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  const handleDraw = () => {
    if (!socket || !actualRoomCode) return;
    setError('');
    socket.emit('game:draw', { code: actualRoomCode }, (res) => {
      if (!res.ok) setError(res.error);
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

  const is1v1 = opponents.length === 1;
  const topOpponent = opponents[0];
  const leftOpponent = opponents[1];
  const rightOpponent = opponents[2];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {error && (
        <div className="bg-red-500/20 border-b border-red-500/50 text-red-300 px-4 py-2 text-center text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <TopBanner />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 sm:gap-4">
          <div className="flex gap-3 sm:gap-4">
            <div className="hidden lg:block w-[180px] h-full">
              <div className="w-full h-full overflow-hidden rounded-xl">
                <AdSidebar />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-3 sm:gap-4">
              {topOpponent && (
                <div className="card p-3 sm:p-4">
                  <PlayerInfo
                    player={topOpponent}
                    count={gameState.handCounts[topOpponent.id]}
                    isTurn={gameState.currentPlayerId === topOpponent.id}
                    team={topOpponent.team}
                  />
                  <div className="mt-2">
                    <OpponentHand
                      count={gameState.handCounts[topOpponent.id]}
                      position={is1v1 ? 'top' : 'top'}
                    />
                  </div>
                </div>
              )}

              <div className="md:hidden card p-2 flex items-center justify-between gap-2 text-center">
                <div className="flex-1">
                  <div className="text-[9px] text-slate-400">Sala</div>
                  <div className="font-mono font-bold text-xs text-blue-400 truncate">
                    {gameState.roomCode}
                  </div>
                </div>
                <div className="flex-[1.4] border-x border-slate-700 px-1">
                  <div className="text-[9px] text-slate-400">Ronda {gameState.round}</div>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold">
                    <span className="text-blue-400">{gameState.teamScores?.[1] ?? 0}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-red-400">{gameState.teamScores?.[2] ?? 0}</span>
                  </div>
                </div>
                {gameState.hasPool && (
                  <div className="flex-1">
                    <div className="text-[9px] text-slate-400">Pozo</div>
                    <div className="font-bold text-sm text-amber-400">
                      🃏 {gameState.poolCount}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl p-3 sm:p-4 min-h-[320px] sm:min-h-[440px] relative bg-felt-inset shadow-inner border border-domino-accent/20">
                <Board board={gameState.board} ends={gameState.ends} boardShape={gameState.boardShape} />
                {lastAction && myTurn && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-slate-200 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-slate-700">
                    {lastAction}
                  </div>
                )}
              </div>

              <div className="card p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
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
                <Hand
                  tiles={gameState.myHand}
                  validIndices={validIndices}
                  selectedIndex={selectedTile?.index}
                  onSelect={handleTileClick}
                  canPlay={myTurn}
                />

                {myTurn && gameState.canPlay && (
                  <p className="text-center text-[10px] sm:text-xs text-slate-500 italic mt-2">
                    Toca una ficha válida para jugarla
                  </p>
                )}

                {myTurn && gameState.canDraw && (
                  <button onClick={handleDraw} className="btn-primary w-full mt-3 text-sm">
                    🃏 Robar del pozo ({gameState.poolCount})
                  </button>
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
          </div>

          <div className="hidden lg:block space-y-3">
            <div className="card p-3">
              <div className="text-[10px] text-slate-400">Sala</div>
              <div className="font-mono font-bold text-lg text-blue-400 break-all">
                {gameState.roomCode}
              </div>
            </div>

            <Scoreboard
              teamScores={gameState.teamScores}
              mode={gameState.mode}
              round={gameState.round}
              winningTeam={gameState.winningTeam}
              endReason={gameState.endReason}
            />
            {!is1v1 && leftOpponent && (
              <div className="card p-3">
                <div className="text-xs text-slate-400 mb-2">Oeste</div>
                <PlayerInfo
                  player={leftOpponent}
                  count={gameState.handCounts[leftOpponent.id]}
                  isTurn={gameState.currentPlayerId === leftOpponent.id}
                  team={leftOpponent.team}
                />
                <div className="mt-2">
                  <OpponentHand
                    count={gameState.handCounts[leftOpponent.id]}
                    position="left"
                  />
                </div>
              </div>
            )}
            {!is1v1 && rightOpponent && (
              <div className="card p-3">
                <div className="text-xs text-slate-400 mb-2">Este</div>
                <PlayerInfo
                  player={rightOpponent}
                  count={gameState.handCounts[rightOpponent.id]}
                  isTurn={gameState.currentPlayerId === rightOpponent.id}
                  team={rightOpponent.team}
                />
                <div className="mt-2">
                  <OpponentHand
                    count={gameState.handCounts[rightOpponent.id]}
                    position="left"
                  />
                </div>
              </div>
            )}
            {is1v1 && topOpponent && (
              <div className="card p-3">
                <div className="text-xs text-slate-400 mb-2">Oponente</div>
                <PlayerInfo
                  player={topOpponent}
                  count={gameState.handCounts[topOpponent.id]}
                  isTurn={gameState.currentPlayerId === topOpponent.id}
                  team={topOpponent.team}
                />
                <div className="mt-2">
                  <OpponentHand
                    count={gameState.handCounts[topOpponent.id]}
                    position="top"
                  />
                </div>
              </div>
            )}

            {gameState.hasPool && (
              <div className="card p-3">
                <div className="text-[10px] text-slate-400">Pozo</div>
                <div className="font-bold text-2xl text-amber-400">
                  🃏 {gameState.poolCount}
                </div>
              </div>
            )}
          </div>
        </div>

        {gameState.status === 'round-end' && (
          <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
            <div className="card p-6 sm:p-8 max-w-md w-full text-center">
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
              <p className="text-3xl font-black text-domino-accent mb-6">
                +{gameState.roundPoints} puntos
              </p>
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

        {showSidePicker && selectedTile && gameState.ends && (
          <SidePicker
            tile={selectedTile.tile}
            leftEnd={gameState.ends.left}
            rightEnd={gameState.ends.right}
            onSelect={(side) => {
              setShowSidePicker(false);
              playTile(selectedTile.index, side);
            }}
            onCancel={() => {
              setShowSidePicker(false);
              setSelectedTile(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
