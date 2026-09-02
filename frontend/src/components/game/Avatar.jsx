/**
 * Retratos.
 *
 * Primero se intenta el retrato de `/avatares/<semilla>.svg`. Si no existe (o
 * todavia no se genero), se cae al retrato de SVG dibujado por codigo, que no
 * pesa nada y nunca falla. Por eso agregar un bot nuevo jamas deja un hueco:
 * se ve el SVG hasta que llegue su foto.
 *
 * Los jugadores humanos siempre van con SVG, derivado de su nombre: el mismo
 * nombre da siempre la misma cara.
 */

import { useState } from 'react';

// Los 12 rivales de la casa. Solo estos tienen foto; cualquier otra semilla es
// un jugador humano y va directo al SVG.
const CON_FOTO = new Set([
  'nano', 'yubi', 'chela', 'chuo', 'paula', 'catire',
  'juana', 'musiu', 'comadre', 'pancho', 'zurda', 'tigre'
]);

const CARAS = {
  nano: {
    piel: '#c98d63', pelo: '#2b1a10', fondo: ['#2d4a63', '#16283a'],
    gorra: '#c0392b', lentes: false, bigote: false, barba: false, sombrero: false
  },
  chela: {
    piel: '#d8a678', pelo: '#8e8e94', fondo: ['#6b3a5e', '#33172c'],
    gorra: null, lentes: true, bigote: false, barba: false, sombrero: false, pañuelo: '#e0b64a'
  },
  catire: {
    piel: '#e3b58a', pelo: '#d9a441', fondo: ['#2f5c46', '#153024'],
    gorra: null, lentes: false, bigote: true, barba: false, sombrero: false
  },
  comadre: {
    piel: '#a9764f', pelo: '#1d1d22', fondo: ['#5d3b7a', '#2a1738'],
    gorra: null, lentes: true, bigote: false, barba: false, sombrero: false, aros: true
  },
  tigre: {
    piel: '#8d5a38', pelo: '#141414', fondo: ['#7a1f1f', '#380c0c'],
    gorra: null, lentes: true, bigote: true, barba: true, sombrero: true
  }
};

const PALETAS = [
  ['#2d4a63', '#16283a'], ['#2f5c46', '#153024'], ['#6b3a5e', '#33172c'],
  ['#5d3b7a', '#2a1738'], ['#7a4a1f', '#3a2109'], ['#1f5c5c', '#0d2e2e']
];
const PIELES = ['#c98d63', '#d8a678', '#e3b58a', '#a9764f', '#8d5a38', '#f0c9a0'];
const PELOS = ['#2b1a10', '#141414', '#5c3a1e', '#8e8e94', '#d9a441', '#3d2415'];

function hash(texto) {
  let h = 0x811c9dc5;
  const s = String(texto || 'jugador');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function caraDe(semilla) {
  // Object.hasOwn evita que semillas como "toString" caigan en el prototipo
  if (Object.hasOwn(CARAS, semilla)) return CARAS[semilla];

  // Ojo: hay que usar >>> y no >>. El hash es sin signo y con valores grandes
  // el desplazamiento con signo da negativo, y eso indexa fuera del array.
  const h = hash(semilla);
  return {
    piel: PIELES[h % PIELES.length],
    pelo: PELOS[(h >>> 3) % PELOS.length],
    fondo: PALETAS[(h >>> 6) % PALETAS.length],
    gorra: (h >>> 9) % 3 === 0 ? '#c0392b' : null,
    lentes: (h >>> 11) % 3 === 0,
    bigote: (h >>> 13) % 3 === 0,
    barba: (h >>> 15) % 5 === 0,
    sombrero: false
  };
}

export default function Avatar({ semilla, tamano = 44, aro = true, className = '' }) {
  const [sinFoto, setSinFoto] = useState(false);
  const c = caraDe(semilla);
  const id = `av-${hash(semilla).toString(36)}`;

  if (CON_FOTO.has(semilla) && !sinFoto) {
    return (
      <img
        src={`/avatares/${semilla}.svg`}
        width={tamano}
        height={tamano}
        alt={`Retrato de ${semilla}`}
        onError={() => setSinFoto(true)}
        className={`rounded-full object-cover ${aro ? 'ring-2 ring-domino-accent/55' : ''} ${className}`}
        style={{ width: tamano, height: tamano }}
      />
    );
  }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`Retrato de ${semilla}`}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.fondo[0]} />
          <stop offset="100%" stopColor={c.fondo[1]} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="30" fill={`url(#${id}-bg)`} />

      <g clipPath={`url(#${id}-clip)`}>
        {/* hombros */}
        <ellipse cx="32" cy="63" rx="23" ry="17" fill="#0f1518" />
        <ellipse cx="32" cy="64" rx="18" ry="13" fill="#1b2529" />

        {/* cuello y cabeza */}
        <rect x="27" y="38" width="10" height="9" rx="4" fill={c.piel} opacity="0.85" />
        <ellipse cx="32" cy="29" rx="13" ry="14" fill={c.piel} />

        {/* pelo */}
        {!c.sombrero && !c.gorra && (
          <path d="M19 27c0-9 6-13 13-13s13 4 13 13c0-5-5-7-13-7s-13 2-13 7z" fill={c.pelo} />
        )}

        {/* pañuelo */}
        {c.pañuelo && (
          <path d="M19 26c0-9 6-13 13-13s13 4 13 13c-4-4-9-5-13-5s-9 1-13 5z" fill={c.pañuelo} />
        )}

        {/* gorra */}
        {c.gorra && (
          <>
            <path d="M18 26c0-9 6-13 14-13s14 4 14 13H18z" fill={c.gorra} />
            <rect x="16" y="25" width="30" height="3" rx="1.5" fill={c.gorra} />
            <rect x="14" y="25" width="12" height="3" rx="1.5" fill="#000" opacity="0.35" />
          </>
        )}

        {/* sombrero de ala */}
        {c.sombrero && (
          <>
            <ellipse cx="32" cy="21" rx="22" ry="4.5" fill="#14100c" />
            <path d="M22 21c0-8 3-12 10-12s10 4 10 12H22z" fill="#1c1712" />
            <rect x="21" y="17" width="22" height="3.5" fill="#d4af37" opacity="0.8" />
          </>
        )}

        {/* ojos */}
        <ellipse cx="27" cy="29" rx="1.9" ry="2.3" fill="#15100c" />
        <ellipse cx="37" cy="29" rx="1.9" ry="2.3" fill="#15100c" />

        {/* lentes */}
        {c.lentes && (
          <g stroke="#d4af37" strokeWidth="1.4" fill="none" opacity="0.9">
            <circle cx="27" cy="29" r="4.6" />
            <circle cx="37" cy="29" r="4.6" />
            <path d="M31.6 29h0.8" />
          </g>
        )}

        {/* bigote */}
        {c.bigote && (
          <path d="M25 35.5c2.5-1.6 4.8-1.6 7 0 2.2-1.6 4.5-1.6 7 0-2.3 2.2-4.6 2.4-7 1-2.4 1.4-4.7 1.2-7-1z" fill={c.pelo} />
        )}

        {/* barba */}
        {c.barba && (
          <path d="M20 31c0 9 5 14 12 14s12-5 12-14c0 6-5 9-12 9s-12-3-12-9z" fill={c.pelo} opacity="0.92" />
        )}

        {/* boca */}
        {!c.barba && (
          <path d="M28.5 37.5c2 1.6 5 1.6 7 0" stroke="#7a3a2a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}

        {/* aros */}
        {c.aros && (
          <>
            <circle cx="18.5" cy="31" r="2.2" fill="none" stroke="#e0b64a" strokeWidth="1.3" />
            <circle cx="45.5" cy="31" r="2.2" fill="none" stroke="#e0b64a" strokeWidth="1.3" />
          </>
        )}
      </g>

      {aro && <circle cx="32" cy="32" r="30" fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.55" />}
    </svg>
  );
}

export function Estrellas({ cantidad = 0, total = 5 }) {
  return (
    <span className="inline-flex gap-[1px]" aria-label={`Dificultad ${cantidad} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M5 0.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1L5 7.6 2.2 9.1l.6-3.1L.5 3.8l3.1-.4z"
            fill={i < cantidad ? '#d4af37' : '#3a4048'}
          />
        </svg>
      ))}
    </span>
  );
}
