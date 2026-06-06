import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
        <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold shrink-0">
          <span className="text-2xl sm:text-3xl">🎲</span>
          <span className="text-domino-accent hidden xs:inline sm:inline">Dominó</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs text-slate-400">Conectado como</div>
              <div className="text-sm font-semibold text-domino-accent truncate max-w-[120px]">
                {user.username}
              </div>
            </div>
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
