import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MODES = [
  {
    id: '1v1bot',
    label: '1 vs 1 (con bot)',
    desc: 'Juega solo contra un bot. Con pozo para robar.',
    players: 1,
    maxPlayers: 1,
    icon: '🤖',
    autoStart: true
  },
  {
    id: '1v1',
    label: '1 vs 1 Jugador',
    desc: 'Tú y un amigo, con código de sala. Con pozo.',
    players: 2,
    maxPlayers: 2,
    icon: '🤝',
    autoStart: false
  },
  {
    id: '2v2',
    label: '2 vs 2 Jugadores',
    desc: '2 humanos vs 2 humanos, en equipos.',
    players: 4,
    maxPlayers: 4,
    icon: '👥',
    autoStart: false
  }
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');

  const startGame = (mode) => {
    navigate(`/game?mode=${mode.id}`);
  };

  const joinGame = (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length === 6) {
      navigate(`/game?join=${code}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full flex-1">
        <div className="card p-5 sm:p-6 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            Bienvenido, {user?.username} 👋
          </h1>
          <div className="flex flex-wrap gap-4 sm:gap-6 mt-2 text-sm text-slate-400">
            <span>
              Partidas jugadas:{' '}
              <strong className="text-domino-accent">{user?.games_played || 0}</strong>
            </span>
            <span>
              Victorias:{' '}
              <strong className="text-green-400">{user?.games_won || 0}</strong>
            </span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-4">Elige un modo de juego</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => startGame(mode)}
              className="card p-5 sm:p-6 text-left hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer w-full"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{mode.icon}</span>
                <h3 className="font-bold text-base sm:text-lg">{mode.label}</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mb-3">{mode.desc}</p>
              <div className="text-xs text-domino-accent font-semibold">
                {mode.maxPlayers} jugador{mode.maxPlayers > 1 ? 'es' : ''} requerido{mode.maxPlayers > 1 ? 's' : ''}
              </div>
            </button>
          ))}
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-2">¿Tienes un código de sala?</h2>
          <p className="text-slate-400 text-sm mb-4">
            Únete a la partida de tu amigo (modo 1v1 o 2v2)
          </p>
          <form onSubmit={joinGame} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="input-field uppercase tracking-widest text-center font-mono text-lg"
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap"
              disabled={roomCode.length !== 6}
            >
              Unirse
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
