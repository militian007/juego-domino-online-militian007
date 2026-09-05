import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

/**
 * La vitrina de torneos, con la forma de la de PrivoyTruco.
 *
 * Su pantalla es: cabecera "LA VITRINA", titulo TORNEOS, una tarjeta clara por
 * torneo (nombre, cada cuanto, si es gratis, el pozo, la proxima hora y cuantos
 * anotados, la lista de horarios y el boton ENTRAR), y debajo EL PALMARES con
 * los ultimos campeones.
 *
 * **Aca todavia no hay torneos.** La pantalla existe con su forma definitiva y
 * lo dice, en vez de mostrar horarios inventados con un boton que no lleva a
 * ningun lado. Cuando el sistema este, esta pantalla se llena y no cambia.
 */
export default function Torneos() {
  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">
          ←
        </Link>
        <span className="text-[11px] font-semibold tracking-[0.3em] text-domino-cream/50">
          LA VITRINA
        </span>
        <span className="w-4" />
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-8">
        <h1 className="mt-5 text-3xl font-black tracking-tight text-domino-accent sm:text-4xl">
          TORNEOS
        </h1>
        <p className="mt-1 text-sm text-domino-cream/55">
          Entra, gana la llave y llévate el pozo
        </p>

        <div className="mt-6 rounded-2xl bg-domino-cream/95 p-5 text-domino-dark shadow-2xl">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="shrink-0" aria-hidden="true" />
            <h2 className="text-base font-black">Todavía no hay torneos</h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-domino-dark/70">
            El dominó todavía no tiene torneos. Esta pantalla ya está lista con su forma
            final: cuando los haya, acá van a aparecer los horarios, cuántos se anotaron y
            el botón para entrar.
          </p>

          <p className="mt-3 text-sm leading-relaxed text-domino-dark/70">
            Mientras tanto podés jugar una partida contra alguien y subir en la tabla.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/"
              className="rounded-full bg-domino-dark px-4 py-2 text-xs font-bold tracking-wider text-domino-cream"
            >
              JUGAR AHORA
            </Link>
            <Link
              to="/ranking"
              className="rounded-full border border-domino-dark/25 px-4 py-2 text-xs font-bold tracking-wider text-domino-dark"
            >
              VER LA CLASIFICACIÓN
            </Link>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-domino-cream/95 p-5 text-domino-dark shadow-2xl">
          <h2 className="flex items-center gap-2 text-sm font-black">
            <Trophy size={15} aria-hidden="true" />
            EL PALMARÉS
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-domino-dark/60">
            Acá van a quedar los campeones de cada torneo. Todavía no hay ninguno.
          </p>
        </div>
      </div>
    </div>
  );
}
