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
| Backend (producción) | `https://domino-backend-51mn.onrender.com` | Render free tier (con auto-ping keep-alive ⚡) |
| Repo | `https://github.com/militian007/juego-domino-online-militian007` | GitHub |

> 🤖 **Keep-Alive en Render:** Se implementó una rutina en `server.js` que detecta la variable `RENDER_EXTERNAL_URL` de Render y realiza un auto-ping HTTP (`/api/health`) cada 13 minutos una vez el servidor está activo. Esto evita que Render ponga la instancia gratuita a dormir por inactividad.

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
- **PostgreSQL** (Supabase) en producción, conectado mediante un pooler de conexiones en IPv4 (clúster `aws-1-us-east-2`, puerto `6543`).
- **SQLite** como base de datos local de desarrollo y fallback automático si se cae la conexión en la nube.
- **JWT** (`jsonwebtoken`) para auth
- **bcryptjs** para hashear passwords

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

## 9. Base de Datos (Supabase + Fallback SQLite)

El backend cuenta con una capa híbrida y resiliente configurada en [database.js](file:///c:/Users/JONAT/OneDrive/Desktop/mili/dev/juego%20de%20domino%20online/backend/src/config/database.js):
- **Producción (Render + Supabase):** Se conecta a una base de datos PostgreSQL en Supabase. Cuenta con un latido (*heartbeat*) automático de pings cada 2 minutos para evitar que la conexión se duerma o cierre.
- **Desarrollo Local y Fallback:** Si no se define `DATABASE_URL` o si la conexión a Supabase falla, el sistema hace fallback automáticamente a una base de datos SQLite local (`%APPDATA%/domino-online/data.db`), garantizando que el servidor nunca se caiga.

Estructura de las tablas `users` y `game_history`:
- **users:** `id` (Primary Key), `username` (Unique), `email` (Unique), `password_hash`, `games_played`, `games_won`, `created_at`.
- **game_history:** `id` (Primary Key), `room_code`, `winner_team`, `team1_score`, `team2_score`, `mode`, `played_at`.

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

**Animación de placement** (`index.css`):
- Solo el **último tile** colocado recibe la clase `.tile-placed`
- Animación: scale 0.3→1.15→1, rotate -15°→3°→0°, opacity 0→1, drop-shadow dorado
- Duración: 550ms `cubic-bezier(0.34, 1.56, 0.64, 1)`

---

## 12. Cambios Recientes (historial de commits)

```
44e9504  feat: add Render self-ping keep-alive routine to prevent service from sleeping
512b2b7  feat: Add database heartbeat ping and transparent SQLite fallback to prevent connection drops
f764323  style: Remove CSS brown leather border, leaving 100% green felt background
c824512  style: Use pure green felt background image and render brown leather border via CSS to ensure perfect aspect ratio framing
ff176d9  style: Crop outer wood floor from table background image and adjust board safety margins
7bb2938  feat: Add human placement delay, adjust unplayable tile dim brightness, and restrict board scale area to green felt
ab543bf  feat: Use high-res image slices for domino tiles on board and hand with accurate rotations
7d9a06c  feat: set board background image and deploy high-res sliced tiles and html viewer
0e29117  style: premium black and gold domino tiles design matching the landing page
6bc017c  feat: adjust bot turn delay order and add visual gold glow to newest tile
b53f764  docs: update TODO list with board fix completed and database configuration pending
d5085c6  feat: migrate database layer to support PostgreSQL on Render/Supabase
893badf  fix: domino layout positioning and stability
```

**Último deploy:** commit `44e9504` (2026-06-08)

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

## 15.## 16. TODOs / Próximos Pasos (ideas, no confirmadas)

- [x] **REHACER tablero** (Completado y optimizado con algoritmo de cuadrícula interactiva de 20x20)
- [ ] Implementar revancha después de partida terminada
- [ ] Sistema de ranking/ELO
- [ ] Chat en sala
- [ ] Reconnect con token después de desconexión (mejorar el actual que solo evita duplicar rooms)
- [x] Sonidos de fichas al jugarse
- [ ] Versión mobile-first de Game.jsx (todavía tiene elementos apretados en mobile)
- [ ] Modal de "rondas" o "tranque" cuando nadie puede jugar
- [x] **Configurar DATABASE_URL en Render (Supabase/Neon)** (Migrado exitosamente a Supabase PostgreSQL en producción con clúster aws-1)
- [ ] Dominó doble 9 (actualmente doble 6)
- [ ] Refactor del Bot.js (está funcional pero podría ser más competitivo)

---

## 17. ⭐ HISTORIAL DEL TABLERO (por qué está así)

El usuario quería mayor control y visualización exacta de las fichas sin que se escalaran a tamaños pequeños. Por esta razón, se descartó el sistema de figuras fijas (`serpiente`, `zigzag`, etc.) e implementamos una **Mesa Cuadriculada Interactiva de 20x20**:
- Las piezas se quedan a escala real fija (100% de su tamaño legible).
- Al seleccionar una ficha de la mano, se muestran siluetas doradas con el botón **"+"** en el extremo exterior de cada opción de colocación.
- El usuario hace clic en el extremo que prefiera, lo cual especifica su rotación y dirección con precisión de forma inequívoca.
- La cámara sigue el juego automáticamente con desplazamientos suaves (`smooth scrolling`).

---

## 18. Si entrás a este proyecto por primera vez

1. **Leé este README entero** (5 min).
2. **Corré `git log --oneline -20`** para ver el historial reciente.
3. **Mirá `frontend/src/pages/Landing.jsx`** para entender la estructura visual.
4. **Mirá `backend/src/sockets/gameSocket.js`** y `backend/src/game/DominoGame.js` para la lógica del grid de 20x20.
5. **Si vas a tocar el juego**: `frontend/src/components/game/` y `backend/src/game/`.

---

## 19. Rediseño del Tablero a Cuadrícula Interactiva (Grid 20x20) — 2026-06-08

### Características Clave:
1. **Posicionamiento Basado en Coordenadas**:
   - Cada pieza en `board` almacena sus coordenadas de cuadrícula `x, y` (valor de la mitad 0) y `x2, y2` (valor de la mitad 1), más su `orientation` (`'horizontal'` o `'vertical'`).
   - Las coordenadas de colocación se calculan dinámicamente y se validan en el servidor (`DominoGame.js`) para evitar colisiones y superposiciones.
2. **Bot Inteligente en Grid**:
   - El bot prefiere colocar las piezas en línea recta con respecto a la dirección de flujo de la cadena previa. Si se encuentra bloqueado o cerca de los bordes del grid de 20x20, gira de manera automática hacia cualquier otra dirección libre.
3. **Colocación Inequívoca y Sin Solapamientos**:
   - Las siluetas fantasma renderizan la visualización del dominó, pero el botón interactivo de click `"+"` se posiciona estrictamente en la celda exterior libre de cada opción.
   - Esto previene cualquier solapamiento en la celda de conexión, permitiendo al usuario decidir exactamente si desea colocar la ficha de forma horizontal o vertical.
4. **Cámara de Autocentrado**:
   - `Board.jsx` centra automáticamente la visualización del tablero en la última ficha jugada tras cada colocación mediante un deslizamiento animado suave (`smooth scroll`).

5. **Ajuste de Dimensiones de la Mesa**:
   - Se limitó el ancho máximo de la mesa de juego (`Board.jsx`) a `640px` (`max-w-[640px]`) y el contenedor de la tarjeta padre en el frontend (`Game.jsx`) a `672px` (`max-w-[672px]`) para encajar exactamente con las 20x20 cuadrículas (640x640px de espacio interior).
   - Esto evita que la mesa se estire en pantallas anchas y muestre espacios vacíos a los lados de la cuadrícula. En móviles, se mantiene al 100% de la pantalla con scroll horizontal.

**Última actualización:** 2026-06-11 (Alineación Centrada e Imanes Únicos en el Medio de Fichas Dobles)
**Mantenedor:** mili (militian007)
**Estado:** ✅ Servidor y frontend actualizados y probados con éxito localmente.

---

## 20. Alineación Centrada de Fichas en Dobles Perpendiculares (2026-06-11)

Corregimos el comportamiento de los imanes y la colocación física para fichas dobles ("damas") siguiendo la directriz exacta del usuario:
1. **Unión Centrada en el Medio:** Cuando una ficha no-doble se conecta perpendicularmente a una ficha doble (sea horizontal o vertical), la ficha debe quedar colocada exactamente en el centro de la pieza doble (sobre la línea de división de sus dos mitades), no a la izquierda, ni a la derecha, ni arriba, ni abajo de manera descentrada.
2. **Coordenadas Matemáticas Unificadas:** Ajustamos tanto el frontend (`Board.jsx`) como el backend (`DominoGame.js`) para que ambas opciones de imantación (Arriba/Abajo para dobles horizontales, Izquierda/Derecha para dobles verticales) utilicen exactamente la misma coordenada base (`Math.min` del doble) en el grid matemático en lugar de estar desfasadas por 1 celda. Esto alinea todo el resto de la cadena de dominó subsiguiente de forma recta y recta sin escalonamientos visuales.
3. **Exactamente 2 Imanes:** Se redujeron los imanes en dobles a exactamente 2 (uno a cada lado del centro de la ficha) alineados perfectamente con la línea divisoria de la ficha, previniendo visualizaciones duplicadas o descentradas en los extremos.
