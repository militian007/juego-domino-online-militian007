import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-slate-800 bg-domino-dark/90 backdrop-blur sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
        {/* La marca de la barra es el logo, no un emoji de dado suelto. En el
            menu el logo grande ya esta debajo, asi que aca va la version de
            linea y solo con las fichas cuando no hay sitio. */}
        <Link to="/" className="shrink-0" aria-label="Inicio">
          <Logo variante="linea" className="scale-[0.62] origin-left" />
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/cambiar-clave"
              title="Cambiar mi contraseña"
              className="text-right hidden md:block group"
            >
              <div className="text-xs text-slate-400 group-hover:text-slate-300">Conectado como</div>
              <div className="text-sm font-semibold text-domino-accent truncate max-w-[120px] group-hover:underline">
                {user.username}
              </div>
            </Link>
            <Link
              to="/cambiar-clave"
              title="Cambiar mi contraseña"
              className="md:hidden text-slate-400 hover:text-white text-xs px-2 py-2"
            >
              Clave
            </Link>
            <Link
              to="/dashboard"
              className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4"
            >
              Jugar
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white text-xs sm:text-sm px-2 sm:px-3 py-2 min-h-[36px]"
            >
              Salir
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white text-xs sm:text-sm px-2 sm:px-3 py-2"
            >
              Ingresar
            </Link>
            <Link to="/register" className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4">
              Registro
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
