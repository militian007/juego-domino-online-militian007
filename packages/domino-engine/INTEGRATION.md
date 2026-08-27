# Integración con PrivoyTruco

Guía para montar el dominó dentro de la plataforma, reusando el mismo transporte, lobby,
matchmaking, torneos, banca y chat que ya usa el truco.

> Escrito a partir del protocolo observado en el bundle de producción de `privoytruco.com`.
> Si algún nombre cambió del lado del servidor, lo que vale es el servidor: acá lo importante
> es **dónde encaja cada pieza**, no el nombre exacto.

---

## 1. La idea

El motor de dominó implementa el mismo contrato que ya cumple el de truco:

```
estado + acción  ->  estado nuevo + eventos
```

La plataforma no tiene que aprender nada de dominó. Solo:

1. crear la partida con una seed,
2. reenviar cada `table:action` al motor,
3. mandar a cada asiento su `viewFor(...)` por `table:state`.

Todo lo demás (reloj, reconexión, espectadores, abandono, revancha, torneos) ya lo resuelve
la plataforma, y el motor expone los ganchos para engancharlo.

---

## 2. Registrar el juego

Los torneos ya traen `gameFormat` versionado (`"1v1-v2"`, `"2v2-v2"`) y `targetPoints`.
El dominó se suma con sus propios formatos:

| `gameFormat` | asientos | `targetPoints` sugerido |
|---|---|---|
| `domino-1v1-v1` | 2 | 100 |
| `domino-2v2-v1` | 4 | 100 |

`targetPoints` lo manda la plataforma; el motor **no** asume 100:

```js
createGame({ gameFormat, seed, players, config: { targetPoints: tournament.targetPoints } });
```

En el registro de juegos de la plataforma alcanza con una entrada así:

```js
import * as domino from '@privoytruco/domino-engine';

registerGame({
  formats: ['domino-1v1-v1', 'domino-2v2-v1'],
  create: (o) => domino.createGame(o),
  apply: (s, a) => domino.applyAction(s, a),
  view: (s, seat, o) => domino.viewFor(s, seat, o),
  spectate: (s, o) => domino.spectatorView(s, o),
  bot: (view, o) => domino.chooseAction(view, o),
  isOver: (s) => domino.isTerminal(s),
  serialize: domino.serialize,
  deserialize: domino.deserialize
});
```

---

## 3. Provably fair: `table:round_committed` / `table:round_revealed`

El motor deriva **todo** el azar de `seed`. Cada mano usa `hash(seed + ":" + round)`, así que
publicando la seed al final cualquiera puede recalcular el reparto exacto y verificar que no
hubo mano puesta.

**Al crear la mesa:**

```js
import { randomSeed, commitSeed } from '@privoytruco/domino-engine';

const seed = randomSeed();
const commitment = await commitSeed(seed, tableId);

io.to(tableId).emit('table:round_committed', { tableId, round: 1, commitment });
```

**Al cerrar la partida:**

```js
io.to(tableId).emit('table:round_revealed', { tableId, seed, commitment });
```

El cliente verifica que `sha256(tableId + ":" + seed) === commitment` y puede reproducir el
reparto con `createGame({ gameFormat, seed, players })`.

> Guardá `seed` junto al match. Es lo único que hace falta para reconstruir la partida entera.

---

## 4. `table:action` -> el motor

El cliente ya manda `{ tableId, action: { type, ...payload } }`. Los `type` del dominó son
`UPPER_SNAKE_CASE`, igual que `CALL_TRUCO` o `PLAY_CARD`.

```js
socket.on('table:action', async ({ tableId, action }) => {
  const table = await tables.load(tableId);
  const seat = table.seatOf(socket.userId);
  if (seat == null) return socket.emit('table:error', { message: 'No estás en esta mesa' });

  const result = domino.applyAction(table.state, { ...action, seat });
  if (!result.ok) {
    return socket.emit('table:error', { tableId, message: result.error });
  }

  table.state = result.state;
  await tables.save(tableId, domino.serialize(table.state));

  broadcastState(table);
  scheduleTurnDeadline(table);
  await runBots(table);
});
```

**Importante:** el `seat` lo pone el servidor a partir de la sesión, nunca el cliente. El motor
rechaza cualquier acción fuera de turno, pero la identidad la resolvés vos.

---

## 5. `table:state` -> cada asiento ve lo suyo

`viewFor` ya filtra: mano propia completa, conteo de fichas ajenas, y nada del pozo. Nunca
mandes `table.state` crudo al cliente: ahí están todas las manos.

```js
function broadcastState(table) {
  for (const p of table.seats) {
    if (p.isBot || !p.socketId) continue;
    io.to(p.socketId).emit('table:state', domino.viewFor(table.state, p.seat, {
      sinceSeq: p.lastSeq ?? 0
    }));
    p.lastSeq = table.state.seq;
  }
  for (const s of table.spectators) {
    io.to(s.socketId).emit('table:spectator_state', domino.spectatorView(table.state));
  }
}
```

`sinceSeq` hace que `view.events` traiga solo lo nuevo, para animar sin recalcular el tablero
entero. En un `table:subscribe` (reconexión) mandá `sinceSeq: 0` y el cliente rearma todo.

La vista trae `actions` ya calculadas: el cliente no necesita saber las reglas para pintar los
imanes de colocación, solo recorrer `view.actions`.

---

## 6. Reloj: `table:turn_deadline` / `table:turn_timeout`

El motor no tiene timers. La plataforma decide cuándo se venció el turno y le avisa:

```js
function scheduleTurnDeadline(table) {
  clearTimeout(table.timer);
  if (table.state.phase !== 'playing') return;

  const seat = table.state.turn;
  const ms = table.state.config.turnMs;
  const deadline = Date.now() + ms;

  io.to(table.id).emit('table:turn_deadline', { tableId: table.id, seat, deadline });

  table.timer = setTimeout(() => {
    const r = domino.applyAction(table.state, { type: 'TIMEOUT', seat });
    if (!r.ok) return;
    table.state = r.state;
    io.to(table.id).emit('table:turn_timeout', { tableId: table.id, seat });
    broadcastState(table);
    scheduleTurnDeadline(table);
  }, ms);
}
```

`TIMEOUT` no castiga: juega automáticamente la mejor acción disponible (o roba, o pasa). Si
preferís penalizar al que se cuelga, contá los timeouts vos y mandá `FORFEIT` a los N.

---

## 7. Abandono: `table:abandoned`

```js
const r = domino.applyAction(table.state, { type: 'FORFEIT', seat });
table.state = r.state;
io.to(table.id).emit('table:abandoned', { tableId: table.id, seat, result: table.state.result });
```

`state.result.reason === 'forfeit'` y el marcador queda con el equipo rival en `targetPoints`,
para que la liquidación de banca y `/api/matches/last-forfeit` funcionen igual que en truco.

Ojo: `FORFEIT` cierra la **partida**, no la mano. Una desconexión corta no debería disparar
forfeit — para eso usá `present[seat]` y el reloj.

---

## 8. Bots (`botFill` de torneos)

Los torneos ya traen `botFill`. El bot del dominó recibe exactamente la misma vista filtrada
que un humano, así que no puede hacer trampa ni aunque quisiera:

```js
async function runBots(table) {
  while (table.state.phase === 'playing') {
    const seat = table.state.turn;
    if (!table.seats[seat].isBot) break;

    await sleep(table.botDelayMs);

    const view = domino.viewFor(table.state, seat);
    const action = domino.chooseAction(view, { difficulty: table.botDifficulty });
    const r = domino.applyAction(table.state, action ?? view.actions[0]);
    if (!r.ok) break;
    table.state = r.state;
    broadcastState(table);
  }
}
```

Fuerza medida (200 partidas por cruce, a 50 puntos):

| cruce | victorias |
|---|---|
| `hard` vs `easy` (2v2) | 69% |
| `normal` vs `easy` (2v2) | 61% |
| `hard` vs `normal` (2v2) | 51% |

Para mesas de plata usá `normal`; `easy` sirve para el tutorial y `hard` para torneos.

---

## 9. Persistencia y reconexión

El estado es JSON plano. Para Redis o Postgres:

```js
await redis.set(`table:${id}`, domino.serialize(table.state));
table.state = domino.deserialize(await redis.get(`table:${id}`));
```

Alternativa más barata: guardá solo `{ gameFormat, seed, config, players, actionLog }` y
reconstruí reproduciendo el log. Como el motor es determinista, el resultado es idéntico bit
a bit. Esto sirve además para replays y para auditar una partida reclamada.

En `table:subscribe` de un jugador que vuelve, mandale `viewFor(state, seat, { sinceSeq: 0 })`
y listo: el estado completo alcanza para redibujar todo.

`deserialize` valida `STATE_VERSION`. Si un día sube la versión, las mesas viejas tiran error
en vez de corromperse: manejá ese caso cerrando la mesa o migrando.

---

## 10. Dibujar el tablero

El dominó necesita más pintura que el truco: hay que ubicar cada ficha en la mesa. El motor ya
lo resuelve y manda coordenadas listas.

Cada entrada de `view.board` viene con:

```js
{ tile: [6, 3], x: 10, y: 10, x2: 11, y2: 10, orientation: 'horizontal', side: 'right', bySeat: 2 }
```

- Grid de 20x20 celdas (`view.layout.grid`), celda de 32px (`view.layout.cell`).
- Una ficha horizontal ocupa 2 celdas de ancho por 1 de alto; vertical al revés.
- Los dobles van perpendiculares a la cadena, y `computeBoardOffsets(board, layout)` da el
  desplazamiento de centrado para que la cadena se vea derecha.

Para los imanes de colocación, recorré `view.actions`: cada `PLAY_TILE` trae su `placement`
exacto. El cliente manda de vuelta ese mismo `placement` y no hay ambigüedad posible.

Si el equipo prefiere otro render (cadena lineal, zig-zag automático), puede ignorar
`layout`/`placement` por completo y usar solo `view.ends` — el motor sigue validando igual.

---

## 11. Chat, emotes y voz

No tocan el motor. `table:chat`, `table:emote` / `table:emote_received` y `table:voz` siguen
funcionando igual: son eventos de mesa, no de juego.

---

## 12. Checklist de integración

- [ ] `npm install @privoytruco/domino-engine` en el backend de la plataforma
- [ ] Registrar `domino-1v1-v1` y `domino-2v2-v1` en el registro de juegos
- [ ] Guardar `seed` por match y emitir `table:round_committed` / `table:round_revealed`
- [ ] Rutear `table:action` -> `applyAction` con el `seat` puesto por el servidor
- [ ] Emitir `table:state` con `viewFor` (nunca el estado crudo)
- [ ] Enganchar `table:turn_deadline` / `table:turn_timeout` con la acción `TIMEOUT`
- [ ] Enganchar abandono con `FORFEIT` y `table:abandoned`
- [ ] `botFill` -> `chooseAction` con la dificultad de la mesa
- [ ] Persistir `serialize(state)` y restaurar con `deserialize`
- [ ] Cliente: pintar el tablero con `view.board` + `view.layout`, imanes con `view.actions`
- [ ] Cliente: animar con `view.events` filtrados por `sinceSeq`

---

## 13. Errores comunes

**Mandar el estado crudo al cliente.** `table.state.hands` tiene todas las manos. Siempre
`viewFor`.

**Confiar en el `seat` del cliente.** Resolvelo desde la sesión.

**Mutar el estado.** `applyAction` devuelve uno nuevo; si guardás el viejo, perdés la jugada.

**Asumir 100 puntos.** Los torneos mandan `targetPoints`.

**Usar `Math.random()` para la seed en producción.** Usá `randomSeed()`, que va contra
`crypto.getRandomValues` cuando está disponible.

**Meter delays adentro del motor.** El "tiempo de pensar" del bot y la animación de la ficha
son cosa del transporte y del cliente, no de las reglas.
