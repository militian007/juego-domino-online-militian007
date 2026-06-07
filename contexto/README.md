# Contexto del Proyecto — Juego de Dominó Online

> **Para cualquier programador o IA que entre a este proyecto por primera vez:**
> Leé este archivo entero antes de tocar nada. Acá está TODO lo que necesitás saber para no romper lo que ya está andando.

---

## 1. ¿Qué es esto?

Un **juego de dominó online multiplayer** con 3 modalidades:
- **1 vs Bot** (práctica, sin registro, jugás solo contra la IA)
- **1 vs 1 Online** (con código de sala, pozo para robar)
- **2 vs 2 Online** (en equipos, sin pozo)

Inspirado en el dominó venezolano. La identidad visual apunta a "club privado" con dorado, verde de fieltro y serif.

**Owner / dev principal:** mili (alias `militian007` en GitHub).
**Repo:** https://github.com/militian007/juego-domino-online-militian007

> **Nota importante (2026-06-07):** El usuario está **insatisfecho con el diseño actual del tablero** ("sigue horrible"). Va a pedirle a otra IA que lo rehaga. **NO tocar `frontend/src/components/game/Board.jsx` ni `boardShapes.js`** sin entender primero qué se intentó y por qué no le gustó. Ver §17.

---

## 2. URLs y Deploy

| Servicio | URL | Plataforma |
|---|---|---|
| Frontend (producción) | `https://juego-domino-online-militian007.vercel.app` | Vercel (auto-deploy desde `main`) |
| Backend (producción) | `https://domino-backend-51mn.onrender.com` | Render free tier ⚠️ duerme tras 15 min idle (~30-50s cold start) |
| Repo | `https://github.com/militian007/juego-domino-online-militian007` | GitHub |

> ⚠️ **Cuidado:** el sufijo del backend es **`51mn`**, NO `81mn`. Si ves `81mn` en código viejo, es bug. La URL correcta es `domino-backend-51mn.onrender.com`.

**Variables de entorno en Render:**
- `JWT_SECRET=kX9p2mQvL7nB4wY8cR3jF6hT1sA5dG0uZ`
- `CLIENT_URL=https://juego-domino-online-militian007.vercel.app`

**Variable de entorno en Vercel (frontend):**
- `VITE_API_URL=https://domino-backend-51mn.onrender.com`

**ngrok:** totalmente abandonado. La IP `186.14.169.116` (Venezuela) está bloqueada por ngrok (ERR_NGROK_9040). No intentar de nuevo.

---

## 3. Stack Técnico

### Backend (`backend/`)
- **Node.js 24.14.1** (Render default)
- **Express 4.21** (HTTP REST)
- **Socket.io 4.8** (tiempo real, juego)
- **SQLite** vía `node:sqlite` (experimental, warning esperable en logs)
- **JWT** (`jsonwebtoken`) para auth
- **bcryptjs** para hashear passwords
- DB persistente en disco: `%APPDATA%/domino-online/data.db`

### Frontend (`frontend/`)
- **Vite 5.4** + **React 18.3**
- **React Router 6.27**
- **Socket.io-client 4.8**
- **Tailwind 3.4** con paleta custom (`domino.*`)
- **Axios** para REST
- **Google Fonts**: Cormorant Garamond (serif) + Inter (sans)
- **`vercel.json`** en la raíz de `frontend/` para SPA rewrite (sin esto, refresh de cualquier ruta da 404)

### Deploy
- **Vercel** para frontend (build automático)
- **Render free tier** para backend (duerme tras inactividad)

---

## 4. Estructura de Carpetas

```
juego de domino online/
├── backend/
│   ├── src/
│   │   ├── server.js                    # Entry point + presence tracking
│   │   ├── RoomManager.js               # CRUD de salas, broadcast, bot delay
│   │   ├── config/database.js           # SQLite init + schema
│   │   ├── controllers/authController.js
│   │   ├── middleware/auth.js
│   │   ├── models/User.js
│   │   ├── routes/auth.js               # POST /api/auth/register|login|me
│   │   ├── sockets/gameSocket.js        # io.use (auth + guest) + handlers
│   │   └── game/
│   │       ├── DominoGame.js            # Lógica de dominó
│   │       ├── Bot.js                   # IA del bot
│   │       └── Tile.js
│   ├── package.json
│   └── .env (no commit, ver env vars arriba)
│
├── frontend/
│   ├── public/
│   │   ├── hero-table.png               # ⚠️ IMAGEN DE LA LANDING (no borrar, no editar)
│   │   ├── banner-berkana.png
│   │   ├── banner-publicidad.png
│   │   └── favicon.svg
│   ├── vercel.json                      # ⭐ SPA rewrite (refresh fix)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                      # Rutas (sin PrivateRoute en /game)
│   │   ├── index.css                    # Tailwind + .bg-felt + .bg-felt-inset + .tile-placed animation
│   │   ├── pages/
│   │   │   ├── Landing.jsx              # ⭐ HERO IMAGE + botones reales + contador en vivo
│   │   │   ├── Login.jsx                # Respeta state.from para deep-link
│   │   │   ├── Register.jsx             # Idem Login
│   │   │   ├── Dashboard.jsx            # Auto-arranca si viene ?mode=
│   │   │   └── Game.jsx                 # Socket, tablero, mano, oponentes (con reconnect ref)
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── AdSidebar.jsx
│   │   │   ├── TopBanner.jsx
│   │   │   └── game/
│   │   │       ├── Board.jsx            # ⚠️ Tablero con shape functions
│   │   │       ├── boardShapes.js       # ⚠️ 5 shapes (L, Escalera, Cuesta, Gancho, Serpiente)
│   │   │       ├── Hand.jsx             # Mano del jugador
│   │   │       ├── OpponentHand.jsx
│   │   │       ├── PlayerInfo.jsx
│   │   │       ├── Scoreboard.jsx
│   │   │       ├── SidePicker.jsx       # Picker izq/der al jugar doble
│   │   │       └── Tile.jsx             # Ficha individual
│   │   ├── context/AuthContext.jsx      # user, login, register, logout
│   │   └── services/
│   │       ├── api.js                   # Axios instance
│   │       └── socket.js                # connectSocket(tokenOverride?)
│   ├── tailwind.config.js               # Colores domino.* + fonts
│   ├── index.html                       # Google Fonts link
│   └── package.json
│
├── captures/                            # Source images (referencias, no usadas en build)
│   ├── ORO.png                          # (vieja, no se usa)
│   ├── la landig buena.png              # Source de hero-table.png
│   ├── landing page.png                 # (vieja, no se usa)
│   ├── banner*.png
│   └── README.md
│
├── contexto/                            # ⭐ ESTE DIRECTORIO
│   └── README.md                        # Este archivo
│
├── INICIAR-DOMINO.bat                   # Script de inicio local (Windows)
├── README.md                            # README principal del repo
└── .gitignore
```

---

## 5. Sistema de Diseño (Tailwind + CSS)

### Colores (`tailwind.config.js`)
```
domino.dark:       #0a1414   (background principal, casi negro verdoso)
domino.felt:       #0d1f1c   (cards, contenedores)
domino.card:       #142b27   (cards más claras)
domino.accent:     #d4af37   (dorado principal, botones, títulos)
domino.accent-bright: #f5cf5c (hover de botones dorados)
domino.cream:      #f4ecd8   (texto principal claro)
domino.cream-dim:  #c9bfa3   (texto secundario)
domino.crimson:    #8b1a2b   (errores, no usado en Landing)
```

### Fonts
- `font-serif` → `"Cormorant Garamond", Georgia, serif` (títulos, logo)
- `font-sans` → `Inter, system-ui, sans-serif` (body, UI)

### Utilidades custom (`index.css`)
- `.bg-felt` → fondo con gradiente dorado sutil + textura noise SVG
- `.bg-felt-inset` → fondo de mesa de juego (verde más vivo + sombra inset)
- `.text-shadow-gold` → `text-shadow: 0 0 30px rgba(212, 175, 55, 0.4)`
- `.border-gold-glow` → box-shadow dorado
- `.border-gold-glow-hover` → hover dorado más intenso
- `.tile-placed` → `@keyframes tile-place` (pop-in scale 0.3→1.15→1, rotate -15→3→0, drop-shadow dorado, 550ms cubic-bezier)

### Componentes (`@layer components`)
- `.btn-primary` → botón dorado sólido
- `.btn-secondary` → botón secundario gris
- `.input-field` → input con focus dorado
- `.card` → contenedor de card estándar

---

## 6. Autenticación

### Registro / Login (REST)
```
POST /api/auth/register  { username, email, password }  → { token, user }
POST /api/auth/login     { username, password }          → { token, user }
GET  /api/auth/me        (Bearer token)                  → { user }
```

Token JWT guardado en `localStorage` con key `token`. User en `localStorage` con key `user`.

### Auth en Socket
- `io.use` middleware en `sockets/gameSocket.js`:
  - **Con token** → decodifica, setea `socket.userId`, `socket.username`, `socket.isGuest = false`
  - **Sin token** → setea `socket.userId = "guest-<sid>"`, `socket.username = "Invitado"`, `socket.isGuest = true`
- `room:create` rechaza guests si `mode !== '1v1bot'`
- `room:join` rechaza guests siempre (necesitás cuenta para unirte a sala de otro)

---

## 7. Modos de Juego

| ID | Nombre | Jugadores | Pozo | Requiere Auth | Auto-start |
|---|---|---|---|---|---|
| `1v1bot` | 1 vs Bot | 1 humano + 1 bot | Sí | No | Sí |
| `1v1` | 1 vs 1 Online | 2 humanos | Sí | Sí | No |
| `2v2` | 2 vs 2 Online | 4 humanos (2 equipos) | No | Sí | No |

**Flujos desde Landing:**
- Click en `1 VS 1` o `2 VS 2` (botones en la imagen):
  - Con sesión → `/dashboard?mode=X` → Dashboard auto-arranca `/game?mode=X`
  - Sin sesión → `/login` con `state.from = '/dashboard?mode=X'` → al loguear, Dashboard auto-arranca
- Click en `JUGAR` (top-right) → modal con las 3 opciones, mismo flujo
- Click en `LOGIN` → `/login` directo

**Practice (1v1bot) sin registro:**
- Click en `1 VS 1` o `JUGAR` → si elegís "PRACTICAR VS BOT" en el modal, vas directo a `/game?mode=1v1bot` sin pedirte cuenta
- El backend te marca como `isGuest: true`, `username: "Invitado"`

---

## 8. Socket Events (resumen)

### Cliente → Servidor
- `room:create` `{ mode }` → crea sala, devuelve `{ code, room }`
- `room:join` `{ code }` → une a sala existente
- `room:leave` `{ code }` → sale
- `room:start` `{ code }` → arranca partida (solo host o cuando está lleno)
- `game:play` `{ code, tileIndex, side }` → juega ficha
- `game:draw` `{ code }` → roba del pozo
- `game:pass` `{ code }` → pasa turno
- `game:next-round` `{ code }` → siguiente ronda

### Servidor → Cliente
- `presence:count` `{ total, loggedIn, guests }` → emitido en cada connect/disconnect
- `lobby:update` `room` → cambios en lobby (player join/leave)
- `game:state` `state` → estado completo del juego (board, hands, turn, **boardShape**)
- `game:action` → acción de un jugador (feedback visual)

---

## 9. Base de Datos (SQLite)

Tabla `users`:
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `username` TEXT UNIQUE NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL
- `games_played` INTEGER DEFAULT 0
- `games_won` INTEGER DEFAULT 0
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

Ruta: `%APPDATA%/domino-online/data.db` (en Windows). En Render es un filesystem efímero así que la DB se reinicia en cada deploy — está bien porque solo guarda users registrados, no hay datos críticos.

---

## 10. Landing Page (estado actual)

**Diseño:** Full-bleed con la imagen `hero-table.png` (copia de `captures/la landig buena.png`) como fondo. NO editar la imagen.

**Elementos React superpuestos:**
- **Top-left**: Logo "D.T" (serif, drop-shadow)
- **Top-right**: Botones `LOGIN` (outline, solo si no hay sesión) y `JUGAR` (solid, abre modal)
- **Centro-derecha**: Título serif grande "Domina el arte / del domino" + subtítulo + botones `1 VS 1` y `2 VS 2`
- **Bottom-left**: Links `Menu` y `Salir` (solo si hay sesión)
- **Bottom-right**: Pill negro con `{N} JUGADORES EN LÍNEA` (contador en vivo del socket)

**Posición del título:**
- Contenedor: `absolute inset-0 flex items-center justify-end`
- Padding derecho: `md:pr-[6%] lg:pr-[8%]` (respeta el borde sin pegarse)
- La "d" de "del domino" alineada bajo la "o" de "Domina" con `pl-2 sm:pl-4 md:pl-8 lg:pl-12`

**Paleta de botones dorados (`GoldButton` en `Landing.jsx`):**
- Solid: `bg-gradient-to-b from-domino-accent-bright to-domino-accent text-domino-dark shadow-lg shadow-amber-500/30`
- Outline: `border-2 border-domino-accent/80 text-domino-accent hover:bg-domino-accent hover:text-domino-dark bg-black/30 backdrop-blur-sm`

**Contador en vivo** (hook `useOnlineCount` en `Landing.jsx`):
- Conecta socket al montar
- Escucha `presence:count`
- Muestra `counts.loggedIn` (NO guests, solo logueados)

---

## 11. Formas del Tablero (5 shapes)

**⚠️ Estado actual:** El usuario está **insatisfecho con el diseño del tablero** y va a pedirle a otra IA que lo rehaga. Ver §17 para el historial completo de lo que se intentó.

Implementación actual en `frontend/src/components/game/boardShapes.js` y `backend/src/RoomManager.js`:

```js
// SHAPES array - IDs que el backend manda al cliente
['l', 'escalera', 'cuesta', 'gancho', 'serpiente']
```

| ID | Nombre | Patrón | Visual esperado |
|----|--------|--------|-----------------|
| `l` | L (Esquina) | 14H + 14V | Esquina de 90° |
| `escalera` | Escalera | 3H+1V × 7 | Escalera uniforme bajando |
| `cuesta` | Cuesta | 4H+1V+2H+1V+4H+1V+2H+1V+4H+1V+2H+1V+4H+1V (28) | Colina con bajadas irregulares |
| `gancho` | Gancho | 8H+6V+8H+6V | Zigzag con 2 bajadas grandes |
| `serpiente` | Serpiente | 2H+1V+3H+1V+2H+1V+3H+1V+2H+1V+3H+1V+2H+1V+3H+1V+1H (28) | Onda corta repetida |

**Limitación fundamental:** En dominó, una cadena simple solo puede girar 90° y solo en una dirección (no ramifica). Los nombres son **aspiracionales** — ninguna forma puede ser realmente una Cruz (+) o Cuadrado (□) o T con doble brazo porque requieren branching.

**Animación de placement** (`index.css`):
- Solo el **último tile** colocado recibe la clase `.tile-placed`
- Animación: scale 0.3→1.15→1, rotate -15°→3°→0°, opacity 0→1, drop-shadow dorado
- Duración: 550ms `cubic-bezier(0.34, 1.56, 0.64, 1)`

**Bot pacing** (`backend/src/RoomManager.js`):
- `await this._sleep(2500)` entre jugadas del bot (configurable)
- Historial: 800 → 1200 → 1800 → **2500** (actual)
- El usuario lo quiere aún más lento si la próxima IA refactorea esto

---

## 12. Cambios Recientes (historial de commits)

```
c92eab7  fix: backend usa los nuevos shape IDs (l, escalera, cuesta, gancho, serpiente)
18cb8dd  redesign: 5 formas honestamente distintas (L, Escalera, Cuesta, Gancho, Serpiente)
75b0c1c  fix: reconnect no duplica salas, Cruz mas horizontal, bot 2.5s
57fd0d0  fix: vercel.json SPA rewrite, 5 shapes, bot 1.8s
c51146c  fix: myPlayerId para guests (fallback a socket.userId, no user.id)
b0451c6  docs: contexto/ folder con README.md
264fb08  feat: alinea la d de 'del' bajo la o de 'Domina'
8f54331  fix: bug md:text-2xl, agranda contenedor
50097dc  feat: mesa de juego con fondo de fieltro verde realista
df26a07  feat: 5 board shapes + animacion + bot 1.2s
e3423fe  feat: Landing con imagen real, hotspots clickeables, conteo en vivo
b2b8783  feat: presence tracking (N jugadores en linea)
8698c6c  feat: 1v1bot sin registro, modal de modo en Landing, redir por deep-link
9318e26  ... más viejo
```

**Último deploy:** commit `c92eab7` (2026-06-07)

---

## 13. Cómo Correrlo en Local

### Backend
```bash
cd backend
npm install
# .env con JWT_SECRET y CLIENT_URL=http://localhost:5173
npm run dev   # nodemon, puerto 4000
```

### Frontend
```bash
cd frontend
npm install
# .env con VITE_API_URL=http://localhost:4000
npm run dev   # vite, puerto 5173
```

### Script de inicio rápido
Hay un `INICIAR-DOMINO.bat` en la raíz que probablemente levanta ambos (verificar antes de usar).

### Test rápido desde el celu
Render duerme tras 15 min, primer hit tarda 30-50s. El frontend en Vercel ya tiene configurado el proxy al backend.

---

## 14. Convenciones y Reglas del Proyecto

1. **NO commitear** `node_modules`, `.env`, `data.db`, archivos en `captures/` (excepto README)
2. **NO editar** `frontend/public/hero-table.png` (es la imagen de fondo de la Landing)
3. **NO cambiar el sufijo** del backend (`51mn`) sin actualizar la env var de Vercel
4. **Cambios se pushean a `main`** → Vercel y Render redespliegan automáticamente
5. **Comentar solo si es estrictamente necesario** (regla del dev: código limpio sin comentarios innecesarios)
6. **NO usar emojis en el código** salvo que el usuario lo pida explícitamente
7. **Hot reload**: Vercel tarda ~30s en redesplegar, Render ~30-50s en cold start
8. **NO commitear cambios sin haberlos visto en localhost** (el usuario prueba en producción directo, así que mejor previsualizar)

---

## 15. Reglas de UX que el usuario (mili) ya estableció

- **"No em hagas trabajar doble"**: hacer TODO lo posible de mi lado, evitar pedirle clicks innecesarios al usuario
- **"Si vas a poner algo encima de otra cosa, que se tape bien"**: cualquier overlay tiene que cubrir bien lo de abajo
- **"No quiero que dañes la imagen"**: las imágenes de referencia son sagradas, solo se superponen elementos React encima
- **"Quiero ver cómo se ve"**: prefiere iteración visual rápida a explicación teórica
- **Mensajes cortos**: respuestas concisas, sin floritura
- **Ajustes finos**: prefiere que le dé los valores exactos (clases de Tailwind) para que pueda tocar él mismo si quiere
- **"Sigue horrible / no me gusta"**: el feedback es honesto y rápido. Si algo no le gusta, lo dice y pasa a otra cosa. No pedirle que lo siga mirando si ya dijo que no.

---

## 16. TODOs / Próximos Pasos (ideas, no confirmadas)

- [x] **REHACER tablero** (Completado y optimizado con algoritmo de doble cadena estable y alineación exacta)
- [ ] Implementar revancha después de partida terminada
- [ ] Sistema de ranking/ELO
- [ ] Chat en sala
- [ ] Reconnect con token después de desconexión (mejorar el actual que solo evita duplicar rooms)
- [ ] Sonidos de fichas al jugarse
- [ ] Versión mobile-first de Game.jsx (todavía tiene elementos apretados en mobile)
- [ ] Modal de "rondas" o "tranque" cuando nadie puede jugar
- [ ] **Configurar DATABASE_URL en Render (Supabase/Neon)** (Código migrado a PostgreSQL por la IA, listo para conectar)
- [ ] Dominó doble 9 (actualmente doble 6)
- [ ] Refactor del Bot.js (está funcional pero podría ser más competitivo)

---

## 17. ⭐ HISTORIAL DEL TABLERO (por qué está así)

**El usuario ODIA el aspecto actual del tablero.** Va a pedirle a otra IA que lo rehaga. Acá está todo lo que se intentó:

### Intento 1: Shapes originales
- L, T, Cruz, Cuadrado, Serpiente — todos con bajadas de 1 ficha
- **Problema del usuario:** "se siguen viendo mal", "parecen escaleras"
- Las 5 formas eran visualmente idénticas: cadena horizontal con bajadas de 1

### Intento 2 (18cb8dd): Shapes rediseñados con bajadas más largas
- L: 14H + 14V (esquina real)
- Escalera: 3H+1V × 7 (escalera uniforme)
- Cuesta: bajadas irregulares
- Gancho: 8H+6V+8H+6V (zigzag)
- Serpiente: 2H+1V+3H+1V... (onda)
- **Problema del usuario:** "sigue horrible no haga mas nada se lo voy a pedir a otra ia"
- Captura de pantalla mostraba la Serpiente con patrón 3-derecha→1-abajo→5-derecha→1-abajo→3-derecha (todavía parece escalera)

### Conclusión
El usuario quiere **otra solución** que no sea shapes. Posibles direcciones que la próxima IA debería explorar:
1. **NO usar shapes predefinidos** — generar paths random por partida
2. **Cambiar completamente el rendering** — no chain visual, sino grid de 4 lados con slots
3. **Usar la imagen `hero-table.png` como fondo del tablero** (igual que en Landing) y colocar fichas sobre ella
4. **Renderizar en 2D con posiciones explícitas** (`x, y`) en vez de `shape(i) → row/col`
5. **Aceptar la limitación**: una cadena de dominó SOLO puede girar 90° en una dirección. La única forma de que se vea "distinta" es cambiando la longitud de los segmentos y el número de giros, no inventando formas imposibles (Cruz, T con doble brazo, Cuadrado)
6. **Mostrar la cadena en formato "spiral"** (espiral cuadrada hacia adentro) usando ambos extremos de la cadena para hacer giros en direcciones opuestas

### Archivos clave para que la próxima IA los lea
- `frontend/src/components/game/Board.jsx` — recibe `board` (array de tiles con `index`, `rotation`, `end`) y `boardShape` (id)
- `frontend/src/components/game/boardShapes.js` — define las 5 shape functions (NO las toques sin leer esto primero)
- `frontend/src/components/game/Tile.jsx` — renderiza una ficha individual
- `backend/src/RoomManager.js` línea ~92 — elige shape random: `const shapes = ['l', 'escalera', 'cuesta', 'gancho', 'serpiente'];`
- `backend/src/RoomManager.js` línea ~141 — `state.boardShape = room.boardShape;` (incluye en el state)

### Lo que SÍ gustó al usuario
- Landing completa (imagen + título + botones + contador en vivo)
- Deep-link desde Landing → Login → return
- Guest mode para 1v1bot (sin registro)
- Animación de placement de fichas (pop-in)
- Bot lento (2500ms)
- Reconnect fix (ya no se queda en "Preparando la partida...")

---

## 18. Si entrás a este proyecto por primera vez

1. **Leé este README entero** (5 min) — prestá atención a §17 si vas a tocar el tablero
2. **Corré `git log --oneline -20`** para ver el historial reciente
3. **Mirá `frontend/src/pages/Landing.jsx`** para entender la estructura visual
4. **Mirá `backend/src/sockets/gameSocket.js`** para entender el flujo de auth + salas
5. **Probalo en producción**: `https://juego-domino-online-militian007.vercel.app`
6. **Si vas a rehacer el tablero** (lo más probable que te pidan): NO usar la aproximación de `shape(i) → direction`. Considerá las 6 alternativas listadas en §17.
7. **Si vas a cambiar el diseño de la Landing**: las clases están en `Landing.jsx` líneas 200-250, el título está en el `<h1>` con `text-4xl sm:text-5xl md:text-6xl lg:text-7xl` y la imagen está en `frontend/public/hero-table.png`
8. **Si vas a tocar el juego**: `frontend/src/components/game/` y `backend/src/game/`

---

**Última actualización:** 2026-06-07 (sesión de redesign de shapes + handover a otra IA)
**Mantenedor:** mili (militian007)
**Estado:** ✅ Producción funcionando, juego testeado 1v1 online y 1v1bot
**⚠️ Pendiente:** Rehacer tablero (delegado a otra IA)
