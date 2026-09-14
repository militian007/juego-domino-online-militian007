import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IdentidadLigera from './IdentidadLigera.jsx';
import { identidad, retratoUrl } from './identidad.js';

/**
 * EL UMBRAL (seccion 177): la puerta del juego, como la del Ludo.
 *
 * Portada 9:16 generada, titulo en oro, JUEGA YA, EL RELAMPAGO y la hojita
 * de reglas. Sin login: la identidad ligera. La landing de Jonathan sigue en
 * /viejo, intacta, para el informe.
 *
 * Las tres portadas se eligen con `?portada=a|b|c` (queda guardada) mientras
 * Raul decide.
 */
const PORTADAS = ['a', 'b', 'c'];

function portadaElegida() {
  try {
    const pedida = new URLSearchParams(window.location.search).get('portada');
    if (pedida && PORTADAS.includes(pedida)) localStorage.setItem('domino-portada', pedida);
    const guardada = localStorage.getItem('domino-portada');
    return PORTADAS.includes(guardada) ? guardada : 'a';
  } catch {
    return 'a';
  }
}

const REGLAS = [
  'Dominó venezolano, doble seis, 28 fichas.',
  'Sale el doble más alto. Después, el que ganó la mano.',
  'Se juega por las dos puntas de la culebra.',
  'Uno contra uno con pozo; dos contra dos sin pozo.',
  'El que se pega suma los puntos que quedaron en las otras manos.',
  'Tranque: gana el que menos puntos tenga, y suma los del rival.'
];

export default function Umbral() {
  const navigate = useNavigate();
  const [pidiendo, setPidiendo] = useState(false);
  const [reglas, setReglas] = useState(false);
  const yo = identidad();
  const portada = portadaElegida();

  const jugar = () => {
    if (identidad()) navigate('/game?mode=1v1bot');
    else setPidiendo(true);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#08120c] text-domino-cream">
      <img
        src={`/umbral/portada-${portada}.webp`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#08120c]" />

      <div className="relative flex min-h-[100dvh] flex-col px-6 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.35em] text-domino-accent/90">CLUB DE DOMINÓ</span>
          {yo && (
            <button
              type="button"
              onClick={() => setPidiendo(true)}
              className="flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/40 py-1 pl-1 pr-3 text-sm font-bold"
            >
              <img src={retratoUrl(yo.retrato)} alt="" className="h-7 w-7 rounded-full" />
              {yo.nombre}
            </button>
          )}
        </header>

        <div className="mt-auto">
          <h1 className="font-serif text-[52px] font-bold leading-none tracking-wide text-domino-accent drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Dominó
          </h1>
          <p className="mt-2 text-base font-semibold text-domino-cream/85">La mesa de siempre, en tu teléfono.</p>

          <button type="button" onClick={jugar} className="btn-primary mt-6 w-full py-4 text-lg tracking-[0.2em]">
            JUEGA YA
          </button>
          <Link to="/torneos" className="btn-secondary mt-3 block w-full py-3 text-center text-base tracking-[0.2em]">
            EL RELÁMPAGO
          </Link>
          <button
            type="button"
            onClick={() => setReglas((v) => !v)}
            className="mt-4 w-full text-center text-sm font-bold tracking-[0.2em] text-domino-accent/90"
          >
            {reglas ? 'CERRAR' : 'LAS REGLAS'}
          </button>
          {reglas && (
            <ul className="mt-3 space-y-1.5 rounded-2xl border border-domino-accent/30 bg-black/60 p-4 text-sm font-medium text-domino-cream/90 backdrop-blur-sm">
              {REGLAS.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </div>
      </div>

      <IdentidadLigera
        abierta={pidiendo}
        onCerrar={() => setPidiendo(false)}
        onListo={(id) => { setPidiendo(false); if (id) navigate('/game?mode=1v1bot'); }}
      />
    </div>
  );
}
