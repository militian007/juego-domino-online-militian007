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

function Hotspot({ area, onClick, label, mode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute group cursor-pointer focus:outline-none focus:ring-2 focus:ring-domino-accent/60 rounded-full"
      style={{ left: area.left, top: area.top, width: area.width, height: area.height }}
    >
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 bg-domino-accent/10 ring-2 ring-domino-accent/70" />
    </button>
  );
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

  const openPlay = () => {
    if (user) navigate('/dashboard');
    else setModalOpen(true);
  };

  const goTo1v1 = () => goToMode('1v1');
  const goTo2v2 = () => goToMode('2v2');

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-domino-dark text-domino-cream">
      <img
        src="/hero-table.png"
        alt="Mesa de dominó"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable="false"
      />

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4">
        <div className="font-serif text-2xl sm:text-3xl font-semibold tracking-[0.25em] text-domino-cream/90 drop-shadow">
          D<span className="text-domino-cream/50">.T</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="hidden sm:inline text-domino-cream/90 text-sm drop-shadow">
                Hola, <span className="text-domino-accent">{user.username}</span>
              </span>
              <button
                onClick={openPlay}
                className="bg-domino-accent text-domino-dark hover:bg-domino-accent-bright transition px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-[0.2em] shadow"
              >
                JUGAR
              </button>
              <button
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                className="text-domino-cream/90 hover:text-domino-cream text-xs sm:text-sm tracking-wider"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="border border-domino-accent/70 text-domino-accent hover:bg-domino-accent hover:text-domino-dark transition px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-[0.2em] bg-black/30 backdrop-blur-sm"
              >
                LOGIN
              </Link>
              <button
                onClick={() => setModalOpen(true)}
                className="bg-domino-accent text-domino-dark hover:bg-domino-accent-bright transition px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold tracking-[0.2em] shadow"
              >
                JUGAR
              </button>
            </>
          )}
        </div>
      </header>

      <Hotspot
        area={{ left: '60.4%', top: '58.3%', width: '8.6%', height: '6.5%' }}
        onClick={goTo1v1}
        label="Jugar 1 vs 1"
        mode="1v1"
      />
      <Hotspot
        area={{ left: '70.2%', top: '58.3%', width: '9.3%', height: '6.5%' }}
        onClick={goTo2v2}
        label="Jugar 2 vs 2"
        mode="2v2"
      />

      <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-domino-accent/40 rounded-full px-3 sm:px-4 py-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-domino-cream text-xs sm:text-sm font-semibold tracking-wider">
          {counts.loggedIn} JUGADORES EN LÍNEA
        </span>
      </div>

      {user && (
        <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 z-20 flex items-center gap-3 text-domino-cream/80 text-xs sm:text-sm drop-shadow">
          <Link to="/dashboard" className="hover:text-domino-accent transition tracking-wider">Menu</Link>
          <button
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            className="hover:text-domino-accent transition tracking-wider"
          >
            Salir
          </button>
        </div>
      )}

      <ModeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(id) => { setModalOpen(false); goToMode(id); }}
      />
    </div>
  );
}
