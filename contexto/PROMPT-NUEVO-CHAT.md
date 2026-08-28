# PROMPT PARA CONTINUAR EN OTRO CHAT

> **Cómo usarlo:** copia TODO lo que hay debajo de la línea y pégalo como primer mensaje en el
> chat nuevo.
>
> Última actualización: **28 de agosto de 2026**.
> El chat nuevo lee el repo como esté en ese momento; para saber en qué punto estás,
> corre `git log -1 --oneline` en vez de fiarte de un commit escrito aquí.

---

Hola. Vamos a continuar un proyecto que ya está bastante avanzado. Lee esto completo antes de
tocar nada, y **no rehagas cosas que ya están hechas**: al final hay una lista de callejones sin
salida que ya se probaron y midieron.

## REGLA DE ORO

**Toda respuesta que me des tiene que empezar con mi nombre: `jonathan`.** Siempre.

## QUIÉN SOY Y CÓMO TRABAJO

Me llamo Jonathan (militian007). No soy programador de profesión: explícame en español claro y
dime **por qué** en una línea cada vez que tomes una decisión técnica. Hablo venezolano, escribo
rápido y con errores de tipeo; si algo no se entiende, pregunta.

Trabajo así: te muestro capturas y videos de lo que veo mal, y espero que **lo verifiques
corriendo**, no que adivines. Si algo está roto o a medias, dímelo derecho.

Mis reglas están en `CLAUDE.md` (raíz del repo). Las heredé de mis proyectos OLIMPO (`dev/appGym`)
y `dev/jpdevgames`. Resumen:

1. **`contexto/` siempre al día**, en el mismo commit que el código.
2. **Estructura ordenada**, nada suelto en la raíz.
3. **Pensado para escalar.**
4. **Seguridad máxima.** Ninguna clave visible, ningún dato de un usuario expuesto a otro.
5. **Todo se guarda en GitHub.**
6. **Móvil primero.** La mayoría entra desde el teléfono.
7. **Di la verdad.** No me digas que funciona si no lo probaste.
8. **El servidor manda.** El cliente nunca decide un resultado.
9. **Explícame en español y claro.**
10. **Mide antes de cambiar una regla de juego.** Nada de "creo que esto lo mejora": corre una
    simulación A/B de miles de manos y compara. Ya me equivoqué así una vez.

Además: **no comentar de más**, **nada de emojis en el código**, UI en español e identificadores
en inglés, y **no commitear sin haberlo visto corriendo en localhost**.

## EL PROYECTO

Juego de **dominó venezolano en línea**. El objetivo real no es el sitio: es terminar un **motor
de dominó portable** para que el equipo de mi grupo de programación lo integre en su plataforma
**https://privoytruco.com** (la hace otro dev; ahí estamos juntando varios juegos). El dominó es
mi parte.

- Carpeta: `C:\Users\JONAT\OneDrive\Desktop\mili\dev\juego de domino online`
- Repo: https://github.com/militian007/juego-domino-online-militian007
- Frontend en Vercel, backend en Render, base de datos en Supabase. Push a `main` redespliega solo.

**La arquitectura, y por qué importa:**

| Carpeta | Qué es |
|---|---|
| `packages/domino-engine/` | **El producto.** Lo que se le entrega a PrivoyTruco. |
| `backend/` | Banco de pruebas: Express + Socket.io + SQLite/Postgres. |
| `frontend/` | Cliente de referencia: React + Vite + Tailwind. |

El motor **no puede depender** de Express, Socket.io, la base de datos ni de nada de este repo.

**Lee estos archivos antes de proponer nada:**

| Archivo | Qué tiene |
|---|---|
| `CLAUDE.md` | Las reglas completas |
| `contexto/README.md` | El historial: 39 secciones, cada decisión con su porqué |
| `packages/domino-engine/README.md` | API del motor |
| `packages/domino-engine/INTEGRATION.md` | Cómo lo enchufa el equipo de PrivoyTruco |

## LAS 8 REGLAS DEL MOTOR (no se negocian)

1. **Cero dependencias.** ESM puro, Node 18+ y browser.
2. **Determinista.** Todo el azar sale de una `seed`. Nada de `Math.random()` dentro del motor
   (la plataforma usa commit/reveal, el reparto tiene que ser reproducible).
3. **Estado serializable.** `JSON.parse(JSON.stringify(state))` da un estado válido. Sin clases,
   sin `Map`/`Set`, sin funciones dentro.
4. **Reducer puro.** `applyAction(state, action)` no muta; devuelve `{ ok, state, events, error }`.
5. **No sabe de red ni de usuarios.** Habla de `seat` (0..n-1), nunca de `socketId`.
6. **El bot no hace trampa.** Solo recibe `viewFor(state, seat)`, jamás el estado completo.
7. **Toda regla variable va en `config`**, no hardcodeada.
8. **Nada de `setTimeout` dentro del motor.** Los tiempos los pone el transporte.

## CONTRATO CON PRIVOYTRUCO (el motor se adapta, no al revés)

- Socket.io en `/api/socket.io`.
- Cliente → servidor: `table:action` con `{ tableId, action: { type, ...payload } }`.
- Servidor → cliente: `table:state`, `table:turn_deadline`, `table:turn_timeout`,
  `table:round_committed`, `table:round_revealed`, `table:peer_joined`, `table:peer_left`,
  `table:abandoned`, `table:error`, `table:emote_received`, `table:rematch_*`.
- `action.type` y `event.kind` en **UPPER_SNAKE_CASE** (`PLAY_TILE`, `DRAW`, `PASS`, `DEAL`,
  `ROUND_END`, `GAME_END`).
- `gameFormat` versionado: `domino-1v1-v1`, `domino-2v2-v1`.
- `targetPoints` lo manda la plataforma. **No asumir 100.**

## LAS REGLAS DE DOMINÓ IMPLEMENTADAS

28 fichas, 7 por jugador. Sale el doble más alto en la primera mano; después sale quien ganó la
anterior. Si nadie tiene doble, la ficha de más pips. Se juega por los dos extremos.

- **1v1**: hay pozo. Si no puedes jugar, robas hasta poder o hasta vaciarlo; recién ahí pasas.
- **2v2**: sin pozo, pasas directo.
- **Tranque**: gana quien tenga menos pips y **suma los pips que le quedaron al rival**
  (no la diferencia — esto estuvo mal y se arregló).
- **Dominó**: el que se queda sin fichas suma los pips de las manos rivales.
- Empate en tranque: nadie suma.

## CÓMO CORRERLO Y PROBARLO

```bash
cd backend && npm run dev      # :4000
cd frontend && npm run dev     # :5173
```

```bash
cd packages/domino-engine && node --test    # 53 tests
cd backend && node src/game/test.js         # 69 tests
```

**Ahora mismo: 53/53 y 69/69 en verde.** Si tocas el motor, los 69 del backend son la red de
seguridad que prueba que el adaptador viejo sigue funcionando.

## LO QUE YA ESTÁ HECHO (no lo rehagas)

- **Motor extraído y portable**, con `createGame`, `applyAction`, `viewFor`, `playableMoves`,
  `placementsFor`, `explainPlacements`, `boardEnds`, `handPips`. Archivos: `rng.js`, `tiles.js`,
  `layout.js`, `rules.js`, `engine.js`, `bot.js`, `index.js`.
- **Trazado en serpentina.** La posición de cada ficha se calcula, no se elige: cada mitad de la
  cadena avanza en su propia franja y dobla de fila al llegar al borde. Una ficha legal SIEMPRE
  tiene lugar. El jugador elige el extremo, izquierdo o derecho, que es la única decisión real
  del dominó.
- **Los dobles en el borde ofrecen las dos direcciones** (arriba y abajo). Antes solo una, y eso
  hacía injugable el 46% de los dobles. Ahora 5.1%.
- **Se quitó la "banda de borde"**: se midió y causaba el 37% de los bloqueos. Bloqueos 18.2%→12.8%,
  trancas 49.2%→37.8%, y ninguna ficha se sale de la rejilla.
- **El tablero se escala, no scrollea**, con 2 celdas de margen (49px de aire en escritorio,
  28px en teléfono). Con 1 celda la cadena tocaba el borde: llega al extremo en el 51% de jugadas.
- **La mano se acomoda en varias filas** y achica las fichas cuando hay muchas.
- **Pozo elegible**: ves las fichas que quedan y eliges cuál robar.
- **Al cerrar la ronda se revelan las manos** y se desglosa el puntaje, para poder verificarlo.
- **Cinco bots con cara e identidad**: Nano (novato, 1 estrella), Doña Chela (fácil, 2), El Catire
  (normal, 3), La Comadre (difícil, 4), El Tigre (maestro, 5). Difieren en ruido y en tasa de
  jugada aleatoria. Los retratos son SVG generados por código (`Avatar.jsx`), 0 KB.
- **HUD** con sala, ronda, puntos, pozo y turno.
- **"¿Por qué no puedo jugar?"**: `explicarMano()` traduce el diagnóstico del motor a español.
  Se construyó porque yo reportaba "no me deja jugar el 4" y se adivinaba desde capturas.
- **Mesa temática elegible** por el jugador (color de paño y de borde), con textura de cuero real.
- **Cambio de clave**: pantalla `/cambiar-clave` y `backend/scripts/clave.js`.
- **La partida sobrevive al refresco y a salir de la app** (id de invitado estable, sala recordada
  en localStorage 6h, re-join al reconectar).
- **Arrastre en móvil arreglado**: la página ya no scrollea al arrastrar, y ya no se envía la
  jugada dos veces.

## NO REINTENTAR (ya se probó y se midió)

- **Heurística de "apertura"** para que el bot elija colocación: empeoró los bloqueos de
  32.4% a 44.1%. Revertida.
- **Regla de banda de borde**: quitada a propósito, ver arriba. No la reintroduzcas "por prolijidad".
- **Texturas de cuero por ruido fractal isotrópico** → parece estuco. **Por bandas anisotrópicas**
  → parece arpillera. Lo que funcionó fue **domain warping**. El generador está en
  `frontend/tools/gen_cuero.py`.
- **Elegir el lugar de la ficha con una heurística de "más aire"**: medido dos veces, empeora
  (29.9% -> 38.3% de fichas trancadas teniendo el número).
- **Relajar la regla anti-amontone**: no cambia nada (29.9% -> 29.8%) y ensucia la mesa.
- **Agrandar la mesa para destrabar**: ataca el 4% del problema. La causa era que la cadena se
  chocaba consigo misma, ya resuelto con el trazado en serpentina.
- **Costuras en el borde de la mesa**: se probaron dos veces (línea punteada y puntadas SVG), las
  dos horribles. Las fotos de referencia son de cuero liso. No lleva costura.

## CUIDADO CON ESTO

- **Nunca mandes el `state` completo al cliente.** Siempre `viewFor(state, seat)`.
- **Nunca confíes en un `seat` o un id de usuario que mande el cliente**; resuélvelo del token.
- **No commitees** `node_modules`, `.env`, `data.db*`, ni imágenes de `captures/`.
- **No toques sin preguntarme**: `frontend/public/hero-table.png` y `frontend/public/tiles/*.png`
  (esas fichas las recorté a mano).
- **No me pidas la `DATABASE_URL` de producción ni ninguna clave por el chat**, queda escrita para
  siempre en el historial. Para la clave existe `node backend/scripts/clave.js hash "miclave"`,
  que genera el hash y el SQL sin necesitar credenciales.
- **No crees cuentas en producción** para probar nada.
- En `Game.jsx` **todos los hooks van antes de cualquier `return` temprano**. Ya me tumbó la
  página en producción una vez (error #310 de React) y el build de Vite pasa igual, porque es
  error de tiempo de ejecución.

## PENDIENTE / IDEAS SIN DECIDIR

- Probar el refresco en **1v1 entre dos humanos** (solo se verificó contra el bot).
- Mesa de **24x24** en vez de 20x20: medido, bajaría bloqueos 13.5%→9.8% y trancas 37%→26%.
  No decidido.
- Fichas en **SVG** en vez de PNG: quitaría 3.8 MB. No decidido.
- **Selector de rival** antes de empezar.
- Correr en Supabase el SQL para arreglar mi clave de producción y borrar el usuario
  `probe-usuario-inexistente`.

## POR DÓNDE EMPEZAR

Salúdame, dime que leíste esto, y pregúntame en qué seguimos. No empieces a cambiar cosas por
tu cuenta.
