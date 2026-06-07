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
    pip: { left: 1, right: 1 }
  },
  {
    id: '1v1',
    eyebrow: 'Duelo',
    title: '1 VS 1',
    titleAccent: 'ONLINE',
    desc: 'Tú y un amigo. Sala privada con código, pozo para robar, y la gloria de cerrar la mano.',
    cta: 'Crear sala',
    pip: { left: 0, right: 0 }
  },
  {
    id: '2v2',
    eyebrow: 'Equipos',
    title: '2 VS 2',
    titleAccent: 'PREMIER',
    desc: 'La modalidad reina. Dos humanos contra dos humanos, en parejas. Sin pozo, pura lectura.',
    cta: 'Armar mesa',
    pip: { left: 6, right: 6 }
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

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setOnline((v) => Math.max(0, v + Math.floor(Math.random() * 3) - 1));
    }, 4000);
    setOnline(3);
    return () => clearInterval(id);
  }, []);

  const handleMode = (modeId) => {
    if (user) navigate(`/dashboard?mode=${modeId}`);
    else navigate('/login', { state: { from: `/dashboard?mode=${modeId}` } });
  };

  return (
    <div className="bg-felt min-h-screen flex flex-col text-domino-cream relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-domino-accent/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-domino-accent/5 blur-3xl" />
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
            <Link
              to="/dashboard"
              className="border border-domino-accent/60 text-domino-accent hover:bg-domino-accent hover:text-domino-dark transition px-4 py-1.5 rounded-full text-xs sm:text-sm tracking-wider"
            >
              JUGAR
            </Link>
            <Link
              to="/login"
              onClick={() => localStorage.clear()}
              className="text-domino-cream-dim hover:text-domino-cream text-xs sm:text-sm tracking-wider"
            >
              Salir
            </Link>
          </div>
        ) : (
          <Link
            to="/login"
            className="border border-domino-accent/60 text-domino-accent hover:bg-domino-accent hover:text-domino-dark transition px-5 py-1.5 rounded-full text-xs sm:text-sm tracking-[0.2em]"
          >
            INGRESAR
          </Link>
        )}
      </header>

      <main className="relative z-10 flex-1 flex flex-col">
        <section className="w-full max-w-6xl mx-auto px-6 sm:px-10 pt-10 sm:pt-16 pb-6 text-center">
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

        <section className="w-full max-w-6xl mx-auto px-6 sm:px-10 pt-6 sm:pt-10 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleMode(mode.id)}
                className="group relative bg-domino-card/40 hover:bg-domino-card/70 border border-domino-accent/30 hover:border-domino-accent rounded-lg p-6 sm:p-7 text-left transition-all duration-300 hover:-translate-y-1 border-gold-glow-hover"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-domino-accent text-[10px] sm:text-xs tracking-[0.35em] mb-2">
                      {mode.eyebrow}
                    </p>
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
                <p className="text-domino-cream-dim text-xs sm:text-sm leading-relaxed mb-6 min-h-[3.5rem]">
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
            ))}
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
    </div>
  );
}
