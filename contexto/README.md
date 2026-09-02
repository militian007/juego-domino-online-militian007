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
fc39456  Corregir el calculo de coordenadas de imanes laterales en dobles en los bordes para evitar solapamientos
9ec53c2  Permitir imanes a los lados en fichas dobles en los bordes y control de limites sensible a la orientacion
9b9f44f  Restringir la colocacion de fichas en los limites externos del tablero para evitar bloqueos
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

**Último deploy:** commit `fc39456` (2026-06-11)

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

**Última actualización:** 2026-06-11 (Margen Perimetral e Imanes de Dobles Laterales en Bordes)
**Mantenedor:** mili (militian007)
**Estado:** ✅ Servidor y frontend actualizados y probados con éxito localmente.

---

## 20. Alineación Centrada de Fichas en Dobles Perimetrales (2026-06-11)

Corregimos el comportamiento de los imanes y la colocación física para fichas dobles ("damas") siguiendo la directriz exacta del usuario:
1. **Unión Centrada en el Medio:** Cuando una ficha no-doble se conecta perpendicularmente a una ficha doble (sea horizontal o vertical), la ficha debe quedar colocada exactamente en el centro de la pieza doble (sobre la línea de división de sus dos mitades), no a la izquierda, ni a la derecha, ni arriba, ni abajo de manera descentrada.
2. **Coordenadas Matemáticas Unificadas:** Ajustamos tanto el frontend (`Board.jsx`) como el backend (`DominoGame.js`) para que ambas opciones de imantación (Arriba/Abajo para dobles horizontales, Izquierda/Derecha para dobles verticales) utilicen exactamente la misma coordenada base (`Math.min` del doble) en el grid matemático en lugar de estar desfasadas por 1 celda.
3. **Exactly 2 Imanes:** Se redujeron los imanes en dobles a exactamente 2 (uno a cada lado del centro de la ficha) alineados perfectamente con la línea divisoria de la ficha, previniendo visualizaciones duplicadas o descentradas en los extremos.
4. **Propagación por Segmentos de Fichas:** Implementamos un algoritmo recursivo de caminata en `Board.jsx` (`getVisualCoords` y `getGhostVisualCoords`) de modo que el desfase de centrado de `16px` no solo se aplique a la ficha normal directamente adyacente a la dama, sino que se propague a lo largo de todo el segmento de fichas normales de la misma orientación en ese extremo. Esto mantiene la cadena completamente recta sin desfases laterales, mientras que las fichas paralelas tradicionales calzan de forma 100% precisa.
5. **Solución a Caídas del Servidor:** Eliminamos una referencia a una variable inexistente (`lastTile`) en el método de cálculo de colocaciones del backend que provocaba un `ReferenceError` y tiraba el servidor de sockets al jugar en el extremo derecho.

---

## 21. Margen de Seguridad Dinámico y Conexiones Laterales para Dobles en el Borde (2026-06-11)

Implementamos un sistema de control de límites geométrico y habilitamos la jugabilidad en los extremos de las fichas dobles situadas en el perímetro de la mesa de juego para evitar bloqueos:
1. **Límites de Cuadrícula Sensibles a la Orientación:** Las fichas normales y dobles ahora solo pueden colocarse en la fila/columna exterior (fila 0/19, columna 0/19) si corren **paralelas al borde** (orientación horizontal para los bordes superior/inferior, y orientación vertical para los bordes izquierdo/derecho). Las fichas perpendiculares al borde se bloquean, obligando al autogiro a actuar antes de colisionar físicamente con los límites.
2. **Imanes de Dobles Laterales Perimetrales:** Si una ficha doble ("dama") cae exactamente en la fila o columna exterior (donde la lógica perpendicular estándar la dejaría sin jugadas válidas), el juego habilita automáticamente imanes en sus extremos laterales (izquierda/derecha para dobles horizontales, arriba/abajo para dobles verticales), permitiendo que la cadena de dominó corra paralela a lo largo del borde sin atascarse.
3. **Cálculo de Coordenadas de Imantación Sin Colisiones:** Corregimos un bug de superposición visual donde las nuevas fichas adyacentes a las damas perimetrales se calculaban con base en `ex`/`ey` (lo cual hacía que se solaparan directamente con el doble y fueran rechazadas). Ahora se calculan de manera precisa y adyacente usando `minX`/`maxX` y `minY`/`maxY` del doble.

---

## 22. Motor portable `packages/domino-engine` (2026-08-24)

**Motivo:** el dominó se va a integrar en la plataforma **https://privoytruco.com** (de otro dev
del grupo), donde ya vive el truco. Para eso el motor tenía que dejar de estar pegado a Express,
Socket.io y la base de datos de este repo.

### Qué se hizo

Se extrajo toda la lógica de juego a `packages/domino-engine/`, un paquete npm sin dependencias:

```
packages/domino-engine/
├── package.json          @privoytruco/domino-engine, 0 deps, ESM
├── README.md             API completa
├── INTEGRATION.md        guía paso a paso para el equipo de PrivoyTruco
├── src/
│   ├── index.js          API pública
│   ├── rng.js            RNG seedable + commit/reveal SHA-256
│   ├── tiles.js          fichas, pips, dobles
│   ├── layout.js         geometría del grid 20x20 (portada tal cual de DominoGame.js)
│   ├── rules.js          FORMATS + config de reglas
│   ├── engine.js         createGame / legalActions / applyAction / viewFor
│   └── bot.js            bot que solo ve la vista filtrada
└── test/engine.test.js   30 tests (node:test)
```

`backend/src/game/DominoGame.js` quedó como **adaptador de compatibilidad**: mantiene la API vieja
(`getValidMoves`, `playTile`, `getStateForPlayer`, `game.hands[playerId]`, etc.) por encima del
motor nuevo, así que `RoomManager`, `gameSocket` y el frontend siguen funcionando sin cambios.
`backend/src/game/Tile.js` es un shim que reexporta del motor.

### Estructura de PrivoyTruco (relevada del bundle de producción)

- Vite + React + framer-motion, PWA, tema claro/oscuro.
- API REST en el mismo origen: `/api/presence`, `/api/tournaments`, `/api/me/*`, `/api/matches/*`,
  `/api/anuncios/vigente`, `/api/voz/*`, `/api/chat-mesa/*`.
- Socket.io montado en **`/api/socket.io`**.
- Protocolo de mesa `table:*`:
  - cliente → servidor: `table:subscribe`, `table:action` `{ tableId, action: { type, ... } }`,
    `table:start_next_round`, `table:rematch_*`, `table:leave`, `table:abandon`, `table:emote`,
    `table:chat`, `table:spectate`.
  - servidor → cliente: `table:state`, `table:turn_deadline`, `table:turn_timeout`,
    `table:round_committed`, `table:round_revealed`, `table:peer_joined/left`, `table:abandoned`,
    `table:error`, `table:spectator_state`, `table:emote_received`, `table:voz`.
- `action.type` y `event.kind` en `UPPER_SNAKE_CASE` (`PLAY_CARD`, `CALL_TRUCO`, `ROUND_END`).
- Torneos con `gameFormat` versionado (`"1v1-v2"`, `"2v2-v2"`), `targetPoints`, `botFill`,
  `entryFee`, `rakeBps`, `prizeStructure`, moneda `VES`.
- `round_committed` / `round_revealed` ⇒ reparto verificable. Por eso el motor es determinista.

### Bugs de reglas corregidos al portar

1. `this.round` nunca se incrementaba: siempre decía "Ronda 1".
2. El barajado usaba `Math.random()`: imposible de auditar. Ahora sale de `seed`.
3. Tras ganar una mano en 2v2 arrancaba siempre el primer miembro del equipo, no el que dominó.
4. `WINNING_SCORE = 100` hardcodeado. Ahora `targetPoints` viene por config (los torneos lo mandan).
5. **El bot hacía trampa**: leía `game.hands[compañero]` y `game.hands[rival]`. Ahora solo recibe
   `viewFor(state, seat)`, que no incluye manos ajenas ni el pozo.
6. No existían timeout ni abandono. Ahora hay acciones `TIMEOUT` y `FORFEIT`.
7. No había log de eventos. Ahora `state.events` con `seq`, para animaciones y replays.

### Cosas nuevas

- `BOT_DELAY_MS` y `HUMAN_DELAY_MS` como variables de entorno (antes 3000/1000 hardcodeados).
  Poniéndolas en `0` una partida completa contra el bot corre en segundos.
- `backend/src/test-e2e-bot.js`: juega una partida entera contra el bot por socket real,
  verificando que nunca haya fichas duplicadas ni coordenadas fuera del grid.
- Bots con dificultad `easy` / `normal` / `hard`.

### Tests

```bash
cd packages/domino-engine && node --test   # 30 tests del motor
cd backend && node src/game/test.js        # 67 tests (siguen pasando sobre el motor nuevo)
cd backend && node src/test-e2e-bot.js     # partida completa por socket (servidor corriendo)
```

> `backend/src/test-e2e.js` y `src/test-debug.js` fallan con "Token inválido" desde antes de este
> cambio: usan un JWT fijo que no corresponde al `JWT_SECRET` del `.env`. Pendiente arreglarlos.

**Estado:** ✅ motor extraído, 97 tests en verde, verificado en local con el frontend actual.

---

## 23. Libertad de dirección en los bordes + Board.jsx deduplicado (2026-08-24)

### El bug

Reportado por el usuario con captura: con un **doble vertical pegado al borde izquierdo**, el juego
ofrecía **una sola** colocación (hacia arriba). Debería ofrecer arriba **y** abajo, para que el
jugador elija hacia dónde sigue la cadena corriendo a lo largo del borde.

Causa, en `packages/domino-engine/src/layout.js`: la regla de "imanes de dobles perimetrales"
(§21) agregaba una sola dirección según el extremo de la cadena:

```js
if (side === 'left')  add(... hacia arriba ...);
else                  add(... hacia abajo ...);
```

Así, el extremo izquierdo solo podía ir hacia arriba y el derecho solo hacia abajo, aunque las dos
direcciones estuvieran libres.

### El arreglo

Ahora se agregan **las dos direcciones** y son los chequeos de límites y de colisión los que
descartan la que no entra. Se hizo con un helper `addAlong(orientation, nearCell, farCell)` que
ordena `(x,y)`/`(x2,y2)` según el extremo, para que la mitad que conecta quede siempre pegada al
doble y `boardEnds()` siga dando el valor correcto:

- doble **vertical** en la columna 0/1 o 18/19 → arriba **y** abajo
- doble **horizontal** en la fila 0/1 o 18/19 → izquierda **y** derecha

**Un doble en el medio del tablero no cambió**: sigue con su única colocación perpendicular. La
jugabilidad actual se respeta; solo se destraban los bordes.

### Board.jsx dejó de duplicar la lógica

`frontend/src/components/game/Board.jsx` tenía una **copia entera** (584 líneas) de
`getValidPlacementsForTile`, `computeBoardOffsets` y `getCenter`. Por eso el arreglo del backend no
se veía en pantalla: el cliente calculaba los imanes con su propia copia vieja.

Ahora importa del motor (que corre igual en el navegador, es ESM sin dependencias):

```js
import { DEFAULT_LAYOUT, placementsFor, computeBoardOffsets, anchorOffsetFor }
  from '@privoytruco/domino-engine';
```

`Board.jsx` pasó de **896 a 283 líneas**. Se agregó `anchorOffsetFor(board, placement, layout)` al
motor para que el cliente calcule el offset de centrado de los fantasmas sin reimplementarlo.

> **Regla nueva:** ninguna regla de colocación se escribe en el frontend. Si el cliente necesita
> algo geométrico, se exporta desde `packages/domino-engine/src/layout.js`.

### Verificación

- 5 tests nuevos en el motor (35 en total): borde izquierdo, borde derecho, borde superior,
  no-regresión en el medio, y que las dos opciones sean realmente jugables por `applyAction`.
- 67 tests del backend siguen pasando.
- Stress: **600 partidas / 100.184 jugadas**, 0 solapamientos, 0 fichas perdidas, 0 partidas
  colgadas, 0 colocaciones fuera del grid.
- Verificado en el navegador: al arrastrar una ficha aparecen los fantasmas dibujados por el motor.

---

## 24. Dirección de la recta y regla anti-amontonamiento (2026-08-24)

Dos bugs reportados con captura por el usuario.

### Bug A — faltaba la opción recta

**Síntoma:** con un extremo horizontal en el medio del tablero solo aparecían los dos giros
(arriba y abajo), nunca la opción de seguir derecho.

**Causa:** la dirección "recta" estaba hardcodeada al lado de la cadena:

```js
if (side === 'left')  add({ x: ex - 2, ... })   // asumia que la punta libre mira a la IZQUIERDA
else                  add({ x: ex + 1, ... })   // asumia que mira a la DERECHA
```

Pero la punta libre de un extremo puede apuntar a **cualquiera de las 4 direcciones** según cómo
haya girado la cadena. Ejemplo real encontrado escaneando partidas:

```
extremo: [5,6] horizontal en (11,5)-(10,5)   -> punta libre (11,5), apunta a la DERECHA
recta calculada: (9,5)-(10,5)                -> cae DENTRO de la propia ficha -> descartada
```

**Arreglo:** la dirección sale de la geometría de la ficha, no del lado de la cadena:

```js
const body = side === 'left' ? { x: endTile.x2, y: endTile.y2 } : { x: endTile.x, y: endTile.y };
const free = { x: ex, y: ey };
const dx = free.x - body.x;
const dy = free.y - body.y;
addAlong(endTile.orientation, { x: free.x + dx, y: free.y + dy }, { x: free.x + 2*dx, y: free.y + 2*dy });
```

Los giros ahora también pivotan sobre la punta libre, así que son correctos en las 4 direcciones.
El mismo arreglo aplica a los dobles cruzados (columna/fila `free + d` en vez de `ex ± 1`).

### Bug B — colocaciones amontonadas

**Síntoma:** aparecía un imán en una posición donde la ficha quedaba encajada contra otras.

**Diagnóstico:** no era solape de rectángulos (168.522 colocaciones escaneadas, 0 solapes). Era la
cadena **doblándose sobre sí misma**: la ficha nueva quedaba pegada a una ficha que no era su
enganche.

**Regla nueva** en `add()` de `layout.js`:

> Una ficha nueva solo puede tocar a la ficha con la que engancha. Si roza cualquier otra, la
> cadena se está doblando sobre sí misma y la colocación se descarta.

Se implementa mirando los 4 vecinos ortogonales de las dos celdas de la ficha candidata: si alguno
pertenece a una ficha distinta del `anchorIdx`, se rechaza.

### Costo medido

| | trancas | bloqueos por geometría |
|---|---|---|
| sin regla anti-amontone | 58.4% | 36.8% |
| con regla anti-amontone | 59.0% | 37.4% |

La regla cuesta ~0.6 puntos. Prácticamente gratis.

### ⚠️ Pendiente de decisión: bloqueo geométrico

Escaneando 400 partidas: **el 84% de las trancas involucran bloqueo geométrico** — el jugador tenía
una ficha con el número del extremo pero no entraba físicamente. El 37% de los turnos "sin jugada"
son por geometría, no por dominó real. Esto **no lo causan estos arreglos**: es inherente al diseño
de cuadrícula 20x20 (§19).

Agrandar la mesa ayuda pero no lo elimina, porque el bloqueo es local (la cadena se traba sola):

| grid | trancas | bloqueos por geometría |
|---|---|---|
| 20x20 (actual) | 59.4% | 36.4% |
| 24x24 | 51.5% | 33.7% |
| 28x28 | 47.8% | 30.3% |
| 32x32 | 45.3% | 29.5% |

El tamaño es configurable (`config.layout.grid`), así que cambiarlo es una línea. Falta decidir con
el usuario si se agranda la mesa o se acepta el nivel actual de trancas.

### Verificación

- 39 tests del motor (4 nuevos: dirección recta horizontal, dirección recta vertical,
  anti-amontone puntual, anti-amontone en partida completa).
- 67 tests del backend siguen pasando.
- Stress: 500 partidas / 82.405 jugadas, 0 errores, 0 contactos indebidos, 0 solapes,
  0 fichas perdidas, 0 partidas colgadas.
- Verificado en navegador: los fantasmas se dibujan desde el motor, sin errores de runtime.

---

## 25. La cadena estrangulada: por qué el bot acumulaba fichas (2026-08-24)

### El síntoma

Captura del usuario: partida 1v1bot con el **pozo en 0**, el bot con **8 fichas**, y la cadena
cerrada sobre sí misma en espiral. El bot no jugaba porque no podía colocar: robó el pozo entero.

Medido sobre 300 partidas con el código de ese momento:

- **58.7%** de las manos terminaban con el pozo vacío
- **6.0%** de las manos alguien acumulaba 10 o más fichas
- peor caso: **14 fichas en mano con solo 11 en el tablero**

### Un intento que falló (documentado para que nadie lo repita)

Hipótesis: la cadena se enrosca porque nadie la guía hacia el espacio libre. Se implementó
`openness(board, placement, layout)` — puntúa una colocación por la pista libre hacia adelante,
las salidas laterales y el aire alrededor de la nueva punta — y se usó para elegir dónde poner.

**Resultado medido: peor.**

| | bloqueo geométrico | trancas |
|---|---|---|
| sin "aire" | 32.4% | 48.2% |
| con "aire" | 44.1% | 68.2% |

Guiar la cadena hacia el espacio libre la hace **serpentear**, y una cadena que serpentea se choca
consigo misma mucho más que una recta. Una recta solo se detiene contra las paredes. Se revirtió
por completo: `openness` no existe en el código.

> Si a alguien se le ocurre "que la cadena busque espacio", ya se probó y empeora las cosas.

### Lo que sí funcionó

El bot puntuaba juntas la **ficha** y la **colocación**: cada par (ficha, colocación) recibía un
puntaje único que mezclaba estrategia de dominó con un bonus geométrico de `+0.75` por ir recto.
Eso hacía que una ficha estratégicamente peor ganara solo por tener una colocación recta.

Se separaron las dos decisiones en `bot.js`:

1. **Qué ficha jugar** — se agrupan las acciones por `(tileIndex, side)` y se puntúa el grupo con
   la estrategia de dominó, sin mirar geometría.
2. **Dónde ponerla** — dentro del grupo ganador se prefiere la colocación recta.

### Resultado

| métrica | antes de hoy | ahora |
|---|---|---|
| trancas | 59.4% | **47.5%** |
| bloqueo geométrico | 36.4% | **32.2%** |
| manos con 10+ fichas | 6.0% | **1.2%** |
| peor mano | 14 | 14 |

Las "manos 10+" —el síntoma exacto de la captura— bajaron **5 veces**.

Fuerza de los bots después del cambio (200 partidas por cruce, a 50 puntos):

| cruce | victorias |
|---|---|
| hard vs easy | 71% |
| normal vs easy | 69% |
| hard vs normal | 61% |
| hard vs hard | 50% (control) |

> El test `el bot dificil le gana al facil` pasó de 40 a 100 partidas: con 40 la varianza daba
> 55% y el test parpadeaba, aunque la tasa real es 68-71%.

### Sigue pendiente

El bloqueo geométrico bajó de 36.4% a 32.2%, pero **no desaparece**: es inherente a la cuadrícula
(§24). Agrandar la mesa sigue siendo la palanca disponible y es una línea de config
(`config.layout.grid`).

---

## 26. Mesa temática elegible por el jugador (2026-08-24)

### Qué se hizo

El jugador ahora elige paño y baranda desde un botón **"Mesa"** arriba del tablero. La elección
se guarda en `localStorage` con la clave `mesa-tema`.

**5 paños:** Verde casino (speed cloth) · Verde profundo · Torneo (verde frío) · Borgoña · Negro
**4 barandas:** Cuero espresso · Cuero negro · Cuero caoba · Madera nogal
**Costura:** se puede apagar (queda solo el surco donde el cuero se une al paño)

Archivos:
- `frontend/src/components/game/MesaTheme.jsx` — hook `useMesaTheme()` + `<MesaThemePicker>`
- `frontend/src/index.css` — clases `.felt-*` y `.rail-*`, independientes entre sí
- `Board.jsx` recibe `clasePano` / `claseBaranda` / `claseCostura` como props

Cualquier `.felt-*` combina con cualquier `.rail-*`: agregar un paño nuevo es una clase CSS más
una entrada en el array `PANOS`.

### La costura: se probo dos veces y se elimino

Intento 1: `border: 1.5px dashed` dorado. Se veia como linea punteada, no como hilo.
Intento 2: puntadas SVG inclinadas con extremos redondeados, surco + hilo + brillo. Peor: a
escala de pantalla el patron repetido se lee como una **soga dorada trenzada** alrededor del
tablero.

**Se elimino por completo.** Las mesas de poker y de domino de las fotos de referencia del usuario
tienen la baranda de cuero **lisa, sin costura visible**. Quedo `.rail-edge`, que es solo la sombra
suave del acolchado cayendo sobre la tela.

> No intentar costura decorativa en la baranda. Se probo punteada y con puntadas SVG, las dos
> quedaron mal. El cuero va liso.

### Sin texturas de grano (2026-08-24, ajuste)

La primera version del paño y el cuero llevaba grano `feTurbulence` y trama en
`repeating-linear-gradient`. El usuario lo rechazo: a escala de pantalla el ruido se lee como
suciedad, no como tela. **Se eliminaron todas.** Ahora paño y baranda son color plano + dos o tres
gradientes de luz (foco cenital, viñeta y, en el cuero, el cuerpo del material).

Tambien se limpio `.bg-felt` (tenia grano al 8%) y se borro `.bg-felt-inset`, que quedo huerfano.
En todo el CSS ya no queda ni un `feTurbulence` ni un `repeating-linear-gradient`.

> Nada de ruido SVG para simular tela. Se ve sucio. Color + luz alcanza.

### Reemplazos

- Se eliminó `frontend/public/mesa-de-juego.webp` del render: era una foto de 2340x1125 estirada
  dentro de un contenedor cuadrado. Todos los paños se generan por CSS: escalan sin deformarse
  y pesan 0 KB.
- Se quitó el marco doble: `Game.jsx` envolvía el tablero en otro contenedor con `bg-felt-inset`,
  padding y borde dorado. El fieltro visible pasó de **606x606 a 640x640**, que es exactamente la
  cuadrícula de 20x20, así que en escritorio ya no hace falta scrollear.

### Fichas con relieve

Se conservaron los PNG (`/tiles/*.png`, con la filigrana dorada) y se les sumó una capa CSS:
`.tile-edge` (canto asomando 3px = grosor), `.tile-3d` / `.tile-hand` (sombra proyectada) y
`.tile-sheen` (luz cenital coherente con la lámpara del paño). Las de la mano llevan sombra más
marcada que las del tablero.

> Pendiente opcional: redibujar las fichas en SVG. Sacaría los **3,8 MB** de PNG y quedarían
> nítidas a cualquier zoom, pero hay que redibujar la filigrana dorada.

### Sobre el "bug del cero"

El usuario reportó que teniendo el blanco solo le dejaba jugar el 4. **No es un bug del cero.**
Medido sobre 500 partidas, el porcentaje de veces que una ficha coincide con un extremo pero no
tiene colocación física:

| número | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| bloqueo | 20.6% | 22.0% | 20.6% | 19.9% | 20.1% | 17.9% | 15.6% |

Es el bloqueo geométrico de §24, uniforme entre números. Agrandar la mesa sigue siendo la palanca:

| mesa | ficha válida sin lugar | trancas |
|---|---|---|
| 20x20 (actual) | 19.1% | 46.1% |
| 26x26 | 13.6% | 40.4% |
| 32x32 | 9.0% | 32.7% |

---

## 27. Pozo elegible, esquinas mitradas, cuero real y banners (2026-08-24)

### Pozo: el jugador elige la ficha

Antes `drawFromPool` hacía `pool.pop()`: siempre servía la de arriba. Ahora la acción
`DRAW` del motor acepta `poolIndex` y el jugador ve las 14 fichas boca abajo y elige cuál levanta.

**El azar no cambió.** El orden del pozo lo fija la seed al repartir y no se vuelve a tocar en toda
la mano: elegir una posición no mejora ni empeora las probabilidades. Lo que cambia es de quién es
la decisión. Sin `poolIndex` se sigue levantando la última, así que nada viejo se rompe.

- `packages/domino-engine/src/engine.js` — `doDraw` con `poolIndex`, la acción `DRAW` expone `poolCount`
- `backend/src/game/DominoGame.js` — `drawFromPool(playerId, poolIndex)`
- `backend/src/sockets/gameSocket.js` — `game:draw` recibe `{ code, poolIndex }`
- `frontend/src/components/game/Pool.jsx` — las fichas boca abajo, clicables

5 tests nuevos (44 en total): elegir posición, valor por defecto, posición inválida, que el orden
del pozo no se reordena al jugar, y que la vista **nunca** revela qué fichas hay en el pozo.

### Esquinas mitradas

Las 4 tiras de la baranda se pisaban en las esquinas y quedaba una cuña oscura. Ahora cada lado es
un `<span>` con `clip-path: polygon(...)` en forma de trapecio, así el corte a 45 grados es real.
Se eliminó el `conic-gradient` que dibujaba las costuras: no hacía falta y ensuciaba.

> El truco de las 4 tiras con `background-position` no sirve para un marco: en las esquinas siempre
> gana una sobre la otra. Hay que recortar trapecios.

### Cuero: textura generada, no dibujada

Ver `scratch/gen_cuero.py`. Construye un mapa de altura (manchas + arrugas + poro), lo pasa a mapa
de normales y lo ilumina, como un motor 3D. Sale `frontend/public/cuero.webp` (85 KB, sin costura).

Dos intentos fallidos antes de acertar, y el porqué importa:

| intento | resultado | causa |
|---|---|---|
| ruido fractal isotrópico | estuco | grano fino uniforme, sin arrugas |
| bandas anisotrópicas | arpillera / madera cepillada | un filtro direccional **siempre** da rayas paralelas |
| **deformación de dominio** | cuero | torcer las coordenadas con otro ruido curva y ramifica las arrugas |

La textura va en gris y se funde con `background-blend-mode: overlay` sobre el gradiente
abullonado: el relieve lo pone la imagen y el color el CSS, así **un solo archivo sirve para los 5
cueros** del selector.

> Para que las arrugas se vean orgánicas hace falta domain warping. Sin eso queda geométrico.

### Banners

Estaban con `object-cover`, que los recortaba, y pesaban 13,4 MB entre los dos. Se convirtieron a
WebP redimensionados y se pasaron a `object-contain`:

| | antes | ahora |
|---|---|---|
| banner-publicidad | 6,3 MB · 1536x2752 · recortado | **66 KB** · 520x932 · entero |
| banner-berkana | 7,1 MB · 3168x1344 · recortado | **167 KB** · 1600x679 · entero |

La barra lateral quedó `sticky top-4` y sin estirar. Los PNG originales siguen en `public/` por si
hacen falta; solo se dejó de referenciarlos.

> `frontend/public/hero-table.png` (5,6 MB) también convendría convertir, pero está en la lista de
> archivos protegidos (§6 de CLAUDE.md), así que no se tocó.

### Verificación

- 44 tests del motor, 67 del backend
- e2e por socket: partida completa, **55 robos eligiendo posición del pozo**, 0 errores
- Navegador: 4 lados mitrados, paño sin taparse, 14 fichas de pozo, banners enteros

---

## 28. El bug de los dobles injugables (2026-08-24)

### El síntoma

El usuario: "veo que puedo jugar el 5 pero en mis piezas no sale disponible". Tablero con
**7 fichas y casi todo el espacio libre**, así que no era falta de lugar.

### El diagnóstico

Primero se midió quién bloqueaba, comparando `placementsFor` con y sin la regla anti-amontone:

| causa del bloqueo | % |
|---|---|
| regla anti-amontone | 0.3% |
| colisión o borde real | 99.7% |

O sea, la regla anti-amontone era inocente. Pero el ejemplo que devolvió el diagnóstico mostró lo
que sí pasaba: la ficha bloqueada era un **doble**.

**Un doble tenía una sola colocación posible.** Se cruza perpendicular a la cadena, y solo se
ofrecía una de las dos alineaciones. Si esa única celda estaba tapada, el doble quedaba injugable
aunque hubiera lugar de sobra al lado.

### El arreglo

En el dominó real un doble cruzado puede sobresalir hacia **cualquiera de los dos lados** de la
línea. Ahora se ofrecen las dos:

```js
addAlong('vertical', { x: col, y: ey }, { x: col, y: ey - 1 });  // sobresale hacia arriba
addAlong('vertical', { x: col, y: ey }, { x: col, y: ey + 1 });  // sobresale hacia abajo
```

### Resultado

| | antes | ahora |
|---|---|---|
| **dobles injugables** | **46%** | **5.1%** |
| ficha válida sin lugar (todas) | 19.1% | 17.3% |
| trancas | 47.5% | 54.1% |

Las trancas subieron 6.6 puntos: al jugarse más dobles, la cadena se cruza más seguido y se traba
antes. Es el precio de que los dobles sean jugables, y vale la pena.

3 tests nuevos (47 en total): las dos posiciones cruzadas, que si una está tapada la otra sigue
disponible, y que un doble nunca se coloca en línea.

> Un doble tiene el doble de restricción que una ficha normal: 2 colocaciones contra 3, y las 2
> ocupan las mismas celdas base. Si aparece otro caso de "tengo la ficha y no me deja", revisar
> primero si es un doble.

### Banners agrandados

Se pueden agrandar sin deformar, pero **no llenar ancho y alto a la vez**: la proporción manda.

| | antes | ahora | proporción |
|---|---|---|---|
| Berkana (arriba) | 353x150 | **566x240** | 2.356 exacta |
| PrivoyTruco (lateral) | 180x321 | **260x464** | 0.558 exacta |

El de arriba a ancho completo daría 517px de alto y empujaría el juego fuera de pantalla, así que
tiene techo de 240px. La columna lateral pasó de 180 a 230/260px según el ancho de pantalla.
Verificado en vivo: proporción natural = proporción mostrada, sin deformación.

---

## 29. El tablero se escala en vez de scrollear (2026-08-24)

### El problema

El paño tenía `overflow-auto` con una rejilla de 640x640 px adentro (20x20 celdas de 32 px). Cuando
el paño medía menos de 640 (siempre, salvo en pantallas anchas), había que **scrollear** para ver
el resto de la cadena. En el teléfono es impracticable, y la cadena se veía "salir" de la mesa.

### El arreglo

La rejilla sigue midiendo 640x640 en coordenadas lógicas —el motor no se enteró de nada— pero se
dibuja con `transform: scale(anchoDelPaño / 640)` y `transform-origin: top left`. El paño pasó a
`overflow: hidden`. El tablero entero entra siempre, sin scroll.

| mesa | paño | escala | rejilla en pantalla | entra |
|---|---|---|---|---|
| 640 | 586 | 0.916 | 586 | sí |
| 480 | 440 | 0.688 | 440 | sí |
| 360 | 324 | 0.506 | 324 | sí |
| 280 | 244 | 0.381 | 244 | sí |

El costo es que en pantallas chicas las fichas se ven más chicas (24x12 px a 280 de mesa). A cambio
se ve la partida completa y se puede jugar con el pulgar.

### El arrastre hubo que ajustarlo

El imán convertía la posición del puntero con `scrollLeft`/`scrollTop`, que ya no existen. Ahora
divide por la escala:

```js
const localX = (draggedTile.currentX - rect.left) / escala;
const threshold = 45 / escala;   // 45 px de PANTALLA a cualquier escala
```

El umbral se divide para que la sensación de imantado sea la misma en grande y en chico.

### Se mide por tres vías

`useLayoutEffect` en cada render, listener de `resize` y `orientationchange`, y `ResizeObserver`.
Parece redundante y no lo es: en el primer render el observer todavía no disparó, y **hay entornos
donde no dispara nunca** (se comprobó: un `ResizeObserver` recién creado disparó 0 veces mientras el
elemento pasaba de 586 a 264 px, porque el panel estaba oculto y no componía cuadros).

`setEscala` con el mismo valor no provoca render extra, así que medir de más no cuesta nada.

> Si el tablero vuelve a salirse de la mesa, revisar primero que `escala` se esté actualizando.
> Verificado en vivo: imantado correcto a escala 0.916 y a 0.512.

---

## 30. Bug de puntaje en el tranque + manos reveladas (2026-08-24)

### El bug

Reportado por el usuario: "tenía el doble 4 y el doble 6 y solo le sumó al rival 8 puntos en vez
de 20". Los números cierran exacto:

| | pips |
|---|---|
| su mano: 4-4 + 6-6 | **20** |
| mano del rival | 12 |
| lo que otorgó el motor | 20 - 12 = **8** |

O sea, la ronda cerró por **tranque** (no por dominó) y el motor sumaba la **diferencia** entre
las manos. La regla venezolana es que el ganador del tranque suma los pips que le quedaron al
rival, igual que en el dominó.

`BASE_RULES.blockedScoring` pasó de `'difference'` a `'total'`. La variante sigue disponible por
config para quien juegue con la otra regla.

4 tests nuevos (51 en total): tranque con la regla correcta, la variante `difference`, el empate de
pips que no suma a nadie, y el dominó (que ya estaba bien) para que quede cubierto.

> Si aparece una diferencia de puntaje, mirar primero si la ronda cerró por `blocked` o por
> `domino`: son dos cuentas distintas y solo una estaba mal.

### Manos reveladas al cerrar la ronda

El modal de fin de ronda ahora muestra **las fichas que le quedaron a cada uno** con sus pips y la
suma, para que el puntaje se pueda verificar a ojo sin creerle al servidor.

- El motor ya lo exponía (`state.lastRound.hands` y `viewFor().revealedHands`), pero el adaptador
  del backend no lo pasaba al cliente. Ahora `getStateForPlayer` incluye `revealedHands` con
  `{ id, username, isBot, team, tiles, pips }` por jugador, solo cuando la ronda está cerrada.
- `frontend/src/components/game/RoundBreakdown.jsx` lo dibuja. Si la suma de los pips no coincide
  con los puntos otorgados, lo avisa en rojo en pantalla.

El `test-e2e-bot.js` ahora **verifica la cuenta en cada ronda**: recalcula los pips de las manos
reveladas y falla si el puntaje otorgado no coincide.

Verificado en vivo: tranque con 98 pips del perdedor otorgó +98 (antes habría dado 96), y el modal
dibujó las 16 fichas sumando 100 pips entre los dos jugadores.

---

## 31. La mano se acomoda en filas (2026-08-24)

Con la mano cargada (18 fichas después de comerse el pozo) la mano se estiraba en **una sola fila**
con scroll horizontal, y en el teléfono eso es impracticable.

Ahora el contenedor es `flex-wrap` y las fichas se achican según cuántas haya:

| fichas | tamaño | ancho c/u | filas en pantalla de 375px |
|---|---|---|---|
| hasta 9 | `md` | 40 px | 1 |
| 10 a 14 | `sm` | 32 px | 2 |
| 15 o más | `xs` | 24 px | 2 |

Se agregó el tamaño `xs` a `Tile.jsx` (`w-12 h-6` / `w-6 h-12`). **Verificado que Tailwind lo
generó en el CSS compilado**: al ser clases dentro de un objeto en el código, podían haberse
purgado.

Verificado en vivo: a 320 px de contenedor, 7 fichas pasan a 2 filas sin scroll lateral.

### Nota sobre la clave en producción

El usuario reportó que su clave no le sirve en la página de Vercel. **No es un bug.** Local y
producción usan **bases distintas**:

```js
let isPostgres = !!process.env.DATABASE_URL;   // config/database.js
```

- Local: sin `DATABASE_URL` -> SQLite en `%APPDATA%\domino-online\data.db`
- Producción: con `DATABASE_URL` -> PostgreSQL

El reseteo de clave que se hizo en local solo tocó el SQLite. La cuenta de producción es otra, con
su propia clave. Además **no hay endpoint de recuperación**: `routes/auth.js` solo expone
`register`, `login` y `me`.

> Pendiente: falta un flujo de cambio/recuperación de clave. Mientras tanto, la salida es
> registrarse de nuevo en producción.

---

## 32. Auditoría de las reglas de colocación (2026-08-24)

El usuario, después del tercer "tengo la ficha y no me deja jugarla", pidió verificar **todas** las
reglas de una vez. En vez de mirar caso por caso, se hizo que el motor **explique cada rechazo**.

### La herramienta

`explainPlacements(board, tile, side, layout)` devuelve las colocaciones válidas **y** todas las
candidatas descartadas con el motivo. Para eso `add()` se partió en `evaluar()` (devuelve el motivo
o `null`) y el `add` que registra. Queda como API pública del motor: sirve para depurar en vez de
adivinar.

Motivos posibles: `no-coincide-con-el-extremo`, `fuera-del-tablero`, `celda-ocupada`,
`roza-otra-ficha`, `solapa-visualmente`.

### El resultado (94.920 coincidencias sobre 500 partidas)

De las fichas que coincidían con un extremo, el 18,1% no tenía dónde entrar. Repartido así:

| motivo | % de los bloqueos |
|---|---|
| roza otra ficha | 55,1% |
| **borde superior/inferior** | **27,1%** |
| **borde lateral** | **9,7%** |
| celda ocupada | 7,8% |
| solapa visualmente | 0,1% |

### La regla obsoleta

Las dos reglas de borde (una "banda" que prohibía fichas horizontales en las columnas 0/19 y
verticales en las filas 0/19) causaban juntas el **37% de los bloqueos**.

Existían para que las fichas no quedaran cortadas contra el margen cuando el tablero se
scrolleaba. Desde §29 el tablero **se escala y se ve entero**, así que ya no protegían de nada: el
chequeo `fuera-del-tablero` alcanza para que nada se salga del grid.

Se eliminaron. Medido sobre 400 partidas:

| | ficha válida sin lugar | trancas | fuera del grid | contactos indebidos |
|---|---|---|---|---|
| con la regla | 18,2% | 49,2% | 0 | 0 |
| **sin la regla** | **12,8%** | **37,8%** | **0** | **0** |

Un tercio menos de bloqueos y 11 puntos menos de trancas, sin que se saliera una sola ficha.

> Cuando se cambie algo del render, revisar si alguna regla del motor existía solo para tapar una
> limitación del render. Esta llevaba meses cobrando peaje sin proteger nada.

### Cambio de contraseña

`routes/auth.js` solo tenía `register`, `login` y `me`: quien olvidaba la clave quedaba afuera
para siempre. Se agregó `POST /api/auth/change-password` (con `authMiddleware`) y la pantalla
`/cambiar-clave`.

El usuario se resuelve desde `req.username`, que pone el middleware **desde el token verificado**,
no desde el cuerpo del pedido: nadie puede cambiarle la clave a otro. Se busca por username porque
`findById` no trae el `password_hash`.

Probado contra el servidor: sin token rechaza, con la clave actual mal rechaza, con clave corta
rechaza, con la nueva igual a la actual rechaza, y el cambio válido invalida la clave vieja.

> Local y producción usan bases distintas (SQLite vs PostgreSQL según `DATABASE_URL`), así que un
> cambio de clave en una no afecta a la otra.

---

## 33. Cierre de la auditoría: la regla anti-amontone es gratis (2026-08-24)

Después de sacar la regla de banda (§32), se volvió a auditar. El reparto quedó así sobre 108.508
coincidencias:

| motivo | % de los bloqueos |
|---|---|
| roza otra ficha | 82,7% |
| fuera del tablero | 9,2% |
| celda ocupada | 8,0% |

Parecía que la regla anti-amontone era la culpable. **No lo es.** Se probaron cuatro tolerancias:

| variante | ficha sin lugar | trancas | fichas apretadas |
|---|---|---|---|
| toca 1+ (la actual) | 12,7% | 38,9% | **0** |
| toca 2+ | 12,7% | 39,0% | 9 |
| toca 3+ | 12,8% | 39,0% | 99 |
| sin regla | 12,7% | 38,9% | **154** |

Relajarla **no destraba ni una sola jugada**. El 82,7% era una atribución engañosa: esas
colocaciones caían igual en el chequeo de solape visual, solo que más tarde. La regla es un rechazo
más temprano y más barato de algo que iba a pasar igual, y a cambio deja el tablero limpio.

> Cuidado con los porcentajes de "motivo del rechazo" cuando los chequeos están en cadena: el
> primero que falla se lleva toda la atribución. Para saber si una regla cuesta algo hay que
> sacarla y volver a medir, no mirar el reparto.

### Estado final del bloqueo

| mesa | ficha válida sin lugar | trancas |
|---|---|---|
| 20x20 (actual) | 13,5% | 36,9% |
| 24x24 | 9,8% | 26,4% |
| 28x28 | 6,9% | 22,9% |

Al empezar la sesión eran 19,1% y 46,1%. El tamaño de mesa sigue siendo el único lever que queda,
y cuesta tamaño de ficha en pantalla.

### Margen visual de la mesa

La cadena quedaba pegada a la baranda. Se agregó **una celda de aire en los cuatro lados**, sin
quitar área de juego: la rejilla sigue siendo de 20x20, solo se dibuja más chica dentro del paño.

```js
escala = anchoDelPaño / (640 + 2 * 32);
transform: translate(margen, margen) scale(escala);
```

El imán del arrastre descuenta el desplazamiento antes de dividir por la escala. Verificado:
27 px de margen en los cuatro lados.

### El enlace que faltaba

La pantalla `/cambiar-clave` existía desde §32 pero **no tenía ningún enlace**, así que era
inalcanzable. Se agregó en el Navbar: el nombre de usuario ahora es el enlace (escritorio) y hay un
botón "Clave" en móvil.

---

## 34. Cambiar la clave en producción (Supabase)

La base de producción es **PostgreSQL en Supabase**. Local usa SQLite, así que un cambio de clave
en una no afecta a la otra. Herramienta: `backend/scripts/clave.js`.

### Vía 1 — desde el panel de Supabase, sin conexión local

```bash
node scripts/clave.js hash "miClaveNueva"
```

Imprime el hash bcrypt y el `UPDATE` listo. Se pega en **Supabase > SQL Editor** y se ejecuta.
No hace falta tener la `DATABASE_URL` en la máquina.

### Vía 2 — directo, con la DATABASE_URL

```bash
DATABASE_URL="postgresql://..." node scripts/clave.js listar
DATABASE_URL="postgresql://..." node scripts/clave.js set mili "miClaveNueva"
```

La cadena sale de **Supabase > Settings > Database > Connection string > Transaction pooler**
(el mismo pooler IPv4 del puerto 6543 que usa Render). El `set` verifica con `bcrypt.compare`
después de escribir, así que no canta victoria sin comprobar.

> La `DATABASE_URL` nunca se guarda en el repo ni en `.env` versionado: se pasa como variable de
> entorno en el momento.

### Ver los datos

Supabase tiene **Table Editor** para ver `users` a ojo, y **SQL Editor** para consultas. La tabla
relevante es `users(id, username, email, password_hash, games_played, games_won, created_at)`.

### Cuenta basura creada por error

Al diagnosticar si el usuario `mili` existía en producción se probó registrar con el email
`12@hotmail.com`, y eso **creó** la cuenta `probe-usuario-inexistente`. Para borrarla:

```sql
DELETE FROM users WHERE username = 'probe-usuario-inexistente';
```

> Para chequear si un usuario existe no usar el endpoint de registro: crea la cuenta si el dato
> libre no colisiona. Consultar la base directamente.

---

## 35. Los cinco rivales y el HUD nuevo (2026-08-24)

### Cinco niveles de bot, no tres

`DIFFICULTY` pasó de `easy/normal/hard` a cinco niveles con nombre en español, ajustando el ruido
del puntaje y la probabilidad de tirar al azar:

| nivel | ruido | tira al azar |
|---|---|---|
| novato | 22 | 45% |
| facil | 14 | 28% |
| normal | 6 | 10% |
| dificil | 2 | 3% |
| maestro | 0 | 0% |

Los alias `easy`/`hard` siguen funcionando. Escalera medida (150 partidas por cruce, a 50 puntos):

```
          novato   facil  normal dificil maestro
novato      --       43%     38%     27%     35%
facil        50%    --       44%     38%     28%
normal       66%     67%    --       47%     49%
dificil      67%     57%     55%    --       45%
maestro      68%     73%     61%     53%    --
```

### El plantel

`backend/src/game/bots.js`. Cada rival es una dificultad con nombre, cara y frase:

| bot | nivel | estrellas |
|---|---|---|
| Nano | novato | 1 |
| Doña Chela | facil | 2 |
| El Catire | normal | 3 |
| La Comadre | dificil | 4 |
| El Tigre | maestro | 5 |

Se elige uno al azar por sala, o se puede pedir uno concreto con
`room:create { mode, bot: 'tigre' }`. Verificado que los cinco responden al pedido explícito.

### Retratos generados por código

`frontend/src/components/game/Avatar.jsx`. **No hay imágenes**: son SVG, pesan 0 KB y se ven
nítidos a cualquier tamaño. Los cinco bots tienen su cara diseñada (gorra, lentes, bigote, barba,
sombrero, aros); los jugadores humanos reciben una derivada de su nombre, siempre la misma.

> **Bug encontrado al hacerlo:** el generador usaba `>>` sobre un hash sin signo. Con hashes
> grandes el desplazamiento con signo da negativo y eso indexa fuera del array, devolviendo
> `undefined` y tumbando la app entera. Medido: **8 de 12 nombres de prueba fallaban** ("Invitado"
> daba índice -3). Se corrigió a `>>>`. También se usa `Object.hasOwn` para que semillas como
> "toString" no caigan en el prototipo.

### HUD

`frontend/src/components/game/Hud.jsx` reemplaza el panel lateral:

- **Mesa**: código de sala y pozo, con las 14 fichas dibujadas y las gastadas apagadas.
- **Marcador**: barras que avanzan hacia `targetPoints`, con la ronda y cuál equipo es el tuyo.
- **Jugador**: retrato, nombre, estrellas de dificultad, fichas en mano dibujadas y la frase del
  bot cuando le toca.

El backend ahora manda `targetPoints` en el estado (antes el marcador no sabía a cuánto se jugaba)
y la identidad del bot (`avatar`, `difficulty`, `frase`, `estrellas`). Se eliminó el emoji 🤖.

---

## 36. "¿Por qué no puedo jugar?" — el juego se explica solo (2026-08-24)

Tras varios reportes de "tengo la ficha y no me deja", en vez de seguir diagnosticando desde
capturas se conectó `explainPlacements` (§32) a la pantalla.

### Cómo funciona

`game:explain` por socket devuelve, para **cada ficha de la mano**, si se puede jugar y si no, por
qué, en castellano:

| motivo interno | lo que ve el jugador |
|---|---|
| (no coincide) | "no tiene 5 ni 3" |
| `fuera-del-tablero` | "no queda espacio en la mesa por ese lado" |
| `celda-ocupada` | "el lugar ya está ocupado" |
| `roza-otra-ficha` | "quedaría pegada a otra ficha de la cadena" |
| `solapa-visualmente` | "se montaría sobre otra ficha" |

`DominoGame.explicarMano(playerId)` hace la traducción; el motor sigue devolviendo motivos
técnicos.

El panel aparece **solo**, cuando es tu turno y no podés jugar. No hay que apretar nada.

> Primer intento: era un botón "¿Por qué no puedo jugar?" y la explicación se guardaba en estado.
> No servía: `onGameState` limpiaba ese estado en **cada** actualización, y llegan seguido. Ahora
> se pide desde un `useEffect` atado a `[myTurn, canPlay, board.length]`.

### Verificado

Por socket, contra el servidor, en los dos caminos:

```
extremos 5 y 3        [4|4] no tiene 5 ni 3 ... (4 fichas)
                      servidor canPlay=false, diagnostico 0 jugables => COINCIDEN

extremos 5 y 3        [3|3] no queda espacio en la mesa por ese lado
(14 fichas en mesa)   [2|3] [0|5] [4|5] se pueden jugar
```

**Pendiente de confirmar en pantalla:** el panel no se pudo capturar en el navegador porque la
automatización no logra frenar en ese instante (el estado dura poco y el bot lo resuelve). El
endpoint y los mensajes están verificados; lo que falta comprobar es el render en vivo.

---

## 37. Pantalla en blanco en producción: error #310 de React (2026-08-24)

El usuario reportó pantalla completamente en blanco en `/game?mode=1v1bot` **en Vercel**. La
consola daba:

```
Minified React error #310  ("Rendered more hooks than during the previous render")
```

### La causa

El `useEffect` que pide la explicación (§36) quedó escrito **debajo de cinco `return` tempranos**
del componente `Game` (pantalla de error, de búsqueda, de elección de modo, de lobby, y de
"cargando"). En los renders que salían por uno de esos `return`, ese hook nunca se ejecutaba; en
los que llegaban al final, sí. React cuenta los hooks por render y al ver distinta cantidad tira
el error y desmonta todo.

Se movió arriba de todos los `return`, junto al resto de los hooks, con un comentario que explica
por qué tiene que quedar ahí.

> **Regla:** en `Game.jsx` cualquier hook nuevo va arriba del primer `return` temprano. El
> componente tiene cinco, y es fácil no verlos porque están repartidos en 200 líneas.

### Por qué no se detectó antes

En local el bug era intermitente: si la partida arrancaba directo (modo bot, que auto-inicia) el
componente no pasaba por los `return` tempranos y no fallaba. En producción, con la latencia de
Render despertando, sí pasaba por el estado "cargando" y ahí reventaba.

> El build de Vite pasa igual: es un error de tiempo de ejecución, no de compilación. **Compilar
> no alcanza como verificación de un componente con hooks.**

### El panel, ya confirmado en pantalla

Quedaba pendiente de §36 verificar el render en vivo. Confirmado:

```
Por qué no podés jugar · extremos 3 y 0
  [4|4]  no tiene 3 ni 0
  [5|5]  no tiene 3 ni 0
  [2|6]  no tiene 3 ni 0
```

606x109 px, visible, debajo de la mano.

---

## 38. Dos bugs del arrastre en móvil, encontrados en un video (2026-08-28)

El usuario mandó un video de 3 minutos jugando desde el teléfono. Se extrajeron los fotogramas con
`ffmpeg` (`fps=2`, 363 imágenes) y se armaron hojas de contacto para revisarlos. Sirvió: aparecieron
dos bugs que no se veían en una captura fija.

### Bug 1 — la página scrollea mientras arrastrás

Comparando fotogramas consecutivos se ve que el encabezado aparece y desaparece: **la página está
scrolleando sola** durante el arrastre. Eso es el "salto".

En `Hand.jsx` el listener global estaba bien registrado:

```js
window.addEventListener('touchmove', handleTouchMove, { passive: false });
```

`passive: false` existe justamente para poder cancelar el gesto... **pero `handleTouchMove` nunca
llamaba a `e.preventDefault()`**. El navegador interpretaba el arrastre como scroll.

Se agregó el `preventDefault` en `touchmove`, y también en el `touchstart` de una ficha jugable
(si la ficha no se puede jugar no se toca nada, para que el dedo siga scrolleando normal).

### Bug 2 — "No es tu turno" al soltar la ficha

En el último fotograma del video aparece una barra roja con ese error. La causa:

```js
setDraggedTile((prev) => {
  if (prev && prev.isSnapped) playTile(...);   // efecto DENTRO del updater
  return null;
});
```

Dos problemas juntos:

1. Los updaters de React tienen que ser **puros**; pueden ejecutarse más de una vez.
2. En táctil, `touchend` y el `mouseup` **sintético** que el navegador dispara después caen en el
   mismo tick. Los dos updaters veían el mismo `prev` no nulo y **se emitía la jugada dos veces**.
   La segunda llegaba cuando el turno ya había pasado: *"No es tu turno"*.

El guard `isPlacing` no protegía porque se lee del closure: dos llamadas en el mismo tick ven el
mismo valor viejo.

Arreglo: el efecto salió del updater, se usa un `draggedTileRef` para leer el arrastre fuera del
ciclo de render, y un `enviandoRef` como candado contra doble envío en el mismo tick.

> Para estado que se lee desde manejadores de eventos nativos, hace falta un ref espejo. El valor
> del closure puede estar viejo, y `useState` no protege contra dos llamadas en el mismo tick.

### Verificado

Con viewport de móvil (375x812), simulando un arrastre táctil real:

```
touchmove cancelado : true
scroll antes/despues: 0 / 0
la pagina se movio  : false
```

> Los videos del usuario se pueden revisar: `ffmpeg -i video.mp4 -vf "fps=2,scale=540:-1" f_%03d.jpg`
> y después una hoja de contacto con PIL. Se ven cosas que una captura fija no muestra.

---

## 39. La partida sobrevive al refresco y a salir de la app (2026-08-28)

El usuario: *"cuando quiero refrescar la página me manda a otra partida, si me salgo a ver un
WhatsApp también se buguea. Quiero que la partida solo se cierre cuando yo o el otro humano no
quiera seguir."*

### La raíz

```js
socket.userId = `guest-${socket.id}`;   // gameSocket.js
```

Cada conexión trae un `socket.id` nuevo, así que **cada refresco convertía al jugador en otra
persona**. El servidor ya sabía reconectar (`joinRoom` detecta `existingPlayer` y actualiza el
`socketId`), pero nunca lo reconocía. Y el frontend, al no encontrar sala, creaba una nueva.

Además `room:join` rechazaba a **todos** los invitados, así que un invitado no podía volver ni a su
propia mesa.

### El arreglo, en cuatro piezas

1. **Id de invitado estable.** `idDeInvitado()` en `services/socket.js` lo genera una vez y lo
   guarda en el navegador; viaja en el handshake como `auth.guestId`. El backend lo acepta si
   coincide con `/^guest-[a-z0-9]{6,40}$/i`, y si no cae al comportamiento viejo.

2. **El invitado puede volver a SU mesa.** `room:join` ahora deja pasar a un invitado solo si ya
   figura entre los jugadores de esa sala. A una sala ajena sigue rechazándolo.

3. **La partida se recuerda.** El código de sala se guarda en `localStorage` con su modo y la hora.
   Al entrar se intenta volver a ella antes de crear una nueva; si ya no existe, se olvida y se
   crea. Se descarta sola a las 6 horas, y se borra al terminar la partida.

4. **Reconexión del socket.** Al reconectar, el servidor todavía tiene el `socketId` viejo y no
   llega nada. Ahora se re-emite `room:join` en `connect` y en `reconnect`.

### Verificado

```
sala 46PYEL | mano: 56 66 16 55 14 11 12 | rival: Doña Chela
--- refrescar: socket nuevo, mismo guestId ---
volvi a 46PYEL | mano: 66 16 55 14 11 12 | tablero: 2 fichas | rival: Doña Chela
=> RECUPERO LA MISMA PARTIDA, INTACTA

invitado ajeno a esa sala -> rechazado
```

La ficha jugada antes del refresco ya no está en la mano: es la partida real, no una nueva.

### Margen del tablero: de 1 a 2 celdas

El usuario reportó que la cadena tocaba el borde de abajo. Medido: con 1 celda quedaban 27px de
aire en escritorio pero **solo 15px en teléfono**, y la cadena llega a la fila o columna extrema en
el **51% de las jugadas** (desde que se quitó la regla de banda en §32). Con 2 celdas quedan 49px
en escritorio y 28px en teléfono. Cuesta ~8% de tamaño de ficha.

---

## 40. El panel se quedaba viejo justo cuando más lo necesitabas (2026-08-28)

El usuario mandó una captura: mano de **4 fichas**, panel de "por qué no podés jugar" listando
**3**, extremos 0 y 6, y él con un 6 en la mano que el juego no le dejaba jugar.

### La raíz

El efecto que pide la explicación tenía estas dependencias:

```js
}, [socket, actualRoomCode, myTurn, gameState?.canPlay, gameState?.board?.length]);
```

**La mano no estaba.** Al robar del pozo la mano crece, pero `canPlay` sigue en `false`, sigue
siendo tu turno y el tablero no cambia: ninguna dependencia cambia, el efecto no se repite y el
panel sigue mostrando la mano de antes de robar. Justo la ficha que acabás de levantar —la que
motiva la pregunta— es la única que nunca se explica.

Se agregó `manoFirma`, una firma de la mano, a las dependencias.

### Verificado con un A/B en el navegador

Se llevó una partida real hasta el estado exacto (mano bloqueada, pozo con fichas) y se robó sin
recargar:

```
codigo viejo:  mano 6 -> el panel lista 5   (el bug)
codigo nuevo:  mano 6 -> el panel lista 6   (aparece la [0|3] recien robada)
```

### Lo otro que salió a la luz: "tengo la ficha y no me deja"

Medido sobre 2.331 manos: **en el 25% de los turnos en que no podés jugar, sí tenés una ficha que
coincide con un extremo** y está trancada por geometría, no por las reglas del dominó. Son 5,46
fichas así por mano. No es un caso raro: es la queja del usuario, y le pasa seguido.

El motivo dominante que reporta el diagnóstico es `roza-otra-ficha` (11.131 de 13.949), pero
**eso no significa que sacar esa regla lo arregle**: los chequeos están encadenados y el primero
que falla se lleva toda la culpa. Ya se midió en §33 que quitarla no destraba ni una jugada.

A/B del tamaño de la mesa, 400 partidas por tamaño:

| grid | trancas | turnos trancado | ...teniendo la ficha del extremo | fichas así por mano |
|---|---|---|---|---|
| 20x20 | 38.9% | 38.0% | **25.0%** | 5.46 |
| 22x22 | 34.7% | 37.2% | 21.5% | 4.39 |
| 24x24 | 30.4% | 36.5% | 20.6% | 4.13 |
| 26x26 | 27.9% | 36.2% | **17.6%** | 3.39 |

Ninguna ficha se sale de la rejilla en ningún tamaño. El costo es visual: la mesa se escala
entera, así que con 24x24 las fichas quedan al 83% del tamaño actual y con 26x26 al 77%.

Queda **sin decidir** a la espera del usuario, porque toca el equilibrio con la regla de móvil
primero. La alternativa que evitaría el costo es que el tablero haga zoom al área ocupada por la
cadena en vez de a la rejilla completa: así la mesa podría crecer sin achicar las fichas.

---

## 41. El 2v2 jugable: vos y tres bots (2026-08-28)

El usuario pidió desarrollar la segunda parte del motor —el 2v2— y probarla primero con tres bots
antes de meter personas. Buen orden: con bots se prueban cientos de partidas en segundos.

### Primero medir, después construir

Antes de tocar UI se corrieron **300 partidas 2v2 completas** en el motor puro:

```
partidas terminadas: 300 / 300
manos: 1929 | domino: 1031 | trancas: 898 (46.6%)
jugadas: 46937 | pases: 15977 (25.4%)
gana equipo 1: 156 | equipo 2: 144
```

Sin pozo, 28 fichas repartidas, equipos `[1,2,1,2]`, ningún bot intentó robar y ninguna acción
fue rechazada. El reparto de victorias (156/144) dice que no hay ventaja de asiento.

**Falsa alarma de seguridad, resuelta.** Un chequeo grueso marcó que `viewFor` exponía manos
ajenas. Es `lastRound`, que lleva las manos de la ronda **anterior** —ya reveladas en pantalla al
cerrar la mano—. Verificado sobre 11.514 momentos: las 77 "coincidencias" con la mano actual eran
todas de manos de 1 ó 2 fichas (casualidad, 1 en 28) y el `lastRound` siempre era de la ronda
previa. No hay fuga.

### El modo `2v2bots`

Usa **el mismo `gameFormat` que el 2v2 real** (`domino-2v2-v1`). Es a propósito: así lo que se
prueba con bots es exactamente lo que va a correr con humanos, no una variante paralela que se
desincronice.

`RoomManager.startGame` dejó de estar cableado al `1v1bot`: ahora mira `room.config.bots` y
completa la mesa con esa cantidad. `elegirBots(n)` devuelve rivales **distintos**, porque tres
"Doña Chela" en la misma mesa confunden.

### El compañero se sienta enfrente

El frontend repartía los rivales por orden de lista (`opponents[0]`, `[1]`, `[2]`). En 2v2 eso
ponía al compañero —asiento +2— en un costado, como si fuera un rival. Ahora las posiciones se
calculan por asiento relativo al tuyo: **+2 enfrente, +1 a la derecha, +3 a la izquierda**, con la
etiqueta "tu compañero" y el color de equipo en el borde (azul los tuyos, rojo los rivales).

Los dos asientos laterales antes no se dibujaban en la mesa: solo aparecían en la lista del
costado. Ahora se sientan a los lados en pantalla grande y en una fila sobre el tablero en
teléfono.

### El desborde horizontal que salió de paso

Al meter el tablero dentro de un contenedor flex pasó a ser un *flex item*, y esos no bajan de su
ancho natural (`min-width: auto`). El tablero mide 20 celdas x 32px = **640px**, así que empujaba
la página: `scrollWidth` 653 contra `clientWidth` 375 en un teléfono. Se arregló con `min-w-0` en
la columna. Medido después: 375 = 375, sin desborde, y el 1v1 también quedó sin desborde.

### Estado

Motor 53/53, backend **87/87** (18 pruebas nuevas para el modo), build ok. Probado corriendo: una
partida completa por socket (ronda jugada y puntuada, sin pozo, compañero en el asiento 2) y la
mesa vista en el navegador en escritorio y en teléfono.

Falta el 2v2 entre personas de verdad: lobby de 4, equipos, y qué pasa si uno se va.

---

## 42. La causa real de "tengo la ficha y no me deja": la cadena se choca sola (2026-08-28)

El usuario volvió con dos capturas del 2v2. La segunda trae el panel:

```
EXTREMOS 3 Y 5
[0|5] el lugar ya está ocupada
[3|4] quedaría pegada a otra ficha de la cadena
```

Dos fichas legales, las dos trancadas por geometría. Se investigó a fondo, midiendo, y el
resultado descarta las tres hipótesis que parecían obvias.

### Hipótesis 1: la regla anti-amontone. FALSA

Se hizo la regla configurable (`layout.permitirRoce`) y se midió apagándola:

| formato | con la regla | sin la regla |
|---|---|---|
| 1v1 | 24.5% | 24.3% |
| 2v2 | 29.9% | 29.8% |

No cambia nada, y sin ella quedan 34 fichas pegadas a vecinas que no son de su cadena. §33 tenía
razón. La bandera se revirtió: no se deja config muerta.

### Hipótesis 2: el chequeo visual es demasiado estricto. FALSA

Se midió la profundidad real del solape en 2.541 rechazos (celda = 32px):

```
5-16px (medio celda, desvío del dibujo)      6   0.2%
32px o más (choque real de celda entera)  2535  99.8%
```

El dibujo no miente: son choques de verdad.

### Hipótesis 3: elegir mejor el lugar. FALSA, y empeora

Se probó un selector que prefiere la colocación con más aire alrededor de la punta libre:

| formato | recta (actual) | "más aire" |
|---|---|---|
| 1v1 | 24.8% | **31.5%** |
| 2v2 | 29.9% | **38.3%** |

Segunda confirmación de §33. **No reintentar.**

### La causa verdadera

Con la regla del roce apagada, el motivo que queda es el verdadero:

| motivo | grid 20 | grid 26 |
|---|---|---|
| **se montaría sobre otra ficha** | **83.6%** | **90.6%** |
| el lugar ya está ocupado | 14.5% | 6.0% |
| no cabe en la mesa | 3.5% | 3.9% |

**No falta espacio: la cadena se enrolla y se tapa a sí misma.** Por eso agrandar la mesa solo
lleva el 2v2 de 29.9% a 22.3%: ataca el 4% del problema.

### La conclusión de fondo

El lugar físico donde cae la ficha **no es una decisión de dominó**: la regla dice "va en el
extremo izquierdo o en el derecho", nada más. Hoy el dibujo tiene poder de veto sobre una jugada
legal, y eso está al revés. En una mesa real, cuando no hay sitio, los jugadores corren las fichas.

La salida es que la posición se **derive** de la secuencia (trazado en serpentina) en vez de
quedar congelada donde cayó. Así una jugada legal siempre tiene lugar, por construcción. Queda a
decisión del usuario porque cambia cómo se juega: hoy elige el punto exacto donde suelta la ficha.

### Dato aparte

El 2v2 se tranca más que el 1v1 (29.9% contra 24.5%): son cuatro manos y no hay pozo. El modo que
el usuario está probando es justo el peor.

---

## 43. Trazado en serpentina: la posición se calcula, no se elige (2026-08-28)

Decisión del usuario tras la medición de §42. El dibujo dejó de tener poder de veto sobre una
jugada legal.

### Cómo funciona

La cadena se traza a partir de la **primera ficha de la mano** (la que se juega con el tablero
vacío, marcada con `side: 'first'`). Desde ahí salen dos mitades:

- La **mitad derecha** avanza hacia la derecha y, al llegar al borde, **baja** una fila y sigue al
  revés.
- La **mitad izquierda** avanza hacia la izquierda y, al llegar al borde, **sube** una fila.

Cada mitad vive en su propia franja del tablero, así que no se cruzan entre sí ni consigo mismas.
Como consecuencia, **una ficha ya puesta no se mueve nunca**: jugar por la izquierda no corre lo
que hay a la derecha. Las filas van cada 3 celdas, que es lo que necesita un doble cruzado.

`placementsFor` devuelve **como mucho una posición por lado**. El jugador elige el extremo, que es
la única decisión que existe en el dominó.

Los dobles ocupan una sola columna y se dibujan subidos media celda para quedar centrados en la
fila. Ese ajuste es **por ficha y no se acumula**, así que el dibujo ya no se desvía de la
cuadrícula (antes los desvíos se sumaban a lo largo de la cadena).

### El resultado, medido

| | antes | ahora |
|---|---|---|
| ficha legal sin lugar (1v1) | 24.5% | **0.0%** |
| ficha legal sin lugar (2v2) | 29.9% | **0.0%** |
| trancas 1v1 | 36-40% | **12.7%** |
| trancas 2v2 | 47% | **23.1%** |

Casi la mitad de las trancas eran falsas: no eran del dominó, era la cadena tapándose sola. Las
que quedan son las de verdad.

### Lo que se borró

Se fueron 10 pruebas del motor y 5 asserts del backend que codificaban el trazado libre: las tres
opciones por ficha, los giros, los dobles del borde ofreciendo las dos direcciones. Ya no
describen el juego. En su lugar entraron 6 pruebas nuevas, entre ellas dos que recorren partidas
enteras y verifican que **ninguna celda se ocupa dos veces** y que **nadie queda trancado teniendo
una ficha que pega con un extremo**.

También desaparecieron `celda-ocupada`, `roza-otra-ficha` y `solapa-visualmente` del panel de
"por qué no podés jugar": ya no pueden ocurrir. Queda `no-cabe-en-la-mesa`, que solo saltaría si
de verdad se acabara el tablero.

Motor 49/49, backend 86/86, build ok. Probado corriendo: partida 2v2 completa por socket y una
ficha jugada arrastrándola en el navegador (mano 7 -> 6).

### Pendiente visual

Cuando la cadena cambia de fila, las dos filas se ven separadas: no hay nada que dibuje la vuelta.
Se lee bien, pero no parece una cadena continua. Queda para mejorar si al usuario le molesta.

---

## 44. La vuelta de la cadena, dibujada (2026-08-28)

El usuario mandó una captura del 2v2 con la cadena partida en dos filas sueltas: *"tiene que
tener la misma lógica que el 1v1, eso no sirve así"*. Era el pendiente que quedó abierto en §43.

### Qué faltaba

Las filas iban cada 3 celdas y no había nada entre ellas. La cadena se leía como dos renglones de
texto, no como una cadena de dominó.

Ahora las filas van **cada 2 celdas** y la ficha que no entra en la fila **se pone parada y ocupa
la celda de en medio**: toca la fila que termina y la que empieza. Es la vuelta de verdad, la
misma que uno hace en una mesa cuando se le acaba el borde.

Para que siempre haya sitio para esa ficha, **se reserva la última columna de cada fila**.

### El doble que se metía en el pasillo

Al medir saltó que la cadena se pisaba: 2 pruebas en rojo. La causa: los dobles sobresalían
siempre hacia abajo, y en la mitad de arriba (que sube de fila) eso los metía justo en la celda
del pasillo que usaba la ficha que había doblado antes. Pasaba solo cuando el primer tile de una
fila nueva era un doble.

Arreglado: **el doble sobresale hacia donde avanza su mitad de la cadena** — abajo la derecha,
arriba la izquierda. Y el ajuste visual que lo centra en la línea ahora se calcula a partir de
cuál de sus dos celdas está sobre la fila, en vez de asumir siempre la de arriba.

### Verificado

```
pares de fichas seguidas revisados: 172.661
pares que NO se tocan (cadena cortada): 0
momentos con la cadena en mas de 2 filas: 8.514
```

Quedó como prueba fija del motor. También se quitó la prueba de la regla anti-amontone: con la
serpentina las filas **tienen** que tocarse, si no la cadena se ve partida. Esa prueba pedía lo
contrario de lo que ahora queremos.

Motor 49/49, backend 86/86, build ok. Visto corriendo en escritorio y en teléfono, sin desborde
horizontal.

---

## 45. La pantalla es la mesa, no una página con una mesa adentro (2026-08-28)

El usuario mandó capturas del truco de su grupo y pidió aplicar la jerarquía visual: lo principal
grande, lo secundario más chico, y así. Se acordó un orden de cinco pasos; esto cubre los tres
primeros. **No se tocó el motor**: es todo cáscara.

### 1. El paño se acerca a la cadena

Antes se dibujaban siempre las 20x20 celdas, aunque la cadena ocupara una fila. En un teléfono
eso dejaba las fichas a 31px con casi todo el paño vacío. Ahora la vista se ajusta a la caja que
ocupa la cadena (más las siluetas de dónde puede caer, para que el destino nunca quede fuera),
con un mínimo de 12 celdas para que una sola ficha no se vea ridícula.

Al principio de la mano las fichas se ven al doble. Cuando la cadena crece hasta ocupar el
tablero entero, el tamaño llega como máximo al de antes: nunca queda peor.

### 2. El paño dejó de ser cuadrado

Un teléfono es alto y la cadena serpentea en filas, así que el alto sobrante servía. El paño
ahora ocupa lo que le den y la escala la manda el eje que quede más justo. Antes, con el tablero
cuadrado en una pantalla alta, quedaba un hueco negro de 200px entre la mesa y la mano.

### 3. Fuera la barra, el banner y las tarjetas

- Se sacaron `Navbar`, `TopBanner` y `AdSidebar` de la pantalla de juego.
- La pantalla es `100dvh` sin scroll. **Una pantalla de juego no debería scrollear nunca**, y
  antes en el teléfono había que bajar para ver la mano.
- El marcador, la sala, la ronda y el pozo se escriben **sobre la madera**, sin caja.
- Los tres rivales son cara + nombre + fichas apoyados en el paño, sin caja. Primero se probaron
  a media altura de los costados, como en una mesa real, pero **se montaban sobre la cadena**, que
  es lo único que no puede taparse. Quedaron en la banda de arriba.
- La mano dejó de ser una tarjeta: es una franja al pie de la mesa.
- El panel de "por qué no podés jugar" tiene tope de alto, porque crecía y empujaba el tablero.

Medido en un teléfono de 375x812: la mesa ocupa el **54%** de la pantalla, y no hay scroll ni
vertical ni horizontal.

### La publicidad no se borró, se mudó

El banner pasa al cierre de ronda y el lateral a la pantalla de espera: los momentos en que el
jugador respira y sí mira. Es plata del usuario, no se toca sin avisar.

### Falta

Los pasos 4 y 5 que se acordaron: menús chiquitos que abran ventanitas, y el ambiente (luz,
sombra y perspectiva alrededor de la mesa). En escritorio la columna derecha con el marcador y
los jugadores sigue en tarjetas; queda para el paso 4.

---

## 46. El arrastre mandaba datos viejos, y la auditoría del 1v1 (2026-08-29)

El usuario reportó desde producción: *"Colocación inválida"* y *"hay momentos que quiero jugar
una pieza y se pone en oscuro todo"*. Son el mismo bug.

### La causa: un espejo que iba un render atrasado

`draggedTileRef` se sincronizaba con un `useEffect`:

```js
useEffect(() => { draggedTileRef.current = draggedTile; }, [draggedTile]);
```

Al soltar, `handleDragEnd` lee ese ref (tiene que leerlo, porque corre fuera del render). Pero el
efecto corre **después** del render, así que si soltabas rápido el ref todavía tenía el estado
anterior. De ahí los dos síntomas:

- con la posición vieja, el servidor la rechazaba: **"Colocación inválida"**;
- sin el enganche marcado, no se enviaba nada: **la ficha no se jugaba**.

Ahora el ref se escribe a mano junto con el estado, en la misma línea.

### El cliente dejó de dictar coordenadas

De fondo había algo peor, y va contra la regla 8 (*el servidor manda*): el cliente calculaba
`x, y, x2, y2, orientation` y se los mandaba al servidor, que los comparaba **exactos** contra los
suyos. Cualquier diferencia —una versión distinta desplegada, un estado a medio actualizar— daba
"Colocación inválida".

Con el trazado en serpentina hay **una sola posición por extremo**, así que mandar coordenadas era
redundante. Ahora el cliente manda solo `tileIndex` y `side`, y la posición la calcula el servidor.

Medido: **65.650 jugadas enviadas sin coordenadas, 0 rechazos** (1v1 y 2v2). Antes, con
coordenadas, 100 jugadas también pasaban en local: el bug solo aparecía con el arrastre real, que
es donde el ref quedaba viejo.

### La mano ya no se queda apagada

`isPlacing` apaga la mano mientras se espera la respuesta, y solo se limpiaba al recibirla. Si la
respuesta no llegaba, la mano quedaba apagada para siempre. Se agregó un rescate a los 6 segundos.

### Auditoría de las reglas del 1v1

El usuario pidió revisar el motor de reglas completo. Se verificaron diez reglas sobre
**300 partidas y 2.211 manos**:

| Regla | Resultado |
|---|---|
| 28 fichas, 7 por jugador, pozo de 14 | correcto |
| Las 28 fichas son distintas | correcto |
| Primera mano: sale el doble más alto | correcto (298 de 300) |
| Si nadie tiene doble, sale la de más pips | correcto (2 de 300) |
| Manos siguientes: sale quien ganó | correcto |
| Toda jugada legal coincide con un extremo | correcto |
| No se pasa si queda pozo | correcto |
| No se pasa teniendo jugada | correcto |
| Tranque: gana el de menos pips y suma los del rival | correcto |
| Tranque empatado: nadie suma | correcto |
| Dominó: el que se queda sin fichas suma los del rival | correcto |
| La partida termina al llegar al objetivo | correcto |

**Ninguna regla violada.** De paso quedan los números reales del 1v1: trancas 12.3%, 1.940 manos
ganadas por dominó contra 271 por tranque.

---

## 47. Menús chiquitos y luz de mesa: los pasos 4 y 5 (2026-08-29)

Cierran el plan de cinco pasos que se acordó en §45.

### Paso 4: menús que no compiten

El selector de mesa era una pastilla que decía "Mesa". Ahora es un botón de 32px con su ventanita,
pegado al borde del paño, como los iconos del truco.

**Se detectó un agujero grave al sacar la barra de navegación en §45: no quedaba forma de salir de
la partida.** Se agregó un icono de salida al lado del de la mesa. Es la clase de cosa que no
aparece en ninguna prueba automática y que solo se ve jugando.

### Paso 5: la lámpara

Dos degradados sobre el paño: luz cálida cayendo desde arriba y los bordes apagándose. Más una
sombra profunda bajo la baranda. Es lo que da la sensación de estar sentado a la mesa.

**No se le puso perspectiva al tablero a propósito.** Inclinarlo deformaría las fichas y rompería
las cuentas del arrastre: el dedo caería en un lugar y la ficha en otro. La perspectiva va en el
ambiente, no en la superficie de juego.

### Dos arreglos de jerarquía que salieron probando

- El "pozo N" del encabezado quedaba **tapado por el avatar del rival**, y encima repetía lo que
  ya se ve abajo. Se quitó de arriba.
- El pozo entero (14 fichas boca abajo) se comía media pantalla aunque no hubiera que robar. Ahora
  solo se despliega cuando de verdad podés robar; el resto del tiempo es una línea.

### Medido en un teléfono de 375x812

| | antes de §45 | ahora |
|---|---|---|
| la mesa ocupa | ~30% con scroll | **57%, sin scroll** |
| ficha en la mesa al empezar la mano | 31x15 px | **27x55 px** |
| forma de salir de la partida | barra de arriba | icono en el paño |

Motor 49/49, backend 86/86, build ok.

---

## 48. La pantalla entera es el paño (2026-08-29)

El usuario: *"la mesa debe ocupar toda la pantalla... debe poder verse las piezas que tengo en un
sitio de la mesa, el pozo y el resto de cosas. Diseña de nuevo"*.

En §45 la mesa ocupaba el 54% y lo demás vivía en bloques debajo. Ahora **el paño es la pantalla**:

- La baranda toca los cuatro bordes de la ventana. Se le quitó el tope de 768px y el paño dejó de
  estar centrado dentro de una página.
- **La mano se apoya sobre el paño**, en una banda oscura al pie: es la sombra del canto de la
  mesa más cercano al jugador. Ya no es un cajón aparte debajo del tablero.
- El pozo, el marcador, los rivales y los menús también van sobre el paño.

### El detalle que hacía falta: reservarle sitio a la cadena

Si la mano se apoya encima, la cadena podía quedar escondida detrás. `Board` recibe ahora
`insetInferior`: la altura real de la mano, medida con un `ResizeObserver`. La cadena se centra en
lo que queda libre arriba, no en el paño completo.

### Tres cosas que salieron probando

- **El degradado de la banda no servía.** `from-black/95 to-transparent` a lo largo de 297px
  llegaba al 45% justo donde están las fichas, y se perdían contra el verde. Se cambió por una
  banda casi sólida con el borde de arriba difuminado.
- **Siete fichas se partían en dos filas.** Se achica la ficha a partir de seis en mano: siete
  seguidas se leen mejor que seis y una sola abajo.
- **Los menús quedaban debajo de la mano**, cortados. Se fueron al costado izquierdo, a media
  altura.

### Medido en un teléfono de 375x812

| | §45 | ahora |
|---|---|---|
| la mesa ocupa | 54% | **98%** |
| la mano | cajón aparte debajo | sobre el paño, una sola fila |
| scroll | ninguno | ninguno |

Verificado también en 1280x800: el paño llena la ventana y la cadena queda centrada (626 de 626).

Motor 49/49, backend 86/86, build ok.

---

## 49. El bug estaba en los dobles, no en la mecánica (2026-08-29)

El usuario, con razón: *"es una estupidez romperlo todo para que no me deje solo un error, en vez
de arreglar la mecánica que está bloqueando la pieza en ciertos puntos"*. Y sobre la serpentina:
*"que se vea en varias líneas es un peo porque la gente no sabe por dónde va ni dónde puede jugar"*.

Tenía razón en las dos cosas. **Se revirtió la serpentina** (§43, §44) y se volvió a la colocación
libre: el jugador acomoda la cadena, número con número, sin amontonarse.

### Cómo se encontró el bug de verdad

Se dibujó una posición trabada real en vez de seguir suponiendo:

```
17 .D...#...
18 .D####...
   (D = extremo derecho, valor 3)
ficha [0|3] por right:
    roza-otra-ficha  celdas (6,17)-(7,17)
```

El extremo era el **doble [3|3]**, parado en la columna 5. El motor ofrecía **una sola** salida,
`(6,17)`, que estaba pegada a la cadena. A la izquierda del doble, `(4,17)` y `(3,17)`, estaba
libre — y el motor ni lo miraba.

La causa, en `layout.js`:

```js
if (side === 'left')  add({ ...x: ex - 2... });
else                  add({ ...x: ex + 1... });
if (ey <= 1 || ey >= GRID - 2) { /* recién aquí miraba los otros lados */ }
```

**La dirección se tomaba de si era el extremo izquierdo o el derecho de la cadena, no de la
geometría**, y solo miraba los otros costados si el doble estaba pegado al borde del tablero. Es
exactamente el error corregido en §24 para las fichas normales, que nunca se corrigió para los
dobles.

Un doble está cruzado sobre la cadena: la cadena puede salir por **sus cuatro costados**. Ahora se
ofrecen los cuatro y los chequeos de siempre filtran los ocupados.

### Medido

| | antes | después |
|---|---|---|
| **tenías la ficha y no te dejó** (1v1) | 24.7% | **3.8%** |
| **tenías la ficha y no te dejó** (2v2) | 30.3% | **5.0%** |
| trancas 1v1 | 37.6% | **16.4%** |
| trancas 2v2 | 48.1% | **25.3%** |

Seis veces menos trabas, **sin tocar la mecánica**. Todo lo de §42 a §44 sobra: el 83.6% de
`solapa-visualmente` era consecuencia de que el doble no ofrecía salidas y la cadena se enrollaba
sobre sí misma.

### Lo que también se probó y no sirvió

- **Giro de esquina** (perpendicular apoyada en la celda siguiente): 24.7% → 24.6%. No cambia nada
  por sí solo, así que no se dejó.
- **Elegir la colocación con más salidas para la siguiente** (un ply de anticipación): empeora,
  24.4% → 26.7%. Tercera heurística de colocación que falla. **No reintentar.**

### El zoom se fue

La mesa y las fichas tienen **un solo tamaño** durante toda la mano. El acercamiento a la cadena
(§45) cambiaba de escala en cada jugada y molestaba más de lo que sumaba.

De paso se arregló una medición frágil: el paño se medía a medio asentar (313px cuando terminaba
midiendo 792) y no se volvía a medir. Ahora también se mide en un `requestAnimationFrame`.

Motor 54/54, backend 87/87, build ok.

---

## 50. La cadena se iba contra la pared (2026-08-29)

El usuario mandó una captura con el doble 3 injugable y el panel diciendo *"no queda espacio en
la mesa por ese lado"*, con la mesa **casi vacía**. Su pregunta era la correcta: *"¿te parece que
no hay espacio? Sí hay. Entonces es una regla mal escrita"*.

No era la regla: era **hacia dónde había crecido la cadena**. Se midió:

```
turnos trancados teniendo la ficha del extremo: 3.4%
extremos de la cadena pegados al borde del tablero: 19.2%
motivos:
   fuera-del-tablero (doble)   577   <- 66% de las fichas trancadas
   roza-otra-ficha             176
   ...
```

**Dos de cada tres trabas eran un doble contra la pared.** Un doble se cruza sobre la cadena, así
que necesita la celda siguiente a la punta libre; si la punta está en la fila 0, esa celda no
existe. Con la ficha normal no se nota, porque puede doblar.

### Por qué llegaba al borde

El bot elegía dónde poner la ficha así:

```js
const recta = mejor.opciones.find((a) => a.placement.orientation === extremo.orientation);
return recta || mejor.opciones[0];
```

Seguir derecho siempre, sin mirar el borde. La cadena avanzaba en línea hasta chocar con la pared,
y ahí el siguiente doble quedaba sin salida.

Ahora primero se descartan las colocaciones que dejan la punta contra el borde, y **recién
después** se prefiere seguir derecho. Lo mismo en `straightestPlacement`, que es lo que usa el
servidor cuando el cliente no manda posición.

### Medido

| | antes | después |
|---|---|---|
| **extremos pegados al borde** | 19.2% | **2.1%** |
| **doble sin espacio** | 577 | **132** |
| tenías la ficha y no te dejó (1v1) | 3.8% | **2.6%** |
| trancas 1v1 | 16.4% | **15.1%** |

En 2v2 quedó igual dentro del ruido (5.0% → 5.2%): con cuatro manos y sin pozo, la cadena la
arman entre todos y el bot pesa menos.

### Acumulado del día

| | al empezar | ahora |
|---|---|---|
| tenías la ficha y no te dejó (1v1) | 24.7% | **2.6%** |
| tenías la ficha y no te dejó (2v2) | 30.3% | **5.2%** |

Nueve veces menos trabas en 1v1, sin cambiar la mecánica: colocación libre, el jugador acomoda,
número con número.

Lo que queda (`celda-ocupada`, `roza-otra-ficha`) es la cadena cruzándose consigo misma, que es el
precio de que el jugador elija dónde poner cada ficha.

Motor 54/54, backend 87/87, build ok.

---

## 51. El doble contra el borde ya entra doblando la cadena (2026-08-29)

El usuario, viendo que el doble blanco sí le ofrecía los dos costados: *"¿puede poner el doble 3
como la otra pieza a los lados, siempre y cuando esté en un borde? ¿No se puede?"*.

Eran dos casos distintos aunque parecieran el mismo:

- **El doble blanco**: la punta de la cadena tenía aire, así que los cuatro costados del doble del
  extremo funcionaban (§49).
- **El doble 3**: la punta estaba contra la fila 0. Un doble se cruza en la celda **siguiente** a
  la punta libre, y esa celda no existía.

### La salida

Si la cadena **dobla** en ese punto, la dirección nueva es perpendicular, y el doble cruzado
respecto de esa dirección sí entra: en vez de necesitar la fila -1, ocupa la columna de al lado.
Es lo mismo que ya podía hacer una ficha normal (girar), que por eso no sufría el problema.

Se ofrece solo **como salida de emergencia**, cuando cruzarse más allá de la punta no entra, para
que el doble se siga viendo cruzado siempre que se pueda.

### Medido

| | antes | después |
|---|---|---|
| tenías la ficha y no te dejó (1v1) | 2.6% | **1.5%** |
| tenías la ficha y no te dejó (2v2) | 5.2% | **3.9%** |
| trancas 1v1 | 15.1% | **14.0%** |
| **`fuera-del-tablero (doble)`** | 132 | **0** |

El motivo desapareció de la lista. Queda una prueba fija del motor para que no vuelva.

### El día completo

| tenías la ficha y no te dejó | al empezar | ahora |
|---|---|---|
| 1v1 | 24.7% | **1.5%** |
| 2v2 | 30.3% | **3.9%** |

Dieciséis veces menos trabas en 1v1, **sin cambiar la mecánica**: colocación libre, el jugador
acomoda, número con número, sin amontonarse.

Lo que queda (`celda-ocupada` 341, `roza-otra-ficha` 335) es la cadena cruzándose consigo misma
cuando uno la acomoda encima de su propio recorrido. Es el precio de elegir dónde va cada ficha, y
el jugador lo puede evitar mirando la mesa.

Motor 55/55, backend 87/87, build ok.

---

## 52. El marcador estaba rotulado al revés (2026-08-29)

El usuario ganó una partida y el marcador le decía **VOS 93 · ELLOS 108**, con el modal diciendo
*"El equipo 2 ganó 108 a 93"*. Tenía razón en desconfiar.

**Las cuentas estaban bien; las etiquetas al revés.** En §45, al escribir el marcador sobre la
madera, se hardcodeó:

```jsx
<div>Vos</div>   {gameState.teamScores?.[1]}
<div>Ellos</div> {gameState.teamScores?.[2]}
```

Él había entrado con `?join=`, así que era el **asiento 1, equipo 2**: veía los puntos del rival
bajo su propio nombre. Ahora se rotula con `miJugador.team`.

La suma de las rondas no tenía nada malo: ya se auditó en §46 sobre 300 partidas y 2.211 manos, y
el modal —que sí usaba el equipo correcto— mostraba el resultado real.

**No se pudo reproducir la mitad intercambiada corriendo**: hace falta una segunda cuenta para
entrar de segundo, y los invitados solo pueden crear mesas contra bots. El arreglo es un mapeo
directo del equipo del jugador, y el síntoma de la captura lo explica entero.

## 53. El gesto propio caía en la banda oscura, y el paño tiene tela (2026-08-29)

- **Los emojis propios no se veían.** Estaban en `bottom-8`, que desde §48 es la banda oscura
  sobre la que se apoya la mano. Ahora se posicionan por encima de esa banda, usando su altura
  medida. Verificado corriendo: el gesto sale en y=514 y la banda empieza en 619.
- **El paño tenía un verde plano.** Se le agregó grano de tela: dos rayados finos cruzados que
  hacen el tejido y ruido `feTurbulence` para que no se note la trama repetida. Va en un
  pseudo-elemento porque cada tema del paño ya usa su `background-image` para el color y la luz.

Motor 55/55, backend 87/87, build ok.

---

## 54. Salir de la partida de verdad (2026-08-29)

El usuario: *"hay uno pero para desloguear, y regresás y está la misma partida. Agregá un botón
que uno pueda salir de la partida, quería probar los cambios"*.

El icono de salida solo navegaba al dashboard. La sala seguía guardada en `localStorage` (§39,
para no perder la mesa al irse a WhatsApp), así que al volver se reentraba a la misma partida —
y encima con el código viejo cargado, que era justo lo que no lo dejaba probar los arreglos.

Ahora `salirDeLaPartida()` hace las tres cosas: avisa al servidor con `room:leave`, olvida la
partida guardada y navega. El icono pide confirmación antes, porque un dedazo no puede costarte la
mesa. El "Salir al dashboard" del cierre de ronda usa la misma función.

**Un invitado terminaba en `/login`**, porque el dashboard pide cuenta. Ahora cae en la portada.

Verificado corriendo, el ciclo completo:

```
en partida:   sala 503ZH7 guardada
salir:        partida guardada -> null, cae en "/"
volver:       sala ZDM9CA  (partida nueva, no la vieja)
```

Motor 55/55, backend 87/87, build ok.

---

## 55. La mesa ahora es una foto generada con IA (2026-08-30)

El usuario pidió mejorar el borde. Se le mostraron cuatro opciones hechas con degradados de CSS
—las llamó "basura"— y después cuatro hechas con ruido procedural iluminado, como el cuero de §27
—"qué horrible"—. Entonces pidió generarlas con IA de imagen. **A la primera dijo que sí.**

La diferencia está en el material: la veta del nogal con sus poros y la trama del paño hilo por
hilo no salen de un degradado ni de ruido. **De ahora en adelante los materiales del juego se
generan con IA**, no con CSS.

- Modelo: `nano_banana_pro` (Google), 2K, 9:16 para la pantalla del teléfono. ~1 crédito por
  imagen, así que se puede iterar.
- Lo que hay que pedirle: mesa **a plomo, centrada, con el marco cerrado en los cuatro lados y sin
  lámpara en el encuadre**. La primera salió con una lámpara preciosa ocupando el tercio superior,
  que es justo donde van el marcador y el rival.

### Cómo entró al juego

La imagen se cortó en dos piezas, medidas sobre el archivo (baranda de 188px a los lados y 246
arriba, en 1536x2752):

- `public/mesa-nogal.webp` (28 KB) — el marco, usado con **`border-image`**. Las esquinas no se
  deforman y cada lado se estira solo a lo largo, que es como corre la veta de verdad. El centro
  de la imagen se rellenó plano porque `border-image` lo descarta.
- `public/pano-tela.webp` (116 KB) — el paño, como baldosa **espejada en 2x2** para que repita sin
  costura, a tamaño fijo de 340px. Al principio se usó `background-size: cover` y el tejido se
  agrandaba hasta parecer arpillera.

Entró como una opción más del selector que ya existía (`Nogal y latón` + `Paño de tela`), y quedó
**de fábrica**. Las mesas viejas siguen disponibles.

El relleno de la baranda pasó de una clase de Tailwind al CSS, para que cada tema pueda decidirlo:
la mesa fotográfica no lleva relleno porque el marco lo pone el propio `border-image`.

### Pendiente

En pantalla grande se alcanza a ver la repetición de la baldosa del paño. Se arregla con una
baldosa más grande, a costa de peso.

Motor 55/55, backend 87/87, build ok. Visto corriendo en teléfono y escritorio, sin scroll.

---

## 56. Por qué no se veía la mesa nueva, y el sello de versión (2026-08-30)

El usuario actualizó y seguía viendo la mesa vieja. El push estaba bien (`0406580` en el remoto,
con los dos `.webp` dentro): **el problema era su `localStorage`.**

El tema de mesa se guarda en `mesa-tema`, y el valor por defecto solo aplica a quien **no tiene
nada guardado**. Como él ya había elegido mesa hacía días, se quedaba con la vieja para siempre.
Le pasó igual a este chat mientras probaba: hubo que borrar la clave a mano.

Se agregó `CATALOGO` al tema guardado. Cuando entra una mesa nueva que vale la pena mostrarle a
todos, se sube ese número y los temas guardados con un número viejo se migran al nuevo por defecto.
El jugador puede volver a elegir lo que quiera; solo se pierde la elección anterior una vez.

Verificado corriendo, simulando el navegador del usuario: con `{pano:'verde', baranda:'cognac'}`
guardado, al entrar queda en `rail-foto` + `felt-tela` y se regraba con `catalogo: 2`.

### Sello de versión

Abajo a la izquierda, semitransparente, se muestra la versión. Sale de `package.json` por un
`define` de Vite, así que no hay dos números que se puedan desincronizar. Sirve para saber de un
vistazo si el navegador está corriendo el build nuevo o uno cacheado, que es exactamente lo que
nos hizo perder este rato.

Se arranca en **0.0.25**.

Motor 55/55, backend 87/87, build ok.

---

## 57. El marcador es una placa en la mesa, no números en las esquinas (2026-08-30)

El usuario, con una captura en pantalla ancha: los números de "VOS" y "ELLOS" quedaban **en las
dos esquinas opuestas**, separados por media pantalla. No se leían como un marcador, se leían como
dos números sueltos. Pidió un solo tablero, bien resuelto, con la ronda, el pozo y los puntos.

### La placa

Es una **placa de nogal con filos de latón**, centrada arriba, flotando sobre el paño. Muestra:

```
   VOS    │  RONDA 1 · A 100  │   ELLOS
    0     │     POZO · 14     │     0
          │      6YW05T       │
```

**El material salió de la misma imagen de la mesa**, no de una nueva: se recortó un tramo limpio
de la baranda de arriba —evitando las esquinas, que traen el inglete— y se espejó en vertical, así
queda latón arriba y abajo como una placa atornillada. Pesa 17 KB.

Se hizo así por dos razones: se habían acabado los créditos de generación, y sobre todo porque
recortando de la misma foto la placa es **el mismo material que la mesa**, no uno parecido. La
línea de latón se ubica automáticamente buscando la fila más amarilla de la baranda, en vez de
copiar un número a mano.

### De paso

- El pozo estaba **repetido**: en la placa y otra vez debajo de la mano. Se quitó el de abajo.
- Los tres rivales bajaron a `top-76px` para no quedar debajo de la placa.

Motor 55/55, backend 87/87, build ok. Visto corriendo en teléfono. Versión **0.0.26**.

---

## 58. La placa, con cariño (2026-08-30)

El usuario sobre la primera versión del marcador: *"se ve como si fuera una tabla puesta en un
borde, los números y letras apenas se ven"*. Tenía razón en las dos cosas: era madera plana con
texto encima.

Lo que la convierte en placa y no en tabla pegada:

- **Cartuchos hundidos** para los números. El problema de fondo era el contraste: la veta del
  nogal es clara, así que texto claro sobre madera clara no se lee. Ahora cada número va sobre un
  recuadro oscuro con sombra interior, y encima queda blanco con un halo tenue.
- **Filo de latón por dentro**, igual que el de la baranda.
- **Cuatro tornillos de latón** en las esquinas.
- **Sombra debajo** que la despega del paño.
- La ronda y el pozo también pasaron a fondo oscuro, por el mismo motivo de contraste. El pozo
  lleva un dibujito de ficha al lado del número.

### Dos cosas que salieron probando

- El **código de sala quedaba cortado** contra el filo de abajo. Se sacó de la placa y va debajo,
  sobre el paño.
- Ahí quedaba **detrás del avatar del rival**, así que los tres rivales bajaron a `top-104px`.

Motor 55/55, backend 87/87, build ok. Visto corriendo en teléfono. Versión **0.0.27**.

---

## 59. El rival del 1v1, al costado (2026-08-30)

Con la placa del marcador arriba al centro, en 1v1 el único rival quedaba justo debajo de ella y
encima del código de sala: se pisaban. En 2v2 no pasa, porque el de enfrente comparte el centro
con dos rivales a los lados y el conjunto se lee.

En 1v1 el rival se corre al costado izquierdo, que está libre.

### Sobre los personajes con IA

El usuario pidió generar los avatares con IA en vez de los SVG dibujados por código. **No se pudo:
el workspace de generación está sin créditos.** El chequeo de precio (`get_cost`) responde, pero la
generación falla con "Out of credits".

Quedan escritos los prompts para las cinco caras, listos para lanzar en cuanto haya saldo. Hasta
entonces siguen los retratos SVG de `Avatar.jsx`, que no dependen de nada externo.

Motor 55/55, backend 87/87, build ok. Versión **0.0.28**.

---

## 60. El avatar del rival, dentro del paño (2026-08-30)

Pegado al borde izquierdo, la baranda le comía media cara al avatar del rival. Se mete dentro del
paño: `left-4 top-86px` en teléfono y `left-72px top-74px` en pantalla grande, que es donde el
usuario lo marcó en su captura.

### Los personajes de alta calidad siguen pendientes

Segundo intento de generarlos, **misma respuesta: "Out of credits in the selected workspace"**. El
chequeo de precio responde (2 créditos por imagen), la generación no.

Los prompts están escritos para las cinco caras, con luz y encuadre comunes para que se vean de la
misma familia y se puedan recortar en círculo. En cuanto haya saldo se lanzan.

Motor 55/55, backend 87/87, build ok. Versión **0.0.29**.

---

## 61. Fichas un 10% más grandes (2026-08-30)

Pedido del usuario. Se hizo en los dos sitios donde vive el tamaño:

- **En la mano**, la tabla de tamaños de `Tile.jsx`. Medido después: la ficha pasa de 32x64 a
  **35x70** y la mano sigue entrando en **una sola fila** en un teléfono de 375px.
- **En la mesa**, un factor `ZOOM_FICHAS = 1.1` sobre la escala del paño. Se muestra un 10% menos
  de mesa en vez de agrandar la rejilla: **la rejilla define dónde caben las fichas**, y tocarla
  cambiaría las reglas del juego. Quedan ~0.9 celdas de margen a cada lado, así que la cadena
  entera sigue cabiendo.

Sin scroll en ningún eje. Motor 55/55, backend 87/87, build ok. Versión **0.0.30**.

### Sobre domino.patmai.com

El usuario lo mandó como "el juego de dominó que tiene el otro equipo". **No es un juego**: es un
**marcador y organizador de torneos** ("Domino Pro — el marcador oficial de tu mesa de dominó").
Se juega con fichas de verdad en una mesa de verdad y la app anota. No compite con esto; es
complementario. El detalle está en la respuesta al usuario.

---

## 62. La portada, hecha para el teléfono (2026-08-30)

El usuario: *"vamos a convertir la app web en un juego. La pantalla de inicio está bien pero hay
que hacerla de teléfono"*.

La portada ya ocupaba la pantalla y no scrolleaba. Lo que le faltaba era ser **la portada de un
juego** y no de una web:

- **Faltaba el botón de jugar ya.** Solo ofrecía `1 VS 1` y `2 VS 2`, que piden cuenta **y**
  necesitan a alguien del otro lado. Un recién llegado no podía hacer nada. Ahora manda
  **JUGAR AHORA**, que entra contra el bot sin cuenta.
- **Los botones estaban al medio.** En un teléfono van abajo, donde llega el pulgar. Medido: el
  botón grande queda a 115px del borde inferior y ocupa los 335px de ancho.
- **Había dos botones de "jugar"** compitiendo: el de la cabecera y el nuevo. El de la cabecera se
  esconde en teléfono; en pantalla grande se queda, porque allá no hay botón grande.
- El contador de jugadores pasó de abajo a la derecha a arriba al centro en teléfono, porque abajo
  chocaba con los botones. Se acortó a "0 EN LÍNEA".
- El texto de marketing se oculta en teléfono: un juego invita a jugar, no explica.

En pantalla grande la portada queda como estaba, con los tres botones en fila.

`GoldButton` acepta ahora `className`, que hacía falta para estirarlo al ancho.

Sin scroll en ningún eje. Motor 55/55, backend 87/87, build ok. Versión **0.0.31**.

## 63. Las fichas de la mano, un 15% más grandes. Las de la mesa ya estaban en su techo (2026-09-01)

El usuario: *"aumenta un 15% el tamaño de las piezas en la mesa y que se ven en tu mano"*.

**La mano sí: hecho.** De 35×70 a 40×81 px (`Tile.jsx`, tabla `dims`). El +15% va sobre el tamaño
de ahora, que ya traía el +10% de la sección 61.

Al agrandarlas, la séptima ficha se caía a una segunda fila. La culpa no era del tamaño: el botón
de emojis vivía **al lado** de la mano y le robaba 72px de ancho. Se mudó a la línea de arriba,
junto a "tu turno", y bajó de 48 a 40px. Ahora la mano tiene los 375px del teléfono: entran las 7
fichas en una fila, y también las 8 de cuando robás del pozo.

**La mesa no se puede.** Y esto es lo importante de anotar, para no volver a intentarlo:

La mesa muestra siempre la misma porción de paño (escala fija, como pidió el usuario en la sección
46: nada de zoom mientras se juega). Se ven `24 / zoom` celdas. Pero la cadena **dibujada** no mide
20 celdas sino hasta **22,5**: los dobles van cruzados y su desplazamiento visual se acumula a lo
largo de la cadena, así que el dibujo se sale hasta 1,25 celdas de la rejilla por cada lado.

Medido sobre **141.606 posiciones** reales de partidas 1v1 y 2v2:

| zoom | fichas de mesa | posiciones con la cadena cortada | lo peor que se corta |
|------|----------------|----------------------------------|----------------------|
| 1,09 | −1% | 0 (0,0%) | — |
| **1,10 (el de hoy)** | 0% | 101 (0,1%) | 3px |
| 1,15 | +5% | 1.264 (0,9%) | media ficha |
| 1,20 | +9% | 1.264 (0,9%) | una celda entera |
| 1,265 (el +15% literal) | +15% | 5.741 (4,1%) | celda y media |

O sea: **el 1,10 que ya teníamos es el máximo**. Se probó 1,2 y se devolvió a 1,1.

La otra vía para agrandar las fichas de la mesa es **achicar la rejilla**: menos celdas que mostrar,
celdas más grandes. Pero eso cambia el juego, así que se midió antes (regla 10), ~120.000 turnos por
rejilla:

| rejilla | ficha trabada | trancas | tamaño de ficha en teléfono |
|---------|---------------|---------|------------------------------|
| **20 (hoy)** | **1,14%** | 58,8% | 32×16 |
| 18 | 2,57% | 61,2% | 35×17 (+9%) |
| 16 | 4,98% | 65,1% | 37×19 (+17%) |
| 14 | 12,36% | 68,4% | 41×20 (+28%) |

Pagar **4 veces más** "tengo la ficha y no me deja jugarla" (secciones 42, 50 y 51) por un 17% de
tamaño es deshacer el trabajo de esas tres secciones. **No se hizo.** Queda anotado por si el
usuario decide que el tamaño vale ese precio.

Mano en una sola fila y sin scroll en ningún eje, medido a 375×812. Motor 55/55, backend 87/87,
build ok. Versión **0.0.32**.

## 64. Las fichas montadas: la mesa usaba el tamaño de la mano. Y pantalla completa (2026-09-01)

Dos cosas de las capturas del usuario.

### Las fichas se montaban una sobre otra

**No era el motor.** Se midieron 90.126 posiciones reales de 1v1 y 2v2 buscando dos fichas cuyos
rectángulos se pisaran: **cero**. El motor coloca bien; lo que se montaba era el **dibujo**.

La causa: `Board.jsx` pintaba cada ficha de la mesa con `<Tile size="sm">`, **la misma clase que usa
la mano**. La casilla del tablero mide 64×32px exactos (una celda de la rejilla), pero `sm` venía
creciendo con los pedidos del usuario: 70×35 en la sección 61 y 81×40 en la 63. O sea la ficha se
salía 17px de su casilla y pisaba a la vecina. Por eso el usuario dijo *"no como estaba antes"*:
empezó con el +10% de la 61 y el +15% de la 63 lo hizo evidente.

Arreglo: `Tile` tiene ahora un tamaño **`mesa`** de 64×32, atado a la celda, y la mesa usa ese.
La mano se queda con los suyos. Medido en el navegador: la ficha de la mesa dibuja 30×15px y lo
esperado era 30×15px — **calzan exactas**, cero solape.

**Efecto que hay que decir claro:** al dejar de salirse de su casilla, la ficha de la mesa se ve
más chica que en las capturas. Ese es su tamaño real. Lo de antes era el bug, no un tamaño.

Para agrandarlas de verdad hay un camino sin tocar reglas y está sin hacer: el dibujo necesita
22,5 celdas de ancho (sección 63) porque el desplazamiento visual de los dobles se **acumula** a lo
largo de la cadena y se sale ~1,25 celdas por lado. Si se acota ese arrastre a 20,5 celdas, la ficha
pasa de 30×15 a 32×16 (+10%) gratis. Hay que rehacer `joinOffset` y volver a correr el detector de
solapes de esta sección.

### La barra del navegador

El usuario la ve arriba y ocupa pantalla. Dos caminos, y se pusieron los dos:

- **Instalable (PWA).** `manifest.webmanifest` con `display: standalone` y `orientation: portrait`,
  más los meta de Apple y `viewport-fit=cover`. Iconos 192/512 y uno *maskable*, generados con
  Pillow: paño verde con la doble seis encima. Instalada desde "agregar a pantalla de inicio", abre
  **sin barra ninguna**. Es la buena, pero hay que instalarla.
- **Pantalla completa al instante.** `utils/pantalla.js`. La API solo funciona pedida **dentro de un
  toque**, así que se llama desde el clic de los botones de jugar (portada y dashboard), nunca al
  cargar. Al salir de la partida se devuelve la barra. Si el navegador la niega (iOS Safari no la
  tiene), se sigue jugando igual: no rompe nada.

Motor 55/55, backend 87/87, build ok. Versión **0.0.33**.

## 65. Doce rivales de la casa, 6 mujeres y 6 hombres (2026-09-01)

El usuario quiere cambiar las caras de los circulitos y tener **12 bots**, mitad y mitad.

**El plantel pasó de 5 a 12**, repartidos entre las cinco dificultades del motor:

| dificultad | mujeres | hombres |
|------------|---------|---------|
| novato ★ | Yubi | Nano |
| fácil ★★ | Doña Chela, La Negra Paula | Chuo |
| normal ★★★ | Mama Juana | El Catire, El Musiú |
| difícil ★★★★ | La Comadre | Don Pancho |
| maestro ★★★★★ | La Zurda | El Tigre |

Cada bot lleva ahora `sexo`, que el juego no usa: está para poder regenerar el retrato de
cualquiera sin adivinar cuál era. Medido: los 12 llegan a salir, y en una mesa de 2v2 nunca se
repite ninguno.

**Los retratos todavía no están, y hay que decirlo:** el espacio de generación de imágenes está en
**cero créditos** (plan free, y tampoco hay generaciones de prueba disponibles). Se comprobó con
`balance` y con `models_explore`. Así que las 12 imágenes quedan pendientes de que haya crédito.

Lo que sí quedó listo para que entren sin tocar código:

- `Avatar.jsx` intenta primero `/avatares/<id>.webp` y, si el archivo no existe, **cae solo** al
  retrato de SVG de siempre. Medido en el navegador: cero imágenes rotas, los tres retratos de la
  mesa se dibujan igual que antes. Agregar un bot nunca deja un hueco.
- `contexto/avatares-prompts.md` con los **12 prompts escritos**, cada uno con la descripción del
  personaje más un bloque de estilo común (retrato cuadrado de hombros para arriba, luz cálida de
  lámpara sobre la mesa, fondo de paño verde y nogal desenfocado) para que los 12 se vean del
  mismo juego y no doce dibujos sueltos.
- `frontend/public/avatares/` con su LEEME explicando que el archivo se llama como el `id` del bot.

Cuando haya crédito: generar los 12 con `nano_banana_pro` a 2K en 1:1, guardarlos con su `id` y
listo, aparecen solos.

Motor 55/55, backend 87/87, build ok. Versión **0.0.34**.

## 66. Dos retratos dibujados a mano, porque no hay generador de IA (2026-09-01)

El usuario pidió que los retratos los generara Claude mismo, no un servicio de afuera.

**Hay que decirlo claro: Claude no tiene un generador de imágenes adentro.** El único generador
conectado a esta sesión es la herramienta MCP externa, y está en cero créditos. No es cuestión de
esforzarse más: no existe el músculo. Se verificó con `balance` (0 créditos, plan free) y con
`models_explore` (sin generaciones de prueba disponibles).

Lo que sí se puede hacer a mano es **dibujarlos en vector**. Se hicieron dos de muestra, Nano y
La Comadre, en `frontend/tools/retratos.py`:

- Una **base común** a los doce (fondo de paño con viñeta, cabeza, cuello, hombros, luz cálida de
  lámpara desde arriba a la izquierda, sombra del lado contrario, marco dorado) para que los doce
  se vean del mismo juego y no doce dibujos sueltos.
- Lo propio de cada uno va aparte: pelo, ropa, accesorios, boca, cejas y paleta.

Dos correcciones que se vieron al mirarlos grandes: a Nano los rizos sueltos le quedaban en la sien
y parecían un moretón — pasaron a ser **patilla** siguiendo el contorno de la cara, que es como de
verdad asoma el pelo bajo una gorra. Y a La Comadre la boca le quedó de amargada — se rehizo como
sonrisa de medio lado con volumen en el labio de abajo, que es el gesto que pide su frase.

Se guardan en **`.svg`**, no en `.webp`: son vector, pesan 6 KB y se ven nítidos a cualquier
tamaño, que es justo lo que hace falta cuando el mismo retrato va a 46px en la mesa y más grande en
otros lados. `Avatar.jsx` apunta ahora a `/avatares/<id>.svg`.

Verificado corriendo: Nano sale en la mesa con su retrato, y los diez que todavía no existen caen
solos al retrato de SVG viejo sin romper nada.

**Faltan diez**, a la espera de que el usuario diga si el estilo le sirve. Los prompts de IA quedan
en `contexto/avatares-prompts.md` por si algún día hay crédito.

Motor 55/55, backend 87/87, build ok. Versión **0.0.35**.

## 67. Los doce retratos, el menú de juego y la portada a medida (2026-09-01)

### Los doce retratos, completos

Al usuario le sirvió el estilo de la sección 66, así que se dibujaron los diez que faltaban con la
misma base. Para que doce caras no sean doce dibujos sueltos se hicieron **piezas compartidas**:
bocas (sonrisa abierta, de medio lado, suave, risa grande, línea seria, bajo bigote), bigote,
barba, lentes (redondos, de alambre, oscuros), argollas, perlas, sombrero de paja, sombrero de ala
y pañuelo. Cada personaje es una paleta más una combinación de esas piezas.

Tres se vieron mal al mirarlos grandes y se corrigieron: **a Doña Chela, El Catire y El Musiú el
pelo se les confundía con la piel** porque los tres son de pelo claro sobre piel clara. Se
oscurecieron los tonos, se les puso filo en el nacimiento del pelo y patilla a los lados. El
pañuelo de Doña Chela además parecía una vincha sobre una calva: ahora baja hasta las orejas, deja
ver las canas alrededor de la cara y lleva el nudo a la vista.

Verificado corriendo: sale Doña Chela en la mesa con su retrato, cero imágenes rotas.

### El menú de juego

El usuario: *"se ve horrible"*. Era una página web genérica: tarjeta de bienvenida enorme, títulos
de sección grandes, cuatro tarjetas altas con emojis y un formulario. En un teléfono había que
scrollear para ver los modos.

Ahora entra entero en la pantalla, sin scroll:

- El saludo pasó de tarjeta a **una línea**.
- Los modos se agrupan en **"Contra la casa"** y **"Con amigos"**, que es la decisión real que toma
  el jugador: si puede empezar ya o si necesita gente.
- El emoji se cambió por **`MesaIcono`**, un diagrama de la mesa con sus sillas: dorado sos vos,
  crema un humano, gris con antena un bot. Dice de un vistazo cuántos juegan y contra qué.
- Los títulos van en **sans y no en serif**: con la Cormorant, "1 vs 1" se leía "I VS I".

### La portada

Dos arreglos que pidió el usuario mirando su teléfono:

- **Había dos "Salir"**, el de la cabecera y otro en un pie abajo a la izquierda junto a un "Menu".
  Ese pie se eliminó: los modos ya están en "VER TODOS LOS MODOS" y el salir arriba.
- **Sobraba alto y tocaba scrollear.** `min-h-screen` pasó a `h-[100dvh]`, que además descuenta la
  barra del navegador en el teléfono. Medido: 812 de alto en una pantalla de 812, scroll cero.

### Sobre generar con IA

El usuario preguntó por Gemini. Vale la pena dejarlo escrito: **`nano_banana_pro` ES el modelo de
imagen de Google**; no es que falte buscar en otro proveedor, es ese mismo el que está sin crédito.
Si el usuario consigue una API key de Google AI Studio se puede escribir un script que la lea del
`.env` (regla 4: ninguna clave en el código) y genere los doce con los prompts de
`contexto/avatares-prompts.md`. Ojo: la suscripción a la app de Gemini no da acceso a la API.

Motor 55/55, backend 87/87, build ok. Versión **0.0.36**.

## 68. Un solo selector de modos, la mesa cuadrada, y el menú de buscar partida (2026-09-01)

Tres cosas que el usuario vio en su teléfono.

### Había dos menús de modos y le salía el viejo

Desde el menú salía el diseño nuevo de la sección 67, pero **"VER TODOS LOS MODOS" en la portada
abría el viejo**: otra lista, con otros textos ("PRACTICAR VS BOT", "2 VS 2 PREMIER") y tarjetas
altas de tres columnas que en un teléfono obligaban a scrollear.

La causa era que había **dos listas de modos**, una en `Landing.jsx` y otra en `Dashboard.jsx`, cada
una con sus textos. Ahora hay una sola: `components/SelectorModos.jsx` exporta `MODOS`, `Seccion`,
`Fila` y el selector completo. La portada y el menú usan ese mismo. Se borraron `ModeCard` y la
lista vieja de la portada, y la ventana pasó de `max-w-5xl` a `max-w-md`, porque es una lista y no
una grilla.

Los textos se acortaron para que entren en una línea: dentro de la ventana el texto tiene 185px de
ancho y los largos partían las filas a distinto alto.

### La mesa del icono era redonda

El usuario: *"la mesa es cuadrada no redonda"*. Tenía razón, una mesa de dominó es cuadrada.
`MesaIcono` pasó de círculo a cuadrado redondeado, con su baranda de nogal y su filo dorado.

### El menú de buscar partida

Era el último con lenguaje viejo: tarjetas grandes con emojis (⚡ y 🗝️), título "Duelo de
Caballeros" y párrafos largos. Ahora usa las mismas filas que el resto, y el icono **dice lo que
falta**: `MesaIcono` acepta `vacias` (sillas punteadas, las que estás esperando) y `codigo` (la
etiqueta del código para la sala privada). Arriba dice "faltan 3" si es 2v2 y "faltan 1" si es 1v1.

Los títulos van en sans también aquí: en serif "1 vs 1" se leía "I vs I".

Verificado corriendo a 375x812 las tres pantallas, sin scroll en ninguna. Para poder ver la de
buscar partida sin cuenta se abrió el permiso de invitado un momento y **se devolvió a como estaba**;
comprobado con un diff contra la copia previa.

La sección de modos online se llamó primero "Con amigos", pero el usuario la cambió a
**"Contra jugadores"**: no siempre es un amigo, y lo que la diferencia de la otra sección es
que del otro lado hay una persona y no la casa (v0.0.38).

Motor 55/55, backend 87/87, build ok. Versión **0.0.37**.

## 69. El menú de modos no scrollea en ningún teléfono (2026-09-01)

El usuario: *"en la pantalla principal elimina el scroll"*.

Se midió en cuatro tamaños de teléfono y el que se pasaba era el **menú**: 693px de contenido en
una pantalla de 640, o sea **53px de más**. La portada ya estaba bien desde la sección 68.

Lo que se lo comía eran las filas de modo: 84px cada una por cuatro. Se bajaron a 78 (icono de 54
a 48 y menos alto de fila), y los márgenes de sección y del `main` se apretaron un poco.

Pero eso solo arregla un tamaño. Para que no vuelva a pasar, el menú **se aprieta solo** según lo
bajita que sea la pantalla, con tres escalones en `index.css` sobre la clase `menu-compacto`:

| pantalla | icono | alto de fila | pista del código |
|----------|-------|--------------|------------------|
| normal | 48 | py-3 | se ve |
| menos de 700 de alto | 42 | py-1.5 | se ve |
| menos de 600 | 36 | py-1 | se ve |
| menos de 520 | 32 | py-0.5 | se esconde |

La pista del código se esconde en la más chica porque el placeholder del campo dice lo mismo.

Medido, sobra cero en: 412x732, 375x812, 360x640, 360x560 y 320x480, en el menú y en la portada.

Para medir el menú sin cuenta se agregó una ruta de prueba y **se quitó al terminar** (comprobado:
cero ocurrencias de `menu-preview` en `App.jsx`).

Motor 55/55, backend 87/87, build ok. Versión **0.0.39**.

## 70. El scroll que salía al recargar: `dvh` contra la barra del navegador (2026-09-01)

El usuario: *"cuando actualizas o refresca la página en el primer menú sale el scroll, es raro"*.

**No se pudo reproducir en el emulador**, y eso mismo fue la pista. Se metió una sonda en
`index.html` que mide el alto del documento cuadro por cuadro desde el arranque: desde el primer
cuadro (17ms) el alto era exacto, sin transitorio. O sea **no es la fuente ni un salto de layout**;
esas dos habrían aparecido como un pico en los primeros cuadros.

Lo que el emulador no tiene es lo que sí tiene su teléfono: **la barra del navegador**. Y ahí está
la causa. Las pantallas usaban `100dvh`, y en el móvil `dvh` se resuelve en el primer pintado al
alto **con la barra escondida**, que es más grande que lo que de verdad se ve. La página queda más
alta que la ventana y sale el scroll; en cuanto la barra se va, calza y el scroll desaparece. De
ahí el "es raro".

El arreglo es cambiar a **`svh`**, que es el alto **con la barra puesta**, el más chico de los tres:
así nunca sobra, ni en el primer pintado ni después. Cuando la barra se esconde queda un dedo de
fondo abajo, que no se nota porque el contenido va centrado.

- Menú y pantalla de buscar partida: `min-h-[100svh]`.
- Ventana de modos de la portada: `max-h-[88svh]`.
- Portada: el contenedor va en `100svh` para que los botones estén siempre a la vista, pero **la
  foto de la mesa se queda en `100dvh`** para que no aparezca una franja cuando la barra se va.

**Lo que NO se tocó, y hay que decirlo:** la mesa de juego sigue en `h-[100dvh]`. Ahí el riesgo es
el mismo (que la mano quede debajo del borde) pero la partida entra en pantalla completa y la barra
no está, así que cambiarlo metería una franja negra abajo sin ganar nada. Si alguna vez la mano se
ve cortada al entrar a una partida sin pantalla completa, esa es la línea a cambiar.

Medido: sobra cero, y el botón de JUGAR AHORA entero dentro de la ventana.

Motor 55/55, backend 87/87, build ok. Versión **0.0.40**.

## 71. El doble que no entraba donde sí entraba una ficha normal (2026-09-01)

El usuario, con dos capturas: *"no me dejó jugar el doble porque no tenía camino, pero sí tenía para
jugarlo abajo, como jugué el 6/3 que sí me dejó"*.

Esa frase es la prueba: **el mismo sitio aceptó una ficha normal y rechazó el doble**. Si el sitio
existe, la regla del doble está mal.

Se escribió un detector de ese síntoma exacto: para cada punta, si el doble de ese número no tiene
dónde ir pero alguna ficha normal con ese mismo número sí, es un caso. Sobre **113.497 posiciones**:
**513 casos, el 0,45%** (1 de cada 222). Reproducido, no supuesto.

### Por qué pasaba

No era la geometría, era la regla de **"no rozar otra ficha"** (§ de placementsFor). Un doble se
juega **cruzado** sobre la cadena, así que sobresale una celda a cada lado y toca la fila vecina.
Una ficha normal, acostada, pasa por el mismo pasillo sin tocar nada. En un tablero apretado, con
filas de la cadena a una celda de distancia, el doble se quedaba sin ninguna casilla mientras la
normal entraba de sobra. Justo lo que el usuario vio.

Esa regla se había medido en su momento y se dejó porque no bloqueaba nada *en general* y dejaba el
tablero prolijo. Lo que no se había medido es su efecto **sobre los dobles en particular**.

### El arreglo

Una **pasada de rescate**: si a un doble no le queda ni una casilla, se repasan las mismas
posiciones permitiendo que roce. Se relaja **solo** rozar; salirse del tablero y solaparse se
siguen rechazando, así que la ficha entra pegada a la vecina pero nunca encima. En el 99,5% de las
jugadas no cambia nada, porque la pasada solo corre cuando la alternativa es una ficha injugable.

Medido después, sobre 112.306 posiciones:

| | antes | después |
|---|-------|---------|
| doble rechazado donde una normal entra | 0,45% | **0,001%** |
| ficha trabada ("tengo la ficha y no me deja") | 1,14% | **0,87%** |
| trancas | 58,8% | 58,3% |
| fichas montadas | 0 | **0** |
| fichas fuera del tablero | 0 | **0** |

Queda un caso de 112.306. Es cuando ni rozando hay sitio, que es de verdad no tener camino.

El tablero exacto del ejemplo quedó como test en `engine.test.js`, con la comprobación de que el
rescate nunca deja una ficha encima de otra ni fuera del tablero. Motor **56/56**.

Motor 56/56, backend 87/87, build ok. Versión **0.0.41**.

## 72. Las fichas de la mesa, un 20% más grandes: la cámara sigue la cadena (2026-09-01)

El usuario pidió **+20%** en las fichas de la mesa. En la sección 63 se había medido que con la
vista clavada en el centro de la rejilla el techo era el zoom 1,1, y eso seguía siendo cierto:

| zoom | fichas | **punta jugable cortada** (vista fija) |
|------|--------|----------------------------------------|
| 1,10 (el de entonces) | 0% | 0,04% |
| 1,20 | +9% | 0,62% |
| 1,32 | +20% | **5,2% — 1 de cada 19 manos** |

O sea, el +20% por la vía simple costaba no ver dónde jugar 1 de cada 19 manos. Inaceptable.

### Lo que faltaba medir

La vista estaba **clavada en el centro de la rejilla**, así que tenía que mostrar el doble de lo que
más se alejara del centro. Pero la cadena mide **11,4 celdas de promedio** contra una ventana de
18,2. Sobraba sitio; el problema era dónde apuntaba la ventana, no su tamaño.

La cámara ahora sigue a la cadena, con esta prioridad:

1. Si la cadena entera entra, la ventana se queda **quieta en el centro** y solo se corre lo justo
   si hace falta para no cortar nada.
2. Si no entra, se asegura que entren **las dos puntas jugables**, que es donde se puede jugar.
3. Si ni las puntas entran, se centra entre ellas.

**La escala no cambia nunca**: las fichas no cambian de tamaño mientras se juega, que es lo que el
usuario rechazó en la sección 46. Esto es desplazamiento, no zoom.

Medido sobre 142.469 posiciones con zoom 1,32:

| | resultado |
|---|-----------|
| la cámara se queda quieta | **91,4% de las jugadas** |
| punta jugable fuera de vista | 0,22% (1 de cada 448) |
| alguna ficha vieja fuera de vista | 1,21% |
| corrimiento entre jugadas | 0,41 celdas (p99), 1,91 el máximo |

El paso 2 (asegurar las puntas antes que la cadena entera) es lo que baja el 0,29% al 0,22%: sin él
la cámara se centraba entre las puntas sin garantizar que entraran.

Verificado corriendo: la ficha de la mesa pasó de **30x15 a 38x19 px** en un teléfono de 375.

Motor 56/56, backend 87/87, build ok. Versión **0.0.42**.

## 73. La cadena se enroscaba sobre sí misma: ahora busca sitio libre (2026-09-01)

El usuario, con el panel de "por qué no podés jugar" en pantalla: *"siempre debe buscar jugar lejos
para que no se choquen las piezas, porque los jugadores siempre van a intentar romper el juego, hay
que cubrir todas esas posibilidades"*.

Tenía razón y había un hueco a medio tapar en el código. `aireEnLaPunta`, que decide entre varias
colocaciones, mide **solo la distancia al borde de la mesa**, con tope 2. No sabe nada de las otras
fichas. Así la cadena se enrosca sobre sí misma, la punta queda metida en un rincón, y el jugador ve
sitio de sobra en la mesa mientras la ficha no entra. Es justo el `[1|3] el lugar ya está ocupado`
de su captura.

### Lo que se midió antes de tocar (regla 10)

Se probaron tres formas de meter el "sitio libre" (casillas seguidas libres alrededor de la punta
nueva, en las cuatro direcciones, hasta tres por dirección):

| variante | ficha trabada |
|----------|---------------|
| A — como estaba (solo borde, luego derecho) | 0,61% |
| B — sitio libre **antes** que seguir derecho | **0,90% (peor)** |
| C — seguir derecho manda, sitio libre desempata | **0,45%** |
| D — sitio libre solo para elegir hacia dónde doblar | 0,57% |

**El orden importa más que la idea.** Poner el sitio libre por delante de "seguir derecho" empeora
las cosas: la cadena serpentea y se hace más rincones de los que evita. Es la cuarta vez que se
confirma que la apertura codiciosa sola no sirve (ver §32, §33). Lo que sí sirve es usarla **solo
para desempatar** entre las opciones que ya van derecho.

C se confirmó en tres tandas independientes de ~120.000 turnos: 0,61→0,45, 0,75→0,49 y 0,66→0,53.

### El resultado, ya dentro del motor

A/B del motor de verdad, mismas semillas, con y sin el cambio:

| | sin el cambio | con el cambio |
|---|---------------|---------------|
| ficha trabada | 0,90% (1.268 fichas) | **0,63% (861 fichas)** |
| trancas | 59,2% | 59,7% |
| doble rechazado donde una normal entra | 0% | **0%** |
| fichas montadas | 0 | **0** |
| fichas fuera del tablero | 0 | **0** |

Un 30% menos de fichas trabadas. La función quedó exportada como `espacioEnLaPunta` y la usan tanto
`straightestPlacement` (el camino del jugador) como el bot, para que los dos coloquen igual.

Motor 56/56, backend 87/87, build ok. Versión **0.0.43**.

## 75. La mesa rectangular: marcador afuera y cada jugador en su borde (2026-09-02)

El usuario, con dos capturas del 2v2: *"se montan las fichas en la cara de los jugadores, eso es una
cagada"*, y una tercera de `domino.patmai.com` como referencia: mesa rectangular, marcador arriba y
fuera de la mesa, los jugadores con su nombre en los bordes, y **un rectángulo invisible adentro
donde van las piezas y del que no se salen**.

### La medición que decidió la forma

Antes de mover nada se midió cuánto ocupa la cadena a lo ancho y a lo alto, sobre 116.120
posiciones:

| | media | p95 | p99 | máximo |
|---|-------|-----|-----|--------|
| ancho | 11,0 | 17 | 18,5 | 20,5 |
| alto | **6,9** | 13,5 | 16 | 19,5 |

**La cadena es ancha, no cuadrada.** O sea que la mesa rectangular del usuario es la forma correcta,
y el paño cuadrado de antes desperdiciaba alto.

### Lo que se hizo

- El marcador **salió de la mesa**: era `absolute` dentro del paño y ahora es una barra arriba.
- `Board` ya no recibe un solo `insetInferior` sino **`margenes` por los cuatro lados**. Ese es el
  rectángulo invisible: la escala y la cámara se calculan contra él, así que la cadena no puede
  salirse.
- `AsientoFlotante` (el retrato suelto sobre el paño, al que le crecían las fichas encima) se
  reemplazó por **`PlacaAsiento`**, apoyada en el borde: el compañero arriba y los rivales a los
  costados con el nombre en vertical.

Medido jugando en el navegador: **cero fichas invadiendo una placa**, peor invasión 0 px.

### El precio, que hay que decirlo

Las placas de los costados se comen ancho, y en un teléfono el ancho es el que manda:

| | antes | ahora |
|---|-------|-------|
| ficha de mesa en **1v1** | 38x19 | **36x18** (−5%) |
| ficha de mesa en **2v2** | 38x19 | **30x15** (−21%) |

En 1v1 no hay rivales a los costados, así que el rectángulo usa casi todo el ancho y no se pierde
casi nada. En 2v2 las dos placas se llevan 84 px de los 375 de la pantalla. Para recuperarlos habría
que poner a los rivales en las **esquinas de arriba** en vez de a media altura (ficha ~36x18), pero
eso es exactamente lo que el usuario había rechazado en la sección 74.

Motor 56/56, backend 87/87, build ok, sin errores de consola. Versión **0.0.45**.

## 76. El doble que se ponía de pie, y el menú de la mesa en un solo botón (2026-09-02)

### El doble en línea

El usuario: *"se ve que el 6 tiene la lógica pero se puso mal, se puso en paralelo o de pie en vez
de acostado"*.

Se escribió un detector y se sacó el caso en ASCII, como en la sección 42:

```
   0: 5|2  (10,8)->(10,9)  vertical
>> 1: 2|2  (10,10)->(10,11)  vertical   <- el doble, DE PIE
```

El doble `2|2` y su vecina `5|2` los dos verticales: el doble quedó en fila, como una ficha más, en
vez de acostado cruzando la cadena.

**La causa estaba en la regla de "seguir derecho".** `straightestPlacement` (y el bot) tomaban la
dirección de continuación del **eje de la propia ficha del extremo**. Eso está bien para una ficha
normal, pero un doble está **cruzado** sobre la cadena: la cadena tiene que salir por sus costados,
no por su mismo eje. Tomando su eje, la cadena le seguía de largo y el doble quedaba de pie.

Se arregló en los dos sitios que eligen colocación: si el extremo es un doble, la continuación
preferida es la **perpendicular**. Y ese criterio va **antes** que el filtro de no pegarse al borde:
al revés, las cruzadas se descartaban por estar más cerca del borde y el doble terminaba en línea
igual (medido: 39% de las posiciones con el orden viejo, 26% con el nuevo).

A/B del motor real, mismas semillas, 67.658 fichas colocadas:

| | sin el arreglo | con el arreglo |
|---|----------------|----------------|
| ficha que queda en línea con un doble | 21,97% | **3,73%** |
| ficha trabada | 0,62% | **0,35%** |
| trancas | 54,9% | 55,5% |
| fichas montadas / fuera del tablero | 0 | **0** |

De ese 3,73% que queda, el **72% son casos donde no existía ninguna colocación cruzada**: la
alternativa habría sido dejar la ficha injugable, que es peor. Queda un test con las dos
direcciones (doble vertical → sale horizontal, y al revés).

### El menú de la mesa

El usuario: *"el botón para salir, chat y textura quiero que esté arriba a la izquierda y estén en
una ventana que se despliegue"*.

Los tres controles estaban sueltos por los bordes, compitiendo con las placas de los jugadores.
Ahora hay **un solo botón arriba a la izquierda** que abre una ventanita con las tres cosas: paño,
enviar un gesto y salir de la partida (con su confirmación dentro del mismo panel). `MesaThemePicker`
aprendió un modo `enMenu` para dibujarse plano en vez de traer su propio botón, y la sección
"Baranda" se esconde sola mientras haya una sola opción.

El botón de emojis salió de la mano; los gestos abren ahora centrados sobre ella. Verificado
corriendo: cero controles sueltos, los 11 gestos salen, y el menú cierra al elegir.

Motor 57/57, backend 87/87, build ok. Versión **0.0.46**.

## 77. Los controles de la mesa, al estilo de PrivoyTruco (2026-09-02)

El usuario, con dos capturas de la app de PrivoyTruco: *"me gusta más cómo se ve su ventana, es en
una esquinita y se despliegan las opciones: sonido, temas o color de mesa, iconos o chat. El botón
de salir me gustaría que esté arriba a la izquierda"*.

En la sección 76 se habían juntado los tres controles en un solo botón `☰`. Esto lo separa como en
la referencia:

- **El salir va arriba del todo, a la izquierda y solo**, en la misma fila que el marcador (que pasó
  a `flex-1`). Está aparte a propósito: es lo único de esa pantalla que no tiene vuelta atrás, y no
  debe estar a un dedo de distancia del resto. Sigue pidiendo confirmación.
- **Los demás van en una columnita redonda al borde del paño**: sonido, color de la mesa y gestos.
  El de paño abre su panelito al lado y se convierte en una `X` para cerrarlo.

**El sonido ahora existe de verdad.** Había `soundEffects.js` con sonidos sintetizados (sin
archivos), pero no había forma de apagarlos. Se le agregó un interruptor que además **se recuerda**
en `localStorage`: quien juega en silencio no quiere que el sonido vuelva solo la próxima vez.
No se puso un botón decorativo: se comprobó primero que hubiera audio que apagar.

Verificado corriendo, los cuatro controles: el sonido alterna y guarda (`domino-silencio` 1/0), el
paño abre y cierra, salen los 11 gestos, y el salir pide confirmación. Cero errores de consola.

Motor 57/57, backend 87/87, build ok. Versión **0.0.47**.

## 78. Regla de oro: nada dibujado a mano. Iconos de librería (2026-09-02)

El usuario, mirando la columna de controles: *"esos iconos primero se ven de Atari, hazle mejor y con
diseños, por Dios, agarra iconos de internet de mejor calidad"*. Y acto seguido: *"ya deja de dibujar
mierdas a mano, eres una IA, dame resultados profesionales y buen acabado, que sea una regla de oro
inquebrantable a partir de ahora"*.

Tiene razón y el patrón se venía repitiendo: las barandas de CSS ("basura", §55), el ruido
procedural ("qué horrible", §55) y ahora los iconos SVG escritos `path` por `path`.

**Queda como regla en `CLAUDE.md` §1.1.** Nada de gráficos improvisados donde ya existe algo hecho y
mejor. Para iconos se instaló **`lucide-react`**, y el nombre de cada icono se comprueba antes de
usarlo. Si algo no se puede hacer con acabado profesional, se dice, no se entrega a medias.

Se cambiaron todos los iconos escritos a mano: sonido (`Volume2`/`VolumeX`), color de mesa
(`Palette`), gestos (`Smile`), salir (`LogOut`), las flechas de la solapa (`ChevronLeft`/`Right`) y
la flecha de cada modo en el selector (`ChevronRight`). En `Game.jsx` quedan **cero** `path`
dibujados a mano.

### La solapa, ahora minimizada

El usuario también aclaró, con la flecha en la captura, que los controles tienen que estar **en una
ventanita minimizada** y salir al tocarla, no siempre a la vista. Ahora la columna arranca recogida:
solo se ve una pestañita de 20px pegada al borde, y al tocarla se despliegan los tres botones.
Medido: 0px recogida, 40px desplegada, y la pestaña cambia a "Ocultar los controles".

Verificado corriendo: paño abre y cierra, el sonido guarda en `localStorage`, cero errores de
consola.

Motor 57/57, backend 87/87, build ok. Versión **0.0.48**.
