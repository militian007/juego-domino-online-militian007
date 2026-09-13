import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AVISOS, FAMILIAS, elegirFamilia, familiaElegida, prepararSonidos, sonar } from '../utils/soundEffects.js';

/**
 * La pagina para ESCUCHAR y elegir la familia de sonidos de la mesa.
 *
 * Solo existe en desarrollo (ver App.jsx): es una herramienta para decidir,
 * no una pantalla del juego. Se toca cada aviso en cada familia, y el boton
 * "Usar esta" deja la eleccion guardada en el navegador para que la mesa la
 * use de una vez.
 */
export default function Sonidos() {
  const [elegida, setElegida] = useState(familiaElegida());

  return (
    <div className="min-h-screen bg-domino-dark px-4 py-6 text-domino-cream">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-3xl font-bold text-domino-accent">Los sonidos de la mesa</h1>
        <p className="mt-1 text-sm font-medium text-domino-cream-dim">
          Toca cada aviso para oírlo. Elige la familia con el botón dorado y después juega una mesa para
          escucharla en su sitio.
        </p>

        {Object.entries(FAMILIAS).map(([clave, nombre]) => (
          <section
            key={clave}
            className={`mt-5 rounded-2xl border p-4 ${
              elegida === clave ? 'border-domino-accent bg-domino-card' : 'border-slate-700 bg-domino-card/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{nombre}</h2>
              <button
                type="button"
                onClick={() => {
                  prepararSonidos();
                  setElegida(elegirFamilia(clave));
                }}
                className={elegida === clave ? 'btn-primary py-2 px-4' : 'btn-secondary py-2 px-4'}
              >
                {elegida === clave ? 'Elegida' : 'Usar esta'}
              </button>
            </div>
            <p className="mt-1 text-xs font-medium text-domino-cream-dim">
              {clave === 'fichas' && 'Solo las grabaciones reales del clac y del pozo, afinadas.'}
              {clave === 'madera' && 'Golpes secos de madera, como los del Ludo de la casa.'}
              {clave === 'club' && 'Campanitas suaves, discretas.'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(AVISOS).map(([aviso, rotulo]) => (
                <button
                  key={aviso}
                  type="button"
                  onClick={() => {
                    prepararSonidos();
                    sonar(aviso, clave);
                  }}
                  className="rounded-xl border border-domino-accent/40 bg-black/30 px-3 py-3 text-left text-sm font-semibold active:scale-95"
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-6 text-center text-sm font-semibold">
          <Link to="/game?mode=1v1bot" className="text-domino-accent underline underline-offset-4">
            Jugar una mesa con la familia elegida
          </Link>
        </p>
      </div>
    </div>
  );
}
