import MesaConSillas from './MesaConSillas.jsx';

/**
 * El tablon (seccion 188): las mesas armadas de otros que todavia tienen
 * silla para un pana. Cada renglon: el codigo en Cinzel, el modo, los
 * retratos de los que ya estan sentados, un circulo punteado por cada silla
 * libre, y ENTRAR. Sin mesas, un renglon que lo dice y ya.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

export default function Tablon({ mesas = [], onEntrar, ocupado = false }) {
  return (
    <div className="mt-auto border-t border-domino-accent/50 pt-3" data-tablon>
      <div className="mb-1.5 text-[10px] font-extrabold tracking-[0.3em] text-domino-accent">MESAS ABIERTAS</div>
      {mesas.length === 0 && (
        <p className="py-2 text-[13px] font-semibold text-domino-cream/60">Ninguna ahora. Abre la tuya y mándale el código a tus panas.</p>
      )}
      {mesas.map((m) => (
        <div key={m.code} className="flex items-center gap-2.5 border-b border-domino-accent/15 py-2 text-[13px] font-semibold" data-mesa={m.code}>
          <b className="text-[15px] tracking-[0.12em] text-domino-accent" style={{ fontFamily: SERIF }}>{m.code}</b>
          <span className="text-domino-cream/85">{m.mode === '1v1' ? '1 vs 1' : '2 vs 2'}</span>
          <span className="ml-auto flex items-center">
            {m.sillas.map((s) => (
              s.tipo === 'pana' ? (
                <span key={s.asiento} className="-ml-1.5 first:ml-0">
                  <MesaConSillas.Retrato avatar={s.avatar} tamano={24} />
                </span>
              ) : (
                <span
                  key={s.asiento}
                  className={`-ml-1.5 h-6 w-6 rounded-full border-2 first:ml-0 ${s.tipo === 'casa' ? 'border-domino-accent/70 bg-domino-accent/25' : 'border-dashed border-domino-accent/70 bg-black/30'}`}
                  title={s.tipo === 'casa' ? 'La casa' : 'Silla libre'}
                />
              )
            ))}
          </span>
          <button
            type="button"
            onClick={() => onEntrar(m.code)}
            disabled={ocupado}
            className="rounded-full bg-domino-accent px-3 py-1 text-[10px] font-extrabold tracking-[0.2em] text-domino-dark disabled:opacity-60"
          >
            ENTRAR
          </button>
        </div>
      ))}
    </div>
  );
}
