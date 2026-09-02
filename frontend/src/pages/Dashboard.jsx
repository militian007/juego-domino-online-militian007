import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import MesaIcono from '../components/MesaIcono.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { pantallaCompleta } from '../utils/pantalla.js';

const MODES = [
  {
    id: '1v1bot',
    label: '1 vs 1',
    desc: 'Contra un rival de la casa. Con pozo.',
    asientos: 2,
    bots: 1,
    maxPlayers: 1,
    grupo: 'casa'
  },
  {
    id: '2v2bots',
    label: '2 vs 2',
    desc: 'Con un compañero de la casa. Sin pozo.',
    asientos: 4,
    bots: 3,
    maxPlayers: 1,
    grupo: 'casa'
  },
  {
    id: '1v1',
    label: '1 vs 1',
    desc: 'Vos y un amigo, con código de sala.',
    asientos: 2,
    bots: 0,
    maxPlayers: 2,
    grupo: 'amigos'
  },
  {
    id: '2v2',
    label: '2 vs 2',
    desc: 'Cuatro personas en equipos. Sin pozo.',
    asientos: 4,
    bots: 0,
    maxPlayers: 4,
    grupo: 'amigos'
  }
];

function Seccion({ titulo, pie, children }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-domino-accent/80">
          {titulo}
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-domino-cream/35">{pie}</span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function ModoFila({ modo, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-domino-accent/15 bg-domino-card/70 px-3.5 py-3.5 text-left transition hover:border-domino-accent/45 hover:bg-domino-card active:scale-[0.99]"
    >
      <MesaIcono asientos={modo.asientos} bots={modo.bots} tamano={54} />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold leading-tight tracking-wide text-domino-cream">
          {modo.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-domino-cream/45">
          {modo.desc}
        </span>
      </span>
      <span className="text-domino-accent/40 transition group-hover:translate-x-0.5 group-hover:text-domino-accent">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');

  useEffect(() => {
    if (!initialMode) return;
    if (!MODES.some((m) => m.id === initialMode)) return;
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

  const casa = MODES.filter((m) => m.grupo === 'casa');
  const amigos = MODES.filter((m) => m.grupo === 'amigos');

  return (
    <div className="flex min-h-[100dvh] flex-col bg-domino-dark">
      <Navbar />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-6 pt-4 sm:max-w-2xl">
        {/* El saludo va en una linea. Antes ocupaba una tarjeta entera y empujaba
            los modos fuera de la pantalla del telefono. */}
        <div className="mb-5 flex items-baseline justify-between gap-3 px-1">
          <span className="truncate font-serif text-xl text-domino-cream">
            Hola, {user?.username || 'jugador'}
          </span>
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-domino-cream/40">
            {user?.games_played || 0} partidas ·{' '}
            <span className="text-domino-accent">{user?.games_won || 0}</span> ganadas
          </span>
        </div>

        <Seccion titulo="Contra la casa" pie="empieza ya">
          {casa.map((m) => (
            <ModoFila key={m.id} modo={m} onClick={() => startGame(m)} />
          ))}
        </Seccion>

        <Seccion titulo="Con amigos" pie="hace falta gente">
          {amigos.map((m) => (
            <ModoFila key={m.id} modo={m} onClick={() => startGame(m)} />
          ))}
        </Seccion>

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
        <p className="mt-1.5 px-1 text-[10px] uppercase tracking-wider text-domino-cream/30">
          ¿Te pasaron un código? Escribilo aquí
        </p>
      </main>
    </div>
  );
}
