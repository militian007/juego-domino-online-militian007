import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { authApi } from '../services/api.js';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');

    if (nueva.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres');
      return;
    }
    if (nueva !== repetir) {
      setError('Las dos contraseñas nuevas no coinciden');
      return;
    }

    setEnviando(true);
    try {
      await authApi.changePassword({ currentPassword: actual, newPassword: nueva });
      setListo(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-domino-dark">
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
        <div className="card p-6 sm:p-8">
          <h1 className="mb-1 text-2xl font-bold">Cambiar contraseña</h1>
          <p className="mb-6 text-sm text-slate-400">
            Necesitás tu contraseña actual para poder cambiarla.
          </p>

          {listo ? (
            <div className="rounded-lg border border-emerald-600/40 bg-emerald-900/30 p-4 text-center">
              <p className="font-semibold text-emerald-300">Contraseña actualizada</p>
              <p className="mt-1 text-xs text-slate-400">Te llevamos al inicio...</p>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                  Contraseña nueva
                </label>
                <input
                  type="password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="input w-full"
                />
                <p className="mt-1 text-[11px] text-slate-500">Mínimo 6 caracteres.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                  Repetir la nueva
                </label>
                <input
                  type="password"
                  value={repetir}
                  onChange={(e) => setRepetir(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="input w-full"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button type="submit" disabled={enviando} className="btn-primary w-full disabled:opacity-60">
                {enviando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          )}

          <Link to="/dashboard" className="mt-4 block text-center text-xs text-slate-400 hover:text-white">
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
