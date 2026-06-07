import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const MODES = [
  {
    id: '1v1bot',
    eyebrow: 'Solitario',
    title: 'PRACTICAR',
    titleAccent: 'VS BOT',
    desc: 'Afina tu estrategia contra un rival que cuenta fichas, sacrifica altas y piensa antes de jugar.',
    cta: 'Jugar solo',
    pip: { left: 1, right: 1 },
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
    pip: { left: 0, right: 0 },
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
    pip: { left: 6, right: 6 },
    requiresAuth: true,
    badge: 'Con cuenta'
  }
];

function DominoTile({ left, right, size = 'md' }) {
  const dims = size === 'lg' ? 'w-24 h-44 sm:w-28 sm:h-52' : 'w-16 h-28 sm:w-20 sm:h-36';
  return (
    <div className={`${dims} relative bg-domino-cream rounded-md border border-domino-cream-dim/40 flex flex-col items-center justify-between py-3 shadow-2xl shadow-black/60`}>
      <div className="flex-1 flex items-center justify-center">
        <Pips value={left} small={size !== 'lg'} />
      </div>
      <div className="w-3/4 h-px bg-domino-dark/80" />
      <div className="flex-1 flex items-center justify-center">
        <Pips value={right} small={size !== 'lg'} />
      </div>
    </div>
  );
}

function Pips({ value, small = false }) {
  const positions = {
    0: [],
    1: ['center'],
    2: ['tl', 'br'],
    3: ['tl', 'center', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'center', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
  };
  const size = small ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';
  const layout = {
    tl: 'absolute top-1 left-1',
    tr: 'absolute top-1 right-1',
    ml: 'absolute top-1/2 left-1 -translate-y-1/2',
    mr: 'absolute top-1/2 right-1 -translate-y-1/2',
    bl: 'absolute bottom-1 left-1',
    br: 'absolute bottom-1 right-1',
    center: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };
  return (
    <div className="relative w-8 h-8 sm:w-10 sm:h-10">
      {positions[value]?.map((p, i) => (
        <span key={i} className={`${size} ${layout[p]} rounded-full bg-domino-dark`} />
      ))}
    </div>
  );
}

function ModeCard({ mode, onSelect, compact = false }) {
  return (
    <button
      onClick={() => onSelect(mode.id)}
      className={`group relative bg-domino-card/40 hover:bg-domino-card/70 border border-domino-accent/30 hover:border-domino-accent rounded-lg ${compact ? 'p-5' : 'p-6 sm:p-7'} text-left transition-all duration-300 hover:-translate-y-1 border-gold-glow-hover`}
    >
      <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-domino-accent text-[10px] sm:text-xs tracking-[0.35em]">
              {mode.eyebrow}
            </p>
            {mode.badge && (
              <span className={`text-[9px] sm:text-[10px] tracking-wider px-2 py-0.5 rounded-full border ${
                mode.requiresAuth
                  ? 'border-domino-accent/40 text-domino-accent/80'
                  : 'border-green-500/40 text-green-400/80'
              }`}>
                {mode.badge}
              </span>
            )}
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl leading-[1.1]">
            <span className="text-domino-cream">{mode.title}</span>
            <br />
            <span className="text-domino-accent italic">
              {mode.titleAccent}
            </span>
          </h3>
        </div>
        <div className="hidden sm:block opacity-60 group-hover:opacity-100 group-hover:rotate-3 transition-all duration-500">
          <DominoTile left={mode.pip.left} right={mode.pip.right} />
        </div>
      </div>
      <p className="text-domino-cream-dim text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 min-h-[3.5rem]">
        {mode.desc}
      </p>
      <div className="flex items-center justify-between pt-4 border-t border-domino-accent/20">
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-domino-felt border border-domino-accent/40 rounded-2xl shadow-2xl shadow-black/70 animate-[scaleIn_0.2s_ease-out]"
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

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setOnline((v) => Math.max(0, v + Math.floor(Math.random() * 3) - 1));
    }, 4000);
    setOnline(3);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (modeId) => {
    const mode = MODES.find((m) => m.id === modeId);
    setModalOpen(false);
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
    if (user) {
      navigate('/dashboard');
    } else {
      setModalOpen(true);
    }
  };

  return (
    <div className="bg-felt min-h-screen flex flex-col text-domino-cream relative overflow-hidden">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-domino-accent/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-domino-accent/5 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <div className="rotate-12 flex gap-3 sm:gap-6">
          <DominoTile left={6} right={6} size="lg" />
          <DominoTile left={3} right={5} size="lg" />
          <DominoTile left={2} right={4} size="lg" />
        </div>
      </div>

      <header className="relative z-10 w-full px-6 sm:px-10 py-5 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-domino-cream">
          <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-[0.2em] text-domino-accent">
            D
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-[0.2em] text-domino-cream-dim">
            T
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <span className="hidden sm:inline text-domino-cream-dim">
              Hola, <span className="text-domino-accent">{user.username}</span>
            </span>
            <button
              onClick={openPlay}
              className="border border-domino-accent/60 text-domino-accent hover:bg-domino-accent hover:text-domino-dark transition px-4 py-1.5 rounded-full text-xs sm:text-sm tracking-wider"
            >
              JUGAR
            </button>
            <Link
              to="/login"
              onClick={() => localStorage.clear()}
              className="text-domino-cream-dim hover:text-domino-cream text-xs sm:text-sm tracking-wider"
            >
              Salir
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline text-domino-cream-dim hover:text-domino-cream text-xs sm:text-sm tracking-[0.2em] px-2"
            >
              INGRESAR
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="border border-domino-accent/60 text-domino-accent hover:bg-domino-accent hover:text-domino-dark transition px-5 py-1.5 rounded-full text-xs sm:text-sm tracking-[0.2em]"
            >
              JUGAR
            </button>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        <section className="w-full max-w-6xl mx-auto px-6 sm:px-10 pt-8 sm:pt-14 pb-4 text-center">
          <p className="text-domino-accent text-xs sm:text-sm tracking-[0.4em] mb-4 sm:mb-6 font-sans">
            CLUB PRIVADO · DOMINÓ VENEZOLANO
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.05] tracking-tight">
            <span className="text-domino-cream">Domina el arte</span>
            <br />
            <span className="text-domino-accent text-shadow-gold italic">del dominó</span>
          </h1>
          <p className="mt-5 sm:mt-7 text-domino-cream-dim text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Únete a la mesa y compite con los mejores. Estrategia, cálculo y un
            poco de descaro en cada mano.
          </p>
        </section>

        <section className="w-full max-w-4xl mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-6 sm:pb-10">
          <div className="flex flex-col items-center text-center">
            <button
              onClick={() => setModalOpen(true)}
              className="group relative inline-flex items-center justify-center gap-3 sm:gap-4 bg-domino-accent text-domino-dark hover:bg-domino-accent-bright transition-all duration-300 px-10 sm:px-16 py-4 sm:py-5 rounded-full font-sans text-sm sm:text-lg tracking-[0.3em] sm:tracking-[0.4em] font-bold shadow-2xl shadow-domino-accent/30 hover:shadow-domino-accent/50 hover:-translate-y-0.5 border-gold-glow"
            >
              <span>JUGAR</span>
              <span className="text-xl sm:text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <p className="text-domino-cream-dim/60 text-[10px] sm:text-xs tracking-[0.3em] mt-4 sm:mt-5">
              ELIGE TU MODALIDAD
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 w-full px-6 sm:px-10 py-4 flex items-center justify-end text-xs text-domino-cream-dim">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>
            <strong className="text-domino-cream">{online}</strong> jugador{online !== 1 ? 'es' : ''} en línea
          </span>
        </div>
      </footer>

      <ModeModal open={modalOpen} onClose={() => setModalOpen(false)} onSelect={handleSelect} />
    </div>
  );
}
