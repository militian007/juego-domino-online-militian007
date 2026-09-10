import { useEffect, useRef, useState } from 'react';

/**
 * Los consejos que salen solos durante la partida.
 *
 * Punto 4 del plan de Domino Legends (§123): *"Consejos que salen solos en los
 * momentos clave. Barato y se nota mucho."* Ellos te dicen "el que tiene el
 * doble mas alto empieza" o "tu rival esta trancado y tiene que robar";
 * nosotros avisabamos poco y en seco.
 *
 * ## Dos cosas que este archivo NO hace
 *
 * 1. **No inventa nada.** Cada consejo sale de un cambio real del estado que
 *    manda el servidor: la mesa vacia, el pozo que baja, una mano que llega a
 *    una ficha. Si el estado no lo dice, no hay consejo.
 * 2. **No repite.** Cada consejo se muestra UNA vez por ronda. Un cartel que
 *    vuelve cada dos jugadas deja de leerse a los treinta segundos y pasa a
 *    estorbar, que es exactamente lo contrario de lo que se busca.
 */

/** Cuanto se queda cada consejo en pantalla. */
const MS_VISIBLE = 3600;

/**
 * Saca los consejos que corresponden a este cambio de estado.
 *
 * Devuelve `{ clave, texto }`. La clave es lo que evita que se repita: dos
 * consejos con la misma clave en la misma ronda son el mismo consejo.
 */
function consejosDelCambio(antes, ahora, { myTurn, miId }) {
  const salida = [];
  if (!ahora) return salida;

  const enJuego = ahora.status === 'playing';
  if (!enJuego) return salida;

  const mesa = ahora.board?.length ?? 0;
  const mesaAntes = antes?.board?.length ?? 0;

  // Quien sale, al empezar la ronda.
  if (mesa === 0) {
    salida.push(
      ahora.round > 1
        ? { clave: 'salida', texto: 'Sale quien ganó la ronda pasada' }
        : { clave: 'salida', texto: 'Sale el que tenga el doble más alto' }
    );
  }

  // El rival esta trancado y tiene que robar. Se sabe porque el pozo baja
  // cuando NO es tu turno: robar es lo unico que lo baja.
  const pozo = ahora.poolCount ?? 0;
  const pozoAntes = antes?.poolCount ?? pozo;
  if (pozo < pozoAntes && !myTurn) {
    const quien = ahora.players?.find((p) => p.id === ahora.currentPlayerId);
    salida.push({
      clave: 'rival-roba',
      texto: quien
        ? `${quien.username} no puede jugar y está levantando`
        : 'Tu rival no puede jugar y está levantando'
    });
  }

  // Se acabo el pozo: a partir de aca, el que no puede jugar pasa.
  if (ahora.hasPool && pozo === 0 && pozoAntes > 0) {
    salida.push({ clave: 'pozo-vacio', texto: 'Se acabó el montón: el que no puede, pasa' });
  }

  // Ultima ficha, tuya o de otro.
  const mias = ahora.myHand?.length ?? 0;
  const miasAntes = antes?.myHand?.length ?? mias;
  if (mias === 1 && miasAntes > 1) {
    salida.push({ clave: 'me-queda-una', texto: '¡Te queda una ficha!' });
  }

  for (const p of ahora.players ?? []) {
    if (String(p.id) === String(miId)) continue;
    const n = ahora.handCounts?.[p.id] ?? 0;
    const nAntes = antes?.handCounts?.[p.id] ?? n;
    if (n === 1 && nAntes > 1) {
      salida.push({ clave: `una-${p.id}`, texto: `A ${p.username} le queda una ficha` });
    }
  }

  return salida;
}

export function useConsejos(gameState, { myTurn, miId }) {
  // La cola va en ESTADO, no en un ref con un `setInterval` mirandolo. La
  // primera version encolaba en un ref y un reloj de 150 ms lo vaciaba: en
  // cuanto el navegador frena los relojes (pestaña de fondo, telefono con la
  // pantalla apagada) el consejo salia tarde o no salia. Con estado, mostrar el
  // siguiente es consecuencia de que se fue el anterior, no de un reloj.
  const [cola, setCola] = useState([]);
  const anterior = useRef(null);
  const dichos = useRef(new Set());
  const ronda = useRef(null);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = gameState;
    if (!gameState) return;

    // Ronda nueva: se olvida lo dicho, para que los consejos de salida vuelvan.
    if (ronda.current !== gameState.round) {
      ronda.current = gameState.round;
      dichos.current = new Set();
    }

    const nuevos = consejosDelCambio(antes, gameState, { myTurn, miId }).filter((c) => {
      if (dichos.current.has(c.clave)) return false;
      dichos.current.add(c.clave);
      return true;
    });

    if (nuevos.length) setCola((antes2) => [...antes2, ...nuevos]);
  }, [gameState, myTurn, miId]);

  // El primero de la cola es el que se ve. Cuando se le acaba el tiempo se cae
  // de la cola, y el que sigue entra solo.
  const actual = cola[0] ?? null;

  useEffect(() => {
    if (!actual) return;
    const id = setTimeout(() => setCola((c) => c.slice(1)), MS_VISIBLE);
    return () => clearTimeout(id);
  }, [actual]);

  return actual;
}

export default function ConsejoDeMesa({ consejo, style }) {
  if (!consejo) return null;
  return (
    <div
      style={style}
      className="burbuja-entra pointer-events-none absolute inset-x-0 z-30 flex justify-center px-6"
    >
      <span className="rounded-full border border-domino-accent/35 bg-black/80 px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-domino-cream shadow-lg backdrop-blur-sm">
        {consejo.texto}
      </span>
    </div>
  );
}
