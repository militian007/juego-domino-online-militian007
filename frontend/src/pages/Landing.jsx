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

function Hotspot({ area, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute z-10 group focus:outline-none rounded-full"
      style={{ left: area.left, top: area.top, width: area.width, height: area.height }}
    >
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 ring-2 ring-domino-accent/80 bg-domino-accent/10" />
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const goMenu = () => {
    if (user) navigate('/dashboard');
    else navigate('/login');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-domino-dark text-domino-cream">
      <img
        src="/hero-table.png"
        alt="Mesa de dominó"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable="false"
      />

      <Hotspot
        area={{ left: '78.5%', top: '4%', width: '12.5%', height: '11%' }}
        onClick={() => navigate('/login')}
        label="Login"
      />
      <Hotspot
        area={{ left: '91.5%', top: '4%', width: '8%', height: '11%' }}
        onClick={() => setModalOpen(true)}
        label="Jugar"
      />

      <Hotspot
        area={{ left: '57%', top: '60%', width: '14%', height: '11%' }}
        onClick={() => goToMode('1v1')}
        label="1 vs 1"
      />
      <Hotspot
        area={{ left: '72%', top: '60%', width: '14%', height: '11%' }}
        onClick={() => goToMode('2v2')}
        label="2 vs 2"
      />

      <Hotspot
        area={{ left: '2%', top: '91%', width: '8%', height: '7%' }}
        onClick={goMenu}
        label="Menú"
      />
      <Hotspot
        area={{ left: '10%', top: '91%', width: '8%', height: '7%' }}
        onClick={handleLogout}
        label="Salir"
      />

      <div className="absolute bottom-[2.5%] right-[2%] z-20 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-domino-accent/40 rounded-full px-3 sm:px-4 py-1.5 shadow-lg">
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
