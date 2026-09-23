# El dominó contra la PLANTILLA DE LA CASA

Puesta al día: **23-sep-2026** (plantilla del truco al 23-sep, la de las fichas 🆕).
Se compara ficha por ficha. «A medias» quiere decir que está la pieza pero le falta algo
de lo que dice la plantilla.

| Piso · ficha | Qué pide la plantilla | Estado | Dónde está en el dominó |
| --- | --- | --- | --- |
| **0.1** Dibujo barato | reglas de dibujo, nada que repinte por cuadro | ✅ hecho | `index.css` (efectos por opacidad), relojes una vez por segundo · §189 |
| **0.2** Medir antes de publicar | herramienta que cuente repintados | ✅ hecho | `frontend/scripts/perf/cuentas.mjs`, `traza.mjs` · dibujo 0–2 % a CPU 4× |
| **0.3** Peso | WebP, precarga, service worker | ✅ hecho | `public/sw.js`, fichas y dorsos en WebP (25,9 → 2,1 MB) |
| **1.1** Cuenta y sesión | registro, login, invitado | ⛔ a propósito | identidad ligera (§177); las cuentas llegan con la PAM |
| **1.2** Perfil y foto | retrato, nombre | 🟡 a medias | `IdentidadLigera.jsx` (nombre + 12 retratos); `Perfil.jsx` es el viejo de cuenta |
| **1.3** Instalar la app | tarjeta + link | 🟡 a medias | `InstalarApp.jsx` existe, no está en el umbral nuevo |
| **1.5** 🆕 Cartel de bienvenida | pizarra al crear cuenta | ⛔ espera | necesita cuentas (piso 1) |
| **2.1** Lobby y mesas | poner mesa, código, tablón | ✅ hecho | `Antesala.jsx`, `Tablon.jsx`, `MesaConSillas.jsx` · §188, §198 |
| **2.2** Las 4 reglas del enganche | candado, llamada, soltar, revancha | ✅ hecho | `RoomManager.js` (`candado`, `llamarALaMesa`, `soltarDeLaMesa`, `revancha`) · §191, §192 |
| **2.3** Reloj, gracia y cartel | reloj de turno, gracia, cartel sin conexión | ✅ hecho | `RELOJ` en `RoomManager.js`, `CartelSinConexion.jsx` (con los dos botones) · §191, §195, §199 |
| **2.4** Espectador | mirar una mesa en juego | ❌ falta | el tablón ya lista «jugándose ahora», sin MIRAR |
| **2.5** 🆕 Al mejor de 3/5 | serie con apuesta | ⛔ espera | necesita plata (piso 3) |
| **3.x** Plata, ventanilla, cajero | todo el dinero | ⛔ espera | se copia del ludo cuando cierre su R5 |
| **3.3** 🆕 Guardianes de la tanda | termómetro que avisa al socio | ✅ hecho hoy | `services/guardianes.js`, se ve en `/buzon` con la llave |
| **4.1** Puntos, ligas y escudos | ranking del juego | 🟡 a medias | `models/Ranking.js` + `Ranking.jsx` (podio, semana/siempre/torneos); sin ligas ni escudos |
| **5.1** Panas y retos | agregar pana, en línea, retar | 🟡 a medias | retos sí (`retosSocket.js`, también entre invitados); lista de panas no (es de la casa, piso 1) |
| **5.2** Chat de salón, mesa y panas | salón + burbujas + tira | ✅ hecho hoy | salón §196; mesa con las reglas del 23-sep: `mesaChat.js`, `ChatDeMesa.jsx` |
| **5.3** Emotes y voz | burlas por liga, voz | 🟡 a medias | stickers en la mesa (`Sticker.js`); sin voz, sin ligas |
| **6.1** Torneos | calendario propio, cuadro, walkover | 🟡 a medias | los de Jonathan (`services/torneos.js`, `Torneos.jsx`); sin piel de club, sin Relámpago |
| **7.1** Soporte y tickets | ticket-hilo con el socio | ❌ falta | el buzón hace de puerta mientras tanto |
| **7.2** Disputas con reporte copiable | libreta de la partida para el socio | 🟡 hecho hoy el lado del socio | `services/libreta.js`, `/disputas` con la llave; el botón del jugador espera A/B/C |
| **7.3** Anuncios de la casa | cartel del socio | ❌ falta | |
| **8.1** Config con perillas | toda perilla con su botón | ✅ hecho hoy | `models/Config.js` + `/config` con la llave (reloj, gracia, strikes, chat, guardianes) |
| **8.2** Mesas, partidas, tablero | admin del juego | ❌ falta | hay `/api/diag` en DEV y nada más |
| **8.3** Telegram del staff | avisos al socio | ⛔ espera | sin canal ni credenciales: los guardianes se ven en `/buzon` |
| **9.1** Batería | un comando, banco propio | ✅ hecho | `scripts/bateria.ps1` (15 etapas) · §199 |
| **9.2** Robots que juegan solos | enjambre | 🟡 a medias | `partida-entera.mjs` juega una partida; sin enjambre de carga |

## Lo que la plantilla no cubre y el dominó sí tiene

- El umbral con la receta de la casa y el dock de cinco puertas (§197).
- El buzón de ideas y fallas (§200), que en el truco es ficha 7.1 y aquí es puerta única.
- La casa torpe sutil medida (§199): una persona normal gana 71–73 %.
