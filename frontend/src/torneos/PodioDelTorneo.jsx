import { Crown } from 'lucide-react';
import { Retrato, SERIF, BODY, GRITO } from './utileria.jsx';

/**
 * EL PODIO DE TRES ESCALONES, copia del truco (`PodioDelTorneo.tsx`, Raul
 * 19-sep: «A1, pero mejoralo, refinalo»). Escalones con veta y bisel (2 · 1 ·
 * 3), marcos de oro/plata/bronce alrededor del retrato, corona al campeon,
 * polvo de oro bajo el foco, y al pie quien le gano el 3.º a quien EN LA MESA.
 * Sin plata: debajo del nombre, los puntos de la clasificacion.
 */

const ESCALON = {
  1: { alto: 84, fondo: 'linear-gradient(180deg, #E9CB78, #9A7A2E)', tinta: '#2b1c08' },
  2: { alto: 60, fondo: 'linear-gradient(180deg, #dfe3e8, #8f96a0)', tinta: '#22262b' },
  3: { alto: 44, fondo: 'linear-gradient(180deg, #d8a06a, #8a5325)', tinta: '#2b1608' }
};
const MARCO = {
  1: 'conic-gradient(from 0deg, #F8E3A8, #9A7A2E, #F8E3A8, #9A7A2E, #F8E3A8)',
  2: 'conic-gradient(from 0deg, #ffffff, #8f96a0, #ffffff, #8f96a0, #ffffff)',
  3: 'conic-gradient(from 0deg, #f2c9a0, #8a5325, #f2c9a0, #8a5325, #f2c9a0)'
};
const ORO = 'linear-gradient(180deg, #FDF3C8 0%, #F2D479 40%, #C9A343 70%, #9A7A2E 100%)';

export default function PodioDelTorneo({ detail, miUserId, pie }) {
  const t = detail.tournament;
  const jugador = (id) => detail.players.find((p) => p.userId === id) ?? null;
  const nombre = (id) => (id ? jugador(id)?.displayName ?? '—' : '—');
  const pagos = [...detail.payouts].sort((a, b) => a.place - b.place);
  const puesto = (n) => pagos.find((p) => p.place === n) ?? null;
  const humanos = detail.players.filter((p) => !p.isBot && p.status !== 'refunded').length;
  const tercero = detail.tercerPuesto ?? null;
  const puntosDe = (n) => puesto(n)?.puntos ?? t.premiosPuntos?.[n - 1] ?? null;

  const pilar = (n) => {
    const p = puesto(n);
    if (!p) return <span key={n} style={{ flex: 1 }} />;
    const j = jugador(p.userId) ?? { displayName: p.displayName };
    const esMio = !!miUserId && p.userId === miUserId;
    const e = ESCALON[n];
    const grande = n === 1;
    const d = grande ? 78 : 56;
    const pts = puntosDe(n);
    return (
      <span key={n} className="flex min-w-0 flex-col items-center" style={{ flex: 1, gap: 5 }} data-testid={`podio-puesto-${n}`}>
        {grande && <Crown size={30} strokeWidth={2} fill="#F2D479" color="#9A7A2E" style={{ marginBottom: -4, filter: 'drop-shadow(0 0 8px rgba(229,194,106,0.9))' }} aria-hidden />}
        <span style={{ width: d, height: d, borderRadius: 999, padding: 3, background: MARCO[n], boxShadow: grande ? '0 0 0 2px #10231B, 0 0 0 3px rgba(229,194,106,0.6), 0 0 32px rgba(229,194,106,0.6)' : '0 0 0 2px #10231B, 0 0 0 3px rgba(229,194,106,0.35)' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', background: 'radial-gradient(circle at 40% 35%, #4a3320, #2a1a10)' }}>
            <Retrato jugador={j} tamano={d - 6} />
          </span>
        </span>
        <span className="max-w-full truncate" style={{ fontFamily: grande ? SERIF : BODY, fontWeight: 800, fontSize: grande ? 15 : 12.5, letterSpacing: grande ? '0.04em' : '0.02em', color: grande ? '#F8E3A8' : '#F5F0E8', textTransform: grande ? 'uppercase' : 'none' }}>
          {p.displayName}{esMio ? ' (tú)' : ''}
        </span>
        {pts != null && <span style={{ fontFamily: BODY, fontSize: grande ? 13.5 : 12, fontWeight: 800, color: '#F8E3A8' }}>+{pts} pts</span>}
        <span
          style={{
            width: '100%',
            height: e.alto,
            borderRadius: '6px 6px 0 0',
            display: 'grid',
            placeItems: 'center',
            fontFamily: GRITO,
            fontSize: 28,
            color: e.tinta,
            backgroundImage: `repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0 3px, transparent 3px 9px), ${e.fondo}`,
            boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -10px 0 rgba(0,0,0,0.28), 0 -2px 12px rgba(0,0,0,0.3)',
            textShadow: '0 1px 0 rgba(255,255,255,0.4)'
          }}
        >
          {n}
        </span>
      </span>
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-[20px] px-3 pb-4 pt-4 text-center"
      style={{
        background: 'radial-gradient(90% 60% at 50% 0%, #1d3a2b 0%, #10231B 45%, #080d0a 100%)',
        border: '1.5px solid rgba(197,160,40,0.8)',
        boxShadow: 'inset 0 0 0 1px rgba(244,226,168,0.10), 0 0 50px rgba(197,160,40,0.22), 0 22px 55px rgba(0,0,0,0.65)',
        color: '#F5F0E8',
        fontFamily: SERIF
      }}
      data-testid="podio-del-torneo"
    >
      <span aria-hidden style={{ position: 'absolute', left: '50%', top: -30, width: 280, height: 280, transform: 'translateX(-50%)', background: 'radial-gradient(closest-side, rgba(244,226,168,0.26), transparent 70%)', pointerEvents: 'none' }} />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle, rgba(248,227,168,0.9) 0 1px, transparent 2px) 12% 20% / 6px 6px no-repeat,' +
            'radial-gradient(circle, rgba(248,227,168,0.7) 0 1px, transparent 2px) 78% 14% / 6px 6px no-repeat,' +
            'radial-gradient(circle, rgba(248,227,168,0.8) 0 1px, transparent 2px) 60% 34% / 6px 6px no-repeat,' +
            'radial-gradient(circle, rgba(248,227,168,0.6) 0 1px, transparent 2px) 26% 40% / 6px 6px no-repeat,' +
            'radial-gradient(circle, rgba(248,227,168,0.8) 0 1px, transparent 2px) 88% 46% / 6px 6px no-repeat'
        }}
      />
      <div style={{ position: 'relative', fontFamily: BODY, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.3em', color: '#C5A028', textTransform: 'uppercase' }}>{t.name}</div>
      <div style={{ width: 74, height: 1, margin: '8px auto 10px', background: 'linear-gradient(90deg, transparent, #C5A028, transparent)' }} />
      <div style={{ position: 'relative', fontFamily: GRITO, fontSize: 23, letterSpacing: '0.06em', background: ORO, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))' }}>
        {miUserId && puesto(1)?.userId === miUserId ? '¡CAMPEÓN, ERES TÚ!' : '¡CAMPEÓN!'}
      </div>
      <div className="flex items-end justify-center" style={{ gap: 6, marginTop: 14, position: 'relative' }}>
        {pilar(2)}
        {pilar(1)}
        {pilar(3)}
      </div>
      <div aria-hidden style={{ height: 8, margin: '0 -12px', background: 'linear-gradient(180deg, #6a4626, #2b1a0c)', boxShadow: '0 -1px 0 rgba(255,255,255,0.08)' }} />
      {(tercero || humanos > 0) && (
        <p style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.62)', marginTop: 12, marginBottom: 0, fontFamily: BODY, fontWeight: 600, lineHeight: 1.5 }} data-testid="podio-tercer-puesto">
          {[humanos > 0 ? (humanos === 1 ? '1 persona jugó' : `${humanos} personas jugaron`) : null, tercero ? `${nombre(tercero.ganadorUserId)} le ganó el 3.º a ${nombre(tercero.perdedorUserId)} en la mesa` : null].filter(Boolean).join(' · ')}
        </p>
      )}
      {pie && <div style={{ marginTop: 10, position: 'relative' }}>{pie}</div>}
    </div>
  );
}
