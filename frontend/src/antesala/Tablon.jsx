import MesaConSillas from './MesaConSillas.jsx';

/**
 * EL TABLON (secciones 188 y 198), como el salon del truco: primero lo que se
 * puede tocar (MESAS ESPERANDO GENTE, con ENTRAR) y debajo lo que solo se
 * mira (JUGANDOSE AHORA, sin boton: a una mesa que ya arranco no se entra).
 *
 * Cada renglon dice con que reglas se juega (Raul, 21-sep: «que salga que
 * modo es, para cuantos puntos, etc.»): retratos de los sentados, un circulo
 * punteado por cada silla libre, "2 vs 2 · Tranca · a 100 · faltan 2" y el
 * codigo en Cinzel.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

const modoTexto = (mode) => (mode === '1v1' ? '1 vs 1' : '2 vs 2');

const haceCuanto = (ms) => {
  if (!ms) return '';
  const min = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
};

/** "Nano vs Chuo" o "Juana y Tigre vs Paula y Raúl": por equipos (silla par contra impar). */
const quienes = (m) => {
  const nombre = (j) => j.username;
  if (m.mode === '1v1') return { a: m.jugadores.filter((j) => j.asiento === 0).map(nombre).join(''), b: m.jugadores.filter((j) => j.asiento !== 0).map(nombre).join('') };
  return {
    a: m.jugadores.filter((j) => j.asiento % 2 === 0).map(nombre).join(' y '),
    b: m.jugadores.filter((j) => j.asiento % 2 === 1).map(nombre).join(' y ')
  };
};

function Retratos({ sillas }) {
  return (
    <span className="flex shrink-0 items-center">
      {sillas.map((s) => (
        s.tipo === 'pana' ? (
          <span key={s.asiento} className="-ml-2 first:ml-0">
            <MesaConSillas.Retrato avatar={s.avatar} tamano={28} />
          </span>
        ) : (
          <span
            key={s.asiento}
            className={`-ml-2 grid h-7 w-7 place-items-center rounded-full border-2 text-[12px] font-black first:ml-0 ${s.tipo === 'casa' ? 'border-domino-accent/70 bg-domino-accent/25 text-domino-accent/80' : 'border-dashed border-domino-accent/70 bg-black/40 text-domino-accent'}`}
            title={s.tipo === 'casa' ? 'La casa' : 'Silla libre'}
          >
            {s.tipo === 'casa' ? '' : '+'}
          </span>
        )
      ))}
    </span>
  );
}

function Seccion({ titulo, n, children, testid }) {
  return (
    <div className="mt-4" data-testid={testid}>
      <div className="mb-1.5 text-[10px] font-extrabold tracking-[0.25em] text-domino-accent">
        {titulo}{n > 0 ? ` · ${n}` : ''}
      </div>
      {children}
    </div>
  );
}

export default function Tablon({ mesas = [], enJuego = [], onEntrar, ocupado = false }) {
  return (
    <div className="mt-auto pt-2" data-tablon>
      <Seccion titulo="MESAS ESPERANDO GENTE" n={mesas.length} testid="mesas-esperando">
        {mesas.length === 0 && (
          <p className="rounded-xl border border-domino-accent/20 bg-black/30 px-3 py-2.5 text-[12.5px] font-semibold text-domino-cream/60">
            Ninguna ahora. Sé el anfitrión: siéntate y mándale el código a tus panas.
          </p>
        )}
        {mesas.map((m) => {
          const dueno = m.sillas.find((s) => s.asiento === 0);
          return (
            <div key={m.code} className="mb-2 flex items-center gap-2.5 rounded-xl border border-domino-accent/30 bg-black/35 px-2.5 py-2" data-mesa={m.code}>
              <Retratos sillas={m.sillas} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-extrabold">Mesa de {dueno?.username || '…'}</b>
                <span className="block text-[10.5px] font-semibold text-domino-cream/65">
                  {modoTexto(m.mode)} · {m.modalidadLabel} · a {m.puntos} · {m.libres === 1 ? 'falta 1' : `faltan ${m.libres}`} · <span className="tracking-[0.15em] text-domino-accent" style={{ fontFamily: SERIF }}>{m.code}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => onEntrar(m.code)}
                disabled={ocupado}
                className="shrink-0 rounded-lg px-3 py-2 text-[10.5px] font-black tracking-[0.15em] text-domino-dark shadow-[0_3px_8px_rgba(0,0,0,0.5)] disabled:opacity-60"
                style={{ fontFamily: SERIF, background: 'linear-gradient(180deg, #F4E2A8 0%, #D8B45C 55%, #B9922F 100%)' }}
              >
                ENTRAR
              </button>
            </div>
          );
        })}
      </Seccion>

      {enJuego.length > 0 && (
        <Seccion titulo="JUGÁNDOSE AHORA" n={enJuego.length} testid="mesas-en-juego">
          {enJuego.map((m) => {
            const q = quienes(m);
            return (
              <div key={m.code} className="mb-2 flex items-center gap-2.5 rounded-xl border border-domino-accent/20 bg-black/30 px-2.5 py-2" data-en-juego={m.code}>
                <span className="flex shrink-0 items-center">
                  {m.jugadores.map((j) => (
                    <span key={j.asiento} className="-ml-2 first:ml-0">
                      <MesaConSillas.Retrato avatar={j.avatar} tamano={26} />
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[12.5px] font-extrabold">
                    {q.a} <span className="text-[10px] text-domino-accent" style={{ fontFamily: SERIF }}>vs</span> {q.b}
                  </b>
                  <span className="block text-[10.5px] font-semibold text-domino-cream/65">
                    {modoTexto(m.mode)} · {m.modalidadLabel} · a {m.puntos}{m.marcador ? ` · van ${m.marcador[1] ?? 0} a ${m.marcador[2] ?? 0}` : ''} · {haceCuanto(m.empezoEn)}
                  </span>
                </span>
              </div>
            );
          })}
        </Seccion>
      )}
    </div>
  );
}
