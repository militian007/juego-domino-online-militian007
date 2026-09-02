/**
 * Un diagrama chiquito de la mesa: el paño y quien se sienta en cada silla.
 *
 * Sirve de icono para elegir modo. Dice mas que un emoji: de un vistazo se ve
 * cuantos juegan, cual sos vos (dorado) y cuales son bots (gris con antena).
 */

const TU = '#d4af37';
const HUMANO = '#f4ecd8';
const BOT = '#8b9a95';

function Silla({ x, y, tipo }) {
  const color = tipo === 'tu' ? TU : tipo === 'bot' ? BOT : HUMANO;
  return (
    <g>
      {tipo === 'bot' && <path d={`M ${x} ${y - 8} L ${x} ${y - 13}`} stroke={BOT} strokeWidth="2" />}
      {tipo === 'bot' && <circle cx={x} cy={y - 14} r="2" fill={BOT} />}
      <circle cx={x} cy={y} r="7.5" fill="#0a1414" />
      <circle cx={x} cy={y} r="6" fill={color} />
      {tipo === 'tu' && <circle cx={x} cy={y} r="9.5" fill="none" stroke={TU} strokeWidth="1.8" opacity="0.6" />}
    </g>
  );
}

export default function MesaIcono({ asientos = 2, bots = 0, tamano = 46 }) {
  // Vos siempre abajo. Los demas se reparten alrededor, y los bots se cuentan
  // desde el de enfrente para que el compañero humano quede siempre visible.
  const posiciones =
    asientos === 2
      ? [{ x: 32, y: 52, tipo: 'tu' }, { x: 32, y: 12, tipo: bots >= 1 ? 'bot' : 'humano' }]
      : [
          { x: 32, y: 54, tipo: 'tu' },
          { x: 32, y: 10, tipo: bots >= 1 ? 'bot' : 'humano' },
          { x: 10, y: 32, tipo: bots >= 2 ? 'bot' : 'humano' },
          { x: 54, y: 32, tipo: bots >= 3 ? 'bot' : 'humano' }
        ];

  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="mesaIconoPano" cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#1f6b4f" />
          <stop offset="100%" stopColor="#0d3325" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="17" fill="url(#mesaIconoPano)" stroke="#6b4b28" strokeWidth="4" />
      <circle cx="32" cy="32" r="19.2" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.5" />
      {/* dos fichas puestas en el centro, para que se lea que es dominó */}
      <g opacity="0.85">
        <rect x="24" y="29.5" width="9" height="5" rx="1" fill="#20160c" stroke="#c9a24a" strokeWidth="0.7" />
        <rect x="33" y="29.5" width="9" height="5" rx="1" fill="#20160c" stroke="#c9a24a" strokeWidth="0.7" />
      </g>
      {posiciones.map((p) => (
        <Silla key={`${p.x}-${p.y}`} {...p} />
      ))}
    </svg>
  );
}
