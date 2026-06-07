import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-16">
        <div className="card p-6 sm:p-8 w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">Iniciar sesión</h1>
          <p className="text-slate-400 text-center mb-6 sm:mb-8 text-sm sm:text-base">
            Entra a tu cuenta para jugar
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="tu_usuario"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-domino-accent hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
