import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { pantallaCompleta } from '../utils/pantalla.js';

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
    id: '2v2bots',
    eyebrow: 'Equipos',
    title: '2 VS 2',
    titleAccent: 'CON BOTS',
    desc: 'Prueba la modalidad en parejas sin esperar a nadie: tu compañero y los dos rivales los pone la casa.',
    cta: 'Jugar en pareja',
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

function GoldButton({ children, onClick, size = 'md', as: As = 'button', to, variant = 'solid', className = '' }) {
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
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

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
    pantallaCompleta();
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

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-domino-dark text-domino-cream">
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
          <GoldButton onClick={() => setModalOpen(true)} size="sm" className="hidden md:inline-flex">
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

      <main className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none md:items-center md:justify-end">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center px-5 pb-6 text-center md:w-auto md:items-start md:pb-0 md:pr-[6%] md:text-left lg:pr-[8%]">
          <p className="mb-2 font-sans text-[10px] tracking-[0.4em] text-domino-accent drop-shadow sm:text-sm md:mb-4">
            CLUB PRIVADO · DOMINÓ
          </p>
          <h1 className="font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block whitespace-nowrap text-domino-cream">Domina el arte</span>
            <span className="block text-domino-accent md:pl-8 lg:pl-12">del dominó</span>
          </h1>
          <p className="mt-5 hidden max-w-sm text-sm leading-relaxed text-domino-cream/90 drop-shadow sm:text-base md:mt-6 md:block">
            Únete a la mesa, afina tu estrategia y compite con los mejores jugadores.
          </p>

          {/* En el telefono los botones van abajo, donde llega el pulgar, y manda
              el de jugar sin cuenta: es lo unico que un recien llegado puede
              hacer de una. Antes solo se ofrecian los modos online, que piden
              cuenta y ademas necesitan que haya alguien del otro lado. */}
          <div className="mt-6 flex w-full flex-col gap-2.5 md:mt-9 md:w-auto md:flex-row md:items-center md:gap-4">
            <GoldButton onClick={() => goToMode('1v1bot')} size="lg" className="w-full md:w-auto">
              JUGAR AHORA
            </GoldButton>
            <div className="flex gap-2.5 md:contents">
              <GoldButton onClick={() => goToMode('1v1')} size="lg" variant="outline" className="flex-1 md:flex-none">
                1 VS 1
              </GoldButton>
              <GoldButton onClick={() => goToMode('2v2')} size="lg" variant="outline" className="flex-1 md:flex-none">
                2 VS 2
              </GoldButton>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-[11px] tracking-[0.2em] text-domino-cream/60 underline-offset-4 transition hover:text-domino-accent hover:underline md:mt-5 md:text-xs"
          >
            VER TODOS LOS MODOS
          </button>
        </div>
      </main>


      <div className="absolute left-1/2 top-[68px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-domino-accent/40 bg-black/60 px-3 py-1 shadow-lg backdrop-blur-sm md:left-auto md:right-6 md:top-auto md:bottom-5 md:translate-x-0 md:px-4 md:py-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="whitespace-nowrap text-[10px] font-semibold tracking-wider text-domino-cream sm:text-sm">
          {counts.loggedIn} EN LÍNEA
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
