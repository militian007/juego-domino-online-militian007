import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, disconnectSocket } from '../services/socket.js';

const MODES = [
  {
    id: '1v1bot',
    eyebrow: 'Solitario',
    title: 'PRACTICAR',
    titleAccent: 'VS BOT',
    desc: 'Afina tu estrategia contra un rival que cuenta fichas, sacrifica altas y piensa antes de jugar.',
    cta: 'Jugar solo',
    requiresAuth: false,
    badge: 'Sin registro'
  },
  {
    id: '1v1',
    eyebrow: 'Duelo',
    title: '1 VS 1',
    titleAccent: 'ONLINE',
    desc: 'Tú y un amigo. Sala privada con código, pozo para robar, y la gloria de cerrar la mano.',
    cta: 'Crear sala',
    requiresAuth: true,
    badge: 'Con cuenta'
  },
  {
    id: '2v2',
    eyebrow: 'Equipos',
    title: '2 VS 2',
    titleAccent: 'PREMIER',
    desc: 'La modalidad reina. Dos humanos contra dos humanos, en parejas. Sin pozo, pura lectura.',
    cta: 'Armar mesa',
    requiresAuth: true,
    badge: 'Con cuenta'
  }
];

function GoldButton({ children, onClick, size = 'md', as: As = 'button', to, variant = 'solid' }) {
  const base = 'inline-flex items-center justify-center font-bold tracking-[0.2em] rounded-full transition-all duration-200 whitespace-nowrap';
  const sizes = {
    sm: 'px-4 py-1.5 text-xs sm:text-sm',
    md: 'px-6 py-2.5 text-sm sm:text-base',
    lg: 'px-8 py-3 text-base sm:text-lg'
  };
  const variants = {
    solid: 'bg-gradient-to-b from-domino-accent-bright to-domino-accent text-domino-dark shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-amber-500 hover:-translate-y-0.5',
    outline: 'border-2 border-domino-accent/80 text-domino-accent hover:bg-domino-accent hover:text-domino-dark bg-black/30 backdrop-blur-sm'
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]}`;

  if (As === Link) {
    return <Link to={to} className={cls}>{children}</Link>;
  }
  return <button onClick={onClick} className={cls}>{children}</button>;
}

function ModeCard({ mode, onSelect }) {
  return (
    <button
      onClick={() => onSelect(mode.id)}
      className="group relative bg-domino-card/60 hover:bg-domino-card/80 border border-domino-accent/30 hover:border-domino-accent rounded-lg p-5 sm:p-6 text-left transition-all duration-300 hover:-translate-y-1"
    >
      <div className="flex items-center gap-2 mb-2">
        <p className="text-domino-accent text-[10px] sm:text-xs tracking-[0.35em]">
          {mode.eyebrow}
        </p>
        {mode.badge && (
          <span className={`text-[9px] sm:text-[10px] tracking-wider px-2 py-0.5 rounded-full border ${
            mode.requiresAuth
              ? 'border-domino-accent/40 text-domino-accent/80'
              : 'border-green-400/40 text-green-400/80'
          }`}>
            {mode.badge}
          </span>
        )}
      </div>
      <h3 className="font-serif text-2xl sm:text-3xl leading-[1.1] mb-3">
        <span className="text-domino-cream">{mode.title}</span>
        <br />
        <span className="text-domino-accent italic">
          {mode.titleAccent}
        </span>
      </h3>
      <p className="text-domino-cream-dim text-xs sm:text-sm leading-relaxed mb-4 min-h-[3.5rem]">
        {mode.desc}
      </p>
      <div className="flex items-center justify-between pt-3 border-t border-domino-accent/20">
        <span className="text-domino-accent text-xs sm:text-sm tracking-[0.25em] group-hover:tracking-[0.3em] transition-all">
          {mode.cta}
        </span>
        <span className="text-domino-accent text-lg group-hover:translate-x-1 transition-transform">
          →
        </span>
      </div>
    </button>
  );
}

function ModeModal({ open, onClose, onSelect }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-domino-felt border border-domino-accent/40 rounded-2xl shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-domino-felt/95 backdrop-blur border-b border-domino-accent/20 px-6 sm:px-10 py-5 flex items-center justify-between">
          <div>
            <p className="text-domino-accent text-[10px] sm:text-xs tracking-[0.4em] mb-1">
              CLUB PRIVADO · SALA
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-domino-cream">
              Elige tu <span className="text-domino-accent italic">modalidad</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-domino-cream-dim hover:text-domino-accent transition text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-domino-card/50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="px-6 sm:px-10 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {MODES.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onSelect={onSelect} />
            ))}
          </div>
          <p className="text-center text-domino-cream-dim/60 text-xs mt-8 tracking-wider">
            ESC para cerrar
          </p>
        </div>
      </div>
    </div>
  );
}

function useOnlineCount() {
  const [counts, setCounts] = useState({ total: 0, loggedIn: 0, guests: 0 });

  useEffect(() => {
    const socket = connectSocket();
    const onCount = (data) => setCounts(data);
    socket.on('presence:count', onCount);
    return () => {
      socket.off('presence:count', onCount);
      disconnectSocket();
    };
  }, []);

  return counts;
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const counts = useOnlineCount();

  const goToMode = (modeId) => {
    const mode = MODES.find((m) => m.id === modeId);
    if (!mode) return;
    if (mode.requiresAuth && !user) {
      navigate('/login', { state: { from: `/dashboard?mode=${modeId}` } });
      return;
    }
    if (user) {
      navigate(`/dashboard?mode=${modeId}`);
      return;
    }
    navigate(`/game?mode=${modeId}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const goMenu = () => {
    if (user) navigate('/dashboard');
    else navigate('/login');
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-domino-dark text-domino-cream">
      <img
        src="/hero-table.png"
        alt="Mesa de dominó"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable="false"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40 pointer-events-none" />

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-10 py-4 sm:py-6">
        <div className="font-serif text-3xl sm:text-4xl font-semibold tracking-[0.25em] text-domino-cream/95 drop-shadow-lg">
          D<span className="text-domino-cream/50">.T</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!user && (
            <GoldButton as={Link} to="/login" variant="outline" size="sm">
              LOGIN
            </GoldButton>
          )}
          <GoldButton onClick={() => setModalOpen(true)} size="sm">
            JUGAR
          </GoldButton>
          {user && (
            <button
              onClick={handleLogout}
              className="text-domino-cream/80 hover:text-domino-cream text-xs sm:text-sm tracking-wider px-2"
            >
              Salir
            </button>
          )}
        </div>
      </header>

      <main className="absolute inset-0 z-10 flex items-center justify-center md:justify-end pointer-events-none">
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xl w-full md:w-auto px-5 md:pr-[6%] lg:pr-[8%] pointer-events-auto">
          <p className="text-domino-accent text-xs sm:text-sm tracking-[0.4em] mb-3 sm:mb-4 font-sans drop-shadow">
            CLUB PRIVADO · DOMINÓ
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.05] tracking-tight drop-shadow-2xl">
            <span className="block text-domino-cream">Domina el arte</span>
            <span className="block text-domino-accent">del domino</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-domino-cream/90 text-sm sm:text-base leading-relaxed drop-shadow max-w-sm">
            Únete a la mesa, afina tu estrategia y compite con los mejores jugadores.
          </p>

          <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
            <GoldButton onClick={() => goToMode('1v1')} size="lg">
              1 VS 1
            </GoldButton>
            <GoldButton onClick={() => goToMode('2v2')} size="lg">
              2 VS 2
            </GoldButton>
          </div>
        </div>
      </main>

      {user && (
        <div className="absolute bottom-3 sm:bottom-5 left-4 sm:left-6 z-20 flex items-center gap-4 text-domino-cream/90 text-xs sm:text-sm drop-shadow">
          <button onClick={goMenu} className="hover:text-domino-accent transition tracking-wider">
            Menu
          </button>
          <button onClick={handleLogout} className="hover:text-domino-accent transition tracking-wider">
            Salir
          </button>
        </div>
      )}

      <div className="absolute bottom-3 sm:bottom-5 right-4 sm:right-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-domino-accent/40 rounded-full px-3 sm:px-4 py-1.5 shadow-lg">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-domino-cream text-xs sm:text-sm font-semibold tracking-wider whitespace-nowrap">
          {counts.loggedIn} JUGADORES EN LÍNEA
        </span>
      </div>

      <ModeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(id) => { setModalOpen(false); goToMode(id); }}
      />
    </div>
  );
}
