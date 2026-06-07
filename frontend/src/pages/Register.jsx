import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Las contraseñas no coinciden');
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-16">
        <div className="card p-6 sm:p-8 w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-center">Crear cuenta</h1>
          <p className="text-slate-400 text-center mb-6 sm:mb-8 text-sm sm:text-base">
            Únete y empieza a jugar
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Usuario</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="input-field"
                placeholder="tu_usuario"
                minLength={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Confirmar contraseña</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                className="input-field"
                placeholder="Repite tu contraseña"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-domino-accent hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
