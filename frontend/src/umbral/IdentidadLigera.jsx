import { useState } from 'react';
import { SeccionInstalarPerfil } from '../components/InstalarLaApp.jsx';
import { RETRATOS, guardarIdentidad, identidad, limpiarNombre, retratoUrl } from './identidad.js';

/**
 * La tarjeta de "como te llaman en la mesa": nombre y retrato, una sola vez.
 * Sale sobre el umbral la primera vez que alguien toca JUEGA YA.
 */
export default function IdentidadLigera({ abierta, onListo, onCerrar }) {
  const actual = identidad();
  const [nombre, setNombre] = useState(actual?.nombre || '');
  const [retrato, setRetrato] = useState(actual?.retrato || RETRATOS[0]);
  if (!abierta) return null;
  const valido = limpiarNombre(nombre).length >= 2;
  const listo = () => onListo(guardarIdentidad({ nombre, retrato }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-domino-accent/40 bg-domino-felt p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold tracking-[0.3em] text-domino-accent">EN LA MESA</p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-domino-cream">¿Cómo te llaman?</h2>
        <input
          autoFocus
          value={nombre}
          maxLength={14}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && valido) listo(); }}
          placeholder="Tu nombre en la mesa"
          className="mt-3 w-full rounded-xl border border-domino-accent/40 bg-black/40 px-4 py-3 text-lg font-bold text-domino-cream outline-none placeholder:text-domino-cream/40 focus:border-domino-accent"
        />
        <p className="mt-4 text-[11px] font-bold tracking-[0.3em] text-domino-accent">TU RETRATO</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {RETRATOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRetrato(r)}
              aria-label={r}
              className={`aspect-square overflow-hidden rounded-full border-2 transition ${
                retrato === r ? 'border-domino-accent shadow-[0_0_12px_rgba(216,180,92,0.6)]' : 'border-transparent opacity-80'
              }`}
            >
              <img src={retratoUrl(r)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!valido}
          onClick={listo}
          className="btn-primary mt-5 w-full py-3 text-base disabled:opacity-40"
        >
          A la mesa
        </button>
        <p className="mt-2 text-center text-xs font-medium text-domino-cream/60">
          Se guarda en este teléfono. Lo cambias cuando quieras.
        </p>
        {/* Instalar la app (seccion 209): la fila del perfil del truco. Esta hoja es el perfil del dominó. */}
        <div className="mt-4">
          <SeccionInstalarPerfil />
        </div>
      </div>
    </div>
  );
}
