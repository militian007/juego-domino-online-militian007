# Reglas del proyecto — Dominó Online

> Archivo de reglas para cualquier dev o IA que trabaje en este repo.
> El contexto largo y el historial de decisiones está en [contexto/README.md](contexto/README.md).

## 0. Objetivo actual (2026-08-24)

Terminar el **motor de dominó** y dejarlo **portable** para integrarlo en la plataforma
**https://privoytruco.com** (proyecto de otro dev del grupo). El motor vive en
`packages/domino-engine/` y **no puede depender** de Express, Socket.io, la base de datos
ni de nada de este repo.

- `packages/domino-engine/` → el producto que se entrega al equipo de PrivoyTruco.
- `backend/` + `frontend/` → banco de pruebas / cliente de referencia del motor.

## 1. Reglas de código

1. **NO comentar de más.** Código limpio; comentario solo si la lógica no se explica sola.
2. **NO usar emojis en el código** salvo que el usuario lo pida explícito.
3. **Español** en textos de UI y mensajes de error de cara al usuario. Identificadores en inglés.
4. **NO commitear**: `node_modules`, `.env`, `data.db*`, imágenes de `captures/`.
5. **NO commitear cambios sin haberlos visto corriendo en localhost.**
6. Cambios a `main` → Vercel y Render redespliegan solos.

## 2. Reglas del motor (obligatorias para que sea portable)

1. **Cero dependencias.** ESM puro, corre en Node 18+ y en el browser.
2. **Determinista.** Todo azar sale de una seed. Nada de `Math.random()` dentro del motor.
   La plataforma usa commit/reveal (`table:round_committed` / `table:round_revealed`), así que
   el reparto tiene que ser reproducible a partir de `seed`.
3. **Estado serializable.** `JSON.parse(JSON.stringify(state))` tiene que dar un estado válido.
   Sin clases con métodos en el estado, sin `Map`/`Set`/funciones dentro.
4. **Reducer puro.** `applyAction(state, action)` no muta: devuelve estado nuevo.
5. **El motor no sabe de red, ni de sockets, ni de usuarios.** Habla de `seat` (0..n-1), nunca de `socketId`.
6. **El bot no hace trampa.** Recibe únicamente `viewFor(state, seat)`, jamás el estado completo.
7. **Toda regla variable va en `config`**, no hardcodeada: puntos objetivo, doble-6/doble-9,
   con o sin pozo, equipos, quién sale.
8. **Nada de `setTimeout` ni delays dentro del motor.** Los tiempos los pone la capa de transporte.

## 3. Contrato con la plataforma PrivoyTruco

La plataforma ya tiene su protocolo definido (visto en el bundle de producción). El motor de
dominó se adapta a él, no al revés.

- Socket.io montado en `/api/socket.io`.
- Cliente → servidor: `table:action` con `{ tableId, action: { type, ...payload } }`.
- Servidor → cliente: `table:state`, `table:turn_deadline`, `table:turn_timeout`,
  `table:round_committed`, `table:round_revealed`, `table:peer_joined`, `table:peer_left`,
  `table:abandoned`, `table:error`, `table:emote_received`, `table:rematch_*`.
- Los `action.type` son **UPPER_SNAKE_CASE** (`PLAY_TILE`, `DRAW`, `PASS`).
- El estado lleva `phase`, `events[]` (cada evento con `kind`) y la lista de acciones legales.
- Los `event.kind` también son **UPPER_SNAKE_CASE** (`DEAL`, `PLAY_TILE`, `ROUND_END`, `GAME_END`).
- El formato de juego se registra como `gameFormat` versionado, estilo `"1v1-v2"` / `"2v2-v2"`.
  Para dominó: `domino-1v1-v1`, `domino-2v2-v1`.
- `targetPoints` lo manda la plataforma (los torneos lo traen en su payload). No asumir 100.

## 4. Reglas de dominó implementadas (venezolano, doble 6)

- 28 fichas, 7 por jugador.
- Sale el doble más alto de la primera mano; en manos siguientes sale quien ganó la anterior.
- Si nadie tiene doble, sale la ficha de más pips.
- Se juega por los dos extremos de la cadena.
- **1v1**: hay pozo. Si no puedes jugar, robas hasta poder o hasta vaciar el pozo; recién ahí pasas.
- **2v2**: sin pozo. Si no puedes jugar, pasas directo.
- **Tranque**: cuando todos pasan seguido. Gana el equipo con menos pips en mano.
- **Domino**: el que se queda sin fichas suma todos los pips que quedan en las manos rivales.
- Empate en tranque: nadie suma.
- Se juega a `targetPoints` puntos (por defecto 100).

## 5. Cómo correrlo en local

```bash
node --run dev --prefix backend    # o: cd backend && npm run dev   → :4000
cd frontend && npm run dev         # → :5173
```

Tests del motor:

```bash
cd packages/domino-engine && node --test
cd backend && node src/game/test.js
```

## 6. Archivos que NO se tocan sin preguntar

- `frontend/public/hero-table.png` — fondo de la landing.
- `frontend/public/tiles/*.png` — fichas recortadas a mano.
