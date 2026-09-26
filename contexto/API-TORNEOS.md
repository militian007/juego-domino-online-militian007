# API de los torneos y el Relámpago (sección 211)

Contrato del servidor para la pantalla. Copia del truco, **sin plata**: el premio es la copa y
puntos de clasificación. Todo el cuadro vive en la base (`copa_torneos`, `copa_inscritos`,
`copa_cruces`, `copa_mesas`, `copa_ajustes`); un reinicio a mitad de torneo lo retoma.

Horas: siempre **ISO 8601 en UTC** (`"2026-09-26T23:00:00.000Z"`). La zona del Relámpago es
`America/Caracas` (los nombres «El Relámpago 7:00 p. m.» ya vienen en hora de Venezuela).

## Estados

| Cosa | Campo | Valores |
|---|---|---|
| Torneo | `estado` | `registration` (anotándose) · `live` (en juego) · `completed` · `cancelled` |
| Inscripción | `estado` / `registrationStatus` | `registered` (en el cuadro) · `ausente` (no llegó a la ventana) · `sin_cupo` (llegó, pero el cuadro se llenó) |
| Cruce | `estado` | `pending` (falta un jugador) · `ready` (los dos, sin mesa) · `playing` (con mesa) · `completed` · `bye` (no ocurre hoy) |
| Cruce | `motivo` (cómo cerró) | `partida` · `no_show` (walkover por plazo) · `cedio_el_cruce` (NO VOY) · `socio` |
| Torneo | `tipo` | `relampago` (lo publica la grilla) · `normal` (lo crea el socio) |

`tournament:updated` además usa `status: "armando"` mientras corre la ventana «siéntate ya».

## Identidad

- **Cuenta**: `Authorization: Bearer <jwt>` (el token de siempre). `userId` numérico.
- **Invitado** (identidad ligera): cabeceras `X-Guest-Id: guest-xxxxxx` y `X-Guest-Name: Nombre`
  (y opcional `X-Guest-Retrato: tigre`). Son los mismos valores del handshake del socket. En GET
  también vale `?guestId=`.
- En el cuadro todos los ids viajan como **texto** (`"42"`, `"guest-abc123"`, `"bot-copa-tigre"`).
  Los bots de la casa empiezan por `bot-copa-`; también llevan `esBot: true`.
- Sin identidad, los GET funcionan igual (vitrina abierta, `me` vacío). Los POST de jugador
  responden `401 { code: "sin_identidad" }`.

## El objeto Torneo (`serializar`)

```json
{
  "id": 7, "nombre": "El Relámpago 8:30 p. m.", "tipo": "relampago", "esRelampago": true,
  "estado": "registration", "empiezaEn": "2026-09-27T00:30:00.000Z",
  "puntos": 24, "cupo": 256, "minimo": 2, "relleno": true, "cuadroMinimo": 16, "botNivel": "persona",
  "premios": { "campeon": 100, "segundo": 50, "tercero": 25 }, "conTercerPuesto": true,
  "inscritos": 5,        // en el cuadro / anotados vivos (registered), bots incluidos
  "anotados": 7,         // personas que se anotaron (incluye ausente y sin_cupo)
  "terminadoEn": null,
  "campeon": null        // o { "userId": "42", "username": "Raúl", "esBot": false }
}
```

## Rutas del jugador — `/api/torneos`

### `GET /api/torneos` — la vitrina
Torneos en `registration` y `live`, y los `completed` de las últimas 48 h, del más próximo al
más lejano.
```json
{
  "torneos": [ { ...Torneo, "anotado": true,
                 "ventana": { "abierta": false, "hasta": null, "segunda": false } } ],
  "relampago": {
    "on": true,
    "proximaFranja": "2026-09-26T23:00:00.000Z",
    "serie": [ { ...Torneo, "anotado": false } ]   // los Relámpagos de HOY (día de Caracas)
  },
  "proximos": [...], "palmares": [...]              // SOLO para la pantalla vieja; no usar
}
```

### `GET /api/torneos/palmares?dias=7&limite=20&desde=0`
```json
{ "items": [ { "id": 7, "nombre": "...", "tipo": "relampago", "terminadoEn": "...",
               "campeon": { "userId": "42", "username": "Raúl", "esBot": false, "avatar": "tigre" },
               "podio": [ { "puesto": 1, "userId": "42", "username": "Raúl", "avatar": null, "esBot": false, "puntos": 100 },
                          { "puesto": 2, ... }, { "puesto": 3, ... } ] } ],
  "limite": 20, "desde": 0, "hayMas": false }
```

### `GET /api/torneos/mis-titulos?limite=24&desde=0` (identidad)
`{ "items": [ { "id", "nombre", "tipo", "terminadoEn", "puntos" } ], "limite", "desde", "hayMas" }`

### `GET /api/torneos/mios` (identidad)
`{ "anotado": [7, 9], "torneos": [ { "id", "nombre", "estado", "miEstado", "empiezaEn" } ] }`

### `GET /api/torneos/mesas-en-vivo` — mesas de torneo para mirar
```json
{ "mesas": [ { "code": "K3F9QZ", "empezada": true, "marcador": { "a": 12, "b": 7 }, "mano": 2,
               "espectadores": 3, "tournamentId": 7, "tournamentName": "...", "round": 3,
               "abiertaAlPublico": true, "playerA": "Raúl", "playerB": "El Tigre" } ] }
```
`abiertaAlPublico`: semifinal o final (el que no está anotado solo puede mirar esas).

### `GET /api/torneos/:id` — detalle
```json
{
  "torneo": { ...Torneo },
  "rondas": 4,
  "jugadores": [ { "userId", "username", "avatar", "esBot", "estado", "siembra", "puesto" } ],
  "cuadro": [ {
    "id": 31, "ronda": 1, "slot": 0,
    "a": { "userId": "42", "username": "Raúl", "avatar": null, "esBot": false, "siembra": 3 },
    "b": { ... } ,                       // null = todavía no se sabe
    "ganadorId": null, "estado": "playing",
    "siguienteId": 39, "siguienteLado": "A",   // a dónde pasa el ganador (null = final / 3.º)
    "tercerPuesto": false,               // true = el partido por el 3.º (ronda de la final, slot 1)
    "plazoEn": "2026-09-26T23:03:00.000Z",   // hasta cuándo hay para sentarse (null = ya arrancó)
    "presentes": { "a": true, "b": false },
    "segundaLlamada": false, "motivo": null,
    "marcador": null,                    // { a, b } final, cuando cerró jugando
    "mesa": { "code": "K3F9QZ", "empezada": false, "marcador": null, "mano": null, "espectadores": 0 }
  } ],
  "tercerPuesto": null,                  // { ganadorId, perdedorId } cuando cerró
  "podio": [ { "puesto": 1, "userId", "username", "avatar", "esBot", "puntos": 100 } ],
  "armado": { "abierta": false, "hasta": null, "segunda": false },   // ventana «siéntate ya»
  "anotados": 7,
  "me": {
    "registered": true, "registrationStatus": "registered",
    "puertaHasta": null,                 // ISO si soy ausente y la puerta sigue abierta
    "code": "K3F9QZ",                    // MI mesa viva: entrar con room:join { code }
    "cruce": { "id": 31, "ronda": 1, "plazoEn": "...", "rival": { ...persona },
               "presente": false, "prorrogaUsada": false, "segundaLlamada": false }
  }
}
```
La ronda 1 puede ser una **ronda previa** (cuadro que no es potencia de 2): unos juegan la
previa y otros («directos») esperan en la ronda 2. Nadie pasa gratis.

### `GET /api/torneos/:id/vivo` — solo marcadores (refrescar cada ~5 s)
`{ "ahora": "...", "mesas": [ { "cruceId", "code", "empezada", "marcador", "mano", "espectadores" } ] }`

### `POST /api/torneos/:id/register` (identidad; el invitado necesita nombre)
- `201 { ok: true }` · `200 { ok: true, yaEstaba: true }`
- `400 { code: "cerrada" }` (ya arrancó o pasó la hora) · `400 { code: "lleno" }`
- `400 { code: "sin_nombre" }` · `409 { code: "relampago_pendiente", error: "Termina el de las 7:00 p. m. primero…", pendienteId }` (uno a la vez)
- En el Relámpago se admite **overbooking** hasta `torneos.inscripcionTope` aunque el cupo sea menor.

### `POST /api/torneos/:id/unregister` (identidad)
`{ ok: true }` · `400` si ya arrancó.

### `POST /api/torneos/:id/voy` (identidad) — «guárdenme el puesto»
Queda escrito como presente y, **una vez por cruce**, corre el plazo `torneos.prorrogaMin`.
`{ ok: true, prorrogaMinutos: 3, deadlineAt: "..." }` · `404` sin mesa esperándote.

### `POST /api/torneos/:id/no-voy` (identidad) — ceder el cruce
El rival pasa en el acto (en un cuadro de eliminación, ceder = quedar fuera: preguntar antes).
`{ ok: true }` · `404` · `409`.

### `POST /api/torneos/:id/entrar-tarde` (identidad) — la puerta abierta
Solo Relámpago, solo `ausente`/`sin_cupo`, hasta `me.puertaHasta`. Toma el lugar de un directo
que espera la previa y juega contra él YA (le llega `tournament:table_ready`).
- `200 { ok: true, cruceId, rivalUserId }`
- `200 { ok: false, codigo: "ya_estas" }` · `409 { ok: false, codigo: "no_aplica" | "cerrada" | "no_inscrito" | "sin_hueco", error }`

## Rutas del socio — `/api/socio/torneos` (llave `DOMINO_BUZON_LLAVE`: `?llave=`, cuerpo `llave` o `X-Llave`)

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /` | — | `{ torneos: [Torneo] }` (todos, del más nuevo) |
| `POST /` | `{ nombre, empiezaEn (ISO o ms), puntos?: 24/50/100/150/200 (100), cupo?: 2..256 (32), relleno?: bool (true), cuadroMinimo?: 2..cupo (min(16,cupo)), minimo?: (2), premios?: [p1,p2,p3] (100,50,25), botNivel?: persona/casa/novato/facil/normal/dificil/maestro }` | `201 { ok, torneo }` |
| `POST /:id/cancel` | — | `{ ok, torneo }` (idempotente; no si ya terminó) |
| `POST /:id/fill-bots` | `{ cuantos? }` | `{ ok, agregados, cupo, inscritos }` (solo en `registration`) |
| `POST /:id/postpone` | `{ minutos }` 1..1440 | `{ ok, startAt }` |
| `POST /:id/matches/:matchId/walkover` | `{ ganadorId }` | `{ ok }` |
| `POST /:id/matches/:matchId/relaunch` | — | `{ ok, code }` (mesa nueva, plazo fresco) |
| `GET /relampago` | — | `{ relampago: Config }` |
| `PUT /relampago` | cambios parciales de `Config` | `{ ok, relampago: Config }` |

`Config` del Relámpago (nace **apagada**):
```json
{ "on": false, "modo": "gloria", "prendidoPor": null, "prendidoEn": null,
  "desdeFecha": null, "hastaFecha": null,           // temporada YYYY-MM-DD (Caracas), inclusive
  "desdeHora": 18, "desdeMinuto": 0, "hastaHora": 23, "hastaMinuto": 0,
  "cadaMinutos": 30,                                // tiene que dividir 1440
  "anticipacionHoras": 48, "cuadroMinimo": 16, "puntos": 24, "capacidad": 256,
  "botNivel": "persona",
  "premios": { "campeon": 100, "segundo": 50, "tercero": 25 },   // viven en perillas
  "proximaFranja": "..." }
```
`modo` es fijo (`gloria`). Prender (`on: true`) publica en el acto las franjas dentro de la
anticipación; apagar no borra lo ya publicado.

## Socket

### Servidor → cliente (a la sala `user:<id>` de cada identidad estable, o a todos)

| Evento | A quién | Carga |
|---|---|---|
| `tournament:table_ready` | los del cruce | `{ tournamentId, tournamentName, tableId, code, deadlineAt, round, totalRondas, rivalName, quedan, llamado: { title, body }, segundaLlamada }` — `code` es la sala: `room:join { code }` y la mesa arranca sola cuando están los dos. Con `segundaLlamada: true` (60 s más, una vez) el `totalRondas` viene en 0. |
| `tournament:updated` | todos | `{ tournamentId, status, ...extra }` — `status` = estado del torneo o `armando` (`{ hasta, parejas: false, segunda }`); al anotarse viene `anotados`. Es la señal para volver a pedir el detalle. |
| `tournament:armando` | los anotados | `{ tournamentId, hasta, parejas: false, segunda }` — «siéntate ya»: el cuadro se arma solo con los conectados cuando cierre. |
| `tournament:llegaste_tarde` | ausentes / sin cupo | `{ tournamentId, motivo: "ausente" \| "sin_cupo", proximoId, puertaAbierta, puertaHasta }` |
| `tournament:podium` | todos | `{ tournamentId, tournamentName, podio: [ { puesto, userId, username, avatar, esBot, puntos } ] }` |
| `tournament:recordatorio` | los anotados | `{ tournamentId, hito (min), title, body, startAt }` (a los 10 y a los 5 min) |
| `tournament:mesa_cerrada` | los sentados | `{ tournamentId, code, motivo }` — la mesa ya no cuenta (walkover, relanzada, cancelado). |
| `table:spectator_state` | quien mira | `{ code, tournamentId, round, vista, mesa }` — `vista` = `spectatorView` del motor (ninguna mano); `mesa` = la forma de `game:state` con `myHand: []` y sin jugadas. Llega en cada cambio. |
| `ranking:cambio` | premiados | `{ userId, antes, despues, cambio }` (los puntos del podio) |
| `notif:nueva` | cuentas | el aviso guardado en el buzón (tipo `torneo`) |

En la mesa del torneo, `game:state` trae además `torneo: { tournamentId, round, nombre }`.
La mano siguiente sale **sola** a los `torneos.siguienteManoMs` (6 s): no hace falta
«Siguiente». Irse de la mesa antes de que arranque no suelta la silla.

Viejos, solo para la pantalla de antes (no usar en la nueva): `torneo:partida`, `torneo:campeon`.

### Cliente → servidor

| Evento | Carga | Ack |
|---|---|---|
| `table:spectate` | `{ code }` | `{ ok: true }` o `{ ok: false, code: "NOT_SPECTATABLE" \| "NOT_ALLOWED" \| "NO_GAME", error }` — el anotado mira cualquier partida; los demás, solo semifinal y final. |
| `table:unspectate` | `{ code }` | `{ ok: true }` |
| `room:join` | `{ code }` | el de siempre; en una mesa de torneo, entrar = presentarse (queda escrito). |
| `torneo:anotarse` | `{ torneoId, anotarse }` | viejo; mejor el REST. |

## Reglas (lo que la pantalla debe contar)

- **Plazo para sentarse**: `torneos.presentacionMin` (3). Vencido: si los DOS se presentaron y
  no coincidieron, **segunda llamada** (60 s, una vez); si no, pasa el que vino; un bot nunca
  falta; si ninguno, la mejor siembra.
- **Quieto en la mesa del torneo**: 120 s sin una jugada propia (lo que juega la mesa por ti no
  cuenta) = pierde esa partida. Solo en torneos.
- **Relámpago**: a 24, una sola partida, se rellena con la casa hasta 16, se arma con los que
  están (ventana 60 s + segunda ventana), puerta abierta 180 s, uno a la vez, partido por el 3.º
  a la vez que la final. Premio: copa + 100/50/25 puntos (perillas).
- Un reinicio del servidor no hace perder a nadie: durante 4 min los plazos se empujan y las
  mesas se relanzan (el `code` cambia: la pantalla lo toma de `tournament:table_ready` o del
  detalle).
