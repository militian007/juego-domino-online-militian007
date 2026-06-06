import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const features = [
  { icon: '🤝', title: '1 vs 1 clásico', desc: 'Juega contra un amigo o un bot. Hay pozo para robar fichas cuando no puedas jugar.' },
  { icon: '👥', title: '2 vs 2 en equipo', desc: 'Forma equipo con tu compañero y enfrenten a otros 2 humanos. La modalidad reina del dominó.' },
  { icon: '🤖', title: 'Bot con estrategia', desc: 'Practica solo contra un bot que cuenta fichas, sacrifica las altas y juega con cabeza.' },
  { icon: '🔐', title: 'Cuenta segura', desc: 'Registrate y lleva el control de tus partidas, victorias y ranking.' }
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center flex-1">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6">
          <span className="text-domino-accent">Dominó</span> Online
        </h1>
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
          El juego clásico de dominó doble 6, ahora en tu navegador.
          Juega 1 vs 1 con un amigo o un bot, o 2 vs 2 en equipos.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center px-4 sm:px-0">
          <Link to="/register" className="btn-primary text-base sm:text-lg w-full sm:w-auto">
            Crear cuenta gratis
          </Link>
          <Link to="/login" className="btn-secondary text-base sm:text-lg w-full sm:w-auto">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">¿Qué ofrecemos?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <div key={i} className="card p-5 sm:p-6 hover:scale-[1.02] transition">
              <div className="text-4xl sm:text-5xl mb-3">{f.icon}</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="card p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Modos de juego</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
            <div className="border border-slate-700 rounded-lg p-5 sm:p-6">
              <div className="text-3xl sm:text-4xl mb-2">🤝</div>
              <h3 className="font-bold mb-1 text-sm sm:text-base">1 vs 1</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Tú contra otro jugador (o un bot). Con pozo para robar fichas.
              </p>
            </div>
            <div className="border border-domino-accent rounded-lg p-5 sm:p-6">
              <div className="text-3xl sm:text-4xl mb-2">👥</div>
              <h3 className="font-bold mb-1 text-sm sm:text-base">2 vs 2</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                2 humanos contra 2 humanos en equipos. Sin pozo, pura estrategia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 sm:py-8 text-center text-slate-500 text-xs sm:text-sm">
        Dominó Online · Hecho con Node + React + Socket.io
      </footer>
    </div>
  );
}
