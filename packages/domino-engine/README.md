# @privoytruco/domino-engine

Motor de dominó doble-6 determinista, sin dependencias, pensado para vivir dentro de la
plataforma **PrivoyTruco** al lado del motor de truco.

- **Cero dependencias.** ESM puro. Node 18+ y navegador.
- **Determinista.** Todo el azar sale de una `seed`. Sirve para commit/reveal.
- **Puro.** `applyAction(state, action)` devuelve un estado nuevo, no muta el anterior.
- **Serializable.** El estado es JSON plano: se guarda en Redis/Postgres y se restaura.
- **Sin red ni timers.** No sabe de sockets, usuarios ni `setTimeout`.
- **Bot honesto.** El bot recibe la misma vista filtrada que un jugador humano.

Para el detalle de cómo montarlo sobre el protocolo `table:*` de la plataforma, ver
[INTEGRATION.md](INTEGRATION.md).

## Instalación

```bash
npm install @privoytruco/domino-engine
```

O como dependencia local dentro del monorepo:

```json
{ "dependencies": { "@privoytruco/domino-engine": "file:../packages/domino-engine" } }
```

## Uso en 30 segundos

```js
import { createGame, applyAction, viewFor, chooseAction, PHASE } from '@privoytruco/domino-engine';

let state = createGame({
  gameFormat: 'domino-2v2-v1',
  seed: 'a3f9c1...',
  players: [
    { id: 'u1', name: 'Mili' },
    { id: 'u2', name: 'Bot', isBot: true },
    { id: 'u3', name: 'Kelvin' },
    { id: 'u4', name: 'Bot', isBot: true }
  ]
});

while (state.phase !== PHASE.GAME_OVER) {
  const view = viewFor(state, state.turn);
  const action = chooseAction(view, { difficulty: 'hard' });
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(result.error);
  state = result.state;
}

console.log(state.result);
```

## API

### `createGame({ gameFormat, seed, players, config })`

Devuelve el estado inicial con la primera mano ya repartida.

| campo | tipo | descripción |
|---|---|---|
| `gameFormat` | string | uno de `FORMATS` (ver abajo) |
| `seed` | string | semilla del match. Si se omite se genera una al azar |
| `players` | array | `{ id, name, isBot }` por asiento. Metadata opaca para el motor |
| `config` | object | overrides de reglas (`targetPoints`, `maxPip`, `hasPool`, ...) |

### `legalActions(state, seat) -> Action[]`

Todas las acciones legales para ese asiento. Array vacío si no es su turno.
Cada acción es un objeto plano con `type` en `UPPER_SNAKE_CASE`, listo para mandar por socket.

### `applyAction(state, action) -> { ok, state, events, error }`

Aplica la acción. **No muta `state`.** Si `ok` es `false`, `error` trae el motivo en español
y `state` vuelve sin cambios. `events` son solo los eventos nuevos que generó esta acción.

### `viewFor(state, seat, { sinceSeq }) -> View`

Vista filtrada para un asiento: su mano completa, el conteo de fichas de los demás y **nunca**
las fichas ajenas ni el contenido del pozo. Trae `actions` ya calculadas.

### `spectatorView(state, { sinceSeq }) -> View`

Igual pero sin ninguna mano y sin acciones.

### `serialize(state)` / `deserialize(json)`

Round-trip a JSON. `deserialize` valida `STATE_VERSION` y tira error si no coincide.

### `chooseAction(view, { difficulty, seed })`

Bot. `difficulty` es `'easy' | 'normal' | 'hard'`. Solo mira la vista, nunca el estado.
Con la misma `seed` y la misma vista devuelve siempre la misma jugada.

## Acciones

| `type` | payload | cuándo |
|---|---|---|
| `PLAY_TILE` | `{ seat, tileIndex, side, placement }` | jugar una ficha |
| `DRAW` | `{ seat }` | robar del pozo (solo si no tiene jugadas) |
| `PASS` | `{ seat }` | pasar (solo sin jugadas y sin pozo) |
| `START_NEXT_ROUND` | `{ seat }` | arrancar la mano siguiente |
| `TIMEOUT` | `{ seat }` | se acabó el reloj: el motor juega por él |
| `FORFEIT` | `{ seat }` | abandono: la partida se cierra a favor del rival |

`placement` es opcional en `PLAY_TILE`: si no viene, el motor elige la colocación más recta.

## Eventos

Cada acción agrega eventos al log `state.events`, con `seq` incremental para que el cliente
pida solo los nuevos (`viewFor(state, seat, { sinceSeq })`).

`DEAL` · `PLAY_TILE` · `DRAW` · `PASS` · `TIMEOUT` · `FORFEIT` · `ROUND_END` · `GAME_END`

## Formatos

| `gameFormat` | asientos | equipos | pozo |
|---|---|---|---|
| `domino-1v1-v1` | 2 | no | sí (14 fichas) |
| `domino-1v1bot-v1` | 2 | no | sí |
| `domino-2v2-v1` | 4 | sí (0-2 vs 1-3) | no |
| `domino-2v2bots-v1` | 4 | sí | no |

Cualquier regla se puede pisar con `config`: `targetPoints`, `maxPip` (doble-9 con `9`),
`tilesPerPlayer`, `hasPool`, `blockedScoring`, `nextRoundStarter`, `layout`.

## Reglas

- 28 fichas doble-6, 7 por jugador.
- Primera mano: sale el doble más alto; si nadie tiene doble, la ficha de más pips.
- Manos siguientes: sale el ganador de la anterior.
- **1v1**: hay pozo. Sin jugada, robás hasta poder o hasta vaciarlo; recién ahí pasás.
- **2v2**: sin pozo. Sin jugada, pasás directo.
- **Tranque**: todos pasan seguido. Gana el equipo con menos pips; suma la diferencia.
- **Dominó**: el que se queda sin fichas suma los pips que quedan en las manos rivales.
- Se juega a `targetPoints` (100 por defecto).

## Tablero

El motor no solo valida qué ficha encaja: también resuelve **dónde** va físicamente, sobre una
cuadrícula de 20x20. Cada ficha del tablero trae `{ x, y, x2, y2, orientation }`, y el motor
garantiza que ninguna colocación se solape ni se salga del grid. `computeBoardOffsets` da los
offsets de centrado de los dobles para que el cliente dibuje la cadena derecha.

Es una capa aparte (`./layout`): si el otro equipo quiere dibujar el tablero de otra forma,
puede ignorarla y usar solo `ends`.

## Tests

```bash
npm test
```

30 tests: determinismo, pureza del reducer, privacidad de la vista, invariantes de fichas
(nunca duplicadas ni perdidas), no solapamiento en el tablero, puntaje, timeout, abandono,
serialización y fuerza relativa de los bots.
