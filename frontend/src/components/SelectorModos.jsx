import MesaIcono from './MesaIcono.jsx';

/**
 * El selector de modos, uno solo para toda la app.
 *
 * Lo usan la portada (dentro de su ventana) y el menu. Antes habia dos listas
 * distintas, con textos distintos, y al usuario le salia la vieja desde la
 * portada y la nueva desde el menu.
 */

export const MODOS = [
  {
    id: '1v1bot',
    label: '1 vs 1',
    desc: 'Un rival de la casa. Con pozo.',
    asientos: 2,
    bots: 1,
    requiresAuth: false,
    grupo: 'casa'
  },
  {
    id: '2v2bots',
    label: '2 vs 2',
    desc: 'Compañero y rivales, de la casa.',
    asientos: 4,
    bots: 3,
    requiresAuth: false,
    grupo: 'casa'
  },
  {
    id: '1v1',
    label: '1 vs 1',
    desc: 'Con un amigo, por código.',
    asientos: 2,
    bots: 0,
    requiresAuth: true,
    grupo: 'amigos'
  },
  {
    id: '2v2',
    label: '2 vs 2',
    desc: 'Cuatro personas, en equipos.',
    asientos: 4,
    bots: 0,
    requiresAuth: true,
    grupo: 'amigos'
  }
];

export function Seccion({ titulo, pie, children }) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-domino-accent/80">
          {titulo}
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-domino-cream/35">{pie}</span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

export function Fila({ icono, titulo, texto, onClick, insignia }) {
  return (
    <button
      onClick={onClick}
      className="fila-modo group flex w-full items-center gap-3.5 rounded-xl border border-domino-accent/15 bg-domino-card/70 px-3.5 py-3 text-left transition hover:border-domino-accent/45 hover:bg-domino-card active:scale-[0.99]"
    >
      {icono}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[17px] font-bold leading-tight tracking-wide text-domino-cream">
            {titulo}
          </span>
          {insignia && (
            <span className="rounded-full border border-domino-accent/35 px-1.5 py-px text-[9px] uppercase tracking-wider text-domino-accent/70">
              {insignia}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-domino-cream/45">{texto}</span>
      </span>
      <span className="text-domino-accent/40 transition group-hover:translate-x-0.5 group-hover:text-domino-accent">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}

export default function SelectorModos({ onElegir, mostrarInsignias = false }) {
  const casa = MODOS.filter((m) => m.grupo === 'casa');
  const amigos = MODOS.filter((m) => m.grupo === 'amigos');

  const fila = (m) => (
    <Fila
      key={m.id}
      icono={<MesaIcono asientos={m.asientos} bots={m.bots} tamano={48} />}
      titulo={m.label}
      texto={m.desc}
      insignia={mostrarInsignias && m.requiresAuth ? 'con cuenta' : null}
      onClick={() => onElegir(m)}
    />
  );

  return (
    <>
      <Seccion titulo="Contra la casa" pie="empieza ya">
        {casa.map(fila)}
      </Seccion>
      <Seccion titulo="Contra jugadores" pie="hace falta gente">
        {amigos.map(fila)}
      </Seccion>
    </>
  );
}
