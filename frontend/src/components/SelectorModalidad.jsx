/**
 * Con que REGLAS se juega (§128). Es aparte de con quien se juega.
 *
 * Las tres modalidades valen igual en 1 vs 1 que en 2 vs 2, asi que va arriba
 * del selector de modos y no dentro de cada fila: elegis las reglas una vez y
 * despues elegis la mesa.
 *
 * Se recuerda la ultima elegida. Quien juega siempre al Cinco no tiene por que
 * pedirlo cada vez.
 */

const LLAVE = 'domino-modalidad';

export const MODALIDADES = [
  {
    id: 'pozo',
    label: 'Con pozo',
    desc: 'Si no podés jugar, levantás del montón hasta poder. Es la de siempre.'
  },
  {
    id: 'tranca',
    label: 'Tranca',
    desc: 'Sin montón: el que no puede jugar, pasa. Manos cortas y más trancas.'
  },
  {
    id: 'cinco',
    label: 'Cinco',
    desc: 'Sumás cada vez que las dos puntas dan 5, 10, 15... Se juega a 200.'
  }
];

export function modalidadGuardada() {
  try {
    const v = localStorage.getItem(LLAVE);
    return MODALIDADES.some((m) => m.id === v) ? v : 'pozo';
  } catch {
    return 'pozo';
  }
}

export function guardarModalidad(id) {
  try {
    localStorage.setItem(LLAVE, id);
  } catch {
    // Navegador sin almacenamiento: se juega con la de siempre.
  }
}

export default function SelectorModalidad({ valor, onCambiar }) {
  const elegida = MODALIDADES.find((m) => m.id === valor) ?? MODALIDADES[0];

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-domino-accent/80">
          Reglas
        </h3>
        <span className="text-[10px] text-domino-cream/40">se recuerda</span>
      </div>

      <div className="flex gap-1.5">
        {MODALIDADES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onCambiar(m.id)}
            aria-pressed={m.id === valor}
            className={`flex-1 rounded-lg border px-2 py-2 text-[12px] font-bold transition ${
              m.id === valor
                ? 'border-domino-accent bg-domino-accent/20 text-domino-cream'
                : 'border-domino-accent/20 bg-black/30 text-domino-cream/60 hover:border-domino-accent/50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-domino-cream/50">{elegida.desc}</p>
    </section>
  );
}
