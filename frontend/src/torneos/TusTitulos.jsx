import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { torneos } from './api.js';
import EstampaCampeon from './EstampaCampeon.jsx';
import { SERIF, BODY } from './utileria.jsx';

/**
 * TUS TITULOS, copia del truco (`TusTitulos.tsx`, Raul 6-ago: «la estampa se
 * pierde cuando cierran la pantalla; que se les guarde en su perfil»). No se
 * guarda ninguna imagen: la estampa se vuelve a dibujar con tres datos. La
 * ultima va grande, las demas en cuadricula; tocar una la abre para compartir.
 *
 * Si la consulta falla la seccion NO se dibuja: decir «no has ganado ninguno»
 * a quien quiza tiene tres seria mentirle.
 */

const BRONCE = '#C9A46A';

function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

function Miniatura({ titulo, nombre, grande, onAbrir }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      data-testid={`titulo-${titulo.id}`}
      aria-label={`Abrir tu estampa de campeón de ${titulo.name}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: grande ? 3 : 2,
        padding: grande ? 12 : 6,
        aspectRatio: grande ? '16 / 10' : '9 / 16',
        gridColumn: grande ? '1 / -1' : undefined,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(201,164,106,0.38)',
        background: 'linear-gradient(170deg, #1E3324 0%, #0A1310 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        cursor: 'pointer'
      }}
    >
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 22%, rgba(201,164,106,0.28) 0%, transparent 62%)' }} />
      <Trophy size={grande ? 22 : 13} strokeWidth={2} color={BRONCE} style={{ position: 'relative' }} aria-hidden />
      <span style={{ position: 'relative', fontFamily: BODY, fontSize: grande ? 9.5 : 7, fontWeight: 800, letterSpacing: '0.2em', color: BRONCE }}>CAMPEÓN</span>
      <span style={{ position: 'relative', fontFamily: SERIF, fontWeight: 700, fontSize: grande ? 25 : 12, lineHeight: 1.05, color: '#F0E6D2', textAlign: 'center', wordBreak: 'break-word' }}>{nombre}</span>
      <span style={{ position: 'relative', fontFamily: BODY, fontSize: grande ? 11.5 : 7.5, lineHeight: 1.25, color: 'rgba(240,230,210,0.75)', textAlign: 'center' }}>
        {titulo.name}<br />{fechaCorta(titulo.endedAt)}
      </span>
      <span style={{ position: 'relative', marginTop: grande ? 4 : 2, fontFamily: SERIF, fontWeight: 700, fontSize: grande ? 9 : 6.5, letterSpacing: '0.14em', color: 'rgba(201,164,106,0.85)' }}>LA MESA DE DOMINÓ</span>
    </button>
  );
}

export default function TusTitulos({ nombre }) {
  const navigate = useNavigate();
  const [titulos, setTitulos] = useState(null);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    let vivo = true;
    torneos.misTitulos()
      .then((r) => { if (vivo) setTitulos(r.items ?? r.titulos ?? []); })
      .catch(() => { if (vivo) setTitulos(null); });
    return () => { vivo = false; };
  }, []);

  if (titulos === null) return null;

  const encabezado = (texto) => (
    <h2 className="mt-8 flex items-center gap-2 text-xs font-semibold tracking-widest text-domino-cream/50">
      <span aria-hidden className="inline-block h-4 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, #F4E2A8 0%, #C5A028 100%)' }} />
      {texto}
    </h2>
  );

  if (titulos.length === 0) {
    return (
      <section data-testid="tus-titulos-vacio">
        {encabezado('TUS TÍTULOS DE TORNEO')}
        <p className="mt-3 text-center text-[13px] leading-relaxed text-domino-cream/65">
          Todavía no has ganado ningún torneo. El que gana se lleva su estampa, y se le queda aquí para siempre.
        </p>
        <button type="button" onClick={() => navigate('/torneos')} className="mt-3 w-full rounded-lg border border-domino-accent/40 bg-black/30 py-2.5 text-[13px] font-bold text-domino-accent">
          Ver los torneos
        </button>
      </section>
    );
  }

  const [ultimo, ...resto] = titulos;
  return (
    <section data-testid="tus-titulos">
      {encabezado(titulos.length === 1 ? 'TU TÍTULO DE TORNEO' : `TUS TÍTULOS DE TORNEO · ${titulos.length}`)}
      <div className="mt-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Miniatura titulo={ultimo} nombre={nombre} grande onAbrir={() => setAbierto(ultimo)} />
        {resto.map((t) => <Miniatura key={t.id} titulo={t} nombre={nombre} grande={false} onAbrir={() => setAbierto(t)} />)}
      </div>
      <p className="mt-2 text-center text-[11px] text-domino-cream/50">Toca una para volver a compartirla.</p>
      {abierto && <EstampaCampeon nombre={nombre} torneo={abierto.name} fecha={abierto.endedAt} onCerrar={() => setAbierto(null)} textoCerrar="Cerrar" />}
    </section>
  );
}
