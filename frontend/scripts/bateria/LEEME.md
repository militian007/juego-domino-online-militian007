# La bateria del domino (piso 9 de la plantilla de la casa)

Pruebas de punta a punta con navegadores de verdad (puppeteer-core + el Chrome
instalado), a tamano de telefono (375x812). Corren contra el juego levantado en
local: `backend` en 4000 y `frontend` en 5173. Cada script imprime un JSON con
lo que comprobo y deja fotos en `out/` (o en `DOMINO_OUT`).

Una vez: `npm i puppeteer-core` en esta carpeta. Las de cuentas necesitan dos
cuentas locales y sus fichas en `DOMINO_TOKEN`/`DOMINO_USER` y
`DOMINO_TOKEN2`/`DOMINO_USER2` (se sacan con `POST /api/auth/login`).

| Script | Que prueba | Seccion |
|---|---|---|
| `antesala.mjs` | tres invitados: armar 2v2, entrar por codigo, entrar por link, arranque solo, los tres en la partida | 188 |
| `antesala-casa.mjs` | sentarse sin tocar nada arranca contra la casa en 1v1 y 2v2 | 189 |
| `antesala-fantasma.mjs` | el dueno cierra el telefono: la mesa se borra y el pana vuelve | 189 |
| `reglas-de-la-mesa.mjs` | "estas?" con todos y con uno sin red, el candado, los tres strikes | 191 |
| `sin-conexion.mjs` | el cartel "se te cayo la conexion" sale, cuenta y se va (dos cuentas) | 191 |
| `revancha.mjs` | la revancha arma la mesa nueva con las mismas sillas | 192 |
| `fotos-mesa.mjs` | fotos de la mesa: 1v1, 2v2, controles, y el chat entre dos cuentas | 187 |
| `partida-entera.mjs` | juega contra la casa hasta el fin de la ronda, con fotos | 185 |

Las herramientas del telefono barato (piso 0) estan en `../perf/`. Las medidas
del motor (la culebra, las montadas, el destranque) en
`packages/domino-engine/tools/`. Las pruebas unitarias: `cd backend && npm test`
y `cd packages/domino-engine && npm test`.

Regla de la casa: nada de jugador ni de mesas se entrega sin esta bateria en
verde y sin las fotos a tamano real.
