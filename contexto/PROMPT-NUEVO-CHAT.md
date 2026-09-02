# PROMPT PARA CONTINUAR EN OTRO CHAT

> **Cómo usarlo:** copia TODO lo que hay debajo de la línea y pégalo como primer mensaje en el
> chat nuevo.
>
> Última actualización: **2 de septiembre de 2026** (versión 0.0.54).
> El chat nuevo lee el repo como esté en ese momento; para saber en qué punto estás,
> corre `git log -1 --oneline` en vez de fiarte de un commit escrito aquí.

---

Hola. Vamos a continuar un proyecto que ya está muy avanzado. Lee esto completo antes de tocar
nada, y **no rehagas cosas que ya están hechas**: al final hay una lista de callejones sin salida
que ya se probaron y se midieron.

## REGLA DE ORO

**Toda respuesta que me des tiene que empezar con mi nombre: `jonathan`.** Siempre.

## QUIÉN SOY Y CÓMO TRABAJO

Me llamo Jonathan (militian007). No soy programador de profesión: explícame en español claro y
dime **por qué** en una línea cada vez que tomes una decisión técnica. Hablo venezolano, escribo
rápido y con errores de tipeo; si algo no se entiende, pregunta.

Trabajo así: te muestro capturas de lo que veo mal —muchas veces forzando el error a propósito— y
espero que **lo verifiques corriendo**, no que adivines. Si algo está roto o a medias, dímelo
derecho. Cuando te doy un número o un porcentaje, quiero que venga de una medición, no de una
impresión.

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
    simulación A/B de miles de manos y compara.

Además: **no comentar de más**, **nada de emojis en el código**, UI en español e identificadores
en inglés, y **no commitear sin haberlo visto corriendo en localhost**.

## REGLA DE ORO VISUAL (inquebrantable, la puse el 2026-09-02)

**Nada de dibujar a mano lo que ya existe hecho y mejor.** Nada de `<path d="...">` inventados a
ojo, nada de texturas de CSS, nada de gráficos improvisados.

- **Iconos monocromos: `lucide-react`** (instalado).
- **Iconos a color: set Fluent Emoji de Microsoft.** No se importa el paquete entero: hay un
  extractor, `frontend/tools/extraer-iconos.cjs`, que saca solo los que se usan a
  `src/components/iconosColor.js` (4 KB) y los pinta `IconoColor.jsx`. Para agregar uno, se edita
  `QUIERO` en ese script y se vuelve a correr.
- **Materiales y texturas: IA de imagen** (`nano_banana_pro`, 2K). **Ojo: el espacio de generación
  está en 0 créditos desde hace días.** Verifícalo con `balance` antes de prometerme una imagen.
- Si algo no se puede hacer con acabado profesional, **dímelo**, no me entregues algo a medias.

Ya me pasó tres veces: barandas de CSS ("basura"), ruido procedural ("qué horrible") e iconos SVG
escritos a mano ("se ven de Atari"). Cuando improvisas un gráfico, lo noto al instante.

## EL PROYECTO

Juego de **dominó venezolano en línea**. El objetivo real no es el sitio: es terminar un **motor de
dominó portable** para que el equipo de mi grupo lo integre en su plataforma
**https://privoytruco.com** (la hace otro dev; ahí estamos juntando varios juegos). El dominó es mi
parte.

- Carpeta: `C:\Users\JONAT\OneDrive\Desktop\mili\dev\juego de domino online`
- Repo: https://github.com/militian007/juego-domino-online-militian007
- Frontend en Vercel, backend en Render, base de datos en Supabase. Push a `main` redespliega solo.

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
| `contexto/README.md` | El historial, **hasta la sección 83**, cada decisión con su porqué y sus números |
| `packages/domino-engine/README.md` | API del motor |
| `packages/domino-engine/INTEGRATION.md` | Cómo lo enchufa el equipo de PrivoyTruco |

## LAS 8 REGLAS DEL MOTOR (no se negocian)

1. **Cero dependencias.** ESM puro, Node 18+ y browser.
2. **Determinista.** Todo el azar sale de una `seed`. Nada de `Math.random()` dentro del motor.
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
- `action.type` y `event.kind` en **UPPER_SNAKE_CASE**.
- `gameFormat` versionado: `domino-1v1-v1`, `domino-1v1bot-v1`, `domino-2v2-v1`,
  `domino-2v2bots-v1`.
- `targetPoints` lo manda la plataforma. **No asumir 100.**

## LAS REGLAS DE DOMINÓ IMPLEMENTADAS

28 fichas, 7 por jugador. Sale el doble más alto en la primera mano; después sale quien ganó la
anterior. Si nadie tiene doble, la ficha de más pips. Se juega por los dos extremos.

- **1v1**: hay pozo. Si no puedes jugar, robas hasta poder o hasta vaciarlo; recién ahí pasas.
- **2v2**: sin pozo, pasas directo. El compañero se sienta enfrente (asientos 0-2 y 1-3).
- **Tranque**: gana quien tenga menos pips y **suma los pips que le quedaron al rival**
  (no la diferencia).
- **Dominó**: el que se queda sin fichas suma los pips de las manos rivales.
- Empate en tranque: nadie suma.

## CÓMO CORRERLO Y PROBARLO

```bash
cd backend && npm run dev      # :4000
cd frontend && npm run dev     # :5173
```

```bash
cd packages/domino-engine && node --test    # 57 tests
cd backend && node src/game/test.js         # 87 tests
```

**Ahora mismo: 57/57 y 87/87 en verde**, versión 0.0.54. Si tocas el motor, los 87 del backend son
la red de seguridad que prueba que el adaptador sigue funcionando.

## CÓMO SE COLOCA UNA FICHA (esto es el corazón, entiéndelo antes de tocarlo)

**No hay trazado automático.** La colocación es **libre**: `placementsFor` genera las posiciones
posibles en una rejilla de 20x20 y el jugador arrastra la ficha adonde quiera. Hubo un intento de
trazado en serpentina y **lo mandé revertir**: "que se vea en varias líneas es un peo, la gente no
sabe por dónde va".

Cuando hay varias posiciones para la misma ficha, gana la que pase estos filtros **en este orden**,
que está medido y el orden importa más que cada regla por separado:

1. **Si el extremo es un doble, salir cruzado.** Un doble está acostado sobre la cadena; la cadena
   sale por sus costados, no por su mismo eje. Sin esto el doble quedaba "de pie" en el 22% de las
   jugadas (§76).
2. **`aperturaFutura`** — el "cerebro". Pone la ficha y pregunta, por cada punta, si todavía entra
   algo (cuatro sondas: normal y doble por punta). Gana la que deja el tablero más abierto.
   Va **primero** de los filtros de posición: medido, primero da 0,034% de fichas trabadas contra
   0,068% si va de último (§81).
3. **No pegarse al borde** de la mesa.
4. **Seguir derecho** (cruzado si el extremo es doble).
5. **`espacioEnLaPunta`** — casillas libres alrededor, solo para desempatar entre las que ya van
   derecho. **Si esto va antes que "seguir derecho", empeora** (0,61% → 0,90%) (§73).

Y hay una **pasada de rescate**: si a una ficha no le queda ni una casilla, se repasan las mismas
posiciones permitiendo que **roce** a una vecina que no es su enlace. Solaparse y salirse del
tablero se siguen rechazando siempre (§81).

**El número que importa:** "ficha trabada" = tengo una ficha que pega con una punta y el tablero no
me deja ponerla. Va en **0,060%**, una vez cada 1.673 turnos. Venía de 24,7%. Si tocas algo de la
colocación, **vuelve a medir esto** antes y después.

## CÓMO SE VE LA MESA

- **La cámara sigue a la cadena**, con escala fija. Las fichas **nunca cambian de tamaño** mientras
  juegas: eso lo rechacé y no se vuelve. La cámara se queda quieta el 91% de las jugadas.
- **La ventana muestra 21,5 celdas** (`ZOOM_FICHAS = 1.116` en `Board.jsx`). Ese número no es
  arbitrario: medido sobre 120.936 posiciones, es el mínimo con el que **no se sale ni una ficha
  de la pantalla, nunca**. Con 20,9 celdas todavía se salía el 0,10% (§82).
- **El marcador va fuera de la mesa**, arriba. La mesa es rectangular y los jugadores se sientan en
  sus bordes: compañero arriba, rivales a los costados. `Board` recibe `margenes` por los cuatro
  lados: ese es el rectángulo donde vive la cadena, y no se sale de ahí (§75).
- **Los controles** van en una solapa al borde izquierdo que arranca recogida (sonido, color de
  mesa, gestos). El **salir va aparte, arriba a la izquierda**, porque es lo único sin vuelta atrás.

## LO QUE YA ESTÁ HECHO (no lo rehagas)

- **Motor extraído y portable**: `rng.js`, `tiles.js`, `layout.js`, `rules.js`, `engine.js`,
  `bot.js`, `index.js`.
- **12 rivales de la casa**, 6 mujeres y 6 hombres, repartidos en las cinco dificultades
  (`backend/src/game/bots.js`). Sus retratos están en `frontend/public/avatares/*.svg`.
- **1v1 con bot, 2v2 con tres bots, 1v1 y 2v2 entre personas** con código de sala.
- **2v2 auditado**: 400 partidas, 97.663 turnos, once reglas comprobadas en cada turno, cero fallos.
- **"¿Por qué no puedo jugar?"**: `explicarMano()` traduce el diagnóstico del motor a español.
- **Pozo elegible**, **manos reveladas al cerrar la ronda** con el desglose del puntaje.
- **La partida sobrevive al refresco** y a salir de la app (sala recordada 6h, re-join).
- **App instalable (PWA)**: manifest, iconos, y pantalla completa al tocar jugar.
  Las pantallas usan **`svh`, no `dvh`**: con `dvh` salía scroll al recargar en el teléfono (§70).
- **El menú no scrollea en ningún teléfono**: se aprieta solo por escalones de alto (§69).
- **Un solo selector de modos** (`SelectorModos.jsx`) que usan la portada y el menú.
- **Logo** (`Logo.jsx`): dos fichas del propio juego cruzadas sobre el nombre. Dos variantes,
  apilada para la portada y en línea para la barra y el menú.

## NO REINTENTAR (ya se probó y se midió)

- **Trazado en serpentina.** Lo mandé revertir: la gente no entiende por dónde va la cadena.
- **Heurística de "apertura" o "más aire" como criterio principal** para elegir colocación: se
  probó cuatro veces y siempre empeora. Solo sirve **de desempate**, después de "seguir derecho".
- **Achicar la rejilla** para agrandar las fichas: medido con el motor actual, rejilla 16 multiplica
  por 20 las fichas trabadas (0,051% → 1,032%) para ganar 20% de tamaño (§82).
- **Subir el zoom de la mesa**: 1,116 es el techo. Más arriba se salen fichas de la pantalla (§82).
- **Texturas de cuero por ruido procedural**: parece estuco o arpillera. Y las barandas de CSS son
  "basura". La mesa buena es una imagen generada con IA (`mesa-nogal.webp`).
- **Costuras en el borde de la mesa**: probadas dos veces, las dos horribles.
- **`lucide-react` para los iconos de la mesa**: es monocromo de trazo y quedó "de Atari" a mis
  ojos. Para la mesa van los de color (Fluent Emoji).
- **La regla "no rozar otra ficha" como absoluta**: se relajó a propósito con la pasada de rescate.
  El test que decía que "nunca se tocan fichas fuera de la cadena" **ya no aplica** y se cambió por
  uno que comprueba que rozar sea raro y que montarse no pase nunca.

## CUIDADO CON ESTO

- **Nunca mandes el `state` completo al cliente.** Siempre `viewFor(state, seat)`.
- **Nunca confíes en un `seat` o un id de usuario que mande el cliente**; resuélvelo del token.
- **No commitees** `node_modules`, `.env`, `data.db*`, ni imágenes de `captures/`.
- **No toques sin preguntarme**: `frontend/public/hero-table.png` y `frontend/public/tiles/*.png`
  (esas fichas las recorté a mano, y son la base del logo).
- **No me pidas la `DATABASE_URL` de producción ni ninguna clave por el chat.** Para la clave existe
  `node backend/scripts/clave.js hash "miclave"`.
- **No crees cuentas en producción** para probar nada.
- En `Game.jsx` **todos los hooks van antes de cualquier `return` temprano**. Ya me tumbó la página
  en producción una vez (error #310 de React) y el build de Vite pasa igual.
- El **backend en Render se duerme**: la primera conexión puede tardar 30-50 segundos.

## PENDIENTE / SIN DECIDIR

- **Página de perfil**: ranking, historial de partidas, amigos, billetera para apostar, torneos,
  foto de perfil. Lo pedí y lo frenamos porque **billetera, torneos y ranking son cosas de la
  plataforma PrivoyTruco, no del motor**, y ese es el entregable real. Si se retoma: definir
  primero si la billetera es de fichas de juego o de dinero real (lo segundo no lo maneja este repo).
- **El tamaño de la ficha en 2v2** es de 20x10 px en un teléfono de 375, contra 29x15 en 1v1. La
  diferencia son las placas de los rivales de los costados, que se comen 120 px de los 347 del paño
  (el 35% del ancho). Ponerlas en las esquinas de arriba las devolvería (ficha ~31x15). Sin decidir.
- **Los 12 retratos son vectores dibujados a mano** (`frontend/tools/retratos.py`), hechos cuando no
  había crédito de IA. Los prompts para rehacerlos con IA están en `contexto/avatares-prompts.md`.
- **2v2 entre cuatro personas reales** sin probar (lobby de cuatro, elegir compañero, qué pasa si
  alguien se va).
- **Acotar el corrimiento visual de los dobles**: hoy la cadena dibujada necesita 22,5 celdas cuando
  la rejilla mide 20, porque el desplazamiento de los dobles se acumula. Acotarlo daría fichas más
  grandes gratis, sin tocar reglas.
- **Fichas en SVG** en vez de PNG: quitaría 3,8 MB. Sin decidir.

## POR DÓNDE EMPEZAR

Salúdame, dime que leíste esto, y pregúntame en qué seguimos. No empieces a cambiar cosas por tu
cuenta.
