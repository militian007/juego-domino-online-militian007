/**
 * EL CUADRO, SIN BASE (seccion 211). Copia de `lib/tournaments/bracket.ts`,
 * `tercerPuesto.ts`, `puertaAbierta.ts` (la parte pura), `orchestrator.ts`
 * (los puestos y el walkover) y `recordatoriosReglas.ts` del truco, pasadas a
 * JS. Todo lo de aqui se prueba sin base: es lo delicado (quien pasa, quien
 * queda de que puesto, que dice el llamado) y en el truco costo plata cada vez
 * que se equivoco.
 *
 * Lo unico que cambia respecto del truco: aqui no hay series (bo3/bo5). El
 * dueno lo decidio: el Relampago del domino es a UNA partida de 24. El cruce
 * se cierra con la primera partida que se gana.
 */

/** Menor potencia de 2 que es >= n (minimo 2). */
export function nextPow2(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`nextPow2: n inválido (${n})`);
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

/** Mayor potencia de 2 que es <= n (minimo 2). */
export function prevPow2(n) {
  if (!Number.isInteger(n) || n < 2) throw new Error(`prevPow2: n inválido (${n})`);
  let p = 2;
  while (p * 2 <= n) p *= 2;
  return p;
}

/**
 * Orden de siembra estandar: el 1 y el 2 solo se cruzan en la final, el 1
 * enfrenta al peor. seedOrder(2)=[1,2]; al duplicar, cada x da [x, 2n+1-x].
 */
export function standardSeedOrder(size) {
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new Error(`standardSeedOrder: size debe ser potencia de 2 >=2 (${size})`);
  }
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2;
    const next = [];
    for (const x of order) {
      next.push(x);
      next.push(n + 1 - x);
    }
    order = next;
  }
  return order;
}

const clave = (ronda, slot) => `${ronda}:${slot}`;

/**
 * El plan del cuadro a partir de los ids YA ordenados por siembra (indice 0 =
 * siembra 1).
 *
 * NADIE PASA GRATIS (Raul, 23-ago en el truco): si la cantidad no es potencia
 * de 2, la llave es la potencia INFERIOR y los cupos que sobran se disputan en
 * una RONDA PREVIA (ronda 1). Con potencia exacta no hay previa.
 *
 * Cada cruce: { ronda, slot, a, b, bye, ganador, siguienteRonda,
 * siguienteSlot, siguienteLado, estado } con estado pending | ready | bye.
 */
export function generarCuadro(ids) {
  const n = ids.length;
  if (n < 2) throw new Error('generarCuadro: se requieren al menos 2 jugadores');
  if (new Set(ids).size !== n) throw new Error('generarCuadro: hay ids duplicados');
  if ((n & (n - 1)) !== 0) return generarConPrevia(ids);

  const tamano = nextPow2(n);
  const rondas = Math.log2(tamano);
  const orden = standardSeedOrder(tamano);
  const posiciones = orden.map((s) => (s <= n ? ids[s - 1] : null));
  const cruces = [];
  const porClave = new Map();

  const enlace = (ronda, slot) => (ronda >= rondas
    ? { siguienteRonda: null, siguienteSlot: null, siguienteLado: null }
    : { siguienteRonda: ronda + 1, siguienteSlot: Math.floor(slot / 2), siguienteLado: slot % 2 === 0 ? 'A' : 'B' });

  for (let slot = 0; slot < tamano / 2; slot++) {
    const a = posiciones[slot * 2] ?? null;
    const b = posiciones[slot * 2 + 1] ?? null;
    const presentes = [a, b].filter((p) => p !== null);
    if (presentes.length === 0) throw new Error(`generarCuadro: slot ${slot} de ronda 1 vacio`);
    const bye = presentes.length === 1;
    porClave.set(clave(1, slot), cruces.length);
    cruces.push({ ronda: 1, slot, a, b, bye, ganador: bye ? presentes[0] : null, estado: bye ? 'bye' : a && b ? 'ready' : 'pending', ...enlace(1, slot) });
  }
  for (let ronda = 2; ronda <= rondas; ronda++) {
    for (let slot = 0; slot < tamano / 2 ** ronda; slot++) {
      porClave.set(clave(ronda, slot), cruces.length);
      cruces.push({ ronda, slot, a: null, b: null, bye: false, ganador: null, estado: 'pending', ...enlace(ronda, slot) });
    }
  }
  for (const c of cruces) {
    if (c.ronda === 1 && c.bye && c.ganador) ponerEnElSiguiente(cruces, porClave, c, c.ganador);
  }
  recalcular(cruces);
  return { rondas, tamano, cruces };
}

/** Con ronda previa: ronda 1 = la previa; la llave real arranca LLENA en la 2. */
function generarConPrevia(ids) {
  const n = ids.length;
  const base = prevPow2(n);
  const previas = n - base;
  const directos = base - previas;
  const rondas = Math.log2(base) + 1;
  const orden = standardSeedOrder(base);
  const cruces = [];
  const posDeSiembra = new Map();
  orden.forEach((s, pos) => posDeSiembra.set(s, pos));

  // La previa k disputa el cupo de la siembra directos+1+k, con los ultimos
  // 2*previas del sorteo en pares seguidos: nadie queda sin rival.
  for (let k = 0; k < previas; k++) {
    const cupo = posDeSiembra.get(directos + 1 + k);
    cruces.push({
      ronda: 1, slot: k, a: ids[directos + 2 * k], b: ids[directos + 2 * k + 1], bye: false, ganador: null, estado: 'ready',
      siguienteRonda: 2, siguienteSlot: Math.floor(cupo / 2), siguienteLado: cupo % 2 === 0 ? 'A' : 'B'
    });
  }
  const jugadorEn = (pos) => (orden[pos] <= directos ? ids[orden[pos] - 1] : null);
  for (let slot = 0; slot < base / 2; slot++) {
    const esFinal = rondas === 2;
    cruces.push({
      ronda: 2, slot, a: jugadorEn(slot * 2), b: jugadorEn(slot * 2 + 1), bye: false, ganador: null, estado: 'pending',
      siguienteRonda: esFinal ? null : 3, siguienteSlot: esFinal ? null : Math.floor(slot / 2), siguienteLado: esFinal ? null : slot % 2 === 0 ? 'A' : 'B'
    });
  }
  for (let ronda = 3; ronda <= rondas; ronda++) {
    for (let slot = 0; slot < base / 2 ** (ronda - 1); slot++) {
      const esFinal = ronda === rondas;
      cruces.push({
        ronda, slot, a: null, b: null, bye: false, ganador: null, estado: 'pending',
        siguienteRonda: esFinal ? null : ronda + 1, siguienteSlot: esFinal ? null : Math.floor(slot / 2), siguienteLado: esFinal ? null : slot % 2 === 0 ? 'A' : 'B'
      });
    }
  }
  recalcular(cruces);
  return { rondas, tamano: base, cruces };
}

function ponerEnElSiguiente(cruces, porClave, c, ganador) {
  if (c.siguienteRonda == null) return;
  const sig = cruces[porClave.get(clave(c.siguienteRonda, c.siguienteSlot))];
  if (!sig) return;
  const lado = c.siguienteLado === 'A' ? 'a' : 'b';
  if (sig[lado] != null && sig[lado] !== ganador) throw new Error(`ponerEnElSiguiente: lado ${c.siguienteLado} ocupado`);
  sig[lado] = ganador;
}

function recalcular(cruces) {
  for (const c of cruces) {
    if (['bye', 'completed', 'playing'].includes(c.estado)) continue;
    c.estado = c.a != null && c.b != null ? 'ready' : 'pending';
  }
}

/** Aplica el ganador de un cruce del PLAN (puro, idempotente con el mismo ganador). */
export function aplicarResultado(plan, ronda, slot, ganador) {
  const cruces = plan.cruces.map((c) => ({ ...c }));
  const porClave = new Map(cruces.map((c, i) => [clave(c.ronda, c.slot), i]));
  const c = cruces[porClave.get(clave(ronda, slot))];
  if (!c) throw new Error(`aplicarResultado: no existe ${ronda}:${slot}`);
  if (c.ganador != null) {
    if (c.ganador !== ganador) throw new Error(`aplicarResultado: ${ronda}:${slot} ya cerrado con otro ganador`);
    return { ...plan, cruces };
  }
  if (ganador !== c.a && ganador !== c.b) throw new Error('aplicarResultado: el ganador no juega ese cruce');
  c.ganador = ganador;
  c.estado = 'completed';
  ponerEnElSiguiente(cruces, porClave, c, ganador);
  recalcular(cruces);
  return { ...plan, cruces };
}

/** El campeon del plan si la final ya cerro. */
export function campeonDelPlan(plan) {
  return plan.cruces.find((c) => c.ronda === plan.rondas && c.slot === 0)?.ganador ?? null;
}

// ------------------------------------------------------ el tercer puesto

export const SLOT_FINAL = 0;
export const SLOT_TERCER_PUESTO = 1;

/**
 * ¿Lleva partido por el 3.º? (Raul, 19-sep en el truco.) Si se premia el
 * tercer puesto y el cuadro tiene dos semifinales de verdad (ninguna es un
 * bye). Aqui «se premia» = el tercero tiene puntos.
 */
export function tercerPuestoAplica(premio3, plan) {
  if (!(Number(premio3) > 0)) return false;
  if (plan.rondas < 2) return false;
  const semis = plan.cruces.filter((c) => c.siguienteRonda === plan.rondas);
  return semis.length === 2 && semis.every((c) => !c.bye);
}

/** La ronda de la final: la mas alta entre los cruces sin siguiente. */
export function rondaFinalDe(cruces) {
  let r = 0;
  for (const c of cruces) if (c.siguienteId == null && c.ronda > r) r = c.ronda;
  return r;
}

/** ¿Este cruce (fila de la base) es el partido por el 3.º? */
export function esTercerPuesto(c, rondaFinal) {
  return c.siguienteId == null && c.ronda === rondaFinal && c.slot === SLOT_TERCER_PUESTO;
}

// ------------------------------------------------------ la puerta abierta

/**
 * Los directos que TODAVIA esperan a una previa (puertaAbierta.ts): cruce de
 * ronda 2 pendiente con un solo jugador, cuyo otro lado lo llena una previa
 * sin ganador y cuyo lado propio no lo alimenta ninguna previa. `cruces` son
 * filas de la base ({ id, ronda, a, b, ganador, estado, siguienteId, siguienteLado }).
 */
export function huecosDePuerta(cruces) {
  const previas = cruces.filter((c) => c.ronda === 1);
  const out = [];
  for (const c of cruces) {
    if (c.ronda !== 2 || c.estado !== 'pending' || c.ganador != null) continue;
    if ((c.a == null) === (c.b == null)) continue;
    const lado = c.a != null ? 'A' : 'B';
    const otro = lado === 'A' ? 'B' : 'A';
    const alimentaOtro = previas.find((p) => p.siguienteId === c.id && p.siguienteLado === otro);
    const alimentaDirecto = previas.some((p) => p.siguienteId === c.id && p.siguienteLado === lado);
    if (!alimentaOtro || alimentaOtro.ganador != null || alimentaDirecto) continue;
    out.push({ cruceId: c.id, lado, directo: c.a ?? c.b });
  }
  return out;
}

// ------------------------------------------------------ los puestos

/**
 * El orden final (deriveTournamentPlacements del truco). El 1.º y el 2.º se
 * LEEN de la final (el caso Cabito: nunca se deducen por siembra); el 3.º y
 * el 4.º salen del partido por el 3.º si lo hubo; el resto por la ronda en que
 * cayo (mas tarde = mejor) y la siembra. Un cruce que quedo sin terminar vale
 * como eliminacion en esa ronda (el caso 16rafa), y el inscrito que no aparece
 * en ningun cruce va de ultimo.
 *
 * `cruces`: filas con { id, ronda, slot, a, b, ganador, estado, siguienteId }.
 * `inscritos`: [{ userId, siembra }]. Devuelve [{ puesto, userId }].
 */
export function puestosDelCuadro(cruces, inscritos) {
  const siembraDe = new Map(inscritos.map((r) => [r.userId, r.siembra ?? Number.MAX_SAFE_INTEGER]));
  const rondaFinal = rondaFinalDe(cruces);
  const tercer = cruces.find((c) => esTercerPuesto(c, rondaFinal)) ?? null;

  const eliminado = new Map();
  const trabado = new Map();
  for (const c of cruces) {
    if (tercer && c.id === tercer.id) continue;
    if (c.estado !== 'completed' || !c.ganador) {
      for (const u of [c.a, c.b]) if (u) trabado.set(u, Math.max(trabado.get(u) ?? 0, c.ronda));
      continue;
    }
    const perdedor = c.ganador === c.a ? c.b : c.a;
    if (perdedor) eliminado.set(perdedor, c.ronda);
  }
  for (const [u, r] of trabado) if (!eliminado.has(u)) eliminado.set(u, r);

  const aparecio = new Set();
  for (const c of cruces) {
    if (c.a) aparecio.add(c.a);
    if (c.b) aparecio.add(c.b);
  }
  const INF = Number.MAX_SAFE_INTEGER;
  const orden = [...new Set(inscritos.map((r) => r.userId))].sort((x, y) => {
    const rx = eliminado.get(x) ?? (aparecio.has(x) ? INF : 0);
    const ry = eliminado.get(y) ?? (aparecio.has(y) ? INF : 0);
    if (rx !== ry) return ry - rx;
    return (siembraDe.get(x) ?? INF) - (siembraDe.get(y) ?? INF);
  });

  const final = cruces
    .filter((c) => c.siguienteId == null && c.ganador && !(tercer && c.id === tercer.id))
    .sort((a, b) => b.ronda - a.ronda || a.slot - b.slot)[0];
  const campeon = final?.ganador ?? null;
  if (campeon && orden[0] !== campeon) {
    const i = orden.indexOf(campeon);
    if (i > 0) orden.splice(i, 1);
    orden.unshift(campeon);
  }
  const finalista = final ? (final.ganador === final.a ? final.b : final.a) : null;
  if (finalista && orden[1] !== finalista) {
    const i = orden.indexOf(finalista);
    if (i >= 0) orden.splice(i, 1);
    orden.splice(1, 0, finalista);
  }
  if (tercer?.ganador) {
    const tercero = tercer.ganador;
    const cuarto = tercer.ganador === tercer.a ? tercer.b : tercer.a;
    for (const [puesto, u] of [[2, tercero], [3, cuarto]]) {
      if (!u) continue;
      const i = orden.indexOf(u);
      if (i >= 0) orden.splice(i, 1);
      orden.splice(Math.min(puesto, orden.length), 0, u);
    }
  }
  return orden.map((userId, i) => ({ puesto: i + 1, userId }));
}

/** ¿Termino? Cuando TODOS los cruces sin siguiente (la final y el 3.º) tienen ganador. */
export function cuadroTerminado(cruces) {
  const finales = cruces.filter((c) => c.siguienteId == null);
  return finales.length > 0 && finales.every((c) => c.ganador != null);
}

// ------------------------------------------------------ el walkover

/**
 * Quien pasa cuando la mesa no arranco (pickWalkoverWinner del truco, sin la
 * serie): 1) si exactamente UNA persona dio la cara, esa; 2) un bot nunca es
 * no-show (esta presente por definicion); 3) si siguen empatados, la mejor
 * siembra.
 */
export function elegirGanadorWalkover(candidatos, presentes, esBot, siembraDe) {
  const humanos = presentes.filter((u) => candidatos.includes(u) && !esBot(u));
  if (humanos.length === 1) return humanos[0];
  const conBots = [...new Set([...humanos, ...candidatos.filter((u) => esBot(u))])];
  if (conBots.length === 1) return conBots[0];
  return [...candidatos].sort((x, y) => (siembraDe(x) ?? Number.MAX_SAFE_INTEGER) - (siembraDe(y) ?? Number.MAX_SAFE_INTEGER))[0];
}

// ------------------------------------------------------ el llamado a la mesa

/**
 * EL LLAMADO (llamadoDeTorneo del truco, «el salon se va vaciando»): el aviso
 * sube de temperatura con el cuadro. En la ronda 1 manda el numero real de
 * inscritos (con previa, la potencia de 2 lo inflaba).
 */
export function llamadoDeTorneo(ronda, totalRondas, rival, minutos, participantes) {
  const faltan = Math.max(1, totalRondas - ronda + 1);
  const quedan = ronda === 1 && participantes && participantes > 1
    ? participantes
    : Math.min(2 ** faltan, 2 ** Math.max(1, totalRondas));
  const plazo = `Tienes ${minutos} min para sentarte.`;
  if (faltan === 1) return { title: 'Queda una mesa prendida', body: `Y es la tuya. ${rival} ya está avisado. ${plazo}`, quedan: 2 };
  if (faltan === 2) return { title: 'Quedan cuatro', body: `De tu mesa sale un finalista. Te toca contra ${rival}. ${plazo}`, quedan };
  if (ronda === 1) return { title: 'Se abrió el salón', body: `Entran ${quedan} y sale uno. Tu primera mesa es contra ${rival}. ${plazo}`, quedan };
  return { title: `Quedan ${quedan} de pie`, body: `Tu mesa está lista: te toca contra ${rival}. Gana y sigues. ${plazo}`, quedan };
}

// ------------------------------------------------------ los recordatorios

/** Ordena de mayor a menor, quita repetidos y descarta lo que no sirve. */
export function normalizarHitos(crudos) {
  const limpios = crudos.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(limpios)].sort((a, b) => b - a);
}

/**
 * Que hito toca avisar AHORA, o null. El mas CHICO ya vencido, y solo si es
 * menor al ultimo mandado: el de 5 nunca reabre el de 10.
 */
export function hitoQueToca(arrancaMs, hitos, yaAvisado, ahora = Date.now()) {
  const faltanMs = arrancaMs - ahora;
  if (faltanMs <= 0) return null;
  const faltanMin = faltanMs / 60_000;
  let elegido = null;
  for (const h of hitos) {
    if (h <= 0 || faltanMin > h) continue;
    if (elegido === null || h < elegido) elegido = h;
  }
  if (elegido === null) return null;
  if (yaAvisado != null && elegido >= yaAvisado) return null;
  return elegido;
}

/** La hora como la lee un venezolano: «8:30 pm». */
export function horaEnZona(cuando, zona = 'America/Caracas') {
  return new Intl.DateTimeFormat('es-VE', { timeZone: zona, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(cuando)
    .replace(/\s+/g, ' ')
    .replace(/\s*a\.\s*m\.\s*$/i, ' am')
    .replace(/\s*p\.\s*m\.\s*$/i, ' pm');
}

/** El texto del recordatorio. El ultimo hito deja de informar y apura. */
export function mensajeDelHito({ hito, esUltimo, nombre, hora, anotados }) {
  if (esUltimo) {
    return {
      title: hito === 5 ? 'Cinco minutos' : `Faltan ${hito} minutos`,
      body: `Ya casi arranca ${nombre}, a las ${hora}. Métete ahorita para que tu primera mesa no te agarre por fuera.`
    };
  }
  const gente = anotados > 1 ? ` Somos ${anotados} anotados;` : ' Estás anotado;';
  return { title: `Tu torneo empieza en ${hito} minutos`, body: `${nombre} arranca a las ${hora}.${gente} abre la app y quédate por acá.` };
}
