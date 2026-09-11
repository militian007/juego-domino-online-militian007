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

/**
 * Cuanto se queda cada consejo en pantalla.
 *
 * Era 3600. Jonathan: *"a mi no me salen los consejos"*. Salian —comprobado,
 * disparan y caen dentro de la pantalla— pero duraban poco y eran una pastilla
 * chiquita y oscura abajo del todo, justo donde uno esta mirando sus fichas y
 * no un cartel.
 */
const MS_VISIBLE = 4600;

/** Se recuerda si ya jugo alguna vez, para el consejo de la primera partida. */
const LLAVE_PRIMERA = 'domino-ya-jugo';

/**
 * Si el Panita habla o no.
 *
 * Se apaga desde la solapa de la mesa y se recuerda, igual que el silencio: a
 * quien ya sabe jugar, un consejo cada ronda le sobra. Y quien lo apago no
 * quiere que vuelva solo la proxima vez.
 */
const LLAVE_APAGADOS = 'domino-sin-consejos';

export function consejosEncendidos() {
  try {
    return localStorage.getItem(LLAVE_APAGADOS) !== '1';
  } catch {
    return true;
  }
}

export function alternarConsejos() {
  const ahora = !consejosEncendidos();
  try {
    localStorage.setItem(LLAVE_APAGADOS, ahora ? '0' : '1');
  } catch {
    // Navegador sin almacenamiento: se queda encendido y listo.
  }
  return ahora;
}

function esPrimeraVez() {
  try {
    return localStorage.getItem(LLAVE_PRIMERA) !== '1';
  } catch {
    return false;
  }
}

function anotarQueYaJugo() {
  try {
    localStorage.setItem(LLAVE_PRIMERA, '1');
  } catch {
    // Navegador sin almacenamiento: se le vuelve a explicar y listo.
  }
}

/**
 * Saca los consejos que corresponden a este cambio de estado.
 *
 * Devuelve `{ clave, texto }`. La clave es lo que evita que se repita: dos
 * consejos con la misma clave en la misma ronda son el mismo consejo.
 */
const pozoDe = (e) => e?.poolCount ?? 0;

function consejosDelCambio(antes, ahora, { myTurn, miId }) {
  const salida = [];
  if (!ahora) return salida;

  const enJuego = ahora.status === 'playing';
  if (!enJuego) return salida;

  const mesa = ahora.board?.length ?? 0;
  const mesaAntes = antes?.board?.length ?? 0;

  // La primera vez que alguien juega, lo primero es COMO se pone una ficha.
  // Es el unico consejo que no sale del estado sino de si ya jugo antes.
  if (mesa === 0 && esPrimeraVez()) {
    salida.push({
      clave: 'primera-vez',
      texto: 'Tocá una ficha tuya y después el imán azul para ponerla'
    });
    anotarQueYaJugo();
  }

  // Quien sale, al empezar la ronda.
  if (mesa === 0) {
    salida.push(
      ahora.round > 1
        ? { clave: 'salida', texto: 'Sale quien ganó la ronda pasada' }
        : { clave: 'salida', texto: 'Sale el que tenga el doble más alto' }
    );
  }

  // Los dos extremos piden lo mismo. Pasa seguido y cambia como jugas: si
  // tenes esa ficha, entra por los dos lados.
  const ends = ahora.ends;
  if (mesa >= 2 && ends && ends.left === ends.right) {
    salida.push({
      clave: 'extremos-iguales',
      texto: `Los dos extremos piden ${ends.left}`
    });
  }

  // A alguien no le quedo mas remedio que pasar.
  const ultima = ahora.lastAction;
  if (ultima?.type === 'pass' && String(ultima.playerId) !== String(miId)) {
    const quien = ahora.players?.find((p) => String(p.id) === String(ultima.playerId));
    salida.push({
      clave: 'paso-alguien',
      texto: quien ? `${quien.username} no pudo jugar y pasó` : 'Tu rival no pudo jugar y pasó'
    });
  }

  // Quedan pocas en el monton: a partir de aca conviene guardarse las buenas.
  if (ahora.hasPool && pozoDe(ahora) > 0 && pozoDe(ahora) <= 3 && pozoDe(antes) > 3) {
    salida.push({ clave: 'pozo-poco', texto: 'Quedan pocas en el montón' });
  }

  // La partida se esta por definir.
  const objetivo = ahora.targetPoints ?? 100;
  const masAlto = Math.max(ahora.teamScores?.[1] ?? 0, ahora.teamScores?.[2] ?? 0);
  if (masAlto >= objetivo - 20 && masAlto < objetivo) {
    salida.push({ clave: 'cerca', texto: `Van ${masAlto} de ${objetivo}: esto se define ya` });
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

export function useConsejos(gameState, { myTurn, miId, encendidos = true }) {
  // La cola va en ESTADO, no en un ref con un `setInterval` mirandolo. La
  // primera version encolaba en un ref y un reloj de 150 ms lo vaciaba: en
  // cuanto el navegador frena los relojes (pestaña de fondo, telefono con la
  // pantalla apagada) el consejo salia tarde o no salia. Con estado, mostrar el
  // siguiente es consecuencia de que se fue el anterior, no de un reloj.
  const [cola, setCola] = useState([]);
  const anterior = useRef(null);
  const dichos = useRef(new Set());
  const ronda = useRef(null);
  const estabaEncendido = useRef(encendidos);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = gameState;

    // Al volver a encenderlos se olvida lo dicho. Si no, el que los apago y los
    // prende de nuevo en la misma ronda no ve NADA hasta la ronda siguiente, y
    // el interruptor parece roto.
    const seAcabaDeEncender = encendidos && !estabaEncendido.current;
    estabaEncendido.current = encendidos;
    if (seAcabaDeEncender) dichos.current = new Set();

    if (!gameState || !encendidos) return;

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
  }, [gameState, myTurn, miId, encendidos]);

  // El primero de la cola es el que se ve. Cuando se le acaba el tiempo se cae
  // de la cola, y el que sigue entra solo.
  const actual = encendidos ? cola[0] ?? null : null;

  useEffect(() => {
    if (!actual) return;
    const id = setTimeout(() => setCola((c) => c.slice(1)), MS_VISIBLE);
    return () => clearTimeout(id);
  }, [actual]);

  return actual;
}

/**
 * El Panita lo dice, en un globo de dialogo.
 *
 * Jonathan: *"prefiero que salga nuestra mascota oficial diciendolos en un
 * cuadro de dialogo, se ve mejor no crees?"*. Si: un consejo con dueño se lee
 * como alguien hablandote, y un cartel suelto se lee como una etiqueta del
 * sistema — y las etiquetas del sistema la gente las aprende a ignorar.
 *
 * ## Compacto a proposito
 *
 * El Panita mide 64 px y el globo no pasa de dos renglones. Una mascota grande
 * saltando cada media ronda tapa la mesa y cansa a los diez minutos; el freno
 * de verdad ya esta en el hook —cada consejo sale UNA vez por ronda— pero el
 * tamaño ayuda.
 *
 * El dibujo es el sticker que ya existe (`/stickers/panita.png`, §114): la
 * misma cara que la gente ve en el pase y en los menus. Nada dibujado a mano.
 */
export default function ConsejoDeMesa({ consejo, style }) {
  if (!consejo) return null;
  return (
    <div
      // `opacity: 1` a mano y no confiado a la animacion: si algun dia no corre,
      // el consejo tiene que verse igual.
      style={{ opacity: 1, ...style }}
      className="panita-entra pointer-events-none absolute inset-x-0 z-30 flex items-end justify-center gap-1.5 px-3"
    >
      <img
        src="/stickers/panita.png"
        alt=""
        aria-hidden="true"
        className="panita-saluda h-[64px] w-auto shrink-0 drop-shadow-[0_5px_10px_rgba(0,0,0,.75)]"
      />

      <div className="relative max-w-[268px]">
        {/* La colita del globo, apuntando al Panita. Es un cuadrado girado, no
            un dibujo: asi hereda el borde y el fondo del globo sin repetirlos. */}
        <span
          aria-hidden="true"
          className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-domino-accent/60 bg-domino-dark"
        />
        <p className="relative rounded-2xl border border-domino-accent/60 bg-domino-dark/97 px-4 py-2.5 text-[14px] font-semibold leading-snug text-domino-cream shadow-[0_6px_20px_rgba(0,0,0,.7)]">
          {consejo.texto}
        </p>
      </div>
    </div>
  );
}
