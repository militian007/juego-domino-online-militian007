/**
 * Un diagrama chiquito de la mesa: el paño y quien se sienta en cada silla.
 *
 * Sirve de icono para elegir modo. Dice mas que un emoji: de un vistazo se ve
 * cuantos juegan, cual sos vos (dorado) y cuales son bots (gris con antena).
 *
 * La mesa va cuadrada, como la de domino de verdad, no redonda.
 */

const TU = '#d4af37';
const HUMANO = '#f4ecd8';
const BOT = '#8b9a95';

function Silla({ x, y, tipo }) {
  // Una silla vacia se dibuja punteada: es la que estas esperando que llegue.
  if (tipo === 'vacia') {
    return (
      <g>
        <circle cx={x} cy={y} r="7.5" fill="#0a1414" />
        <circle cx={x} cy={y} r="6" fill="none" stroke={HUMANO} strokeWidth="1.8"
                strokeDasharray="3 2.6" opacity="0.6" />
      </g>
    );
  }
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

export default function MesaIcono({ asientos = 2, bots = 0, vacias = 0, codigo = false, tamano = 54 }) {
  // Vos siempre abajo. Los demas se reparten alrededor, y los bots se cuentan
  // desde el de enfrente para que el compañero humano quede siempre visible.
  const posiciones =
    asientos === 2
      ? [
          { x: 32, y: 54, tipo: 'tu' },
          { x: 32, y: 10, tipo: vacias >= 1 ? 'vacia' : bots >= 1 ? 'bot' : 'humano' }
        ]
      : [
          { x: 32, y: 55, tipo: 'tu' },
          { x: 32, y: 9, tipo: vacias >= 1 ? 'vacia' : bots >= 1 ? 'bot' : 'humano' },
          { x: 9, y: 32, tipo: vacias >= 2 ? 'vacia' : bots >= 2 ? 'bot' : 'humano' },
          { x: 55, y: 32, tipo: vacias >= 3 ? 'vacia' : bots >= 3 ? 'bot' : 'humano' }
        ];

  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mesaIconoPano" x1="0.25" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#1f6b4f" />
          <stop offset="100%" stopColor="#0d3325" />
        </linearGradient>
      </defs>
      {/* baranda de nogal y paño, en cuadrado */}
      <rect x="14" y="14" width="36" height="36" rx="5" fill="url(#mesaIconoPano)" stroke="#6b4b28" strokeWidth="4.5" />
      <rect x="12.6" y="12.6" width="38.8" height="38.8" rx="6.2" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.5" />
      {/* dos fichas puestas en el centro, para que se lea que es dominó */}
      <g opacity="0.9">
        <rect x="23" y="29.5" width="9" height="5" rx="1" fill="#20160c" stroke="#c9a24a" strokeWidth="0.7" />
        <rect x="32" y="29.5" width="9" height="5" rx="1" fill="#20160c" stroke="#c9a24a" strokeWidth="0.7" />
      </g>
      {posiciones.map((p) => (
        <Silla key={`${p.x}-${p.y}`} {...p} />
      ))}
      {codigo && (
        <g>
          <rect x="41" y="50" width="22" height="12" rx="3" fill="#0a1414" stroke="#d4af37" strokeWidth="1.6" />
          <g fill="#d4af37">
            <rect x="44" y="54.5" width="3.5" height="3" rx="1" />
            <rect x="49.5" y="54.5" width="3.5" height="3" rx="1" />
            <rect x="55" y="54.5" width="3.5" height="3" rx="1" />
          </g>
        </g>
      )}
    </svg>
  );
}
