import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import SelectorModos, { MODOS } from '../components/SelectorModos.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { pantallaCompleta } from '../utils/pantalla.js';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');

  useEffect(() => {
    if (!initialMode) return;
    if (!MODOS.some((m) => m.id === initialMode)) return;
    navigate(`/game?mode=${initialMode}`, { replace: true });
  }, [initialMode, navigate]);

  const startGame = (mode) => {
    pantallaCompleta();
    navigate(`/game?mode=${mode.id}`);
  };

  const joinGame = (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length === 6) {
      pantallaCompleta();
      navigate(`/game?join=${code}`);
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-domino-dark">
      <Navbar />

      <main className="menu-compacto mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-4 pt-3 sm:max-w-2xl">
        {/* El saludo va en una linea. Antes ocupaba una tarjeta entera y empujaba
            los modos fuera de la pantalla del telefono. */}
        <div className="mb-4 flex items-baseline justify-between gap-3 px-1">
          <span className="truncate font-serif text-xl text-domino-cream">
            Hola, {user?.username || 'jugador'}
          </span>
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-domino-cream/40">
            {user?.games_played || 0} partidas ·{' '}
            <span className="text-domino-accent">{user?.games_won || 0}</span> ganadas
          </span>
        </div>

        <SelectorModos onElegir={startGame} />


        <form
          onSubmit={joinGame}
          className="flex items-center gap-2 rounded-xl border border-domino-accent/15 bg-domino-card/40 p-2"
        >
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            aria-label="Código de sala"
            className="min-w-0 flex-1 rounded-lg bg-black/30 px-3 py-2.5 text-center font-mono text-base uppercase tracking-[0.3em] text-domino-cream placeholder:text-domino-cream/25 focus:outline-none focus:ring-1 focus:ring-domino-accent/50"
          />
          <button
            type="submit"
            disabled={roomCode.length !== 6}
            className="shrink-0 rounded-lg bg-domino-accent px-5 py-2.5 text-sm font-bold text-domino-dark transition disabled:cursor-not-allowed disabled:bg-domino-accent/20 disabled:text-domino-cream/30"
          >
            Entrar
          </button>
        </form>
        <p className="pista-codigo mt-1.5 px-1 text-[10px] uppercase tracking-wider text-domino-cream/30">
          ¿Te pasaron un código? Escribilo aquí
        </p>
      </main>
    </div>
  );
}
