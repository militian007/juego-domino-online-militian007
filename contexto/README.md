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

## 79. Iconos a color de verdad, y la pestaña por detrás (2026-09-02)

El usuario: *"quiero diseño de los malditos iconos, eso es una basura, todos son de mejor calidad...
puedes hacer iconos con color, diseño de alta calidad y que se vea premium"*. Y sobre la solapa:
*"quiero que el icono de la ventana desplegable quede detrás de los iconos de audio, tema e iconos,
y que sea más alargada hacia abajo"*.

### Los iconos

`lucide-react` (§78) es **monocromo de trazo**: resolvió lo de no dibujar a mano, pero no lo que él
pedía, que es color y volumen. Se cambió al set **Fluent Emoji de Microsoft** (`fluent-emoji-flat`),
que son iconos a color con relieve:

| control | icono |
|---------|-------|
| sonido | `speaker-high-volume` / `muted-speaker` |
| color de mesa | `artist-palette` |
| gestos | `grinning-face` |
| salir | `cross-mark` |

El de salir fue primero `cross-mark-button`, que es **verde**, y verde para salir confunde: se pasó
al `cross-mark` rojo.

**Cómo se cargan sin engordar el paquete:** importar el JSON del set entero mete más de un mega para
cinco iconos. `frontend/tools/extraer-iconos.cjs` saca solo los que se usan a
`src/components/iconosColor.js` (4 KB), y `IconoColor.jsx` los pinta. No se dibuja ni un `path`:
el cuerpo del SVG sale tal cual del paquete. Para agregar o cambiar un icono se edita `QUIERO` en
ese script y se vuelve a correr.

### La pestaña

Va **por detrás** de los botones (`z-0` contra `z-10`) y **asoma 48 px por debajo** del último, que
es lo que la hace clicable: con el alto anterior quedaba tapada y no había forma de cerrarla. Mide
104 px recogida y 196 px desplegada, y la flecha gira 180°.

Verificado corriendo: 4 de los 5 SVG traen degradados o rellenos de color (el quinto es la flecha de
la pestaña, monocroma a propósito), el paño abre y cierra, salen los 11 gestos, el salir pide
confirmación. Cero errores de consola.

Motor 57/57, backend 87/87, build ok. Versión **0.0.49**.

## 80. Los jugadores sin caja, y la pestaña más fina (2026-09-02)

Tres cosas que pidió el usuario mirando la pantalla:

### Los jugadores, sin rectángulo y en horizontal

*"Quita eso que encierras a los iconos de los jugadores en rectángulos, porque aparte de no ser
uniformes cambian de tamaño por el nombre y están de lado, es una cagada. Deja el icono, debajo de
la imagen pones el nombre en horizontal, y debajo del nombre el número de piezas, también en
horizontal."*

Hecho tal cual: se fue la caja (borde y fondo), el nombre ya no va rotado y la placa tiene **ancho
fijo de 58 px**, así que los tres miden lo mismo pase lo que pase con el nombre. Los largos se
cortan con puntos suspensivos ("Mama Ju…"), que es el precio de que sean uniformes.

### La pestaña

Más fina (de 28 a **16 px**) y con el fondo mucho más transparente (`bg-black/70` → `bg-black/25`).
El largo se queda como estaba, que le gustó.

### El icono de salir

*"Esa X es una mierda"*. Vuelve al de la puerta con la flecha (`LogOut` de lucide), que es el que
había antes de la vuelta de los iconos a color.

### El precio, medido

El nombre en horizontal a los costados necesita más ancho, y en un teléfono el ancho es el que
manda. `MARGEN_MESA.lados` pasó de 34 a 60 px:

| | antes | ahora |
|---|-------|-------|
| ficha de mesa en 2v2 | 30x15 | **25x13** (−17%) |

Verificado jugando: **cero fichas invadiendo a un jugador**, peor invasión 0 px, y en pestaña limpia
cero errores de consola.

Si el tamaño de la ficha pesa más que el nombre en horizontal, la salida es poner el nombre de los
rivales **debajo del retrato pero fuera del paño**, sobre la baranda, o volver al nombre vertical.
Queda anotado.

Motor 57/57, backend 87/87, build ok. Versión **0.0.50**.

**Retoque (v0.0.51):** la pestaña se acortó (172 px desplegada y 76 recogida, contra 196 y 104)
y su fondo subió de negro al 25% al 45%, para que se despegue del paño sin competir con él.
Asoma 24 px por debajo de los tres botones, que es lo que la mantiene agarrable.

## 81. El cerebro que evita que te tranques (2026-09-02)

El usuario: *"¿no podemos poner una IA o un cerebro que manipule la dirección en que se ponen las
piezas para que la gente no pueda trancarse? Algo que vea: si sigues en línea derecha pegas con una
pared, o si sigues derecho se va a trancar, mejor que bajes o subas"*. Y aclaró qué llama trancarse:
**tener la ficha y que el tablero no te deje ponerla**.

Eso es justo lo que se venía midiendo como "ficha trabada", que estaba en **0,338%**.

### El cerebro

`aperturaFutura(board, placement, side)`: se pone la ficha y se pregunta, por cada punta, si todavía
entra algo. Bastan **cuatro sondas** —una ficha normal y un doble por punta— porque lo que decide si
una ficha entra es la geometría y si es doble o no, no su número concreto. Entre las colocaciones
posibles gana la que deja el tablero más abierto.

**Dónde va en el orden importa, y esta vez al revés que en la sección 73.** Se probaron cuatro
posiciones, con la punta fijada para que lo único que cambiara fuera dónde se apoya la ficha:

| el cerebro va... | ficha trabada |
|------------------|---------------|
| no va (como estaba) | 0,338% |
| **primero de todo** | **0,034%** |
| después del borde | 0,043% |
| último desempate | 0,068% |

Va primero. Las trancas no se mueven (19,3% → 19,6%): el cerebro cambia dónde se apoya la ficha, no
qué números quedan en las puntas.

**Ojo con la primera medición.** El primer A/B dio que las trancas subían de 55,7% a 60%, y era
mentira: al reelegir la colocación estaba cambiando también **de qué punta** juega el bot, o sea la
estrategia. Fijando la punta, el efecto desaparece. Vale la pena recordarlo: si un experimento toca
dos variables a la vez, el número no dice nada.

### Y lo que quedaba: la regla de rozar

Con el cerebro puesto, el motor real bajó a 0,231%. Se le preguntó al motor **por qué** rechazaba
las que quedaban: de 1.158 colocaciones fallidas, **407 eran por `roza-otra-ficha`** — la misma regla
que había causado el bug del doble en la sección 71.

Allí se le puso una pasada de rescate solo para dobles. Medido ahora, extenderla a **todas las
fichas** (si a una ficha no le queda ni una casilla, se repasan las posiciones permitiendo rozar):

| | solo dobles | todas |
|---|-------------|-------|
| ficha trabada | 0,231% | **0,071%** |
| trancas | 19,4% | 19,0% |
| fichas montadas / fuera del tablero | 0 | **0** |
| fichas rozando a una ajena | 259 | 1.955 (2 de cada 100 posiciones) |

El precio es cosmético y minúsculo. Se cambió el test que afirmaba que **nunca** se tocan fichas
fuera de la cadena: eso dejó de ser cierto a propósito, y ahora comprueba lo que sí tiene que
seguir siendo cierto — que rozar es raro (tope 10%) y que montarse o salirse **no pasa nunca**.

### El resultado

Sobre **118.817 turnos**: ficha trabada **0,060%**, o sea **1 vez cada 1.673 turnos**. Trancas 18,3%,
cero fichas montadas, cero fuera del tablero.

De dónde venimos: 24,7% al empezar esta serie, 1,14% tras los arreglos de geometría, 0,338% con el
sitio libre, y **0,060%** con el cerebro y el rescate. No es cero —queda el caso en que de verdad no
hay casilla ni rozando— pero es 1 de cada 1.673.

Motor 57/57, backend 87/87, build ok, jugado en el navegador sin errores. Versión **0.0.52**.

## 82. Ninguna ficha fuera de la pantalla, garantizado (2026-09-02)

El usuario, forzando errores a mano: *"si te vas para los laterales se pone la pieza pero hay parte
del tablero que se va hacia el otro lado, eso no puede ser, la gente necesita ver siempre todas las
piezas... lo mejor es hacer un cuadrado con sus límites y que no se pueda pasar de ellos"*.

Tenía razón y la raíz era simple: **la rejilla donde se puede jugar (20 celdas, 24 con el
corrimiento de los dobles) era más grande que la ventana que se veía (18,2 celdas)**. El motor
dejaba poner fichas que la pantalla no podía mostrar.

### Se probó primero achicar la rejilla

Que el límite de juego sea el borde visible es la idea correcta, y con el cerebro de la sección 81
parecía barata. Medido, no lo es:

| rejilla | ficha trabada | celdas a mostrar | ficha |
|---------|---------------|------------------|-------|
| **20** | **0,051%** | 24,0 | 29x14 |
| 18 | 0,220% | 23,0 | 30x15 |
| 16 | 1,032% | 20,0 | 35x17 |
| 14 | 3,545% | 18,0 | 39x19 |

Achicar la rejilla multiplica por 20 las fichas trabadas para ganar un 20% de tamaño. No.

### La ventana

La otra vía: agrandar la ventana hasta que la cadena entre siempre. Medido sobre **120.936
posiciones**, con la cámara siguiendo la cadena:

| ventana | zoom | posiciones con alguna ficha fuera | lo peor |
|---------|------|-----------------------------------|---------|
| 18,2 celdas | 1,32 | 4,50% | 3,3 celdas |
| 20,0 | 1,20 | 0,28% | 1,5 |
| 20,9 | 1,15 | 0,10% | 1,1 |
| **21,5** | **1,116** | **0 (cero)** | **0** |

Se puso en **1,116**. Comprobado además jugando en el navegador: **0 px fuera del paño**.

### El precio, y de dónde sale

Las fichas quedan un 15% más chicas: **29x15 en 1v1** y **20x10 en 2v2**.

Esa diferencia entre modos no es casualidad: **las placas de los rivales de los costados se comen
120 px de los 347 del paño, o sea el 35% del ancho**. En 1v1 no hay placas laterales y la ficha es
la mitad más grande.

Si el tamaño en 2v2 molesta, la única palanca grande es esa. Poner a los dos rivales en las
**esquinas de arriba**, flanqueando al compañero, devuelve los 120 px y la ficha pasaría de 20x10 a
unos **31x15**, con todo igual de visible. Queda anotado a la espera de que el usuario decida, porque
él ya rechazó una vez tener a los tres arriba (§74) — aunque aquello eran los tres en fila al
centro, que es otra cosa.

Motor 57/57, backend 87/87, build ok. Versión **0.0.53**.

## 83. El logo del juego, y los dos menús alrededor de él (2026-09-02)

El usuario pidió un logo y un mejor menú. Eligió, de tres opciones, la de **dos fichas cruzadas
sobre el nombre**, y que se mejoraran **los dos menús** (portada y menú de modos).

### El logo

Sin crédito de IA de imagen (verificado otra vez: 0 créditos), y la regla de oro prohíbe dibujar.
Pero había un activo mejor que cualquiera de las dos cosas: **las fichas del propio juego**, el arte
que el usuario recortó a mano y que está protegido en `frontend/public/tiles/`.

`components/Logo.jsx` compone la doble seis y el 3|6 cruzadas, con el nombre en Cormorant Garamond
y degradado dorado. No hay ni un `path` dibujado: el logo y la mesa usan el mismo material, que es
justo lo que hace que se vea de la misma marca.

Dos variantes, porque un logo apilado no funciona en una cabecera:

- **`titulo`**: fichas grandes cruzadas encima del nombre. Para la portada.
- **`linea`**: las mismas fichas chiquitas al lado del nombre. Para la barra y el menú.

### La portada

El logo **es** el título. Antes había un eslogan de página web ("Domina el arte del dominó"); una
pantalla de título de juego lleva la marca, no un texto de venta.

Un detalle que se vio al probarlo: el fondo es una foto de una mesa con fichas y el logo también
lleva fichas, así que **el logo se perdía dentro de la foto**. Se le puso un velo oscuro de abajo
hacia arriba, solo en teléfono (en escritorio el logo va al costado y no hace falta).

### El menú de modos

El logo arriba del todo, y debajo el saludo con las estadísticas en una línea. El saludo bajó de
serif grande a texto normal para no competir con el logo.

Como el menú no puede scrollear (§69), el logo **se encoge con la pantalla** igual que los modos:
86% por debajo de 700px de alto, 72% por debajo de 600, y desaparece por debajo de 520. Medido:
sobra cero en 375x812, 360x640, 360x560 y 320x480.

### Lo demás

La barra de arriba cambió el emoji de dado 🎲 por el logo en su versión de línea. Y el icono de la
app (`icono-192`, `icono-512`, el maskable) se regeneró con las dos fichas cruzadas sobre el paño,
para que el icono de la pantalla de inicio sea el mismo logo.

**Una cosa que hay que decir:** en el servidor de desarrollo la consola muestra un error de
websocket (`ws://localhost:5199/socket.io/`). El proxy de Vite ya tiene `ws: true`, así que es cosa
del entorno; socket.io cae a polling y **el juego conecta y se juega igual** (comprobado). No se
persiguió porque no afecta a producción, donde no hay proxy de por medio.

Motor 57/57, backend 87/87, build ok. Versión **0.0.54**.

## 84. El traspaso a chat nuevo, puesto al dia (2026-09-02)

`contexto/README.md` se viene actualizando en cada commit, asi que estaba al dia. El que no:
**`contexto/PROMPT-NUEVO-CHAT.md` era del 28 de agosto**, cuarenta y cinco secciones atras.

No era solo que estuviera incompleto: **estaba mal de una forma peligrosa**. Decia que el trazado
de la cadena era **en serpentina**, que es justo lo que el usuario mando revertir en la seccion 44.
Un chat nuevo lo habria leido, lo habria dado por cierto y habria roto el juego. Tambien daba
53/69 tests (van 57/87), cinco bots (van 12), y en su lista de "no reintentar" tenia entradas que
desde entonces se demostraron al reves —por ejemplo, que relajar la regla de no rozar "no cambia
nada", cuando en la seccion 81 resulto ser lo que bajo las fichas trabadas de 0,231% a 0,071%.

Se reescribio entero. Lo que se agrego, que es lo que un chat nuevo necesita para no romper nada:

- **La regla de oro visual** (§78): iconos de libreria, nunca a mano, y donde estan los dos sets.
- **Como se coloca una ficha**, con el orden exacto de los cinco filtros y la advertencia de que
  **el orden importa mas que cada regla**: el cerebro va primero, el sitio libre va de ultimo, y
  cambiarlos de sitio empeora. Con los numeros de cada uno.
- **La cifra que hay que vigilar**: ficha trabada en 0,060%, y la instruccion de volver a medirla
  antes y despues de tocar la colocacion.
- **Por que el zoom es 1,116** y no otro: es el minimo con el que no se sale ni una ficha.
- **`svh` y no `dvh`**, que fue el bug del scroll al recargar.
- Los pendientes de verdad: la pagina de perfil (y por que se freno), el tamaño de la ficha en 2v2
  con su causa medida, y que los doce retratos son vectores a mano esperando credito de IA.

Cada dato se comprobo corriendo antes de escribirlo, no de memoria: version, numero de tests,
cantidad de bots, retratos en disco, el valor de `ZOOM_FICHAS` y los `gameFormat` registrados. Dos
salieron mal en el primer intento y se corrigieron: el README tiene 81 encabezados aunque la ultima
seccion sea la 83, y faltaba el formato `domino-1v1bot-v1`.

Motor 57/57, backend 87/87.

## 85. El 2v2 entre cuatro personas: dos agujeros que nadie habia pisado (2026-09-02)

El 2v2 entre cuatro personas reales estaba en la lista de "sin probar". Se probo, y tenia dos
fallas que lo hacian inservible. Las dos se encontraron corriendo sondas contra el `RoomManager`
de verdad, no leyendo el codigo.

### Buscar partida en 2v2 dejaba a la gente colgada para siempre

`processMatchmaking` tomaba **siempre dos** de la cola, sin mirar el modo. En 2v2 hacen falta
cuatro: creaba la sala, metia a los dos adentro, `startGame` devolvia `Faltan jugadores (2/4)`, y
ese error **solo salia por la consola del servidor**. Los dos jugadores quedaban fuera de la cola,
dentro de una sala que no arranca nunca, y en la pantalla el "buscando partida" girando sin fin.
Ni siquiera podian ser emparejados por otro que llegara despues, porque ya no estaban en la cola.

Medido con una sonda antes del arreglo: dos personas en 2v2 -> 1 sala creada, 2/4 jugadores,
`arrancada=false`, cola vacia, cero avisos a los clientes. En 1v1 la misma sonda daba 2/2 y
arrancada. Nunca habia fallado porque **nadie habia probado el 2v2 por emparejamiento**.

Ahora la cantidad la dice el modo (`config.humans`), y si algo sale mal en el medio los jugadores
**vuelven a la cola** con un `matchmaking:error` en vez de quedarse tirados. Ademas, pedir rivales
para un modo que se llena con bots se corta de entrada con un mensaje claro: esa partida arranca
sola, no hay a quien esperar.

Comprobado con cinco escenarios: dos personas esperan (0 salas, siguen en cola), cuatro arrancan
(4/4, equipos 0-2 y 1-3, los cuatro avisados), el 1v1 sigue igual, el modo con bots se rechaza, y
con seis personas arranca una partida y quedan dos esperando.

### Irse a mitad de partida dejaba a los demas mirando una mesa muerta

`room:leave` sacaba al jugador de `room.players` y nada mas. El juego guarda su propia lista, asi
que el estado **no se corrompia** y los asientos no se corrian —eso estaba bien—, pero el turno se
quedaba clavado en el que se fue. Los otros tres esperaban un turno que no iba a llegar nunca. No
hay reloj de turno en este banco de pruebas, asi que no habia nada que lo destrabara.

Lo peor es que **el motor ya sabia resolverlo**: `ACTION.FORFEIT` esta implementado, le da la
partida al equipo contrario y deja `reason: 'forfeit'`. `DominoGame` expone `forfeit()`. Nadie lo
llamaba.

Se conecto en `room:leave`: irse de una partida **en curso** es abandonarla. Salir del lobby antes
de arrancar no cuenta, y un bot no puede abandonar. El aviso se manda **antes** de sacar al
jugador de la sala, para que el que se va tambien vea por que termino y no una pantalla en blanco.

### Y el adaptador no sabia contar un abandono

Al conectarlo aparecio una tercera falla, mas fina. `winningTeam` y `endReason` leian de
`state.lastRound`, que es el resultado de la **ronda**. Un abandono termina la **partida** sin
cerrar ronda: el resultado queda en `state.result`. Resultado: la partida terminaba y el que se
quedaba veia "terminada" sin ganador ni motivo.

El primer intento tampoco funciono, y vale anotarlo: se puso el caso de abandono **despues** de
`if (this._roundClosed)`, sin ver que `_roundClosed` es `phase !== PLAYING` —y un abandono deja
justamente esa fase—, asi que entraba por la primera rama y devolvia `null` igual. Ahora se
consulta la ronda primero y el resultado de partida **solo si la ronda no dijo nada**: el final
normal muestra exactamente lo mismo que antes, y el abandono deja de venir vacio.

Se agrego `forfeitedSeat` al estado que viaja al cliente, para poder decir **quien** se fue.

### En la pantalla

El cartel de fin conocia dos motivos: "Dominó" y todo lo demas era "Trancado". Un abandono se
habria mostrado como un tranque, que es mentira. Ahora dice `Fulano dejó la partida`, y **no
muestra los puntos ni el desglose de manos**: en un abandono no hay ronda cerrada, asi que serian
"+0 puntos" y una tabla vacia, que parece un error del juego.

### Lo que quedo sin ver con mis propios ojos

El camino de datos esta probado de punta a punta con sondas, y el juego normal se vio corriendo en
localhost. Lo que **no** se vio es el cartel de abandono dibujado: para eso hacen falta dos
personas registradas en dos navegadores, y no se crean cuentas para probar.

Motor 57/57, backend 87/87.

## 86. Fichas mas grandes: el unico camino que no rompe nada es devolverle alto a la mesa (2026-09-02)

Jonathan pidio agrandar las fichas de la mesa. Los dos botones obvios estan medidos y
descartados: subir `ZOOM_FICHAS` de 1,116 saca fichas de la pantalla, y achicar la rejilla
multiplica por 20 las fichas trabadas (§82). Asi que se busco por otro lado.

**El hallazgo:** la escala sale de `min(anchoUtil, altoUtil)`, o sea del lado mas corto de la
mesa, que en una pantalla de escritorio es el vertical. Y la cantidad de celdas visibles (21,5)
no depende del tamano del pano: sale de `ZOOM_FICHAS` y se mantiene sola. Entonces **cada pixel
que se le devuelve al alto agranda todas las fichas sin tocar la garantia de §82**: se ven las
mismas 21,5 celdas, solo que cada celda mide mas.

Se midio donde se iba el alto y aparecieron dos sobras:

- `MARGEN_MESA.arriba` estaba en 62 px, pero la placa del jugador de enfrente termina a 34.
  Habia 28 px que no usaba nadie. Se bajo a 44.
- El bloque de la mano tenia `pt-8`, 32 px de aire entre el borde del pano y el rotulo. Se bajo
  a `pt-3` (12 px).

Resultado medido, con una ficha puesta en la mesa:

| ventana | rejilla antes | rejilla ahora | ficha |
|---|---|---|---|
| 1280x720 | 272 px | 308 px | 27x14 -> 31x15 |
| 1904x1000 | ~519 px | 561 px | +8% |

Es una mejora real pero moderada: entre 8% y 13% segun la pantalla.

**Por que no se puede mucho mas sin decidir algo.** Mirando la mesa con una sola ficha puesta se
entiende el fondo del asunto: la ventana muestra siempre 21,5 celdas, tengas una ficha o veinte.
La ficha no es chica en si —39x19 px en una ventana de 1600— es que la mesa esta casi vacia y el
tamano no se adapta. Eso es una decision tomada y escrita: *"las fichas nunca cambian de tamano
mientras jugas: eso lo rechace y no se vuelve"*. Se respeta.

Lo que queda para ganar de verdad, sin romper nada de eso, es el pendiente que ya estaba anotado:
**acotar el corrimiento visual de los dobles**. Hoy la cadena dibujada necesita 22,5 celdas cuando
la rejilla mide 20 porque el desplazamiento se acumula; si se acota, la ventana necesaria baja y
las fichas crecen gratis. Eso pide volver a correr la simulacion de §82 antes y despues.

**Y en el telefono el problema es otro:** ahi manda el ancho (315 px utiles contra 454 de alto), y
la mesa usa solo el 44% del alto disponible. La rejilla es cuadrada y la pantalla no. Optimizar
eso pide medir "fichas fuera de pantalla" con ventanas no cuadradas, que es una simulacion nueva.

### Una alarma falsa, anotada para que no la repita otro

Se creyo encontrar que el tablero no se re-escalaba al cambiar el tamano de la ventana: se lo veia
quedar en 561 px dentro de un pano de 551, desbordando. **Era el navegador de pruebas**, que
cambia el viewport sin disparar el evento `resize`. Disparandolo a mano, la mesa se recalculo al
instante. El `ResizeObserver` y las escuchas de `resize` y `orientationchange` de `Board.jsx`
funcionan bien.

Motor 57/57, backend 87/87.

## 88. El tablero de 16x16: la base, con la cuenta de Jonathan (2026-09-03)

Jonathan lo planteo asi, y la cuenta es correcta: *"la ficha de domino ocupa 2 cuadros y son 28
fichas, o sea 56 cuadros. ¿Cuando tiene el tablero para jugar?"*. La rejilla era de 20x20 = 400
casillas, siete veces lo que ocupan las fichas. Y una rejilla enorme obliga a dibujarla chiquita
para que entre entera en un telefono.

Pidio empezar por la base: definir bien el tablero, y despues corregir lo demas.

### Lo que se probo y fallo

Antes de achicar nada se intento que la cadena se mantuviera junta, para que cupiera en menos
espacio: un filtro nuevo que, entre las colocaciones posibles, elige la que deja la caja de la
cadena mas chica. La idea era que al llegar al borde doblara sola.

**Empeoro, y bastante.** Medido sobre 120 partidas por tamano de rejilla:

| rejilla | trabadas antes | con "mantener junta" |
|---|---|---|
| 20x20 | 0,030% | 1,620% |
| 12x12 | 9,481% | 8,665% |
| 10x10 | 12,258% | 14,612% |

Y la cadena apenas se encogio: de 20x22 casillas a 19x19,5. Se revirtio. Es la cuarta vez que un
criterio de "compacidad" o "apertura" puesto por delante de seguir derecho empeora las cosas; ya
esta en la lista de no reintentar y ahora tiene una medicion mas.

Al hacerlo aparecio algo que conviene tener anotado: **la regla de donde cae la ficha esta escrita
dos veces**, una en `straightestPlacement` (layout.js) y otra copiada dentro del bot (bot.js). El
primer intento no hizo nada porque solo se toco una. Habria que unificarlas.

### Lo que si se hizo

**La rejilla pasa de 20x20 a 16x16.** El precio esta medido: la ficha trabada sube de 0,030% a
0,751%, una cada 133. Jonathan lo acepto explicitamente eligiendo esta opcion.

Se volvio a medir el zoom, como en §82 pero con la rejilla nueva, sobre 47.000 posiciones de 1v1 y
47.000 de 2v2 jugadas de verdad. La cadena mas grande ocupa **17,5 x 17,0 casillas**:

| zoom | celdas a la vista | posiciones con algo fuera |
|---|---|---|
| 1,40 | 14,3 | 8,37% |
| 1,25 | 16,0 | 0,47% |
| 1,20 | 16,7 | 0,05% |
| 1,15 | 17,4 | 0,004% (2 de 47.168, en 2v2) |
| **1,116** | **17,9** | **cero en los dos modos** |

**El zoom se queda en 1,116**, ahora con mas margen que antes: 17,9 celdas a la vista contra una
cadena que nunca pasa de 17,5.

La ficha en la mesa, medida en el navegador con un telefono de 375: **de 29x15 a 35x18**, un 21%
mas grande. No por subir el zoom, sino porque la rejilla es mas chica.

### Lo que queda

- El doble mal colocado que reporto Jonathan con una captura: sin diagnosticar todavia.
- Unificar la regla de colocacion, que hoy vive en dos archivos.

Motor 57/57, backend 87/87.

## 89. La cadena se iba al rincon: desempate por centrado (2026-09-03)

Con la rejilla nueva de 16x16, Jonathan mando una captura que mostraba el problema entero: la
cadena metida en la esquina de abajo a la derecha, pegada a las dos paredes, con medio tablero
vacio arriba; el cartel rojo de **"Colocacion invalida"**; y **15 fichas en la mano**, porque
estuvo robando sin poder jugar.

Medido, la causa era esa deriva:

| rejilla | se corre del centro | pegada a 1 pared | acorralada en esquina |
|---|---|---|---|
| 20x20 | 2,7 casillas | 16,9% | 1,4% |
| 16x16 | 2,4 casillas | 28,4% | 3,9% |

Con 16x16 la cadena esta contra una pared en mas de una de cada cuatro jugadas. Y contra la pared
es donde se traba: una vez acorralado te quedas robando, que es lo que le paso.

### El arreglo

Un desempate nuevo al final de la seleccion: entre las colocaciones que quedaron empatadas, gana
la que deja la cadena **mas cerca del centro** del tablero.

Va en el ultimo lugar a proposito. Adelantarlo es lo que fallo en la §88 con el criterio de
compacidad: puesto antes de "seguir derecho" empeora, puesto al final ayuda. Es el mismo orden que
ya estaba medido en §73.

Se agrego en los **dos** lugares donde vive esta regla, `layout.js` y `bot.js`. Que este duplicada
sigue siendo deuda.

Resultado sobre 120 partidas por tamano:

| rejilla | trabadas antes | con centrado |
|---|---|---|
| 20x20 | 0,030% | 0,044% |
| 18x18 | 0,312% | **0,105%** |
| 16x16 | 0,751% | **0,189%** |
| 14x14 | 4,004% | **1,272%** |
| 12x12 | 9,481% | **4,162%** |

En 16x16 la ficha trabada baja de una cada 133 a **una cada 529**. Y la esquina baja de 3,9% a
2,8%.

### El zoom baja a 1,10

Enderezar la cadena hacia el centro la estira un poco: llega a **18,0 casillas** donde antes
llegaba a 17,5. Con el zoom en 1,116 se salian 4 fichas de 46.985 en 1v1. Cero es cero, asi que
baja a **1,10** (18,2 celdas a la vista), que da cero en los dos modos.

Aun asi la ficha queda mas grande que al principio: en un telefono de 375, **de 29x15 a 35x17**.

Motor 57/57, backend 87/87.

## 90. El doble contra la pared: cruzado o no entra (2026-09-03)

Jonathan mando una captura con el doble marcado en rojo: al llegar al borde se puso **horizontal
y en paralelo** a la cadena. *"Eso es una estupidez, esta mal hecho"*. Y tiene razon: un doble
acostado en linea con la cadena no existe en una mesa de verdad.

### De donde salia

De una salida de emergencia en `placementsFor`. Cuando el doble no entraba cruzandose mas alla de
la punta —tipicamente porque la punta quedo contra el borde— se ofrecia en la MISMA direccion que
la cadena. La justificacion escrita era que la cadena "dobla ahi mismo", asi que respecto de la
direccion NUEVA el doble esta cruzado. Es defendible en el papel, pero se ve mal, que es lo unico
que importa.

### Lo que se probo antes de sacarlo

Colgarlo del costado de la punta, sin dejar de estar cruzado, que es lo que muestran los ejemplos
que dibujo Jonathan. **No se puede con el dibujo actual**: `joinOffset` centra siempre el doble
cruzado sobre la union, asi que colgado al costado se corre encima de la cadena y lo rechaza el
control de solape. Se comprobo con el diagnostico de `placementsFor`, que devolvia
`solapa-visualmente` para las cuatro candidatas.

Para que esa colocacion exista habria que cambiar como se dibuja un doble cruzado, no como se
elige. Queda anotado.

### Lo que se hizo

Se quito la salida en paralelo. La regla es ahora: **el doble va cruzado o no entra**. Que no
entre es una jugada bloqueada normal; el propio Jonathan lo dijo en el mismo mensaje: *"esta bien
el limite que no puedas seguir"*.

**El precio esta medido y no es chico:** con la rejilla de 16x16, la ficha trabada sube de 0,189%
a **1,014%**, o sea de una cada 529 a una cada 99. Si eso resulta molesto al jugar, la decision a
revisar es esta, y la alternativa es cambiar el dibujo del doble cruzado para que pueda colgar del
costado.

El test `doble contra el borde` guardaba la regla vieja y se reescribio: ahora comprueba que
ninguna opcion quede en paralelo con la cadena.

Motor 57/57, backend 87/87.

---

## 91. Bots que juegan para romper el juego, no para ganar

Pedido de Jonathan: *"puedo crear un grupo de bot que prueben y busquen roper el juego...
busquen las fallas antes de que yo las vea... y nosotros repararlas antes de esperar q
nasca la falla"*.

Si se puede, y ya esta hecho: `packages/domino-engine/tools/romper.mjs`.

```bash
node tools/romper.mjs 1000
```

### En que se diferencia de los tests

Los tests comprueban casos que YO pense. Estos bots juegan partidas enteras y despues de
**cada jugada** revisan que el estado siga siendo valido. Encuentran lo que a nadie se le
ocurrio probar.

### Las 6 personalidades

Ninguna juega bien a proposito. Juegan raro, que es lo que rompe cosas:

| bot | que hace |
| --- | --- |
| `siempre-la-primera` | la primera opcion de la lista, siempre |
| `siempre-la-ultima` | la ultima |
| `al-azar` | al azar, pero con semilla (se repite igual) |
| `obsesionado-con-dobles` | tira dobles apenas puede, que es lo que traba el tablero |
| `suelta-lo-pesado` | la ficha de mas puntos primero |
| `roba-todo-lo-que-puede` | roba antes que jugar |

### Las 10 reglas que se comprueban despues de cada jugada

1. Las 28 fichas siempre estan, sin repetidas ni perdidas
2. Ninguna ficha queda fuera de la rejilla
3. Ninguna ficha se monta sobre otra
4. La cadena de verdad pega: cada ficha con la anterior
5. Las puntas que se informan son las puntas reales
6. Nadie ve la mano de otro
7. Los puntajes nunca son negativos
8. El estado sobrevive guardarlo y volverlo a cargar
9. No se puede pasar si hay jugada legal
10. Siempre hay alguna accion posible

Ademas: cada 7 jugadas se mete una accion invalida a proposito (ficha `99`) para
comprobar que la rechaza sin romperse, y cada 50 partidas se juega la misma semilla dos
veces para confirmar que da exactamente lo mismo.

### Resultado

**2.000 partidas, ningun fallo.**

### Tres falsos positivos mios, y como se arreglaron

Los tres fueron errores de la herramienta, no del motor. Vale anotarlos porque son la
misma trampa tres veces: **buscar una ficha como texto dentro de un JSON**.

1. `[1,2]` aparecia dentro de `"teams":[1,2]`. Se paso a comparar estructura.
2. `revealedHands` trae todas las manos al cerrar la ronda, y eso es a proposito: de ahi
   sale el desglose del puntaje. Se limito la comprobacion a la ronda en curso.
3. El `ROUND_END` de la ronda 1 guardaba las sobras `[[2,2]]`. En la ronda 3 al asiento 1
   le quedaba una sola ficha, justo la `[2,2]`, y coincidieron. Ahora del historial solo
   se miran los eventos de la ronda que se esta jugando.

Regla que queda: **antes de decir "encontre un bug", reproducir la semilla y mirar el dato
crudo.** El motor es determinista, asi que cualquier fallo se repite exacto con su semilla.

---

## 92. La lupa: acercar la mesa con dos dedos y soltar para volver

Pedido de Jonathan: *"que la gente le pueda hacer zoom a la mesa y el zoom sea dinamico y
que cuando suelte el zoom vuelva a su forma original... el va a hacer zoom con los dedos en
el telefono y apenas suelte regrese a su forma base"*.

Hecho: `frontend/src/hooks/useLupa.js`, enganchado en `Board.jsx`.

### La decision de fondo

Es una **lupa encima**, no un cambio de tamano del juego. La partida se sigue dibujando
exactamente igual que antes: misma escala, misma camara, mismas fichas. Lo unico que se
mueve es una capa de vista que se agranda mientras hay dedos apoyados.

Eso resuelve dos problemas de una:

1. **Nadie se queda trabado.** No hay estado que guardar ni boton de "volver": sueltas y
   estas donde estabas. Era literalmente lo que pidio.
2. **El iman no se descoloca.** El calculo de donde cae una ficha sigue usando la escala de
   siempre, asi que acercar no mueve el punto donde se suelta.

### Detalles que importan

- Se acerca **en el punto donde estan los dedos**, no en el centro de la pantalla. Pones los
  dedos sobre una punta de la cadena y se agranda esa punta.
- Con los dos dedos apoyados se puede **arrastrar** la mesa para ir a mirar la otra punta.
- Tope: 3 veces. Mas que eso no sirve para nada.
- Al soltar vuelve animado en 220 ms. De golpe se ve como un salto.
- `touch-action: none` en el paño y `passive: false` en los listeners. Sin las dos cosas el
  navegador se lleva el gesto y termina acercando **la pagina entera** en vez de la mesa.
  Con `addEventListener` normal de React no alcanza: React los registra en pasivo.

### Comprobado

En el pano de 331x673 (telefono de 375), con dedos sinteticos:

| momento | lo que hace la mesa |
| --- | --- |
| en reposo | `scale(1)`, sin transicion |
| separando los dedos | `scale(2.25)` anclado en el punto de los dedos |
| separando mas | `scale(3)`, que es el tope |
| moviendo los dos dedos | se arrastra, la escala no cambia |
| al soltar | vuelve a `scale(1)` con la animacion de 220 ms |

---

## 93. Perfil con historial de partidas y chat global en el menu

Pedido de Jonathan: *"has un sistema de perfil donde la persona pueda ver sus partidas
(ganadas y perdidas) y un chat global donde todos los usuarios puedan chatear que se vea en
el menu principal"*.

### Lo que se encontro antes de empezar

**No se guardaba ninguna partida.** La tabla `game_history` existia desde el principio pero
nunca se escribio una fila, `User.updateStats` nunca se llamo, y ademas la tabla no guardaba
*quien* jugo: solo el codigo de sala y los puntos. Con eso era imposible responder "mis
partidas". El historial arranca de cero desde este cambio; no hay nada viejo que recuperar.

### Las dos decisiones que tomo Jonathan

1. **Solo cuentan las partidas entre personas.** Las que son contra la maquina no se
   guardan. Un record que las incluye se infla solo: cualquiera le gana al bot facil toda la
   noche y el numero deja de servir para comparar.
2. **En el chat escribe el que tiene cuenta; el invitado lee.** Es por moderacion: sin
   cuenta no hay a quien callar, porque el que se porta mal se va, vuelve y sigue.

### Como quedo

| pieza | donde |
| --- | --- |
| tablas `partidas`, `partida_jugadores`, `chat_global` | `backend/src/config/database.js` |
| guardar y consultar partidas | `backend/src/models/Partida.js` |
| guardar y limpiar mensajes | `backend/src/models/ChatGlobal.js` |
| el enganche que graba al terminar | `RoomManager._registrarSiTermino` |
| API del perfil | `GET /api/perfil` (con sesion) |
| eventos del chat | `backend/src/sockets/chatSocket.js` |
| pantalla del perfil | `frontend/src/pages/Perfil.jsx` |
| chat del menu | `frontend/src/components/chat/ChatGlobal.jsx` |

El grabado se cuelga de `broadcastState` porque es el **unico punto por el que pasan todos
los finales**: el normal, el abandono y el que termina por jugada de un bot. Enganchar cada
final por separado seria olvidarse de uno. Se graba una sola vez, con una marca en la sala.

### Los frenos del chat, todos del lado del servidor

Un chat abierto a internet sin frenos se llena de basura el primer dia. Van tres, y ninguno
se puede saltear desde el navegador:

- 300 caracteres como maximo
- un mensaje cada segundo y medio
- quince por minuto

El contador **no se borra al desconectarse**. El primer intento lo borraba, y asi el freno
no servia para nada: al que frenaban cerraba la pestaña, volvia a entrar y seguia.

### Tres bugs que aparecieron haciendo esto

1. **El chat tenia su propia copia del secreto de los tokens**, y decia
   `dev-secret-change-me` mientras el resto del proyecto usa `dev-secret`. En local,
   ninguna cuenta habria podido escribir. La solucion no fue copiar bien el secreto sino
   **no repetirlo**: el chat usa lo que ya dejo verificado el middleware del socket.
2. **Las fechas se guardaban como el texto `CURRENT_DATETIME`.** El conversor a SQLite
   cambia `TIMESTAMP` por `DATETIME` y de paso pisaba `CURRENT_TIMESTAMP`, que SQLite no
   conoce. Se arreglo el reemplazo y ademas la fecha ahora se manda desde Node, para no
   depender de como quedo escrita la tabla en cada base.
3. **`connectSocket` mataba el socket si otro componente lo pedia mientras se conectaba.**
   Solo devolvia el socket existente si YA estaba conectado; si estaba a medio conectar lo
   tiraba y hacia otro, y el primero que lo pidio se quedaba escuchando un socket muerto.
   Este es de toda la app, no del chat: el chat solo lo dejo a la vista.

### Comprobado

- `npm run test:perfil` — 20 pruebas. Juega partidas enteras entre dos personas con el motor
  y el RoomManager de verdad, y comprueba que quede guardada, que no se guarde dos veces,
  que las de bot no entren y que las fechas sean fechas.
- `npm run test:chat` — 9 pruebas contra el servidor levantado: el invitado lee y no
  escribe, la cuenta escribe y le llega a todos, el freno frena, y mandar un nombre
  distinto no sirve para hacerse pasar por otro.
- Motor 57/57, backend 87/87.

### Lo que falta

- **No hay moderacion.** Hay frenos, pero no hay forma de borrar un mensaje ni de callar a
  alguien. Con poca gente aguanta; antes de que entre gente de verdad hace falta.
- Las tablas nuevas se crean solas al arrancar, tambien en produccion.

---

## 94. El menu principal, reacomodado

Pedido de Jonathan, con captura marcada en rojo: el nombre del usuario arriba a la
izquierda (dejando sitio al lado para el nivel de ranking, que todavia no existe), "Salir"
a la derecha, los jugadores en linea abajo y **pegados al chat**, y todo el bloque del menu
un poco mas arriba. El fondo no se toca.

### Que cambio

| antes | ahora |
| --- | --- |
| el nombre iba a la derecha, junto a "Salir" | va a la izquierda, en su propia chapita |
| "EN LINEA" arriba del todo en telefono y abajo a la derecha en escritorio | abajo, al lado del chat, en las dos pantallas |
| el boton del chat se posicionaba solo (`fixed`) | lo coloca quien lo usa: no se posiciona solo |
| el menu pegado al borde de abajo (`pb-6`) | sube y deja sitio a la barra (`pb-20`) |

El contador de gente en linea estaba **en dos sitios distintos segun el tamaño de
pantalla**. Ahora es uno solo, y vive en la misma barra que el chat.

### Medido, no mirado

En telefono de 375: "VER TODOS LOS MODOS" termina en 732 y la barra de abajo empieza en
767, o sea 35 px de aire, y cierra en 800 con 12 px hasta el borde. En escritorio de 900 el
nombre queda arriba a la izquierda (x=258, despues del logo), "Salir" arriba a la derecha
(x=813) y la barra abajo a la izquierda (x=24).

---

## 95. Reloj de turno: 25 segundos para jugar, 60 para volver

Reglas que pidio Jonathan, **solo para las partidas entre personas**:

- **25 segundos para jugar.** Si no jugas, **se te pasa el turno** y juega el siguiente.
  Nada mas: no se juega solo por vos, no se cierra la ronda, nadie suma puntos.
- **Los ultimos 10 segundos** se muestran en un circulito que cuenta 10, 9, 8... 1.
- **Si te caes, tienes 60 segundos para volver**, y al otro le sale el aviso con la cuenta
  atras. Si no vuelves, abandonas la partida (que es lo que ya pasaba al salirse).

Contra la maquina **no hay reloj**: el bot no se cuelga y apurar a quien juega solo no
tiene sentido.

### El castigo se corrigio despues de verlo funcionando

La primera version hacia que **perdieras la ronda** y que tus fichas se contaran como
puntos del rival. Se construyo asi, se probo, y al verla Jonathan la cambio:

> *"Yo creo que la cagué con esa regla... no es lo mismo que me dé todos sus puntos.
> Debería ser que pase automáticamente el turno y juegue la otra persona. Que una persona
> no juegue un turno es suficiente penalización."*

Tiene razon: perder la ronda entera por dormirse un turno decide la partida por un
descuido. Queda anotado aca porque el intento anterior explica por que el motor tiene una
opcion de configuracion en vez de una regla fija.

### Donde vive cada cosa, y por que

El motor tiene **prohibido usar relojes por dentro**: tiene que dar siempre el mismo
resultado con la misma semilla, y un `setTimeout` rompe eso. Asi que el reparto es:

| quien | que hace |
| --- | --- |
| el motor | sabe QUE pasa cuando se acaba el tiempo (`timeoutRule`) |
| el servidor | cuenta el tiempo y le avisa al motor (`RoomManager._ajustarReloj`) |
| la pantalla | dibuja lo que falta |

La accion `TIMEOUT` ya existia en el motor pero hacia otra cosa: **jugaba sola por vos**.
No se cambio por las bravas; se agrego `timeoutRule` en la configuracion, con
`'auto-play'` (lo de antes) por defecto y `'skip-turn'` para lo que se usa ahora.

### Perder el turno NO cuenta como pasar

Esto importa mas de lo que parece. Pasar es **declarar que no tenes jugada**, y el motor
cuenta los pases seguidos para detectar el tranque. Al que se le acaba el tiempo quizas
tenia jugada y no la hizo. Si el salto contara como pase, **dos descuidos seguidos
cerrarian la ronda como trancada y se puntuaria por fichas**: exactamente el castigo que
se acaba de sacar, colado por la puerta de atras.

Tampoco se resetea el contador de pases, para que una ronda de verdad trancada siga
pudiendo cerrarse aunque alguien este dormido.

### Tres cosas que se hicieron distinto a lo obvio

1. **Se manda cuanto FALTA, no la hora en que vence.** Si se mandara la hora del servidor,
   un telefono con el reloj corrido dibujaria una cuenta atras equivocada. "Faltan 8
   segundos" se entiende igual en cualquier reloj.
2. **Reemitir el estado no reinicia el reloj.** El turno se identifica por ronda y asiento;
   mientras sea el mismo, el reloj sigue donde estaba. Sin esto, reconectarse regalaria 25
   segundos limpios cada vez.
3. **El reloj arranca en `startGame`**, no en quien emita el estado despues. Si dependiera
   de que alguien se acuerde de emitir, el PRIMER turno de la partida se quedaria sin
   tiempo: justo el unico que nadie mira. Asi estaba, y asi lo encontro la prueba.

### El turno que salta solo parece un error

Cuando a alguien se le acaba el tiempo, el turno cambia sin que nadie haya hecho nada. Sin
avisar, eso se lee como un fallo del juego. Por eso sale un cartelito de tres segundos y
medio: *"A Fulano se le paso el turno"*. Lleva un contador ademas del nombre, porque si al
mismo jugador le saltan dos turnos seguidos el dato seria identico y el aviso no volveria a
salir.

### El reloj del turno NO se para cuando alguien se cae

Son dos cosas distintas: los 25 segundos son por no jugar, estes conectado o no; los 60 son
para no perder la partida entera por un corte de internet. Si se parara el reloj al
desconectarse, cortar el wifi seria la forma de no perder nunca un turno.

### Comprobado

- Motor: 4 pruebas nuevas (61 en total). Que solo se pierde el turno, que no se juega
  ninguna ficha, que nadie suma puntos, que **no cuenta como pase**, y que sin configurar
  nada sigue como antes.
- `npm run test:reloj` — 20 pruebas del servidor: el reloj corre, reemitir no regala
  tiempo, al siguiente le empiezan sus 25 segundos, contra la maquina no hay reloj, el
  aviso de caida aparece y desaparece, si no vuelve abandona, y el socket viejo no marca
  ausente a quien ya se reconecto.
- `npm run test:reloj-e2e` — 12 pruebas con dos jugadores de verdad por socket: se
  emparejan, nadie juega, y **medio minuto despues el turno pasa solo, sin que nadie sume**.
- En pantalla: se vio el circulito contando y el cartel *"A PruebaPerfil se le paso el
  turno"*, con el marcador quieto en 0 a 0.
- Backend 87/87, perfil 20/20, y los bots rompe-juegos sin fallos en 160 partidas.

---

## 96. Tres fallos que encontro Jonathan jugando

Reclamo suyo, y tiene razon: *"no entiendo por qué no te estás dando cuenta de las cosas,
que probaras con los bots cada que todo saliera bien"*. Los tres se arreglaron y los tres
dejaron una prueba automatica detras, para que no vuelvan por la misma puerta.

### 1. El doble contra la pared no se podia jugar

Captura suya: *"no me deja poner el doble cero, solo me deja poner el cero tres"*.

**Causa.** El doble solo se ofrecia **pasando la punta**. Si la punta quedaba contra el
borde, esa unica salida caia fuera del tablero y el doble era injugable con sitio de sobra
al lado. Una ficha normal ya podia **doblar** en la punta desde la seccion 24; el doble no.

**Arreglo.** El doble tambien dobla, y sigue cruzado: si la cadena gira y se va horizontal,
el doble va vertical. Nunca en linea, que es lo que el mismo rechazo en la seccion 90.

Hubo que cambiar tambien el dibujo. `joinOffset` centraba el doble sobre el **centro** de la
ficha vecina; al costado esa vecina ocupa dos casillas en el eje que importa, con lo que el
doble quedaba corrido media ficha. Ahora se centra sobre la **union**.

**Y va como rescate, no como opcion normal.** Esto lo decidio la medicion, no el gusto:

| | dobles trabados | fichas normales trabadas | total |
| --- | --- | --- | --- |
| antes | 4,870% | 0,348% | 1,000% |
| ofreciendolo siempre | 2,103% | **1,204%** | **1,331%** (peor) |
| solo como rescate | **1,738%** | **0,302%** | **0,506%** |

Ofrecerlo siempre lo empeoraba: el doble atravesado en un giro deja el tablero mas apretado
y estorba a todo lo demas. Como rescate arregla el caso sin tocar las partidas donde el
doble ya entraba. Medido sobre 200 partidas por formato, ~156.000 situaciones.

**Prueba nueva en los bots rompe-juegos (regla 11):** ningun doble puede quedar en linea
con la cadena. Mira la ficha que se acaba de poner, por numero de jugada: un doble bien
cruzado puede quedar en linea con una ficha que llego mucho despues por su costado corto, y
eso no es culpa de como se coloco el doble. El primer intento de esta regla no lo
distinguia y daba 198 falsos positivos.

### 2. El perfil parecia mostrar rondas

**Causa.** Lo que se guardaba **si era la partida completa** (una fila por partida, no por
ronda). Lo que estaba mal era la ETIQUETA: se guardaba `endReason`, que responde por la
**ultima ronda**, asi que en el perfil se leia "dominó" o "trancado". Eso es como termino la
ultima mano, no la partida, y hacia parecer que la lista era de rondas.

**Arreglo.** Se guarda el final de la PARTIDA (`state.result`): quien llego a los 100. En
la lista, el final normal no escribe nada y el abandono dice "por abandono". Debajo del
titulo se aclara que son partidas completas y que las rondas sueltas no cuentan.

### 3. La cuenta atras no se borraba cuando el otro jugaba

*"El otro jugador juega y el conteo continúa. Una vez que el jugador juegue, el conteo debe
desaparecer."*

**Causa, y es fina.** El servidor manda **cuanto falta**, y al empezar cualquier turno eso
vale exactamente `25000`: el mismo numero, turno tras turno. La pantalla anclaba el reloj
cuando ese valor cambiaba, y como nunca cambiaba, **no volvia a ponerlo en hora** y seguia
descontando el turno anterior.

**Arreglo.** El servidor manda ademas un `turnoId` que cambia con cada turno, y es eso lo
que reinicia la cuenta. La prueba de punta a punta comprueba que el id del turno nuevo sea
distinto del anterior.

---

## 97. Icono nuevo, retos desde el chat y buzon de avisos

Cuatro pedidos de Jonathan en una tanda: cambiar el icono al doble seis, poder retar a
alguien desde el chat, un sistema de notificaciones, y que avise de torneos y retos.

### El icono: el doble seis, de pie

El favicon era un **2-1 acostado**. Ahora es el doble seis, de pie: es como se pone un doble
en la mesa (cruzado) y en un cuadrado se ve mas grande. Ademas el juego es dominó
venezolano **doble seis**, que ya lo dice la propia portada.

Los PNG de la app (192, 512 y el "maskable") se generan con
`node scripts/generar-icono.mjs`, en `frontend/scripts/`. **Sin librerias de imagen**: el
PNG se escribe a mano con `zlib`, que ya viene con Node, igual que el motor no tiene
dependencias. Se dibuja al cuadruple y se reduce dos veces, que es como se consiguen los
bordes suaves sin un motor de dibujo. El "maskable" lleva mas aire porque el sistema
operativo le recorta las esquinas.

### Retar desde el chat

Se toca el nombre de quien escribio y sale "¿Retar a Fulano?". El otro recibe el reto
encima de todo, con un minuto para contestar. Si acepta, se arma una **mesa privada** y a
los dos les llega el mismo codigo.

Reglas, y el porque de cada una:

| regla | por que |
| --- | --- |
| solo cuentas pueden retar | igual que el chat: sin cuenta no hay a quien reclamarle |
| solo a quien este en linea | un reto a quien no esta no lo contesta nadie |
| un minuto de vigencia | un reto de ayer no sirve |
| un reto vivo por pareja | si no, se le llena el buzon al otro |
| cinco segundos entre retos | para que no se pueda acosar |

**Los retos NO se guardan en la base.** Viven un minuto: guardarlos seria llenar una tabla
de cosas muertas y tener que limpiarlas. Lo que si se guarda es el **aviso**: si te retaron
mientras no estabas, al volver lo ves aunque el reto ya no sirva.

### El buzon

Campana arriba a la derecha con el contador de los que no leiste. Los avisos **se guardan
en la base**: uno que solo existe mientras mirabas la pantalla no sirve de nada.

Tipos: `reto`, `reto-aceptado`, `reto-rechazado`, `reto-vencido` y **`torneo`**.

**Los torneos todavia no existen.** El tipo esta previsto para que, cuando se hagan, solo
tengan que escribir una fila en la tabla y le llegue a la campana sin tocar nada mas.

### Como se le manda algo a una PERSONA

Cada cuenta entra a una sala de socket propia, `user:<id>`. Es lo que permite mandarle algo
a alguien sin saber en que pestaña esta ni cuantas tiene abiertas, y tambien es como se
sabe si esta en linea: si la sala tiene a alguien dentro, esta.

### Un tropiezo tonto que costo una corrida

El esquema de la base vive dentro de una plantilla de JavaScript. Un comentario SQL que
mencionaba una columna entre comillas invertidas **corto la plantilla en dos** y el servidor
no arrancaba. Queda avisado en el propio archivo.

### Comprobado

- `npm run test:retos` — 16 pruebas por socket con dos cuentas de verdad: el invitado no
  puede retar, nadie se reta a si mismo, no se puede retar a quien no esta, el reto llega
  al momento y ademas al buzon, no se puede retar dos veces al mismo, aceptar arma **la
  misma mesa para los dos**, y un reto ya contestado no se contesta otra vez.
- En pantalla: se reto desde el chat y la pagina llevo a la mesa privada; se recibio un
  reto con la cuenta atras y el aviso quedo en la campana.
- Backend 87/87, reloj 20/20, perfil 20/20, chat 9/9.

---

## 98. Poder instalar la app (y por que no se podia)

Jonathan: *"cuando entro a la página no me da opción, quiero descargar la aplicación para
ver el icono nuevo... pon que siempre te dé la opción"*.

### Por que no aparecia

**No habia service worker.** Chrome no ofrece instalar una web si no encuentra un service
worker con manejador de `fetch`. Manifiesto habia, iconos habia, service worker no: por eso
la opcion no salia nunca, ni iba a salir sola.

### El service worker que se puso

Uno minimo, en `frontend/public/sw.js`, y **a proposito no guarda copias de los archivos
del juego**. El juego se despliega varias veces al dia, y un service worker que guarda
copias es la forma mas comun de que alguien se quede con una version vieja pegada sin
entender por que. Lo unico que guarda es la pagina de arranque, y solo para poder contestar
algo cuando no hay internet. Todo lo demas va derecho a la red.

Se registra solo en la version publicada: en desarrollo estorba al recargado en caliente.

### El boton

El navegador decide solo si muestra su cartel de instalar, y con frecuencia no lo muestra:
porque ya lo mostro una vez, porque no le parecio el momento, o porque el aparato no lo
hace. Por eso hay un boton propio, abajo al lado del chat, que esta siempre.

Dos caminos, porque no hay uno solo:

- **Android y escritorio:** el navegador avisa con `beforeinstallprompt`. Se guarda ese
  aviso y el boton lo dispara. **Es el unico modo de abrir el cartel de instalar**: no se
  puede llamar porque si, hay que tener el aviso guardado.
- **iPhone:** no existe ese aviso ni forma de instalar por codigo. Se instala a mano desde
  Compartir → Añadir a pantalla de inicio. El boton explica como, que es lo unico que se
  puede hacer.

Si la app ya esta instalada, el boton no aparece.

### Un aviso que hace falta

Si ya la tenia instalada, **el icono viejo se queda**: el sistema lo guarda al instalar y no
lo vuelve a pedir. Hay que borrarla y volver a instalarla. El propio cartel lo dice.

---

## 99. La clasificacion, hecha igual a la de PrivoyTruco

Jonathan pidio primero una escalera de rangos con **Retador** arriba y un Top 100 / Top 500
adentro. Se construyo. Despues dijo: *"haz el sistema de ranking igual al de PrivoyTruco,
revisa como es en ese link"*.

### Lo que se encontro en PrivoyTruco (revisado el 5 de septiembre de 2026)

Pantalla **"EL CUADRO DE HONOR · CLASIFICACION"**, con 1208 jugadores clasificados:

| pestaña | que muestra |
| --- | --- |
| **General** | los puntos de siempre: `2893 pts` + "927 victorias · 1687 jugadas · 55%" |
| **Esta semana** | *"Arranca de cero cada lunes — cualquiera puede ganarla"*: `+1722` + "174 victorias esta semana" |
| **Torneos** | *"Los campeones y sus copas"*: `13 copas` + "360 victorias de vida" |

Arriba, un **podio de tres**: el segundo a la izquierda, el **primero en el centro, mas alto
y con corona**, el tercero a la derecha. Debajo, la lista corrida sobre un panel claro.

**Y el dato que cambio el plan: su clasificacion NO tiene rangos con nombre.** Nada de
Retador, Maestro ni Gran Maestro. Es una tabla de puntos y puesto, y ya.

Se le dijo antes de tocar nada, porque contradecia su propia idea. Eligio copiar el modelo
de PrivoyTruco tal cual. **La escalera de rangos se saco.**

### Como quedo

- **Tres vistas**, con los mismos textos y la misma forma que las suyas.
- **Podio de tres** con el primero en el centro.
- Cada fila: puesto, nombre, **victorias · jugadas · porcentaje**, y el puntaje.
- La cabecera del menu muestra **`#6` y `1355 pts`** al lado del nombre, y lleva a la tabla.
- El perfil muestra el puesto, los puntos, lo de la semana y la mejor marca.
- Al terminar una partida: **cuanto se movio el marcador y en que puesto quedaste**.

**Los torneos todavia no existen en el domino.** La pestaña esta, y dice la verdad en vez de
inventar copas que nadie gano.

### Los puntos

Se mueven **segun quien sea el rival** (formula de Elo, la del ajedrez): ganarle a alguien
mejor da mas, ganarle a uno muy por debajo da poquito. Asi la tabla mide como jugas y no
cuantas horas tenes libres, y nadie sube machacando siempre al mismo novato. Decision de
Jonathan, y se mantiene: es como se ganan los puntos, no como se muestran.

Detalles que importan:

- **Las primeras 10 partidas mueven el doble** (48 en vez de 24), para que el que entra
  llegue rapido a su lugar en vez de subir de a poquito durante meses.
- **Ganar siempre suma al menos 1 y perder siempre resta al menos 1.** Si no, ganarle a
  alguien muy por debajo daria cero y se sentiria como que el juego no registro la partida.
- **En 2v2 cada uno se mide contra el promedio del equipo contrario**, no contra el suyo.
- **Los promedios se calculan ANTES de escribir nada.** Si se fuera guardando sobre la
  marcha, el segundo jugador se mediria contra los puntos ya modificados del primero y la
  misma partida daria distinto segun el orden. Hay una prueba solo para eso.
- **Nadie baja de 100 puntos** y **los invitados no entran**.

### La semana va en su propia tabla

`ranking_semana`, una fila por persona y por semana (`2026-W36`). No se pudo guardar en la
misma fila que los puntos de siempre porque la semanal **arranca de cero cada lunes**: habria
que borrarla todos los lunes, y quien no juegue esa semana perderia su historial. Con una
fila por semana, la semana nueva simplemente todavia no tiene filas.

### Dos cosas que se rompieron por el camino

1. **La pagina del menu quedo en blanco.** El efecto que pide el puesto se inserto dentro del
   hook equivocado, donde la variable del usuario no existe. Compilaba igual: era error de
   ejecucion, no de compilacion, y solo aparecio al abrir la pagina de verdad.
2. **Las pruebas de las tablas fallaban con ids inventados.** Las tablas unen con `users`, asi
   que alguien que no existe como cuenta se guarda pero no aparece. La prueba ahora crea
   cuentas de verdad para eso.

### Comprobado

`npm run test:ranking` — 37 pruebas: que el rival importa en los dos sentidos, que ganar
siempre suma, que el orden de los jugadores no cambia el resultado, que los invitados no
entran, el puesto, la tabla general ordenada, los porcentajes, la tabla de la semana (que
suma, que resta al que pierde y que acumula dos partidas en la misma fila), el piso, la mejor
marca, **una partida completa de verdad con el RoomManager y el motor**, y que una partida
contra la maquina no mueve nada.

En pantalla se vieron las tres pestañas con el podio, la cabecera con `#6 · 1355 pts` y el
perfil con el puesto y lo de la semana.

Backend 87/87, perfil 20/20, reloj 20/20.

---

## 100. Atajos de torneos y tabla en el borde derecho

Pedido de Jonathan sobre una captura marcada: *"quita eso que se ven los puntos arriba, pon
al lado de la derecha el icono de torneo y ranking"*.

- **Fuera el chip de puntos** de la cabecera. El puesto ya se ve en la clasificacion y en el
  perfil; arriba estorbaba.
- **Dos atajos en el borde derecho**, uno debajo del otro: TORNEOS y TABLA. Ahi es donde
  llega el pulgar en el telefono sin tapar la mesa.
- Iconos de `lucide-react` (`Trophy`, `BarChart3`), comprobando antes que los nombres
  existan en la version instalada. Regla de oro 1.1: nada de dibujar SVG a mano.

**Se pusieron mal la primera vez.** El ancla del cambio cayo dentro de la barra de abajo y
los atajos quedaron en la esquina inferior, no en el borde derecho. Es el mismo tropiezo de
la seccion 97 con el modal de retos: pegar un componente al lado de `<ChatGlobal />` lo mete
dentro de la barra. Van al nivel de la pantalla.

---

## 101. Torneos, copiando "El Relampago" de PrivoyTruco

Jonathan: *"de una vez copia en privo y truco sistema: torneo, perfil"*.

### Lo que hace el suyo

"El Relampago": uno **cada media hora**, gratis, te anotas, se arma la llave y el que gana
se lleva el pozo. En su pantalla se ve el proximo horario, cuantos anotados hay, la lista de
los siguientes y el boton ENTRAR; debajo, **EL PALMARES** con los ultimos campeones.

### La unica diferencia: el premio

**Su pozo es en bolivares. Aca no hay pasarela de pago.** Se le pregunto antes de construir
nada, y eligio: **puntos de clasificacion y una copa** que queda en el palmares y en la
vista "Torneos" de la clasificacion. Todo lo demas es igual.

### Como funciona la llave

Eliminacion directa. Se empareja de a dos, el que gana pasa y el que pierde queda afuera. Si
en una ronda queda un numero impar, **uno pasa de arriba sin jugar** (el bye de toda la
vida). El ultimo en pie es el campeon.

### Dos cosas sin las que un torneo no termina nunca

1. **Las mesas del torneo arrancan solas** cuando entran los dos. En un torneo nadie tiene
   por que apretar "empezar", y si uno se distrae se traba el cuadro entero.
2. **Hay un reloj para presentarse** (45 segundos). El que no entra a su mesa **pierde por no
   presentarse**, como en un torneo de verdad. Sin esto, uno que se anota y no aparece deja
   el torneo colgado para siempre.

### El reloj del servidor

Cada diez segundos: deja anunciados los proximos ocho torneos en franjas limpias (en punto y
media) y arranca los que ya les llego la hora. **Con menos de dos anotados el torneo se
cancela** y se les avisa: es mas honesto que dejarlos esperando.

Todo es configurable por variable de entorno (`TORNEO_CADA_MIN`, `TORNEO_PREMIO`,
`TORNEO_ESPERA_MS`), que es lo que permite probarlo sin esperar media hora.

### Donde se ve

| donde | que |
| --- | --- |
| `/torneos` | la vitrina: proximo torneo, horarios, anotarse, y el palmares |
| clasificacion, vista "Torneos" | la tabla de copas, con "N victorias de vida" |
| aviso encima de todo | "Te toca jugar contra X", con la cuenta atras para entrar |
| campana | te avisa cuando te toca, cuando ganas la mesa y cuando ganas el torneo |

El aviso de la mesa **no entra solo**: se penso, pero sacar a alguien de golpe de lo que
esta haciendo es peor que perderse un torneo gratis.

### Comprobado

`npm run test:torneos` — 25 pruebas, y la que importa es que **un torneo entero se juega
solo**: se programan, con una sola persona se cancela, con tres arranca, uno pasa de arriba,
la mesa arranca sola cuando entran los dos, se juega, se arma la final, hay campeon, el
campeon cobra sus puntos y su copa, aparece en el palmares y en la tabla de copas, y el que
perdio queda afuera.

Backend 87/87, clasificacion 37/37, perfil 20/20, reloj 20/20.

### Lo que falta: el perfil de ellos

**No se pudo copiar.** Su perfil esta detras de la cuenta: sin sesion sale el formulario de
registro. No se creo una cuenta a su nombre porque eso pide cedula, telefono y aceptar
terminos. Hace falta que Jonathan mande capturas de su perfil ahi, **tapando cedula, fecha
de nacimiento y telefono**, y sin tocar la seccion BANCA.

### La pantalla de torneos

`/torneos` nacio como una pantalla con la forma final pero sin torneos detras. En la misma
tanda se construyo el sistema completo: ver la seccion 101.

---

## 102. Todos arrancan en cero

Pedido de Jonathan: *"el icono de torneo y tabla solo quiero que esté el icono y el nombre,
no quiero que esté dentro de un cuadro. Y reinicia los perfiles, que todos tengan cero
puntos y cero partidas jugadas"*.

### Los atajos, sin recuadro

Solo el icono y el nombre. Lo que los mantiene legibles sobre la foto de la mesa, que tiene
zonas claras, es una sombra en el texto y en el trazo del icono, no una caja.

### Se arranca en cero, no en mil

Antes se entraba con **1000 puntos**, que es lo normal en Elo. Ahora se entra con **cero**.

El motivo es lo que se ve: con mil de arranque, alguien que no jugo nunca aparece con mil
puntos y parece que ya hizo algo. Desde cero, **los puntos se ven ganar**.

La cuenta de Elo no se rompe: lo que importa es la DIFERENCIA entre dos jugadores, no el
numero en si.

**Consecuencia que hay que saber:** nadie baja de cero, asi que **perder cuando todavia no
tenes puntos no te cuesta nada**. El que recien entra solo puede subir. Es coherente con
arrancar en cero, y las pruebas lo comprueban explicitamente.

### El comando de reinicio

`npm run reiniciar-clasificacion`

- Sin nada, **no borra**: dice a que base apunta y cuantas filas hay de cada cosa.
- Con `-- --hazlo`, borra de verdad.

Trabaja sobre la base **que este configurada**: en una maquina sin `DATABASE_URL` es la
SQLite local; en el servidor seria la de produccion. Por eso avisa a cual apunta antes de
tocar nada.

**Las cuentas no se tocan.** Nadie pierde su usuario ni su clave: solo se van los puntos,
las partidas, los torneos y las copas.

### Produccion ya estaba en cero

Se consulto la API publica de produccion: **0 clasificados**. Nadie habia jugado todavia una
partida entre personas alla, asi que no hubo nada que reiniciar. Lo que se limpio fue la
base de esta maquina, que tenia los jugadores de prueba.

### Las pruebas tuvieron que cambiar

Al arrancar en cero, dos comprobaciones dejaron de tener sentido tal como estaban:

- **"lo que gana uno es lo que pierde el otro"** solo se puede comprobar con gente que ya
  tenga puntos: desde cero, el que pierde no baja.
- **La tabla general** usaba ids inventados. Une con `users`, asi que al vaciar la base se
  quedo sin filas. Ahora usa cuentas de verdad, igual que la semanal.

---

## 103. Pinta de las fichas: clasicas y blanco hueso

Pedido de Jonathan: *"en temas también que se le pueda poner skin a los dominós: el que
tenemos y el blanco hueso tradicional"*.

En el menu de la mesa, debajo de PAÑO, hay ahora una fila **FICHAS** con dos opciones. Cada
muestra es una ficha de verdad, no un cuadrito de color: se ve exactamente lo que se elige.

### Como se hizo el blanco hueso, y por que asi

**No es arte nuevo. Es la misma imagen recoloreada con un filtro.**

Las fichas actuales son PNG recortados a mano y estan protegidos (CLAUDE.md §7). Un blanco
hueso de verdad necesita **28 imagenes nuevas**. Para eso habia dos caminos y ninguno estaba
disponible:

- **Dibujarlas a mano:** prohibido por la regla de oro 1.1.
- **Generarlas con IA de imagen:** se consulto el saldo y hay **cero creditos**.

El tercer camino no inventa nada: recolorear el arte que ya existe. Se probaron cinco
filtros y se eligio el que mejor queda.

### Lo que NO es

**No es el blanco hueso tradicional de puntos negros.** El invertido convierte el cuerpo
oscuro en marfil y el dorado en gris, no en negro. Se probo forzar el contraste para llevar
los puntos a negro y sale peor: los puntos son domos con brillo y al subir el contraste se
deshacen en motitas.

Ademas conserva el marco ornamentado, que una ficha de hueso tradicional no tiene.

Al tamaño de la mano se ve muy bien y se lee como hueso. Pero queda anotado: **para el
tradicional de verdad hacen falta 28 imagenes nuevas**, sea con credito de IA o con un set
profesional ya hecho.

### El detalle que se rompio y se arreglo

El filtro va en el contenedor de toda la mesa, para que alcance a la mano, al pozo y a las
manos de los rivales sin pasarselo a cada uno. El problema es que **el selector tambien esta
dentro de la mesa**, asi que la muestra de "Clasicas" salia recoloreada y las dos opciones
se veian iguales.

Se arreglo marcando las muestras con `data-muestra`: el filtro de la mesa las excluye, y
cada una se pinta segun lo que ella misma representa.

---

## 104. Los prompts para generar las fichas blanco hueso

Jonathan paga Gemini y pidio el prompt para generar lo que hace falta.

### La decision de fondo: dos imagenes, no veintiocho

Un modelo de imagen **no cuenta bien los puntos**. Pedirle las 28 fichas garantiza que la
mitad salga con el numero equivocado y haya que rehacerlas una por una, y aun asi no quedan
identicas entre si.

Por eso se le pide **el material** —la ficha vacia y un punto— y **la geometria la pone el
codigo**: un script coloca los puntos en su sitio y arma las 28. El numero siempre sale bien
y las fichas quedan iguales. El arte sigue siendo profesional, que es lo que exige la regla
de oro 1.1.

### Prompt 1: la ficha vacia

> A single blank domino tile, traditional bone/ivory white. Photographed perfectly straight
> from above: top-down orthographic view, no perspective, no tilt, no rotation. Rectangular,
> exactly twice as wide as it is tall. Softly rounded corners. Polished bone material with a
> very subtle natural ivory grain, warm off-white (#F2EBD8). Slight bevel on the edges
> catching soft studio light. Completely blank: NO pips, NO dots, NO dividing line, NO
> numbers, NO text, NO logo. Isolated on a fully transparent background, PNG with alpha
> channel. Centered, filling the frame edge to edge. Studio product photography, ultra sharp,
> high resolution.

### Prompt 2: un punto

> A single domino pip on a fully transparent background. One perfectly circular matte black
> dot with a very subtle darker inner shadow along its upper edge, as if drilled into ivory
> rather than printed on it. Nothing else in the image: no tile, no background, no border, no
> shadow on the ground. Square frame, the dot centered and filling about 80 percent of it.
> PNG with alpha channel. Macro product photography, ultra sharp, high resolution.

### Donde van

`frontend/public/tiles-fuente/`, con los nombres `hueso-ficha.png` y `hueso-punto.png`.
Hay un `LEEME.md` ahi mismo que lo repite.

### Si el fondo no sale transparente

Es lo que mas falla. Si Gemini devuelve fondo blanco, la ficha blanca se pierde contra el.
En ese caso hay que volver a pedirlo agregando al final:

> The background must be 100% transparent alpha, not white.

Y si aun asi no lo hace, pedirlo con **fondo magenta puro (#FF00FF)**, que es un color que no
aparece en la ficha y se puede recortar sin tocar el marfil.

### Conectar Gemini directamente

**No hay conector de Gemini disponible.** Se busco en el registro y no existe.

Lo que si se puede: si Jonathan saca una **clave de API** en Google AI Studio, se escribe un
script en el proyecto que genere las imagenes sin copiar y pegar. **Ojo:** pagar la app de
Gemini NO da credito de API; son cobros distintos. La clave iria en `.env`, nunca al codigo.

---

## 105. Las fichas blanco hueso, de verdad

Jonathan genero con Gemini las dos imagenes que se le pidieron en la seccion 104. Con eso,
el blanco hueso dejo de ser un recoloreado y paso a ser **arte de verdad**: marfil con
puntos negros y la linea del medio, como una ficha de hueso tradicional.

    npm run fichas    (desde frontend/)

Lee `arte-fuente/hueso-ficha.png` y `arte-fuente/hueso-punto.png` y escribe las 28 en
`public/tiles-hueso/`.

### Dos trampas de lo que devuelve Gemini

1. **Los archivos son JPEG aunque digan `.png`.** JPEG no tiene canal alfa.
2. **El cuadriculado de "transparencia" viene PINTADO dentro de la imagen.** No es
   transparencia: son cuadritos blancos y grises de verdad, parte de la foto.

Por eso el script recorta el fondo el mismo. Lo hace por **dos señas juntas**: el pixel es
gris neutro (rojo, verde y azul casi iguales) **y** se llega a el desde el borde de la
imagen. Con una sola de las dos no alcanza: por gris neutro solo se comeria zonas claras de
la ficha, y por borde solo se comeria la ficha entera.

Hizo falta un decodificador de JPEG, `jpeg-js`. Es JavaScript puro, sin compilar nada, y va
como dependencia **de desarrollo**: la regla de cero dependencias es del motor, no de las
herramientas.

### La geometria la pone el codigo

El script coloca los puntos y traza la linea del medio. La linea va por codigo y no en la
imagen de origen para que caiga exactamente en el centro y las dos mitades queden iguales.
Los puntos van en la disposicion de toda la vida, la misma que tienen las fichas clasicas:
el seis en tres columnas por dos filas, porque la ficha esta acostada y cada mitad es un
cuadrado.

### Como llega la pinta a las fichas

Antes se probo con un filtro CSS sobre el contenedor de la mesa. **Se saco.** Ahora cada
pinta es una CARPETA (`/tiles` y `/tiles-hueso`) y `Tile` la toma de un contexto de React,
porque `Tile` se usa en cinco sitios (mesa, mano, pozo, desglose y selector de punta) y
pasarles la carpeta a todos seria arrastrarla por media aplicacion.

### El arte de origen vive fuera de `public`

En `frontend/arte-fuente/`. Si estuviera dentro de `public`, Vite lo copiaria al sitio
publicado y se subirian cinco megas de imagenes que ningun jugador descarga. Solo hacen
falta para volver a generar las fichas.


---

## 106. El recorte estaba mal, y por que

Jonathan, viendo la primera tanda: *"se ve feo, mal recortado o mal difuminado"*. Tenia
razon: la ficha salia **cortada recta por la izquierda** y con las esquinas mordidas.

### La causa, medida

Se midieron los colores de verdad en vez de tantear:

| | separacion del gris puro (`dif`) | brillo minimo |
| --- | --- | --- |
| fondo cuadriculado | 0 a 3 | 205 a 255 |
| marfil de la ficha | **24 a 57** | 132 en el borde de abajo |
| punto negro | 0 a 3 | 12 a 49 |

El recorte usaba `dif <= 26`. El borde de la ficha ronda **25**, asi que **se lo comia**, y
al recortar despues a lo que quedaba visible la ficha salia cortada recta.

Habia un segundo error escondido: se exigia ademas `brillo >= 150`, y **el borde de abajo de
la ficha es oscuro (132)**, asi que ese tambien se perdia.

### El arreglo

- **Ficha:** `dif <= 16` y **sin** limite de brillo. Con el marfil en 24 hay margen de sobra
  para los dos lados, y el borde oscuro de abajo se conserva.
- **Punto:** `dif <= 20` **con** limite de brillo, porque ahi el fondo es claro y el punto
  oscuro: sin el limite se borraria el punto, que tambien es gris.

La leccion es la de siempre en este proyecto: **medir antes de tocar**. Un numero puesto a
ojo (26) que estaba a un pelo del real (24) se llevo por delante todas las fichas.

### Y la cache

Los archivos se llaman igual que antes, asi que el navegador se quedaba con las feas
guardadas. Las direcciones llevan ahora un numero de version (`?v=2`) que lo obliga a
pedirlas de nuevo. Se sube cada vez que cambie el dibujo sin cambiar el nombre.

---

## 107. La ficha arrastrada, y el icono de la app

Dos cosas que reporto Jonathan con capturas.

### La ficha que se arrastra salia con la pinta vieja

La mano y la mesa se veian de hueso, pero **la ficha que llevabas en el dedo salia clasica**.

La causa: la vista previa del arrastre no usa `Tile`, se dibuja con su propia etiqueta de
imagen en `Hand.jsx`, y ahi la ruta habia quedado escrita a mano (`/tiles/...`). Cuando las
pintas pasaron a ser carpetas, esa se quedo apuntando a la vieja.

Comprobado simulando el arrastre: ahora pide `/tiles-hueso/tile_2_6.png`.

**La leccion:** cuando algo se dibuja "por fuera" del componente que le corresponde, se
queda atras en el primer cambio. Vale la pena buscar rutas escritas a mano cada vez que algo
pasa a ser configurable.

### El icono de la app: las dos fichas del logo

Estaba una sola ficha, dibujada con circulos por codigo. Jonathan lo vio instalado en su
telefono y pidio el del logo: *"pon el que hicimos, que esta brutal, el de las 2 fichas"*.

Ahora el icono **lee las fichas de verdad** de `public/tiles/` (la 6-6 y la 3-6, las mismas
del logo) y las gira con los mismos angulos. Asi el icono y la marca son la misma cosa y no
dos dibujos parecidos.

Para eso el script aprendio a **leer** PNG, no solo a escribirlos: unos ochenta renglones
con `zlib`, sin dependencias, igual que el que ya escribia. Y a girar una imagen recorriendo
el destino y preguntando de donde sale cada pixel; hacerlo al reves deja agujeros, porque al
girar dos pixeles de origen caen en el mismo de destino.

**El favicon de la pestaña se queda como esta**, con una sola ficha: a 16 pixeles, dos
fichas cruzadas no se distinguen.

---

## 108. Los iconos de torneos y tabla, hechos a medida

Jonathan pidio un prompt para generarlos con Gemini y los creo: una **copa dorada** y un
**podio de tres**, los dos en el mismo oro de la marca y con fichas de domino labradas.

Reemplazan a los de `lucide-react`. La regla de oro 1.1 pide una libreria **antes que
dibujar a mano**; arte propio bien hecho esta por encima de las dos cosas, y estos pegan con
el oro del logo, que una libreria generica no hace.

### El script

`npm run iconos-atajos` — lee `arte-fuente/icono-torneos.png` y `arte-fuente/icono-tabla.png`
y escribe `public/iconos/torneos.png` y `tabla.png` a 128x128.

Se achican **en el script y no con CSS**: una imagen de dos mil pixeles metida en un hueco de
veintidos pesa dos megas para nada y tarda en cargar. A 128 se ve nitido hasta en pantallas
finas y pesa 20 KB.

### Un modulo compartido

Las funciones de imagen (leer JPEG, recortar el fondo, escalar, escribir PNG) salieron a
`scripts/imagen.mjs`. Las usan **dos** scripts —el de las fichas y el de los iconos— y
copiarlas seria arreglar cada cosa dos veces.

### Un detalle del arte que conviene saber

Gemini le metio texto que no se le pidio: **"CLUB DE DOMINÓ DE VENEZUELA · FUND. 1978"**. A
32 pixeles no se lee y funciona como textura, pero **la fecha es inventada**. Si alguna vez
estos dibujos se usan en grande —una camiseta, un cartel—, ese texto hay que quitarlo.


---

## 109. El fondo atrapado dentro de las asas

Jonathan, sobre el icono de torneos: *"dentro de las asas para agarrar la copa quedo un
blanco feo"*.

**La causa.** El recorte del fondo entra **desde el borde de la imagen** hacia adentro. El
aro de un asa es un agujero cerrado: el fondo de ahi dentro no se toca con el borde, el
relleno no llega, y quedaba el cuadriculado a la vista.

**El arreglo.** Una opcion nueva que borra el gris **este donde este**, sin pedir que se
alcance desde el borde.

**Por que es seguro aqui, medido:**

| | separacion del gris puro |
| --- | --- |
| fondo atrapado en el asa | 0 a 3 |
| oro de la copa, hasta en sus brillos | **70 a 137** |

Con el corte en 16 hay muchisimo margen.

**Donde NO se puede usar:** en las fichas. El punto negro tambien es gris, y borrar todo lo
gris se lo llevaria. Queda escrito en el comentario de la funcion para que nadie lo active
ahi por comodidad.

---

## 110. Premios bloqueados: la base del pase de batalla

Jonathan, sobre la pinta negra y dorada: *"que salga bloqueada, solo se obtiene con el pase
de batalla y se desbloquea cuando cumplas los requisitos"*.

Queda hecho el **sistema**, que es lo que el pase va a usar para repartir todos sus premios.

### Los desbloqueos viven en el SERVIDOR

Tabla `desbloqueos`: una fila por persona y por cosa ganada. Las claves llevan prefijo por
tipo (`fichas:oro`, `pano:marmol`, `titulo:tranquero`), asi se agregan premios nuevos sin
tocar la tabla.

Podria haberse guardado en el navegador, que es mas simple. **No se hizo**: cualquiera se
regalaria los premios editando lo que su telefono tiene guardado, y **un premio que se puede
regalar no es un premio**. El servidor manda (regla 8).

Dar un premio dos veces no rompe nada ni lo duplica: el pase va a poder repetir el aviso sin
miedo.

### En la pantalla

El selector de fichas muestra las tres pintas. La bloqueada **se ve igual, apagada y con un
candado**, y debajo dice de donde sale. Se muestra a proposito: hay que ver lo que uno se
esta perdiendo, si no el premio no motiva a nadie.

Si alguien tiene elegida una pinta que no le corresponde —porque se la quitaron, o porque
toco los datos de su navegador— **se cae sola a las clasicas**.

### Dos cosas que solo aparecieron corriendo

1. **`puedeUsar is not defined`.** El selector es un componente aparte del hook, y quien
   sabe lo que el jugador tiene ganado es el hook. Compilaba igual; reventaba al abrir el
   menu. Ahora se le pasa como propiedad.
2. **La muestra de la pinta bloqueada salia rota**, porque sus imagenes todavia no existen.
   Ahora la imagen se esconde sola y queda el candado sobre el hueco oscuro.

### Lo que falta para que la pinta exista

Las imagenes de origen: el **punto dorado quedo perfecto**, pero la **ficha no sirve** —
Gemini la devolvio vertical en vez de acostada, y con el tercio de abajo tapado por una
nube blanca. Hay que repetirla.

`npm run test:desbloqueos` — 10 pruebas: que quien no jugo no tiene nada, que se da y queda,
que darlo dos veces no duplica, que se acumulan, que lo de uno no se le pega a otro y que se
puede quitar.

## 111. La pinta negro y oro, hecha y bajo llave (2026-09-05)

La ficha de origen que faltaba en la §110 ya esta: Jonathan la repitio y la segunda salio
acostada, sin nube, con el marco dorado y la barra del medio dibujados. Se guardo como
`frontend/arte-fuente/oro-ficha.png`.

### El script dejo de ser "el de las hueso" y paso a ser el de todas

Antes `generar-fichas-hueso.mjs` tenia los numeros de la pinta de hueso escritos por dentro.
Se renombro a **`generar-fichas.mjs`** (`npm run fichas`) y ahora recorre un array `PINTAS`:
cada pinta trae **donde caben sus puntos**, **de que tamaño van**, **como se recorta su
fondo** y **si la raya del medio ya viene dibujada**. Agregar una pinta nueva es agregar una
entrada, no tocar el dibujo.

Se hizo asi porque las dos pintas no se parecen en nada por dentro: la de hueso es lisa y los
puntos usan casi toda la mitad; la de oro tiene un marco grueso y los puntos tienen que caer
**dentro del panel negro**, si no se montan sobre el oro.

### Los numeros de la pinta de oro estan medidos, no calculados a ojo

Se recorrio la imagen contando pixeles antes de escribir nada (regla 10):

- El **oro** tiene `dif` (max de rojo/verde/azul menos el minimo) entre **44 y 106**.
- El **onix** del panel, entre **2 y 7**.
- El panel negro de la mitad izquierda va de **0,06 a 0,46** de ancho y de **0,14 a 0,87**
  de alto.

Con esa separacion tan grande, el corte del fondo en `dif <= 16` no se come nada del oro.

La mitad derecha es la izquierda **reflejada** (`x = ANCHO - x`), no una copia corrida: asi
las dos mitades quedan simetricas de verdad contra el marco.

### `VERSION_FICHAS` a 3

Los archivos se siguen llamando igual (`tile_6_6.png`), asi que el navegador se queda con el
que ya tenia. El numero viaja pegado a la direccion y lo obliga a pedirlas de nuevo. Sube a
**3** porque entraron las de oro y, de paso, se rehicieron las de hueso con el script nuevo.

### Como se ve

Verificado corriendo en localhost: el selector de FICHAS muestra las tres muestras reales
—clasicas, blanco hueso y negro y oro— y la de oro sale apagada con el candado encima y el
texto *"Las que tienen candado se ganan en el pase de batalla."*

Lo que sigue es el **pase de batalla** en si (misiones y experiencia). Jonathan: *"deja eso
listo para luego seguir"*.

## 112. El pase de batalla (2026-09-05)

Jonathan: *"dale full a lo del paso de batalla, crea de una vez las recompensas y la skin de
las fichas. Una de las misiones que sea que por invitar a 3 amigos y logueen subes varios
puntos, así atraemos a más gente"*.

Queda hecho entero: experiencia, niveles, premios que se entregan solos, misiones diarias,
semanales y de temporada, y el sistema de invitaciones.

### Las dos monedas, y por que son dos

- **Puntos de club** (el ranking): dicen quien juega **mejor**. Se ganan y se pierden segun
  contra quien juegues, con la formula de Elo.
- **Experiencia del pase**: dice quien juega **mas**. Solo sube, nunca baja, y se reinicia
  cada temporada.

Si fueran la misma, el que se pasa el dia jugando le pasaria por encima al que juega mejor y
la tabla dejaria de significar algo. Por eso el pase reparte **pocos** puntos de club: unos
270 en seis semanas, un premio simbolico y no un atajo. El numero se cambia en un solo sitio,
`PUNTOS_POR_TRAMO` en `backend/src/models/Pase.js`.

### La temporada se calcula sola

No hay tabla de temporadas ni nadie que tenga que crear la siguiente. Hay una fecha de
arranque (`EPOCA`, el lunes 31 de agosto de 2026) y una duracion (seis semanas). Todo lo
demas sale de ahi: el dia que termina la T1 empieza la T2 sin que nadie haga nada. Es el
mismo truco que ya usaba la clasificacion semanal.

**40 niveles, 100 de experiencia cada uno.** Seis semanas para 4000 de experiencia son unos
95 al dia: se llega jugando un rato, no viviendo ahi.

### De donde sale la experiencia

| De que | Cuanta |
| --- | --- |
| Ganar contra una persona | 25 |
| Perder contra una persona | 10 |
| Ganar contra el bot | 6, con **tope de 30 al dia** |
| Perder contra el bot | 3, dentro del mismo tope |
| Misiones diarias | 15 a 45 cada una, tres por dia |
| Misiones semanales | 100 a 200 cada una, tres por semana |
| Cada pana que traigas y juegue | **150** |
| Traer tres panas | **300 mas** y el titulo "Padrino" |

El tope de los bots existe porque sin el alguien deja el telefono ganandole a la maquina toda
la noche y termina la temporada en una tarde. Las **misiones** si las completa el bot, a
proposito: son la tarea del dia y cada una se cobra una sola vez, asi que no hay nada que
repetir. Lo que no se puede es seguir sacando experiencia por jugar sin parar.

Perder tambien suma. El que pierde tambien jugo, y un pase que solo premia al que gana echa
justamente al que mas necesita quedarse.

### La mision de los panas: la unica que hace crecer el juego

Es la mas gorda de todas: siete niveles y medio de golpe. El link es
`.../register?ref=TuNombre` — **el codigo es el propio nombre de usuario**, no un codigo
aparte: los nombres ya son unicos, el link se entiende de una y se dicta por telefono sin
equivocarse, cosa que un "K7X2QF" no.

**Se cobra cuando el invitado juega su primera partida, no cuando se registra.** Si contara
el registro, cualquiera se crea diez cuentas de mentira y cobra sin traer a nadie.

La pantalla del pase trae el link, un boton de copiar y otro de compartir (usa el compartir
del telefono si lo hay, y si no abre WhatsApp), y la lista de los panas con quien ya jugo.

### Los premios: cosas que existen de verdad

Nada de premios de mentira. Los 40 niveles reparten:

- **Puntos de club** en la mayoria, subiendo de 5 a 12 segun el tramo.
- **Cinco titulos** (niveles 5, 12, 20, 28 y 36) — se ven al lado del nombre **en el chat**,
  y se eligen desde el perfil. Es puro alarde, que es justamente para lo que sirven.
- **Tres paños nuevos** (10, 22 y 34): azul medianoche, purpura real y oro viejo. Misma
  receta que los que ya habia, para que se vean de la misma familia.
- **Las fichas negro y oro en el nivel 40**, que es el premio que ya estaba esperando desde
  la §111.

Los seis paños viejos siguen abiertos para todo el mundo: un premio no puede ser quitarle
algo a quien ya lo tenia.

**No hay nada que reclamar.** Al subir de nivel el premio ya esta entregado. Los pases que
obligan a entrar a apretar un boton solo consiguen que alguien se quede sin lo suyo por
olvido.

### El pase pago esta definido y APAGADO

`PASE_ORO_ACTIVO = false`. La fila dorada se ve en la pantalla, punteada y con el cartel
"próximamente", pero el servidor no entrega nada de ella y no hay forma de comprarla: en
Venezuela todavia no hay pasarela de pago (decision de Jonathan, ya tomada para los torneos).
El dia que haya cobro se cambia el interruptor y la fila empieza a pagar.

### Que se toco del juego

- `RoomManager` ahora avisa al pase de **todas** las partidas, tambien las que son contra la
  maquina. El historial y el ranking siguen contando **solo** las que son entre personas,
  como siempre: son dos preguntas distintas.
- Los torneos avisan al armar la mesa (jugar cuenta desde que te presentas) y al coronar.
- El chat avisa cuando alguien escribe, y de paso muestra el titulo de quien habla.
- El registro acepta `ref` y deja anotado quien trajo a quien.

Todos los eventos los dispara el **servidor** cuando el hecho ya ocurrio. El cliente no puede
pedir experiencia ni completar una mision mandando un mensaje: si pudiera, cualquiera se
completaria el pase sin jugar (regla 8).

### Pruebas

`npm run test:pase` — 62. Incluye una partida **de verdad**: se arma una mesa con el
RoomManager, se juega entera contra el bot y se comprueba que la experiencia llego, que la
mision conto la partida y que esa partida **no** entro al historial. Es el unico eslabon que
las pruebas de unidad no tocan.

Verificado corriendo en localhost: la pantalla del pase con nivel 10, el link de invitacion
con un pana confirmado, las nueve misiones, la escalera con sus muestras (el paño se ve con
su tela, las fichas con su ficha, los titulos con su medalla) y el selector de la mesa con
"azul medianoche" ya desbloqueado y los otros dos con candado.

### Lo que quedo pendiente

- El pase no reparte **copas**: eso sigue siendo solo de los torneos.
- El chat sigue **sin moderacion**. Con el pase empujando a la gente a escribir, hace mas
  falta que antes.

## 113. Stickers en los premios, y el agujero que taparon (2026-09-05)

Jonathan: *"hay que meterle stickers en los premios, y el icono del pase ponlo arriba del
torneo"*.

### Siete stickers nuevos, repartidos por la escalera

Van en los niveles **2, 7, 15, 18, 25, 31 y 38** — todos niveles que antes solo daban puntos,
asi que la escalera no perdio nada y gano variedad. Son 🔥 Candela, 👑 Corona, 🍀 Suerte,
🐐 El Chivo, 🧠 Cerebro, 🫡 Respeto y 💎 Diamante.

Los **once de siempre siguen gratis** para todo el mundo. En el menu de la mesa, los del pase
se ven igual: apagados y con candado sobre un circulo oscuro, para que se sepa lo que uno se
esta perdiendo.

### Y de paso se tapo un agujero de verdad

El servidor **no miraba** lo que le mandaban en el campo `emoji`: reenviaba a la mesa de
todos lo que llegara. Con las herramientas del navegador, cualquiera podia mandar el texto
que se le antojara —un insulto, un link— y salia flotando encima de la mesa.

Ahora `game:reaction` comprueba tres cosas antes de reenviar: que sea un sticker del catalogo,
que si es de los que se ganan quien lo manda lo tenga, y que quien lo manda tenga cuenta.
Probado: `'te voy a ganar bobo'` ya no sale.

Es un caso mas de la regla 8: **el servidor manda**. Lo que el cliente diga es una intencion,
no un hecho.

### Un detalle a tener en cuenta

Cambiar la escalera a mitad de temporada **no reparte hacia atras**: quien ya paso el nivel 2
no recibe el sticker nuevo, porque `nivel_cobrado` dice que ese nivel ya se pago. Hoy no
afecta a nadie —nadie tiene nivel todavia en produccion—, pero si mañana se agrega un premio
a un nivel bajo, hay que bajarle el `nivel_cobrado` a mano a quien ya paso por ahi.

### El atajo del pase, primero

El icono del pase va **arriba del de torneos** en la barra del borde derecho. Es lo que hay
que mirar todos los dias; los torneos y la tabla son de rato en rato.

`npm run test:pase` — 71 pruebas. Las nuevas comprueban que todo sticker de la escalera existe
en el catalogo y al reves (que ninguno se quede sin nivel que lo reparta), y que no se puede
tirar uno que no se gano.

## 114. El Panita, el banner, y el recorte por color (2026-09-05)

Llego el primer arte de Gemini: **El Panita** —la ficha de dominó con cara, ónix negro,
marco dorado, guantes blancos y corbatín verde— y el **banner** de la pantalla del pase.

### El recorte ahora tambien sabe borrar por color

`quitarElFondo` busca gris neutro. Con los stickers no sirve: llevan un **contorno crema**, y
el crema es casi neutro, asi que el recorte se lo comeria. Por eso el prompt pide fondo
**magenta puro**, que no aparece en ninguna parte del dibujo, y se agrego
`quitarElFondoPorColor`.

El umbral no se puso a ojo. Medido sobre el Panita: el fondo queda a distancia **menor de 60**
del magenta puro, lo mas cercano del dibujo esta a **mas de 120**, y en la franja del medio
(60-110) cae el **0,09%** de los pixeles. El corte en **90** parte ese hueco por la mitad.

`npm run stickers` deja los siete stickers y la mascota en `public/stickers/` a 192 px de
alto, y el banner en `public/pase-banner.jpg`.

### El banner sale en JPEG, no en PNG

Es una escena con degradados y un foco: en PNG pesaba **913 KB**, que en un telefono con mala
señal es una cabecera que tarda en aparecer. En JPEG al 82 pesa **77 KB** y no se nota la
diferencia. Los stickers si van en PNG, porque necesitan fondo transparente.

### Los stickers van de BUSTO, y eso se midio

El primer dibujo salio de cuerpo entero, y se veia precioso... a 96 pixeles. Se bajo al tamaño
en el que se ve **de verdad** —30 y 40 pixeles de alto en el menu de la mesa— y la cara
desaparece: queda una mancha oscura con dorado. Recortado al busto, los ojos se le siguen
viendo a 30.

Asi que el prompt cambio: los siete stickers van en **plano de busto**, con la cara ocupando
cerca de la mitad del alto. El cuerpo entero se queda para el banner, que se ve grande.

Es el mismo error de siempre: mirar el arte al tamaño en que lo devuelve el modelo y no al
tamaño en que lo va a ver el jugador.

## 115. Los stickers dibujados, y el recorte que los salvo (2026-09-05)

Jonathan genero seis de los siete stickers y el arte quedo muy bueno. El problema no fue el
dibujo: fue el **encuadre**.

### El error, y como se vio

Salieron **de cuerpo entero**, como el primer prompt pedia. Se bajaron a los 44 pixeles a los
que se ven en el menu de la mesa y **los seis se parecian entre si**: una mancha oscura con
dorado, sin cara y sin gesto. El sticker no sirve si no se distingue del de al lado.

En vez de pedirle que los rehiciera, se recortan aqui: se guarda la **franja de arriba** del
dibujo, con la cara y el objeto que lo identifica (la candela, el trebol, los engranajes).

El numero no se puso a ojo. Se compararon 0,45 / 0,55 / 0,62 / 0,70 sobre los seis, mirandolos
al tamaño real y despues agrandados: con 0,45 se corta la boca, con 0,70 la cara vuelve a
achicarse. Quedo en **0,58**.

### Y el menu tuvo que crecer

Puestos los dibujos, el menu de gestos seguia sin funcionar. Medido en pantalla: el panel se
armaba solo con el ancho de su contenido, quedaba en **188 px**, la casilla en **31**, y el
dibujo entraba a **18 px de alto**. Ahora el panel tiene ancho fijo de 280, los once de
siempre siguen en seis columnas y los del pase van en **tres**, que es lo que necesitan por
ser apaisados. El dibujo termina viendose a 75x48.

### Lo que falta y lo que se hereda

- **Falta el sticker de El Chivo.** En el sexto dibujo el chivo se le mezclo al del cerebro:
  salio con engranajes Y con cuernos y barbita. Ese quedo de Cerebro; el del Chivo hay que
  pedirlo aparte.
- **La corona se pego a todos.** Como cada sticker se pidio con "mismo estilo que la imagen
  anterior", desde el tercero en adelante todos llevan corona, y desde el quinto tambien el
  cuerno dorado. No molesta —a 48 px lo que distingue a cada uno es su objeto— pero si se
  piden mas hay que agregar al prompt "sin corona y sin cuernos, solo lo que dice el SUJETO".

El `emoji` no se tiro: sigue viajando en el mensaje del socket y es el respaldo. Si un dibujo
no existe o no carga, se ve el emoji y no un cuadro roto. Por eso el del Chivo se ve hoy sin
romper nada.

## 116. La espera ya no es un dado (2026-09-05)

Jonathan: *"quiero cambiar lo del dado dando vueltas, que sea una animación de dominós"*.

Habia un emoji de dado girando en dos pantallas: "Buscando oponente" y "Preparando la
partida". Un dado no pinta nada en un juego de domino, y ademas era un emoji, que cada
telefono dibuja a su manera.

Ahora es una **fila de cinco fichas paradas que se cae en cadena y se vuelve a parar**. Son
las **mismas imagenes de la mesa**, no un dibujo aparte: se ve el mismo material, cambia sola
con la pinta que tenga elegida el jugador, y no hay arte nuevo que mantener.

Dos detalles que solo aparecieron corriendo:

- La ficha viene **acostada**. Pararla girandola con `translate` a ojo la dejaba cuadrada y
  cortada. Se arreglo clavando el centro de la imagen en el centro de la casilla y girando
  sobre su propio centro: 22 de ancho por 56 de alto, sin cuentas.
- El giro de la **caida** va en el envoltorio y no en la imagen. Los dos giros en el mismo
  elemento se pisan: manda el ultimo y el otro desaparece.

Cae 72 grados y no 90: a 90 queda tumbada del todo y la fila se ve rota. Y con
`prefers-reduced-motion` no se cae, solo respira.

Los prompts para el resto de las visuales de los menus (el fondo, los iconos de modo y los de
busqueda) quedaron en `contexto/prompts/visuales-de-los-menus.md`, cada uno completo y listo
para copiar.

## 117. Las visuales de los menus, puestas (2026-09-05)

Llegaron las seis ilustraciones y estan las seis en pantalla. Antes de tocar nada se midieron:
el fondo del magenta queda a menos de 60 del magenta puro y lo mas cercano del dibujo a mas de
120, con **0,22% a 0,33%** de pixeles en la franja dudosa. Se recortan limpio.

### El fondo venia con una raya

El prompt pedia "la franja del medio oscura y vacia" y Gemini la pinto **literal**: un
rectangulo oscuro con dos **bordes verticales duros** que en pantalla se veian como una raya
pintada, no como una sombra.

Se arreglo desenfocando el fondo al prepararlo (`desenfocar`, caja separable de dos pasadas,
radio 7 sobre 900 px de ancho). El escalon se derrite y queda como sombra. De regalo, el texto
de encima se lee mejor y el archivo bajo de 148 KB a **67 KB**.

Tambien se le quito `background-attachment: fixed`: en el telefono no sirve —Safari de iOS lo
ignora a medias y Android tironea al desplazar—. Movil primero (regla 6).

### Los iconos van recortados a la cara, como los stickers

Volvieron a salir de cuerpo entero. No se pidio rehacerlos: el mismo recorte de la franja de
arriba (0,58) que ya se usa con los stickers los deja con la cara grande. En las tarjetas se
ven a 44 px de alto y se entienden.

### Donde quedo cada una

| Dibujo | Donde |
| --- | --- |
| `fondo-menu` | telon del menu de modos y de la pantalla de "como buscar" |
| `modo-casa` | cabecera de la seccion "Contra la casa" |
| `modo-gente` | cabecera de la seccion "Contra jugadores" |
| `busqueda-rapida` | tarjeta "Emparejamiento rapido" |
| `sala-privada` | tarjeta "Sala privada" |
| `esperando` | arriba de las fichas que se caen, en "Buscando oponente" |

La cabecera de seccion cambio de forma: el dibujo a la izquierda y el texto en **dos
renglones** a su derecha. En una sola linea no entraba —"CONTRA JUGADORES" con su espaciado ya
se come casi todo el ancho de un telefono— y el titulo se partia solo.

**El diagrama de sillas se queda** en las cuatro filas de modo. Es lo unico que dice
exactamente cuantos juegan y cuales son bots, y eso lo calcula el codigo y nunca se equivoca.
En las dos tarjetas de "como buscar" si se reemplazo, porque ahi el numero ya lo dice la
cabecera de la pantalla.

### Lo que quedo con un pero

- **`modo-gente` tiene un brazo de robot.** Los dos Panitas chocan los puños, pero el de la
  derecha conservo los brazos metalicos del icono anterior. A 44 px no se ve, pero en el icono
  de "contra jugadores" no deberia haber nada de robot.
- **Sigue faltando `sticker-chivo`.**

## 118. Lo que dijeron los amigos de Jonathan (2026-09-05)

Jonathan le paso el juego a sus amigos y volvieron con tres cosas. Las tres tenian razon.

### 1. "Entre que elegis la ficha y la pones se hace eterno"

Y no era impresion. En `gameSocket.js` habia esto:

```js
// Delay human move so it doesn't appear too instantly
if (HUMAN_DELAY_MS > 0) await roomManager._sleep(HUMAN_DELAY_MS);
```

**Un segundo entero de espera puesto a proposito en cada jugada de una persona**, y ademas con
la mano bloqueada mientras tanto (`isPlacing`). La idea era que no se viera "demasiado
instantaneo". Es al reves: la jugada propia tiene que sentirse inmediata, el jugador ya sabe
lo que hizo y no hay nada que anunciarle.

`HUMAN_DELAY_MS` pasa a **0**. La espera del BOT se queda en 3 segundos, que ahi si hace falta
para que parezca que piensa.

### 2. "Las fichas de la mano las queremos mas grandes"

Estaban en tres escalones fijos por cantidad de fichas (`xs`/`sm`/`md`), y dejaban aire sin
usar. Medido en un telefono de 375: siete fichas ocupaban **287 de los 351** disponibles.

Ahora la mano **mide el ancho que de verdad tiene** y estira las fichas hasta llenarlo, con un
tope de 58 px para que no se vean payasas. Siete fichas pasaron de 41 a **51 px de ancho** —un
24% mas grandes— sin desbordar: comprobado que la pagina no scrollea de lado.

Si con una sola fila las fichas quedarian por debajo de 34 px (no se acierta con el dedo), se
parten en dos filas y se recalcula. Dos filas de fichas grandes se tocan mejor que una fila de
fichas diminutas.

### 3. "El pozo que salga en el medio, como un monton desordenado"

La primera version fue un monton chiquito siempre visible en el medio de la mesa. **Estaba
mal entendido.** Jonathan lo explico de nuevo y es otra cosa (ver §119).

`Pool.jsx` se borro: ya no lo usa nadie.

## 119. El pozo, como lo queria de verdad (2026-09-05)

La primera version del pozo estaba mal entendida: un monton chiquito, siempre a la vista en el
medio de la mesa. Jonathan lo volvio a explicar y **pidio expresamente que no se programara
hasta confirmar que se habia entendido**. Se confirmo primero y despues se hizo.

Lo que queria:

1. La mesa se ve **normal**. Nada de pozo. Solo la cadena y la gente jugando.
2. Le toca a alguien robar → las fichas del pozo **aparecen desparramadas por toda la mesa**,
   boca abajo.
3. **Se barajean**: se ven revolviendose, cambiando de sitio, con su ruido.
4. Quedan quietas y la persona **agarra una**. Si todavia no puede jugar, agarra otra, y otra,
   hasta que le salga.
5. Apenas termina, **las fichas se quitan de la mesa** y se sigue jugando normal.
6. Cuando a otro le toque robar, **vuelve a pasar lo mismo**.

O sea: el pozo **entra y sale**, no vive en la mesa.

### Dos decisiones que tomo el

- **Lo ve solo quien roba.** El rival sigue viendo su mesa normal. Eso ademas ahorra tocar el
  servidor: `canDraw` ya es de cada uno y de nadie mas.
- **Con sonido.** Se agrego `playShuffleSound`, que no es un sonido nuevo inventado: es el
  mismo clac de una ficha repetido muchas veces con el tono y el volumen movidos, que es
  justo lo que se oye al revolver el pozo con las manos. Todos los golpes se programan de una
  en el reloj del audio, asi que no dependen de que la pantalla vaya fluida. Respeta el boton
  de silencio que ya existia.

### Tres cosas que solo se vieron corriendo

1. **Las fichas caian debajo de la mano.** Se reparten dentro del rectangulo util, con los
   MISMOS margenes que recibe el tablero.
2. **El velo cortaba con un escalon.** Cubria solo el rectangulo util y se veia una franja
   clara pegada a la mano. Ahora el velo cubre la mesa entera y solo las fichas respetan el
   margen.
3. **El cartel le caia encima al nombre del rival.** Bajado a 96 px, que es donde termina la
   placa del de enfrente, y metido en una pastilla oscura: sobre catorce fichas desparramadas
   el texto suelto no se lee.

### Por que el reparto no es al azar puro y el barajeo si

- **El reparto** es una rejilla con temblor: una ficha por casilla, corrida un poco al azar
  dentro de la suya. Tirandolas del todo al azar quedan pilas en un lado y huecos en el otro.
- **Las posiciones no se recalculan** mientras uno esta agarrando. Si dependieran de la
  cantidad, al levantar una se reacomodarian todas y uno perderia de vista la que iba a tocar.
  Se guarda la lista de sitios y al levantar la ficha numero j se saca el sitio j; las demas se
  quedan quietas y la cuenta sigue calzando con la del servidor.

Probado corriendo: la mesa se ve limpia sin pozo, y forzando el estado de robar se comprobo
que las fichas aparecen, **cambian de sitio cinco veces** antes de quedarse quietas (medido
muestreando la posicion de una ficha), que ninguna cae fuera del rectangulo util, y que al
tocar una teniendo jugada disponible el servidor contesta *"Tienes jugadas disponibles, no
puedes robar"* — el cable llega hasta el fondo.

## 120. Fichas de mesa mas grandes, y el destranque (2026-09-06)

Jonathan volvio con dos cosas de sus amigos.

### 1. Las fichas de la mesa, un 17% mas grandes

Estaban en 35x17 pixeles en un telefono de 375, contra 51x102 las de la mano. El tope lo ponia
`ZOOM_FICHAS = 1,10`, y ese numero salia de una **medicion equivocada**.

`scratch/medir-zoom.mjs` comparaba el ancho Y el alto de la cadena contra la MISMA ventana
cuadrada. En un telefono la ventana no es cuadrada: la escala la manda el lado corto —el
ancho—, asi que a lo alto se ven 26 celdas donde a lo ancho se ven 18. Una cadena alta entraba
perfecto y la medicion decia que no. Y faltaba lo otro: **la camara se corre sola**, y cuando
la cadena ya no entra garantiza que se vean las DOS PUNTAS, que es donde se juega.

Medido de nuevo y bien (`packages/domino-engine/tools/medir-zoom.mjs`), sobre **55.021 posiciones** de
partidas jugadas de verdad, en un telefono de 375:

| zoom | ficha | la cadena entera no entra | no entran ni las PUNTAS |
| --- | --- | --- | --- |
| 1,10 | 35x17 | 0,000% | 0,000% |
| 1,20 | 38x19 | 0,165% | 0,029% |
| **1,30** | **41x20** | **1,263%** | **0,327%** |
| 1,40 | 44x22 | 4,611% | 1,252% |
| 1,50 | 47x24 | 10,180% | 3,271% |

Queda en **1,30**: fichas un 17% mas grandes y las dos puntas a la vista en el **99,67%** de
las jugadas. Para el 1,3% en que se sale un tramo del medio estan los dos dedos, que la lupa
ya existe. Comprobado corriendo: la ficha de la mesa mide 41x20.

### 2. El destranque: el dibujo ya no le veta una jugada legal a nadie

Idea de Jonathan: *"cuando el camino se cierra y el jugador tenga pieza... destrabe la figura y
la ponga en otra forma"*. Es **exactamente** lo que la §33 habia concluido hace tiempo y nunca
se hizo: *"el lugar fisico donde cae la ficha no es una decision de domino... hoy el dibujo
tiene poder de veto sobre una jugada legal, y eso esta al reves"*.

#### Cuanto pasaba, separado en dos casos

Medido sobre **68.758 turnos** de partidas jugadas de verdad
(`packages/domino-engine/tools/medir-destranque.mjs`):

| | cuanto | |
| --- | --- | --- |
| veto PARCIAL: podia jugar otra ficha, pero una suya no entraba | 0,586% de los turnos | |
| **veto TOTAL: no podia jugar NADA teniendo ficha que pega** | **0,266% de los turnos** | **4,73% de las rondas** |

El grave es el segundo: una de cada 21 rondas mandaba a alguien a robar o a pasar cuando la
regla del domino decia que tenia jugada. **De 183 casos, el trazado nuevo destranco los 183.**

#### Que hace

La SECUENCIA de fichas no se toca: el 6|3 sigue pegado al 3|4, en el mismo orden. Lo unico que
se recalcula es el CAMINO sobre la rejilla, probando cuatro formas (`compacta`, `recta`,
`ancha`, `giro`) hasta que una deje sitio. Las puntas siguen valiendo lo mismo, las manos no se
tocan, el turno tampoco. Es puramente geometrico: **no le da ventaja a nadie**, solo devuelve
el espacio que el dibujo habia quitado. La `compacta` resuelve el 93% de los casos.

Si ninguna forma destranca, no se cambia nada: nunca se mueve el tablero para dejarlo igual de
trancado.

#### Donde vive cada parte

- **El motor** trae la accion `RELAYOUT`, `necesitaDestrancar()` y, en `layout.js`,
  `reconstruirCadena` / `jugadasSinSitio` / `destrancarCadena`. Va detras de
  `config.destrancar` para que PrivoyTruco pueda apagarlo (regla 7 del motor).
- **Quien decide CUANDO** es el servidor, en `broadcastState`, que es el unico punto por el que
  pasan todos los cambios de estado. El motor es un reducer puro y no actua por su cuenta,
  igual que con el reloj del turno.
- **Sin boton**, decision de Jonathan. El jugador no tiene por que enterarse de que existe un
  problema de dibujo: para el, el juego simplemente nunca lo frena injustamente.

#### El caso parcial se deja como esta, a proposito

Cuando el jugador **si puede jugar otra ficha**, no se toca el tablero. Rearmar la mesa cada
vez que una ficha cualquiera no entra la haria saltar el 0,59% de los turnos sin necesidad, y
el jugador tiene jugada igual. Se arregla el caso que cambia el resultado de la ronda, no el
que solo molesta.

#### Pruebas

- `packages/domino-engine`: 75 (14 nuevas). La posicion de prueba **se reconstruye jugando**
  con semilla fija, no se pega a mano: un estado pegado se queda viejo en cuanto cambia una
  regla y deja de probar nada. Comprueban que la secuencia, las puntas, las manos, el turno y
  el marcador no se tocan; que el trazado nuevo cae dentro de la rejilla, sin fichas
  superpuestas y con cada ficha pegada a la anterior; que el estado sigue siendo serializable;
  y que la partida se sigue jugando despues.
- `npm run test:destranque` (backend): juega **60 partidas enteras por el RoomManager**, 14.312
  turnos. Comprueba la invariante que de verdad importa: **nadie se queda sin jugar teniendo
  una ficha que pega**. Cero casos. El servidor destranco solo 27 veces.

La animacion es una transicion de `left`/`top` en las fichas de la mesa: cuando la cadena se
vuelve a trazar, se deslizan a su sitio nuevo en vez de saltar. En el juego normal no hace
nada, porque una ficha ya puesta no se mueve. Con `prefers-reduced-motion` no anima.

## 121. Chat en la partida (2026-09-06)

Jonathan: *"mete chat en la partida entre jugadores"*.

### En que se diferencia del chat global

| | global | de mesa |
| --- | --- | --- |
| quien lo ve | cualquiera que entre al menu | los que estan sentados en esa mesa |
| donde se guarda | en la base de datos | en memoria, y muere con la mesa |
| quien escribe | el que tiene cuenta | los que estan jugando esa partida |

**No se guarda en la base.** Lo que se dice en una mesa muere con la mesa: es conversacion de
partida, no historial. Guardar cada "juega rapido pana" llenaria la base de ruido que nadie va
a volver a leer. Queda una copia corta en memoria (25 mensajes) para el que se reconecta: si se
le fue el internet un momento, al volver ve lo que se dijo. Se borra sola cuando la mesa se
cierra, enganchada a los mismos `rooms.delete` que ya existian.

### Se ve de dos formas, y las dos hacen falta

1. **La burbuja.** Lo que alguien acaba de decir sale unos segundos al lado de su sitio en la
   mesa. Es lo que hace que el chat sirva: en plena partida nadie va a estar abriendo un panel
   cada dos jugadas para ver si le hablaron.
2. **El panel.** Se abre con el boton y trae lo dicho y donde escribir. Y el boton lleva un
   contador de sin leer, por lo mismo: para no tener que abrirlo a ver si hay algo.

### Solo entre personas

Contra la maquina el boton **ni se dibuja**. No hay con quien hablar, y ofrecer un boton para
despues negarlo es peor que no ofrecerlo. El servidor tambien lo rechaza, que es donde de
verdad se decide.

### Los frenos, todos en el servidor

Un chat sin frenos se llena de basura el primer dia, y si estuvieran en la pantalla cualquiera
los saltea desde el navegador. Van: largo maximo de 160, un mensaje cada segundo y dos, doce
por minuto, y —lo mas importante— **solo escribe quien esta sentado en esa mesa**, comprobado
contra el RoomManager y no contra lo que diga el navegador. El nombre sale del token que ya
verifico el middleware: mandar un `username` distinto no sirve de nada.

### Dos cosas que solo aparecieron corriendo

1. **La burbuja salia torcida y corrida.** Reusaba la animacion de las fichas (`tile-place`),
   que termina en `transform: scale(1) rotate(0)` y le borraba el `-translate-x-1/2` con el que
   se centra. Ahora tiene una animacion propia que **solo toca la opacidad**.
2. **La burbuja propia quedaba tapada por la mano.** El contenedor de la mesa sigue por detras
   de las fichas. Ahora se coloca a `altoMano + 12` del borde.

### Pruebas

`npm run test:mesa-chat` — 17, contra el servidor levantado. Dos cuentas se sientan en una mesa
y se hablan; se comprueba que al de al lado le llega, que el nombre lo pone el servidor y no el
navegador, que **el que no esta sentado no escribe ni lee**, que un invitado tampoco, que el
historial le llega al que se reconecta, que los frenos frenan, que contra la maquina no hay
chat, y que **lo que se dice en una mesa no se oye en otra**.

Verificado ademas en pantalla con una partida de verdad entre dos cuentas: la burbuja centrada
bajo el nombre del rival, el contador de sin leer en el boton, y el panel enviando y recibiendo.

### Una trampa del entorno, anotada para no repetirla

Para probarlo hace falta un segundo jugador, y las dos pestañas del navegador **comparten
localStorage**, asi que no se pueden tener dos cuentas abiertas a la vez. Se hizo con el
navegador de un lado y un socket de Node del otro. Y ese script **no puede vivir dentro de
`backend/`**: nodemon vigila esa carpeta, al escribir el archivo reinicia el servidor, y con el
reinicio se pierden las mesas, que viven en memoria. Costo tres intentos entenderlo.

---

## 122. La camara sigue la cadena y la ficha vuela (2026-09-10)

Primer paso del plan de [analisis-domino-legends.md](analisis-domino-legends.md): **que la
mesa se sienta viva**. Jonathan: *"dale play al plan y vamos viendo paso por paso"*, y de
paso *"que la skin de las piezas blanca hueso sea el skin predeterminado"*.

### Lo que cambio

1. **Las blanco hueso son las de fabrica.** `MesaTheme.jsx`: `DEFECTO.fichas = 'hueso'`.
   Quien ya tenia otra elegida la conserva; lo que cambia es con que se entra la primera vez.
2. **La camara encuadra la cadena.** Antes la mesa tenia UN tamaño fijo toda la mano (§82).
   Ahora el zoom sale de la caja de la cadena mas el alcance de las puntas, y se mueve con una
   transicion lenta (`.camara-de-mesa`, 420 ms).
3. **La ficha viaja.** La tuya sale del sitio exacto que ocupaba en tu mano; la del rival entra
   desde arriba, por fuera del borde. Antes las dos aparecian de golpe en su casilla.

### El tamaño de la ficha en la mesa, medido

Sobre el juego corriendo, telefono de 375, leyendo la escala de la camara:

| fichas en la mesa | 1 | 2 | 3 | 4 | 5 | 6 | 10 | 11 | 13 | 14 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alto de la ficha | 36 | **42** | 32 | 28 | 23 | 21 | 23 | 20 | 18 | 17 |

Antes era **20 px siempre**. Al principio de la mano —que es cuando se mira— la ficha es
**el doble**. Cuando la cadena se llena, queda igual o un poco mas chica, que es exactamente
lo que hace Domino Legends.

Seguimos por debajo de ellos al arrancar (miden 78 px con una sola ficha, nosotros 36-42).
La diferencia es el aire que reservamos alrededor de las puntas (`ALCANCE_PUNTA = 2` celdas)
para que se vean los sitios donde podes jugar. Bajarlo agranda la ficha pero puede dejar el
iman fuera de la pantalla: es una decision para medir aparte, no para tocar a ojo.

### Como se hizo volar la ficha, y los dos errores del camino

**Primer error: los hooks detras de un `return`.** El estado del vuelo quedo escrito despues
del `return` con el que `Board` dibuja la mesa vacia. Con la mesa vacia corrian menos hooks
que con la mesa puesta, y React se caia con *"Rendered more hooks than during the previous
render"* en cuanto entraba la primera ficha: pantalla en blanco. Van todos arriba del `return`.

**Segundo error: medir el destino en pantalla.** La primera version calculaba a que punto de
la PANTALLA tenia que llegar la ficha. No sirve: en ese mismo momento la camara esta a mitad
de su propia transicion de 420 ms, asi que la ficha aterrizaba donde la mesa estaba, no donde
iba a quedar. La solucion fue no pelearse con la camara sino meterse dentro: **la ficha que
vuela se dibuja junto a las demas, dentro de la camara**, y su destino es la casilla. Asi la
camara se la lleva como a cualquier otra ficha, y aterriza exacto por construccion.

Comprobado en el navegador: en las jugadas medidas, la distancia entre la ficha que vuela y
la casilla real es **0 px** en las cuatro medidas (izquierda, arriba, ancho, alto).

**Y un detalle de tamaño.** El despegue compara los lados LARGOS, no los anchos. La ficha
vuela ya girada como va a quedar; si sale de la mano (siempre parada) hacia una casilla
acostada, comparar ancho con ancho la hacia despegar al doble de grande. Con el lado largo
despega exactamente del tamaño que tenia en la mano.

**El viaje es `@keyframes`, no una transicion.** Una transicion necesita dos renders y un
`requestAnimationFrame` para tener de donde animar, y `rAF` no corre cuando la pestaña no se
esta dibujando: la ficha se quedaba clavada sobre la mano. Con `@keyframes` arranca sola. De
regalo, con el movimiento apagado en el sistema la animacion no corre y la ficha simplemente
esta donde tiene que estar.

### Archivos

- `frontend/src/components/game/Board.jsx` — encuadre, escala, `FichaEnVuelo`.
- `frontend/src/components/game/MesaTheme.jsx` — hueso por defecto.
- `frontend/src/components/game/Hand.jsx` — `data-ficha-mano`, de donde sale la ficha.
- `frontend/src/pages/Game.jsx` — anota el sitio en la mano y lanza el vuelo del rival.
- `frontend/src/hooks/useLupa.js` — devuelve `x`, `y` y `escala` en crudo.
- `frontend/src/index.css` — `ficha-vuela`, `.camara-de-mesa`.

### Lo que queda del plan

Paso 2: que el juego hable (consejos, celebracion de fin de ronda, la mano del rival boca
abajo). Paso 3: modos de reglas (Tranca, Con pozo, Cinco). Paso 4: decisiones de Jonathan.

---

## 123. Que el juego hable (2026-09-10)

Segundo paso del plan de [analisis-domino-legends.md](analisis-domino-legends.md). Jonathan
vio el paso 1 y dijo *"ok se ve decente sigamos con el paso 2"*. El paso 2 son tres cosas, y
las tres apuntan a lo mismo: que el juego **diga** lo que esta pasando en vez de dejarte
adivinar.

### 1. Consejos que salen solos

`frontend/src/components/game/ConsejoDeMesa.jsx`. Una pastilla que aparece sobre la mano y se
va sola. Seis consejos, todos sacados de un cambio REAL del estado que manda el servidor:

| cuando | que dice |
| --- | --- |
| empieza la ronda 1 | Sale el que tenga el doble más alto |
| empieza otra ronda | Sale quien ganó la ronda pasada |
| baja el pozo y no es tu turno | Fulano no puede jugar y está levantando |
| el pozo llega a cero | Se acabó el montón: el que no puede, pasa |
| te queda una ficha | ¡Te queda una ficha! |
| a otro le queda una | A Fulano le queda una ficha |

**Cada uno sale UNA vez por ronda.** Un cartel que vuelve cada dos jugadas deja de leerse a
los treinta segundos y pasa a estorbar, que es lo contrario de lo que se busca.

**La cola va en estado, no en un `setInterval` mirando un ref.** La primera version encolaba
en un ref y un reloj de 150 ms lo vaciaba. Medido en el navegador: cuando la pestaña no se
esta dibujando, los relojes se frenan a ~1 s y el consejo salia tarde o no salia. Con estado,
mostrar el siguiente es consecuencia de que se fue el anterior, no de un reloj.

### 2. El fin de ronda, en dos tiempos

`frontend/src/components/game/CelebracionDeRonda.jsx`.

Primero el **grito sobre la mesa** (1,8 s): el cartel grande, y si ganaste, rayos de sol
girando detras y 36 papelitos cayendo. Recien cuando se va, entra el panel con las cuentas.
Si salieran juntos, el panel taparia la jugada que acaba de cerrar la ronda, que es justo lo
que uno quiere mirar.

Lo que dice el cartel sale de `tituloDeRonda()`, con el motivo y tu equipo:

| motivo | ganaste | perdiste |
| --- | --- | --- |
| domino | **¡Dominó!** | Se quedó sin fichas |
| trancado | ¡Tranca ganada! | Tranca perdida |
| abandono | Ronda ganada | Ronda perdida |

En un **abandono no hay grito**: nadie gano nada, se fue alguien.

Despues, en el panel:

- **El puntaje sube en vez de saltar** (`useNumeroQueSube`). `+22 puntos` apareciendo de golpe
  es un dato; subiendo de a poco es lo que te hace mirarlo. Se apoya en `requestAnimationFrame`,
  con un `setTimeout` de respaldo que lo deja en su valor final si el navegador no esta
  dibujando: nunca se queda a mitad.
- **Los pips del perdedor vuelan hasta el total** (`PuntosQueVuelan.jsx`). Lo que viaja es una
  COPIA; el numero del desglose se queda donde esta, porque sirve para comprobar la cuenta a
  mano. Las dos puntas se encuentran por atributos en el HTML —`[data-pips-volando]` y
  `[data-total-puntos]`— y no encadenando refs entre dos componentes que no se conocen.

Nada de esto es un dibujo: los rayos son un `conic-gradient`, el confeti son rectangulos y el
cartel es tipografia. Son EFECTOS, no ilustraciones (regla 1.1).

### 3. Las fichas del rival, boca abajo

`frontend/src/components/game/ManoBocaAbajo.jsx`. Antes su asiento decia "5 fichas". Un numero
es informacion; un abanico de fichas es la mesa. Cuando el rival juega, el abanico se achica
solo y se ve.

El dorso **no es un dibujo nuevo**: es el mismo `.pool-tile` con el que ya se dibujan las
fichas del pozo, para que el reverso sea UNO en todo el juego.

### Comprobado corriendo

Jugado en localhost, telefono de 375, contra la maquina:

- El consejo de salida sale con el texto correcto, encima de la mano.
- Siete dorsos en el asiento del rival con la mano llena.
- Tres de los cinco cierres, vistos de verdad: **"¡Dominó!" con 36 papelitos y los rayos**,
  "Se quedó sin fichas" y "Tranca perdida". "¡Tranca ganada!" y "¡Empate!" salen de la misma
  funcion pura y no se forzaron.
- El contador llega al total (+19 y +12 en dos rondas distintas).
- El pip que vuela: una copia de "12 pips" viajando 112 px a la izquierda y 78 hacia arriba,
  hasta un total que dice "+12 puntos". Los numeros coinciden.

### Un error del camino

`useNumeroQueSube` quedo escrito **debajo de los cinco `return` tempranos** de `Game`
(buscando partida, sala de espera, sin estado...). Un hook detras de un `return` rompe React:
*"Rendered more hooks than during the previous render"*, pantalla en blanco al entrar a la
mesa. Es el **mismo error** que en la §122. Ahora va arriba de todos los `return`, con el
porque escrito al lado.

### Lo que queda del plan

Paso 3: modos de reglas (Tranca, Con pozo, Cinco), que es trabajo del motor.
Paso 4: las decisiones de Jonathan (Hint/Spy, monedas y tienda, ligas).

---

## 124. El clac de la ficha, medido (2026-09-10)

Jonathan, viendo el video de Domino Legends: *"puede usar el audio de las fichas de ese juego
se escucha mas natural"*.

**El audio de ellos no se usa.** Es su grabacion. Lo que si se puede es medir POR QUE suena
natural y hacer uno propio que de los mismos numeros. Eso es esta seccion.

### Que estaba mal

El clac viejo eran dos osciladores: un triangulo de 950 Hz cayendo a 120 y un seno de 2400
cayendo a 800. Es el equivalente sonoro de dibujar un icono a mano, y la regla 1.1 lo prohibe
para lo visual por la misma razon por la que aca se oia mal.

### La medicion

Se saco el audio del video con `ffmpeg`, se buscaron los arranques secos (un marco de 5 ms
mucho mas fuerte que los 40 ms anteriores) y se quedaron los que se apagan rapido y tienen la
energia arriba: **98 golpes**. De cada uno: cuanto tarda en caer 20 dB, donde esta el centro
del espectro, y como se reparte la energia por bandas.

| | el viejo | **ellos** | el nuevo |
| --- | --- | --- | --- |
| se apaga (-20 dB) en | 30 ms | **50 ms** | 45 ms |
| centro espectral | 1581 Hz | **4359 Hz** | 3944 Hz |
| planitud espectral | 0,085 | **0,023** | 0,011 |
| energia < 500 Hz | 10% | **13%** | 13% |
| energia 500-2000 Hz | **73%** | **18%** | 18% |
| energia 2-8 kHz | 14% | **57%** | 56% |
| energia > 8 kHz | 3% | **12%** | 12% |

Ahi esta todo. El viejo ponia el **73% de la energia entre 500 y 2000 Hz**, que es la banda
del *bip*. El clac de dos fichas duras vive en 2-8 kHz, y ahi ellos tienen el 57%.

### Lo que la planitud enseño

La planitud espectral de ellos es **0,023**: casi nada. Eso quiere decir que su golpe esta
hecho de **picos definidos, no de ruido**. Una ficha dura no hace "shhk", hace "clac": suena
el cuerpo con sus modos y se apaga.

El primer intento fue justamente un golpe de ruido filtrado. Daba planitud **0,329** —
catorce veces mas ruidoso que el de ellos— y sonaba a soplido. Por eso el que quedo es un
**modelo de modos**: nueve senos en las frecuencias del cuerpo, cada uno con su peso y su
tiempo de apagado, mas dos milisegundos de ruido por arriba de 3 kHz para que tenga filo.

### Y nunca suena igual dos veces

Cada golpe mueve el tono un ±8% y el volumen un ±15%. Medido sobre ocho jugadas seguidas, el
centro va de **3675 a 4014 Hz**: no hay dos iguales. Dos fichas de verdad nunca chocan igual,
y una muestra repetida identica se nota a la tercera jugada.

### El revoltijo del pozo usa el mismo clac

Con cuatro modos en vez de nueve. Son veintitantos golpes seguidos: con el modelo entero
serian mas de doscientos nodos de audio a la vez, y en un telefono viejo eso se oye como un
tironeo.

**Los cuatro estan elegidos uno por banda, no son los cuatro primeros.** Recortando por orden
quedaban los cuatro agudos y el monton sonaba a cascabeles: medido, **99% de la energia arriba
de 2 kHz y nada abajo**. Con uno por banda queda 21 / 17 / 61 / 0.

### Comprobado corriendo

Los numeros de la columna "el nuevo" **no son los del prototipo**: salen de renderizar
`armarClac()` —la funcion que va en el juego— en un `OfflineAudioContext` del navegador y
medirla ahi. Por eso la funcion recibe el contexto y el momento en vez de usar los suyos: sin
eso no habria forma de medir lo que de verdad suena.

Jugado ademas en la mesa, con fichas y con el pozo: cero errores.

### Archivos

- `frontend/src/utils/soundEffects.js` — `MODOS`, `armarClac()`, `playTileSound()`,
  `playShuffleSound()`.

### DESHECHO el mismo dia

Jonathan lo escucho: *"se escucha horrible haslo igual y solo subele un decibel y ya... que
tanto, no entiendo por que el afan de querer inventar la rueda. Solo necesitamos que sea la
rueda: si la de ellos es amarilla, la de nosotros es amarilla con rayas, no una rueda cuadrada
y turbo motores"*.

Tenia razon, y la leccion vale mas que el codigo: **dar los mismos numeros no es sonar igual.**
El modelo clavaba las bandas (13/18/56/12 contra 13/18/57/12) y aun asi sonaba mal, porque un
golpe real tiene cosas que esas cuatro bandas no miden — como arranca, como se mezclan los
modos, el cuarto donde se grabo. Se optimizo el objetivo equivocado.

El clac volvio al de antes. **Lo que corresponde no es modelar mejor: es una GRABACION de
verdad**, que es literalmente "la misma rueda". La medicion de arriba no se tira: sirve para
elegir y ajustar esa grabacion, no para fabricar un sustituto.

### Como quedo: una GRABACION, elegida con la medicion

Dos grabaciones, del mismo pack:

| archivo | para que | original | largo |
| --- | --- | --- | --- |
| `clac.wav` | la ficha al ponerse | `metal_hit_01.ogg` | 260 ms |
| `clac-pozo.wav` | cada golpe del monton | `wood_misc_05.ogg` | 80 ms |

- **Origen:** pack *"100 CC0 metal and wood SFX"* de **rubberduck** en OpenGameArt
  (https://opengameart.org/content/100-cc0-metal-and-wood-sfx).
- **Licencia:** **CC0 / dominio publico.** Uso libre, tambien comercial, sin atribucion
  obligatoria. Queda escrito igual en `frontend/public/sonidos/LEEME.md`.
- **Que se le hizo:** recortado desde el golpe, 260 ms, desvanecido de 25 ms al final para que
  no chasquee al cortarse.

La medicion sirvio para **elegir**, que es para lo que servia. Se midieron los 25 golpes de
madera y metal del pack con la misma vara que el video, y este es el que mas se acerca:

| | apagado | centro | < 500 / 500-2k / 2-8k / > 8k |
| --- | --- | --- | --- |
| el del video | 50 ms | 4359 Hz | 13 / 18 / 57 / 12 % |
| **el elegido** | 70 ms | 3751 Hz | 9 / 26 / 58 / 7 % |
| el segundo | 100 ms | 4125 Hz | 16 / 22 / 50 / 13 % |

Cada golpe mueve el tono un ±8% y el volumen un ±15%, cambiando la velocidad de la muestra —
que es lo que pasa de verdad cuando la ficha que golpea es un poco distinta.

**Cual se usa lo eligio Jonathan de oido**, entre cuatro candidatos que se le pasaron sonando.
La medicion hizo la lista corta; la eleccion fue suya. Eso es lo que faltaba en el intento
anterior.

**El pozo revuelto lleva OTRA grabacion, corta y seca.** Al principio usaba la misma del clac,
veintitantas veces con el tono muy movido, y Jonathan lo escucho: *"suena raro el final ese
corrido"*. Tenia razon: veinte colas de 260 ms encimadas no suenan a monton de fichas, suenan
a un barrido. La del pozo dura 80 ms, van una cada 47 ms en vez de cada 35, y el abanico de
tonos paso de 0,82-1,32 a 0,92-1,18.

**Para subir o bajar el volumen se toca UN numero**, `VOLUMEN_CLAC` en `soundEffects.js`. 1 es
como vino la grabacion; 1,12 es aproximadamente un decibel mas.

La grabacion se pide al entrar a la mesa, no en la primera jugada: son 16 KB y un clac que
llega tarde es peor que ninguno. Si no llega, no suena nada y el juego se juega igual.

---

## 125. Los consejos, que no se veian (2026-09-10)

Jonathan: *"a mi no me salen los consejos, puedes verificar eso?"*.

### Lo primero: no estaban rotos

Medido en el navegador, jugando: el consejo **si dispara**, cae **dentro de la pantalla**
(terminaba en 623 de 812, con la mano empezando en 684, asi que tampoco la pisaba), esta
`visible`, con `z-index: 30`, y no hay nada encima.

Una cosa que casi me hace perseguir un fantasma: el medidor decia `opacity: 0` en las treinta
muestras. Resulta que **el panel del navegador donde pruebo no dibuja**, y cuando no dibuja,
el reloj de las animaciones no avanza: `getAnimations()[0].currentTime` se queda en **0** con
el estado en `running`, para siempre. La animacion de entrada va de opacidad 0 a 1, asi que se
quedaba congelada en el primer fotograma. En una pantalla de verdad se ve.

Vale anotarlo porque ya paso dos veces (tambien con el vuelo de la ficha, §122): **en este
panel, cualquier cosa que dependa de una animacion o de `requestAnimationFrame` se mide
congelada.** No es un bug del juego.

### Lo que si estaba mal

Dos cosas, las dos de criterio:

1. **Demasiado discreto.** Letra de 11 px en una pastilla negra translucida, abajo del todo,
   justo donde uno esta mirando sus fichas y no esperando un cartel.
2. **Demasiado raro.** Seis consejos, cada uno una vez por ronda, y los que mas se repiten
   dependian del pozo. En una ronda normal salia uno, al principio, y se iba en 3,6 segundos.

### Lo que cambio

El cartel: **13 px** en vez de 11, borde dorado, fondo solido, sombra, y un icono de bombilla
de `lucide-react` (regla 1.1: de libreria, no dibujado). **4,6 segundos** en vez de 3,6.

Y cinco consejos nuevos, elegidos porque salen SEGUIDO o porque cambian como jugas:

| clave | cuando | que dice |
| --- | --- | --- |
| `primera-vez` | la primera partida de esa persona, nunca mas | Tocá una ficha tuya y después el imán azul para ponerla |
| `extremos-iguales` | los dos extremos piden el mismo numero | Los dos extremos piden 5 |
| `paso-alguien` | otro tuvo que pasar | Fulano no pudo jugar y pasó |
| `pozo-poco` | quedan 3 o menos en el monton | Quedan pocas en el montón |
| `cerca` | alguien esta a 20 o menos del objetivo | Van 85 de 100: esto se define ya |

El de la primera vez es el unico que **no sale del estado** sino de `localStorage`: es el
"como se juega" que tiene Domino Legends con su mascota, y solo tiene sentido una vez.

### Comprobado corriendo

Jugando de verdad contra la maquina, en dos sesiones: salieron **cinco consejos distintos** —
`primera-vez`, las dos variantes de `salida`, `extremos-iguales` y `cerca`— a 13 px y en la
franja de 374 a 482, bien despegados de la mano. Cero errores en consola. Antes, en la misma
cantidad de juego, salia uno.

### Detalle chico pero que ahorra un dolor de cabeza

El cartel ahora lleva `opacity: 1` escrito a mano. `burbuja-entra` no tiene `fill-mode`, asi
que el reposo es el del elemento; si algun dia alguien le pone `forwards` o la animacion no
corre, el cartel tiene que seguir viendose igual.

---

## 126. El Panita dice los consejos (2026-09-10)

Jonathan, despues de ver los consejos de la §125: *"medio los vi, pero prefiero que salga
nuestra mascota oficial diciendolos en un cuadro de dialogo, se ve mejor no crees?"*.

Si, y por una razon concreta: **un consejo con dueño se lee como alguien hablandote; un cartel
suelto se lee como una etiqueta del sistema**, y las etiquetas del sistema la gente las
aprende a ignorar. Es exactamente lo que hace Domino Legends con su mascota en el tutorial.

### Como quedo

El Panita —el sticker que ya existe desde la §114, la ficha de onix con guantes y corbatin—
se asoma por el borde de abajo de la mesa con un globo de dialogo al lado.

- **46 px de alto**, y el globo no pasa de un par de renglones. Una mascota grande saltando
  cada media ronda tapa la mesa y cansa a los diez minutos.
- **Entra desde abajo** (260 ms) y **saluda una vez**, con un balanceo corto. Sin el saludo se
  ve como una calcomania pegada.
- **La colita del globo es un cuadrado girado**, no un dibujo: asi hereda el borde y el fondo
  del globo y no hay que repetir los colores en dos sitios.
- El freno de verdad sigue estando en el hook: **cada consejo sale una vez por ronda**. El
  tamaño solo ayuda.

**No se dibujo nada nuevo** (regla 1.1): es `/stickers/panita.png`, la misma cara que ya se ve
en el pase y en los menus.

### Comprobado corriendo

Jugando contra la maquina, telefono de 375: El Panita salio con *"La Comadre no puede jugar y
esta levantando"*, *"A La Comadre le queda una ficha"* y *"¡Te queda una ficha!"*. La imagen
carga (`naturalWidth > 0`), mide 46x45, el conjunto cae entre 569 y 592 de alto, y la mano
empieza en 691: no se pisan. Cero errores en consola.

### Mas grande, y con interruptor

Jonathan, despues de verlo: *"me gusta, pero tambien hazlo un poco mas grande y que esa opcion
se pueda deshabilitar"*.

- **El Panita pasa de 46 a 64 px** y la letra del globo de 13 a 14. Sigue sin pisar la mano:
  medido, el conjunto termina cerca de 623 y la mano empieza en 684.
- **Se apaga desde la solapa de la mesa**, con el resto de los controles, y se recuerda — igual
  que el silencio. A quien ya sabe jugar, un consejo cada ronda le sobra.
- El icono del boton es la bombilla del set **Fluent Emoji**, sacada con
  `tools/extraer-iconos.cjs`. No se dibujo (regla 1.1).

**Un detalle que salio de probarlo y era un bug de verdad:** al volver a encenderlos no pasaba
nada hasta la ronda siguiente, porque los consejos de esa ronda ya estaban marcados como
dichos. Uno prende el interruptor, no ve nada y piensa que esta roto. Ahora **encenderlos
olvida lo dicho**, asi que el siguiente consejo que corresponda sale enseguida.

Comprobado corriendo: apagado, **cero** consejos en doce jugadas; encendido, sale uno en el
acto (*"Van 99 de 100: esto se define ya"*); apagado sobrevive a recargar la pagina. Cero
errores.


---

## 127. Los dobles que se metian debajo, y el cartel que tapaba los imanes (2026-09-10)

Jonathan mando capturas del telefono con dos cosas: *"ve aqui como se ve cuando voy a poner la
primera ficha, que lo tapa ese anuncio"* y *"ve que los dobles a veces se ponen mal"*.

### 1. El doble se metia POR DEBAJO de la cadena

Lo primero fue descartar lo obvio: ¿se despegan las fichas? No. Medido sobre **89.775
tableros**, en cero casos dos fichas seguidas dejan de tocarse. El dibujo no esta roto.

Lo que si pasa: cuando un doble no tiene sitio para cruzarse en la punta, el motor tiene un
rescate —**el doble dobla**— que lo pone atravesado sobre la direccion nueva. Ese rescate
ofrecia dos posiciones, hacia adelante y **hacia atras**, y la de atras deja el doble metido
por debajo de las fichas ya puestas. Es exactamente lo de las capturas.

**Medido: 411 de 9.855 dobles (4,17%) sobresalian hacia atras.**

El primer intento fue quitarle al rescate la opcion fea. Medido, **no sirve**: las fichas
trabadas —*"tengo la ficha que pega y no me deja ponerla"*— pasan de 0,343% a 2,140% de los
turnos, seis veces mas. Un doble feo cada tanto es mucho menos grave que eso.

**La causa real era de DIBUJO, no de reglas.** `celdaDeUnion` busca por donde se tocan las dos
fichas para centrar el doble. Cuando la cadena dobla, las dos quedan lado a lado y hay **dos**
casillas pegadas, no una: la funcion devolvia la primera que encontraba, o sea media vez la de
atras. Entonces el doble se centraba sobre el CUERPO de su vecina en vez de sobre la punta.

Ahora el par bueno se elige por los **numeros**: dos fichas se tocan por la cara que comparte
valor. Con eso:

| | antes | despues |
| --- | --- | --- |
| dobles que sobresalen hacia atras | **411** (4,17%) | **0** |
| fichas trabadas | 0,343% de los turnos | **0,201%** |

Las trabadas bajaron de yapa: al centrar bien, el doble ocupa donde de verdad va y deja libre
lo que antes pisaba.

De paso, la cadena ya **no sale por el lado LARGO de un doble** salvo como rescate. Un doble
va cruzado sobre la cadena: salir por su lado largo lo deja acostado en linea, que en una mesa
de verdad no pasa. Cuesta cero (las trabadas no se movieron).

Las 75 pruebas del motor y las 87 del backend siguen pasando.

### 2. El cartel del tablero vacio tapaba los imanes

Cuando te toca abrir la ronda, en el centro de la mesa habia una tarjeta con fondo y
**desenfoque** — justo encima de donde salen los imanes azules. En las capturas de Jonathan se
ven los imanes borrosos por detras del cartel: no podia ver donde estaba poniendo la ficha.

Ahora:

- **Si NO es tu turno**, el cartel se queda (dice "Esperando que comience la ronda").
- **Si es tu turno**, baja a una linea fina arriba: *"Sos el primero: poné una ficha en el centro"*.
- **En cuanto agarras una ficha, desaparece.** A esa altura ya sabes lo que estas haciendo.

Comprobado corriendo, telefono de 375: con la mesa vacia y mi turno, el texto viejo ya no
aparece, el aviso queda a 160 px de arriba y el centro esta libre. Con una ficha elegida, lo
que esta encima del iman es **el iman**.

---

## 128. Tres modalidades: Con pozo, Tranca y Cinco (2026-09-10)

Tercer paso del plan de [analisis-domino-legends.md](analisis-domino-legends.md). Ellos dejan
elegir entre **All Fives, Draw y Block**; nosotros jugabamos siempre lo mismo y no se elegia.
Es el paso que mas le alarga la vida al juego, y es **trabajo del motor**, no de la pantalla.

### Las tres

| | que cambia | a cuantos puntos |
| --- | --- | --- |
| **Con pozo** | La de siempre. Si no podes jugar, levantas hasta poder. | 100 |
| **Tranca** | Sin monton: el que no puede jugar, pasa. | 100 |
| **Cinco** | Ademas, cada vez que las dos puntas suman multiplo de cinco, te anotas esa suma. | **200** |

Las modalidades son **ortogonales al modo**: cualquiera vale en 1 vs 1 y en 2 vs 2. Por eso el
selector va ARRIBA del de modos y no dentro de cada fila: elegis las reglas una vez y despues
elegis la mesa. Se recuerda la ultima.

**Lo de siempre no cambia.** Sin elegir nada, 1v1 es "con pozo" y 2v2 es "tranca", que es
exactamente lo que se jugaba antes. Comprobado en la mesa: una partida por defecto sigue
diciendo "a 100", con pozo y sin rotulo.

### Por que el Cinco va a 200, y no a 100

Medido sobre 300 partidas:

| modalidad | rondas por partida | turnos por ronda | trancadas |
| --- | --- | --- | --- |
| Con pozo 1v1 | 8,0 | 30,0 | 14,1% |
| Tranca 1v1 | 10,7 | **14,2** | **63,5%** |
| Cinco 1v1 **a 100** | **3,0** | 36,6 | 13,7% |
| Cinco 1v1 **a 200** | 7,0 | 31,0 | 15,7% |
| Tranca 2v2 | 7,0 | 30,5 | 21,2% |

En el Cinco el **68% del marcador se gana jugando**, no al cerrar la ronda. A 100 la partida se
acaba en **tres rondas**, que es media partida. A 200 dura siete, igual que el clasico. El
numero no se eligio a ojo.

**Y la Tranca se siente distinta, a proposito:** manos de 14 turnos en vez de 30, y el 63% de
las rondas cierran trancadas. Es lo que es el Block domino con 14 fichas repartidas de 28; si
un dia molesta, el numero esta aqui para discutirlo.

### Dos detalles del Cinco que no son obvios

1. **Un doble en la punta cuenta DOBLE.** Esta cruzado, con sus dos caras a la vista: un 5|5
   en la punta son diez, no cinco.
2. **Con una sola ficha en la mesa cuentan sus dos caras**, porque las dos son punta. Un 3|2
   solo son cinco, y el que lo puso se anota.

Ademas los puntos de la ronda **se redondean a multiplos de cinco**: 23 pips son 25 puntos. En
esta modalidad todo el marcador va de cinco en cinco.

**La partida se sigue mirando al CERRAR la ronda**, aunque se anote jugando. Cortar a mitad de
mano dejaria la ronda sin terminar y sin repartir los pips, que es peor que jugar dos o tres
fichas de mas.

### Tranca en 1v1 hubo que habilitarla

`resolveConfig` forzaba el pozo cuando no se reparten todas las fichas, porque un formato al
que le faltan fichas y no tiene de donde sacarlas casi seguro es un error de configuracion.
Ahora respeta `hasPool: false` **cuando se pide a proposito**, y sigue corrigiendo solo cuando
no. Comprobado: en Tranca 1v1 se reparten 7 y 7, y las otras 14 se quedan fuera de la mano.

### Que se ve en la mesa

- El **rotulo de la modalidad** en la placa del marcador, solo si NO es la de siempre: poner
  "Con pozo" en todas las mesas seria ruido.
- En Cinco, un **"+15" que salta en el medio** cada vez que alguien anota. Sin eso, la mitad
  de los puntos de la partida pasan sin que te enteres: el numero de arriba cambia y nadie
  mira arriba mientras juega. El dato viene del servidor (`ultimoCinco`, con su `seq`), no se
  calcula en la pantalla — la pantalla nunca decide puntajes (regla 8).

### Pruebas

- `packages/domino-engine`: **85** (diez nuevas, de las modalidades).
- `backend/src/test-modalidades.js`: **18**, jugadas por el RoomManager de verdad.
  `npm run test:modalidades`.
- Las 87 del backend y las 3 del destranque siguen pasando.

Comprobado ademas en la mesa, corriendo: Cinco arranca "a 200" con su rotulo, el rival anoto
5 jugando y salto el "+5"; Tranca muestra "TRANCA · SIN POZO" y no ofrece monton ni una vez;
y elegir "Cinco" en el menu deja la URL en `?mode=1v1bot&modalidad=cinco`.

---

## 129. Decidido: no van Hint ni Spy (2026-09-11)

Del paso 4 del plan de Domino Legends, el punto que no era tecnico sino de criterio. Jonathan:
*"no lo de hint spy no"*.

**Cerrado, y no hace falta volver a proponerlo.** Ver las fichas del rival cambia el domino de
raiz: el que lo sufre no vuelve a jugar. Y el Hint —marcarle a alguien donde puede poner— en un
juego donde ya existe *"por que no podes jugar"* con el diagnostico escrito es de todos modos
poco.

Del paso 4 quedan sin decidir: monedas/tienda/ruleta y las ligas con divisiones.


---

## 130. El cartel de "¡Dominó!", listo para recibir el arte (2026-09-11)

Cierra lo que quedaba del paso 2. El grito de fin de ronda estaba hecho con tipografia y
efectos de CSS: se ve bien, pero es lo que mas se mira de toda la partida y no compite con el
arte pintado de ellos.

### Lo que se hizo AHORA (sin el arte todavia)

El prompt para Gemini esta en
[contexto/prompts/carteles-de-fin-de-ronda.md](prompts/carteles-de-fin-de-ronda.md), y el
codigo ya sabe usar los dibujos **cuando aparezcan**:

- `npm run carteles` (en `frontend/`) toma `arte-fuente/cartel-*.png`, les quita el fondo
  magenta por el mismo camino que los stickers, y los deja en `public/carteles/`.
- `CelebracionDeRonda` pide el dibujo por `<img>` y **si no esta, se cae solo al texto**.

Asi Jonathan suelta los PNG y ya esta, sin tocar codigo y sin que yo tenga que estar delante.

### Son tres, y todos son de GANAR

| archivo | cuando sale | que dice |
| --- | --- | --- |
| `domino.png` | ganaste la ronda quedandote sin fichas (85% de las veces) | ¡DOMINÓ! |
| `tranca.png` | ganaste una ronda trancada | ¡TRANCA! |
| `ganaste.png` | ganaste la partida entera | ¡GANASTE! |

**Los de perder no llevan arte, a proposito.** Un banner pintado para "Tranca perdida" seria
celebrar que perdiste; esos se quedan en tipografia sobria. Tampoco se pidio `¡EMPATE!`: son
el 0,7% de las rondas, medido, y no vale una imagen que casi nadie va a ver.

### Y no llevan rayos pintados

Los rayos de sol siguen siendo CSS y giran despacio por detras. Pintados en la imagen se
quedarian quietos, y lo que da vida es el giro. El prompt lo prohibe explicitamente, junto con
el confeti y cualquier ficha o personaje: **solo la palabra**.

### Una cosa que se descubrio probando

El servidor de desarrollo devuelve **200 con `text/html`** cuando el archivo no existe: es el
`index.html` del SPA. O sea que **preguntar por `fetch` si el dibujo esta no sirve** —
contestaria que si. Lo unico fiable es el `onError` del `<img>`, que es lo que se uso.

Comprobado corriendo, con los dibujos todavia sin generar: la ronda cerro, se intento
`/carteles/domino.png`, fallo, y salio el "¡Dominó!" de texto de siempre. Cero errores.

### Ojo con las tildes

Los generadores de imagen se equivocan con el texto, y en español mas: se comen la tilde de
DOMINÓ o se olvidan del `¡`. El prompt insiste tres veces y el LEEME avisa de revisar letra
por letra antes de guardar.

---

## 132. El 2 vs 2 entre cuatro personas, probado por fin (2026-09-11)

Estaba en la lista de pendientes como **"sin probar"**: el 2v2 se habia jugado siempre con
bots. Lo que cambia con cuatro humanos es todo lo de alrededor —la sala de cuatro, los
equipos, quien ve que, y sobre todo que pasa si uno se va a mitad de partida— y nada de eso lo
cubren las pruebas del motor.

`backend/src/test-2v2-humanos.js`, **35 comprobaciones** con cuatro sockets de verdad contra el
servidor levantado. `npm run test:2v2-humanos`.

### Lo que se comprobo

| | |
| --- | --- |
| la sala | se crea para cuatro; **no arranca a medias** ("Faltan jugadores (1/4)"); los otros tres entran por codigo |
| los equipos | el 1 con el 3, el 2 con el 4, cada uno en su asiento |
| la privacidad | cada uno ve **solo su mano**, las cuatro son distintas, y el estado no lleva la de los demas |
| jugar | 23 fichas por turnos; **jugar fuera de turno se rechaza** ("No es tu turno"); los cuatro ven la misma mesa |
| caerse | a los demas les llega quien falta y cuanto le queda (60 s) |
| volver | entra con el mismo codigo, **con su mano intacta** y la mesa como estaba; a los demas se les quita el aviso |
| irse del todo | la partida se cierra sola por abandono y nadie queda esperando un turno que no va a llegar |

### El bug que encontro

**Despues de un abandono, el motivo del final estaba mal.** `endReason` devolvia `"domino"` —el
de la ronda ANTERIOR— en vez de `"forfeit"`.

La causa: abandonar termina la partida **sin cerrar ronda**, asi que el motivo queda en
`state.result` y `lastRound` se queda con el de antes. Como `_roundClosed` mira solo la fase,
tras un abandono daba por buena esa ronda vieja. Es exactamente el mismo agujero que ya estaba
tapado en `winningTeam` —con su comentario y todo— y que en `endReason` nadie habia tapado.

Arreglado mirando el abandono primero. Sin el arreglo: `"game-over" / "domino"`. Con el:
`"game-over" / "forfeit"`.

### Dos trampas de la prueba, anotadas para el que venga

1. **El servidor manda `game:state` ANTES de contestar el callback de `room:join`.** Si te
   pones a escuchar despues de que vuelva el callback, ya paso y parece que no llego nunca.
   Costo dos falsos fallos.
2. **Escribir el archivo de prueba dentro de `backend/` reinicia nodemon**, y el reinicio se
   lleva las salas, que viven en memoria. Si la prueba falla con `xhr poll error`, es eso:
   esperar unos segundos y repetir.

### Lo que sigue sin probar

**Elegir compañero.** Hoy los equipos salen del asiento (0 y 2 contra 1 y 3) y no hay forma de
elegir con quien te toca. No es un bug, es una funcion que no existe; si se quiere, hay que
decidirla.

---

## 133. Las monedas del club (2026-09-11)

Jonathan dio luz verde a *"las ligas y la moneda y la tienda"*. Esto es la moneda. Las ligas y
la tienda estan frenadas por dos cosas que hay que decidir y que estan al final de la seccion.

### Que son

Se ganan **jugando entre personas**:

| | |
| --- | --- |
| jugar una partida | **5** |
| ganarla | **15** mas |
| la primera victoria del dia | **25**, una sola vez |

**Contra la maquina no se paga.** Es la regla que sostiene todo lo demas: si pagara, la forma
mas rapida de hacerse rico seria jugar solo contra la casa, y las monedas dejarian de
significar nada. Es la misma vara que la clasificacion.

**No se compran.** En Venezuela no hay pasarela de pago que sirva, asi que esto es moneda de
juego y nada mas. Si algun dia se vende algo sera decision aparte; nada de lo que hay aqui lo
da por hecho.

### Las dos cosas que rompen un sistema de monedas

No son sumar y restar. Son estas, y las dos estan cubiertas:

1. **Pagar dos veces por lo mismo.** Cada movimiento lleva una `referencia` —el codigo de la
   partida, o el dia para la primera victoria— y hay un indice unico sobre
   `(user_id, motivo, referencia)`. Si el servidor reintenta, o si dos caminos avisan de la
   misma partida, la segunda vez **no suma**. Sin esto, un reintento regala monedas.
2. **Quedar en negativo.** `cobrar` mira el saldo antes y, si no alcanza, **no cobra nada** y
   lo dice. Cobrar de mas y dejar el saldo bajo cero es la clase de error que despues no se
   sabe deshacer.

### Hay detalle, no solo un numero

Un saldo suelto no se puede explicar. Cuando alguien pregunte *"¿y mis monedas?"*, con el
detalle se contesta. Comprobado que **el detalle suma exactamente el saldo**.

### Donde vive

En el servidor, como los desbloqueos. Si el saldo viviera en el telefono, cualquiera se
regalaria mil editando su navegador (CLAUDE.md regla 8).

### Probado

`npm run test:monedas` — **34 comprobaciones**, y la prueba **se vale por si misma**: crea las
tablas si no estan, sin depender de que alguien haya levantado el servidor.

Incluye una partida entera **contra un bot jugada de verdad** por el RoomManager, para
comprobar que no paga ni una moneda.

Y comprobado ademas en una partida de cuatro personas de verdad (la de la §132): los dos
ganadores cobraron 45 y los dos perdedores 5, con el detalle de cada moneda.

### LO QUE FALTA DECIDIR

**1. La tienda no tiene que vender.** Lo unico que se desbloquea hoy son **cuatro
cosmeticos** —tres paños y las fichas de oro— y **los cuatro son premios del pase de
batalla**. Una tienda que los venda por monedas vacia el pase. Las salidas son: arte nuevo
solo para la tienda (hace falta Gemini), o que las monedas compren otra cosa (¿niveles de
pase? ¿entradas a torneo?). Hasta que eso se decida, el saldo se guarda y se muestra, que es
lo que hace falta para cualquier camino.

**2. Las ligas chocan con la §99.** Jonathan pidio una escalera de rangos, **se construyo**, y
despues el mismo la mando sacar al ver que PrivoyTruco no la tiene: *"la escalera de rangos se
saco"*. Volver a ponerla es deshacer esa decision y separar el domino de la plataforma a la
que se entrega. No se toco nada hasta que lo diga.

---

## 134. La ficha ya no se voltea al ponerla (2026-09-11)

Jonathan: *"cuando uno pone la pieza en la mesa hace una animacion rara, como si volteara la
pieza"*. Tenia razon, y eran **dos** saltos distintos, los dos del vuelo de la §122.

### Por que se veia asi

Una ficha no tiene una imagen por cada cara: hay **un solo archivo**, `tile_min_max.png`, y
`Tile` lo **gira** 0, 90, 180 o 270 grados segun la orientacion y segun si el numero chico va
primero. Entonces:

1. **Al aterrizar cambiaba de cara.** La mesa no dibuja la ficha con el orden crudo de tu mano:
   la da vuelta segun por que punta entra (`displayTile`). La que volaba usaba el orden crudo,
   asi que al llegar pasaba de golpe de 0 a 180 grados. **Eso es literalmente un volteo.**
2. **Al despegar daba un cuarto de vuelta de golpe.** En la mano la ficha esta parada; en la
   mesa suele quedar acostada. Ese giro de 90 grados ocurria en el primer fotograma, al salir
   de la mano.

### Como quedo

1. **Vuela con la cara con la que va a aterrizar.** Se copia `displayTile` y la orientacion de
   la ficha que ya esta puesta en el tablero, no lo que tenias en la mano.
2. **Gira mientras viaja**, por el camino corto (270 grados a la derecha son 90 a la
   izquierda), en vez de dar el volantazo al salir.

### El giro va en una capa aparte, y no es un capricho

La capa de afuera se mueve y se escala **desde su esquina de arriba a la izquierda**, que es lo
que hace simples las cuentas de sitio. Girar desde esa misma esquina abre la ficha **como una
puerta**: el giro necesita el centro. Por eso son dos capas, cada una con su animacion.

### Comprobado corriendo

Jugando contra la maquina: la ficha en vuelo es `tile_0_2.png` a 0 grados y la que queda puesta
es `tile_0_2.png` a 0 grados — **la misma cara**, sin salto. El giro sale en `90deg` y el pivote
en `32px 16px`, que es el centro exacto de una ficha de mesa. Cero errores en consola.

Antes del arreglo, en la misma prueba: en vuelo `tile_1_4.png` a **0** y puesta a **180**.

---

## 135. La ficha que arrastras se ve como la ficha que agarraste (2026-09-11)

Jonathan: *"cuando uno esta arrastrando la ficha se ve como mal escalada, no se ve bien que
ficha estas arrastrando"*.

### Que pasaba

La copia que sigue al dedo **no usaba el componente de ficha**: era una `<img>` suelta, metida
a la fuerza en una caja de **48x96** con `object-fit: cover`.

El archivo de una ficha es **horizontal** (medido: 399x213). Forzarlo en una caja vertical con
`cover` significa ampliarlo hasta que la tape y recortar lo que sobra:

```
  imagen origen     : 399x213 (horizontal)
  caja forzada      : 48x96  (vertical)
  al cubrir queda en: 180x96, recortada a 48 de ancho
  se veia el        : 27% de la ficha, la franja del medio
```

**Se veia una cuarta parte de la ficha, y encima la del medio**, que es justo donde esta la
barra divisoria y casi ningun punto. De ahi lo de "no se ve que ficha estas arrastrando".

Ademas no la giraba: la `<img>` iba tal cual, asi que tampoco respetaba por donde va cada
numero.

### Como quedo

Usa el **mismo componente `Tile` que todas las demas fichas del juego**, en vertical y con
`anchoFicha` — el ancho de verdad de las fichas de tu mano, que ya se calcula midiendo la
pantalla. La que arrastras es identica a la que agarraste.

Se le sumaron dos cosas chicas: va **levantada un poco por encima del dedo** (debajo la tapa tu
propia mano) y se dibuja como `selected`, igual que cuando la eliges tocandola.

### Comprobado corriendo

Arrastrando de verdad en un telefono de 375:

| | ancho | alto | proporcion |
| --- | --- | --- | --- |
| en la mano | 47 | 94 | 2,00 |
| arrastrando | 47 | 94 | 2,00 |

Misma medida exacta, la imagen girada 90 grados como corresponde a una ficha parada, y sin
recorte. Cero errores en consola.

### La leccion, que ya es la tercera vez

Es el mismo error que el volteo de la §134 y que el rebote de la §122: **dibujar una ficha por
fuera del componente que dibuja fichas**. Cada vez que alguien pone una `<img>` suelta con
medidas a mano, se pierde el giro, la proporcion o las dos. Si hay que dibujar una ficha, se
usa `Tile`.

---

## 136. Decidido: las ligas se quedan como PrivoyTruco (2026-09-11)

Jonathan: *"las ligas dejala igual que PrivoyTruco"*. **No van divisiones ni rangos con
nombre.** Se queda la tabla de puntos y puesto de la §99.

Es la segunda vez que se cierra lo mismo, asi que queda escrito en los dos sitios —aqui y en
el plan de Domino Legends— para no volver a proponerlo.

Del paso 4 del plan ya no queda nada sin decidir: Hint y Spy fuera (§129), ligas fuera (esta),
y la tienda esperando a tener que vender.

## 137. El clac mas bajo y el monton mas alto (2026-09-11)

Jonathan, jugando: *"cuando pones la ficha bajale el volumen un poco, y cuando barajeas subele
un poco"*.

| | antes | ahora |
| --- | --- | --- |
| la ficha al ponerse (`VOLUMEN_CLAC`) | 1,00 | **0,82** |
| el monton revuelto (`VOLUMEN_POZO`) | 0,25-0,43 | **0,44-0,77** |

Los dos son numeros con nombre arriba del archivo, no valores sueltos: subirlos o bajarlos es
tocar uno solo. El del monton se movia al azar en cada golpe y lo sigue haciendo, alrededor del
nuevo valor, para que no suenen todos iguales.

---

## 138. Los tres carteles, puestos (2026-09-12)

Llegaron de Gemini y estan en el juego: **¡DOMINÓ!**, **¡TRANCA!** y **¡GANASTE!**, los tres
con el signo de apertura y la tilde donde corresponde.

### El tamaño al que se guardan, medido

El cartel se dibuja a `min(86vw, 420px)` de ancho. Guardado a **220 de alto** sale de unos 710
px de ancho: **2,2 veces** lo que se ve en un telefono y 1,7 en escritorio, nitido de sobra.

| alto guardado | ancho | peso |
| --- | --- | --- |
| 320 | 1027 | 413 KB |
| 256 | 821 | 271 KB |
| **220** | **706** | **207 KB** |
| 180 | 578 | 143 KB |

A 320 se veria **igual** en pantalla y costaria **el doble** de descarga. En un telefono con
mala señal eso es lo unico que se nota.

### Una trampa de Gemini que conviene tener anotada

Los dos primeros intentos de `tranca` y `ganaste` salieron los dos diciendo **"¡CAPOTE!"**:
pidiendole varias imagenes en el MISMO chat, arrastra la anterior como referencia y devuelve
una variacion en vez de una imagen nueva. **Un chat limpio por cada imagen.**

---

## 139. Tres pintas de fichas nuevas: marmol, jade y madera (2026-09-12)

Llegaron de Gemini y ya estan las 84 fichas (28 por pinta). `npm run fichas`.

**Son las primeras que NO son premio del pase: se compran con monedas.** Eso desbloquea lo que
frenaba la tienda —no tener que vender sin quitarle nada al pase— y por eso llevan
`clave: 'fichas:<id>'` y `comoSeGana: 'Se compra en la tienda'`.

### El recorte del marmol necesitaba otra forma

Las pintas viejas se recortan **por neutralidad**: se borra el gris del fondo, y el dibujo se
salva solo porque es calido (el marfil, el oro).

**Con el marmol eso no sirve: el marmol es blanco y NEUTRO**, asi que el recorte se comeria la
ficha entera. Se agrego un recorte **por color**, que mira la distancia al `#808080` del fondo
en vez de la neutralidad: el marmol esta a mas de cien de distancia y se queda.

Las tres nuevas usan el de color; las dos viejas siguen con el de siempre, sin tocarlas.

### Lo que pesan

| pinta | por ficha | la pinta entera |
| --- | --- | --- |
| hueso | 103 KB | 2,9 MB |
| clasicas | 136 KB | 3,8 MB |
| **marmol** | **120 KB** | **3,4 MB** |
| oro | 160 KB | 4,5 MB |
| **jade** | **172 KB** | **4,7 MB** |
| **madera** | **232 KB** | **6,5 MB** |

Estan en la misma liga que las que ya habia, y **cada quien se baja solo la pinta que usa**.
La de madera es la mas pesada porque la textura tiene mucho grano y el PNG comprime mal el
ruido: si algun dia molesta, es la primera candidata a rehacer con una veta mas limpia.

### La de madera salio clara

Se pidio nogal oscuro y vino roble claro, casi blanqueado. Se lee perfecto y es bien distinta
de las otras, asi que se deja. Queda anotado por si se quiere volver a pedir.

---

## 140. Los paños nuevos, recoloreando el que ya habia (2026-09-12)

Gemini **bloqueaba** el pedido de una tela nueva. Primero por *"paño de mesa de juego"* (lo
asocia a casinos) y *"vino tinto"* (alcohol); se reescribio en neutro, con los colores por
codigo y sin la pila de "sin esto, sin lo otro", y **siguio cortando**.

### La salida fue no pedirla

Se recolorea el paño verde que el juego ya usa. Y no es un parche: es **mejor**.

Lo dificil de una textura que se repite no es el color, es que **los cuatro bordes encajen sin
que se vea la union**. El paño verde ya encaja —la baldosa viene espejada en 2x2 a proposito—
asi que recolorearlo **hereda esa propiedad gratis**. Una tela nueva de la IA habria que
volver a comprobarla, y lo mas probable es que se le viera la grilla al repetirse.

### Como se recolorea sin aplastar el tejido

Cambiar el tono y ya deja el verde asomando en las sombras. En vez de eso: se mide el BRILLO de
cada pixel, se divide por el brillo medio de la tela, y ese factor se aplica al color nuevo.
Cada fibra conserva si era mas clara o mas oscura que sus vecinas —que es lo que hace que se
vea tela y no un rectangulo de color— y el color de conjunto es el que se pide.

El tope de 1,85 esta para que los brillos no se quemen a blanco.

### En WEBP, como el verde

| | PNG | WEBP |
| --- | --- | --- |
| granate | 418 KB | **115 KB** |
| azul noche | 412 KB | **72 KB** |

Es una textura fotografica y el PNG comprime mal las fotos. El verde de siempre pesa 117 KB,
asi que los nuevos entran en la misma medida.

`npm run panos`. Los dos van con `clave`, como las fichas nuevas: **se compran en la tienda**,
no son premio del pase.

### Un choque de nombres

El pase ya da un paño llamado "Azul medianoche" en el nivel 10. El nuevo se llama **"Azul
noche"** para que no haya dos con el mismo nombre en el selector.


---

## 141. La tienda (2026-09-12)

Cierra lo que quedaba del paso 4. La tienda estuvo frenada desde el principio por una razon
concreta y no por falta de codigo: **no habia que vender**. Lo unico que se desbloqueaba eran
cuatro cosmeticos y **los cuatro eran premios del pase**; venderlos lo vacia.

Se destrabo con el arte de las §139 y §140: tres pintas de fichas y dos paños **que no salen
del pase**.

### Que vende y a cuanto

| | precio |
| --- | --- |
| Fichas de mármol, jade y madera | 300 c/u |
| Paño granate y azul noche | 300 c/u |

**El precio no se puso a ojo.** Una partida entre personas deja entre 5 y 45 monedas, asi que
300 son entre siete y sesenta partidas: se siente ganado sin ser eterno. Cuando haya datos de
cuanto juega la gente de verdad, se vuelve a mirar.

### El catalogo vive en el SERVIDOR

Los precios los pone el servidor y el navegador manda **solo la clave** de lo que quiere. Si
los precios vivieran en la pantalla, cualquiera compraria el marmol por una moneda editando su
telefono (regla 8).

### Primero se cobra, despues se entrega

El orden no es casual. Al reves, un fallo entre las dos cosas **regala** el articulo. Asi, el
peor caso es que alguien pague y no reciba —que se arregla mirando el detalle de movimientos—
y el caso contrario no se puede arreglar con nadie.

Ademas el cobro lleva la clave del articulo como referencia, asi que **el propio libro de
monedas** impide pagar dos veces por lo mismo, aunque falle la comprobacion de arriba.

### Probado

`npm run test:tienda` — **24 comprobaciones**. No es "compra y ya": es que no se pueda llevar
algo sin pagarlo, que no se pague dos veces, que un articulo inventado no entregue nada, y que
el precio cobrado sea el del catalogo.

Una de las pruebas es de diseño y no de codigo: **comprueba que nada de lo que vende la tienda
sea premio del pase.** Si algun dia alguien agrega un articulo que choca, la prueba falla.

Y probado corriendo de punta a punta: comprar por la API (800 → 500, segunda compra rechazada),
comprar desde la pantalla (500 → 200, el boton del siguiente pasa a decir "Te faltan 100"), y
**la ficha comprada usandose en la mesa** — las siete de la mano salieron de `/tiles-marmol/`.

### Como se entra

Tocando el saldo de monedas del menu. Es donde uno mira cuando se pregunta "¿y esto para que
sirve?", asi que es donde tiene que estar la respuesta.

### Como se entra, corregido

La primera version la puso **solo detras del saldo de monedas**: un circulito de once pixeles
en una esquina del menu. Jonathan, mirando: *"no veo la tienda"*. Tenia razon — y ademas los
atajos laterales (PASE, TORNEOS, TABLA) **solo salen en la portada**, no en el menu, que es
donde el estaba.

Ahora se entra por tres sitios:

- **Una fila propia en el menu**, justo arriba de los modos: "Tienda · fichas y paños".
- **El atajo lateral de la portada**, entre PASE y TORNEOS.
- El saldo de monedas, como antes.

El icono de la tienda es de `lucide-react` y no dorado de Gemini como los otros tres atajos.
Es lo que hay hoy y la regla 1.1 admite libreria; si algun dia se pide el dorado que pega con
los demas, se cambia en un sitio.


---

## 142. El recorte del fondo se estaba comiendo las fichas (2026-09-12)

Jonathan: *"la ficha de jade sale horrible en la tienda"*. Tenia razon, y el problema era mas
grande que el jade: **de las tres pintas nuevas, dos salieron rotas** y no se habia medido.

### Lo que pasaba

Las tres se recortan del fondo gris #808080 que devuelve Gemini, borrando todo lo que quede a
menos de **60** de ese gris. Ese numero se puso a ojo, y a ojo se ve bien en el marmol, que es
blanco y esta lejisimos del gris. En las otras dos no.

Medido sobre las tres imagenes, contando los saltos del borde (lo mordido) y los agujeros
dentro de la ficha:

| pinta | saltos del borde | agujeros dentro |
| --- | --- | --- |
| marmol | 0 | 1,8% |
| **jade** | **81 filas, hasta 58 px** | 2,1% |
| **madera** | 0 | **64,9%** |

Al jade se le comia el **filo palido y traslucido** del canto —que si esta cerca del gris— y
por eso se veia con el borde mordido. A la madera se le comia **el 65% de la veta**: el nogal
oscuro tiene medios tonos grises, y quedaba como madera lavada, de driftwood.

### Los dos arreglos

**1. Borrar solo desde el borde.** `quitarElFondoPorColor` borraba el color *donde estuviera*.
Ahora acepta `desdeElBorde` y hace lo mismo que `quitarElFondo`: un relleno que entra desde el
borde de la imagen. Un gris rodeado de dibujo se queda, porque entonces no es fondo, es la
veta. Esto solo ya dejo el marmol perfecto (0 agujeros).

**2. La tolerancia, medida.** Barrida de 10 a 60 sobre las tres:

| tolerancia | resultado |
| --- | --- |
| 10 | no llega a borrar el fondo entero (el JPEG lo deja moteado) |
| **20** | **limpio en las tres: 0 saltos, 0 agujeros** |
| 30-50 | empieza a morder el jade |
| 60 | jade mordido, madera al 52% de agujeros |

Asi que **20**, no 60.

### Y el punto del jade no era un punto

`jade-punto.png` no es un punto: es un **plato**, un disco plano con reborde ancho. A tamano de
ficha se leia como un remache atornillado. El punto de la pinta de oro si es una media esfera
dorada, y al jade se le habian pedido justamente "puntos de oro viejo": se reusa ese. El script
aprendio un campo `punto` para decir de que pinta sale el punto.

**No hizo falta volver a Gemini para nada de esto.** El arte estaba bien; lo que estaba mal era
el recorte.

`VERSION_FICHAS` sube a **5** para que los telefonos pidan las nuevas: los archivos se llaman
igual.

### De paso, el escaparate de la tienda

Las fichas se enseñaban a **40 px de alto sobre fondo negro**. Lo unico que se vende ahi es el
material, y a ese tamano no se distinguia el marmol del jade. Ahora van **al 76% del ancho de
la tarjeta y sobre el paño verde**, que es como van a verse en la mesa.

### Los prompts, completos

Jonathan: *"dame los pront completos que ladilla cambiando y copiando a cada rato"*. Tenia
razon: `tanda-para-gemini.md` pedia copiar un bloque fijo y pegarle una linea de sujeto, o
reemplazar `{{MATERIAL}}` a mano. Reescrito: **cada recuadro esta completo y se pega tal cual**.
Quedan los cuatro que faltan de verdad —icono de la tienda, banner de la tienda, baranda y los
cuatro stickers—; las fichas y los paños salieron de la lista porque ya estan puestos.

El icono de la tienda ya esta enchufado en `generar-iconos-atajos.mjs`, y el script dejo de
morirse cuando falta un archivo: se salta el que no este. Los iconos no salen todos el mismo
dia y no tiene sentido que no se pueda rehacer la copa porque todavia no esta la bolsa.

---

## 143. Las siete ilustraciones que faltaban, puestas (2026-09-12)

Jonathan las genero todas de una tanda: el icono y el banner de la tienda, la baranda de
caoba y los cuatro stickers del Panita. Todas salieron bien a la primera —ninguna hubo que
volver a pedirla— y eso es merito de los prompts completos de §142: sin reemplazos a mano no
hay sitio donde equivocarse.

### El icono de la tienda

Una bolsa de oro labrado con una ficha grabada y tres monedas. Ya es el cuarto de la familia
—escudo, bolsa, copa, podio—, asi que **se fue el icono de `lucide-react`** de los dos sitios
donde estaba: el atajo lateral de la portada y la fila del menu.

`npm run iconos-atajos` dejo de morirse cuando falta un archivo: ahora salta el que no este.
Los iconos no salen todos el mismo dia y no tiene sentido que no se pueda rehacer la copa
porque todavia no esta la bolsa.

### El banner de la tienda

El Panita de tendero detras del mostrador, con las tres pintas que vende puestas encima.
Misma cabecera que la del pase: mitad izquierda oscura y vacia, con el titulo en dorado
encima. El paso del banner en `generar-stickers.mjs` paso de ser uno a ser una lista, que ya
son dos.

### La baranda de caoba

Es la **segunda** baranda, gratis. Desde §55 solo habia una, asi que el selector ni se
enseñaba; ahora aparece.

Se monta igual que la de nogal, con `border-image`. Los recortes salieron de medirlos: en la
imagen de 2048 la madera ocupa 229 / 234 / 228 / 231 px, y como se guarda a 1024, van a la
mitad: **115 / 117 / 114 / 116**.

Lo que no se podia copiar es el grosor. Esta lleva **una moldura dorada fina por dentro**, y
al grosor de la de nogal (24 px) esa moldura cae por debajo del pixel: el marco entero se leia
como una raya oscura. Probado a 24 y a 34, va un 40% mas ancha.

### Los cuatro stickers, y por que van gratis

Pensando, llorando, aplaudiendo y dormido. **No entran al pase ni a la tienda.**

El motivo no es generosidad: tres de los cuatro —🤔, 😭 y 🥱— **ya estaban abiertos para todo
el mundo** en la lista de emojis de siempre. Meterlos al pase seria quitarle a la gente algo
que ya tenia, que es justo lo que el pase no hace (`Sticker.js` lo dice desde el primer dia:
"un premio no puede ser quitarle algo a quien ya lo tenia"). Lo que se hizo fue **ponerles
cara**: salieron de `BASE` y entraron en `LIBRES`, con el dibujo del Panita en vez del emoji
pelado.

El aplauso 👏 es el unico nuevo de verdad.

En el menu de gestos van en su propia fila, entre los emojis y los del pase, **sin candado**.
`puedeTirar` los acepta sin mirar desbloqueos; el resto del control de siempre no cambia (lo
que no este en ninguna de las tres listas no se manda).

### Un detalle del recorte

Los siete del pase vinieron de cuerpo entero y hay que quedarse con la franja de arriba
(`FRANJA_DE_ARRIBA`). Estos cuatro **no**: se pidieron de busto, y el gesto esta en las MANOS
—aplaudir, taparse la cara, señalar—, asi que cortarlos por arriba seria cortar justo lo que
dicen. Van enteros.

### Lo que sigue faltando

`sticker-chivo.png`. Lleva pendiente desde la tanda del pase y el premio del nivel 18 cae en
el emoji 🐐 mientras tanto. El prompt esta en `stickers-del-pase.md`.

---

## 144. La placa del marcador, de borde a borde (2026-09-12)

Jonathan marco en una captura la franja entera de arriba en rojo y la placa en verde: la
queria del tamaño de la franja.

La placa estaba **al lado** del boton de salir, en una fila flex. Eso le robaba los primeros
cuarenta pixeles de la pantalla, que en un telefono es mucho: arrancaba despegada del borde
izquierdo y se veia mas chica de lo que da la pantalla.

Ahora el boton va **encima** de la esquina izquierda de la placa, flotando, y la placa ocupa
el ancho entero.

El unico cuidado: sin mas, el boton caia justo sobre el numero de VOS. Se le dieron 28 px de
aire a los lados del renglon de los marcadores. **En los dos lados**, aunque el boton este en
uno solo: si el aire va solo a la izquierda, los dos marcadores quedan descentrados uno
respecto del otro y se nota.

---

## 145. El doble contra la pared, por fin cruzado (2026-09-12)

Jonathan: *"ve se puso mal el doble"*, con una captura: el doble acostado al lado de su
vecina, tapandola casi entera.

**Es la tercera vez que reporta lo mismo** (§90 y §127 son el mismo bicho). Las dos veces
anteriores se arreglo el caso de la captura; esta vez se midio primero, y resulto que no era
un caso raro: **le pasaba al 11,38% de los dobles**.

### Que estaba mal

Cuando la cadena llega a la pared, el doble no cabe pasando la punta. Para eso existe el
rescate `dobleDobla`. Lo que ofrecia el rescate era esto:

```
. . . . . . . . . . . . . . D D      <- el doble, acostado en la fila de arriba
e f f g g h h i i v v                <- la cadena, acostada tambien
```

El doble quedaba **en la misma direccion que su vecina y justo encima**. El comentario del
codigo decia que el doble tenia que cruzarse, pero el codigo hacia lo contrario: con la punta
horizontal, ofrecia el doble horizontal.

Y no habia forma de salvarlo moviendolo de columna: con la punta pegada a la pared, una ficha
de dos casillas centrada sobre la punta solo puede caer encima de la anterior.

### El arreglo

El doble se queda **perpendicular a la ficha anterior**, y en vez de ir una casilla mas alla
de la punta se planta en la casilla DE la punta, saliendo de lado:

```
. . . . . . . . . . . . . . . D      <- el doble, de pie sobre la punta
e f f g g h h i i j j                <- la cadena
```

Eso es lo que se ve ahora en esa misma posicion (partida de prueba `dob-0`, el doble 5|5).

Hubo que tocar tambien el **dibujo**. `joinOffset` centra el doble sobre la union con su
vecina, que es lo correcto cuando el doble cruza pasando la punta. Aqui las dos se tocan **por
el canto** —la vecina esta en la prolongacion del lado largo del doble— y centrarlo lo corria
ficha y media y lo montaba encima de la cadena. Ahora, si se tocan por el canto, no se centra.

### Medido

| | antes | ahora |
| --- | --- | --- |
| dobles en paralelo con la vecina | **11,38%** | **0,00%** |
| solape medio de esos | 75% | — |
| fichas trabadas | 0,197% de los turnos | 0,179% |

400 partidas, 12.923 dobles jugados. Las trabadas **bajaron**: el arreglo no cerro ninguna
jugada, al reves.

Los 85 tests del motor siguen pasando, incluido el de §127 (`doble contra el borde: entra
doblando, y NUNCA en linea`), que es el que vigila que contra la pared el doble se pueda poner.

### Lo que NO se comprobo a mano

La geometria esta comprobada por simulacion, no jugando hasta una esquina con el dedo: llegar
a una punta contra la pared con un doble en la mano lleva media partida y depende del reparto.
Lo que si se vio corriendo es el juego entero con el motor nuevo, repartiendo y pintando
normal.

---

## 146. Los tres remates de la placa (2026-09-12)

Jonathan, despues de ver la §144: la placa ya era ancha, pero tres cosas no cuadraban.

**1. Que pegue con el borde de la mesa.** Medido en pantalla: la placa iba de 4 a 746 y la
mesa de 0 a 750, o sea cuatro pixeles adentro por cada lado. Era el `px-1` del contenedor.
Fuera: ahora las dos van de borde a borde y comprobado que los numeros coinciden exactos.

**2. El boton de salir, centrado.** Estaba **6,75 px por debajo** del centro de la placa. El
motivo: el boton se centraba sobre el CONTENEDOR, y el contenedor llevaba relleno arriba pero
no abajo, mas el renglon del codigo de sala colgando. Con el relleno igual arriba y abajo, y
el codigo movido adentro, el desfase quedo en **0**.

**3. El codigo de la mesa, debajo del pozo.** Colgaba fuera de la placa, en la franja negra,
donde parecia un numero de version perdido y no el codigo que uno le pasa a un pana. Ahora va
dentro, justo debajo del contador del pozo.

Al meterlo dentro quedaba pegado al filo de abajo, medio comido por el reborde y los
tornillos. Con un poco mas de aire abajo despega: medido, **12 px** de aire y sin pisar el
tornillo.

La placa crecio de 63,5 a 72 px de alto, pero el renglon que colgaba debajo se llevaba 19, asi
que la cabecera entera quedo **mas corta que antes**: la mesa gano sitio.

---

## 147. La foto de perfil que sube el jugador (2026-09-12)

Jonathan: *"pongamos que en el perfil se pueda poner una imagen que el jugador suba, así el
jugador se siente más identificado"*.

Se sube desde el perfil y **se ve en la mesa**: si no la vieran los demas, no identifica a
nadie. Quien no sube ninguna sigue con el retrato dibujado de siempre, que no cambia.

### Donde se guarda, y por que ahi

En la base de datos, en su propia tabla `fotos_de_perfil`, como texto.

- **Archivo en disco, no.** El servidor de produccion borra su disco en cada despliegue: la
  foto se perderia al siguiente cambio. La fila no.
- **Servicio de imagenes tipo S3, tampoco.** Serian claves nuevas, una cuenta nueva y una
  factura nueva para guardar veinte kilos por persona.
- **Columna en `users`, tampoco.** `CREATE TABLE IF NOT EXISTS` corre igual en SQLite y en
  Postgres; agregar una columna a una tabla que ya existe pediria una migracion, y aqui no hay
  ninguna. Ademas es un texto gordo: en `users` lo arrastraria cada consulta de la cuenta.

### El recorte lo hace el navegador, por tres motivos

La pantalla recorta el cuadrado del centro, lo baja a 256x256 y lo pasa a JPEG antes de
mandarlo. Medido con una foto vertical de 900x1200: entra de 25 KB y sale de **5,3 KB**, ya
cuadrada.

1. **El peso.** Una foto de telefono son tres o cuatro megas. Asi sube al instante con mala
   señal.
2. **Los datos escondidos.** Una foto sacada con el telefono lleva dentro la fecha, el modelo
   y **donde se tomo**. Redibujarla en un lienzo tira todo eso. Es la razon principal, no un
   efecto secundario.
3. **El cuadro.** Los retratos son redondos; recortando el centro nadie sale estirado.

### Lo que el servidor NO se cree

Nada de lo de arriba es seguridad: cualquiera puede saltarse la pantalla y llamar a la ruta a
mano (regla 8). El servidor revisa otra vez:

- que venga como `data:image/jpeg;base64,` y nada mas;
- que no pase de 40 KB ya descifrado —y el tope se mira ANTES de descifrar—;
- que los bytes **empiecen y terminen** como un JPEG de verdad, no que lo diga la etiqueta;
- que el tamano leido de la **cabecera del propio JPEG** no pase de 320x320.

La ultima es la que de verdad importa. Un JPEG de dos kilos puede declarar 30000x30000 y
reventar la memoria de quien lo abra: pesa poco, asi que el limite de peso no lo ve. Hay que
mirar la cabecera, y para eso el modelo lee los marcadores del JPEG a mano (unas treinta
lineas, sin dependencias).

**El SVG no entra ni disfrazado.** Un SVG no es una imagen: es un documento, puede traer
`<script>` adentro y se ejecuta al mostrarlo. Si entrara, cualquiera le correria codigo en el
navegador a todos los que se sienten en su mesa.

`npm run test:foto` — 25 comprobaciones, todas sobre eso: que pasa cuando alguien manda texto
pelado, un PNG disfrazado, un SVG, una foto de 60 KB, una bomba de 30000x30000, un JPEG sin
cabecera legible. Y que despues de todos los rechazos no quedo nada guardado.

### La foto NO viaja en el estado de la partida

Se pide por su propia ruta, `GET /api/perfil/fotos?ids=...`, una vez por persona.

El estado de la mesa se manda **entero en cada jugada**. Una foto son unos veinte kilos: en
una mesa de cuatro serian ochenta kilos por cada ficha que alguien pone. Metida ahi, la
funcion se hubiera notado como lentitud y nadie habria sabido por que.

El registro de a quien ya se le pidio va en un `useRef` y no en el estado: si estuviera en el
estado, el efecto dependeria de lo que el mismo escribe y se quedaria dando vueltas.

### Probado con dos personas de verdad

No alcanza con verlo en el propio perfil. Se abrieron dos cuentas, una con foto y otra sin,
se juntaron en una sala privada y **se miro la pantalla de la que no tiene foto**: en el
asiento de enfrente sale la cara subida, y la que no subio ninguna conserva su retrato
dibujado.

### Lo que falta, y hay que decirlo

**No hay forma de denunciar una foto.** La ve todo el que se siente en esa mesa, y hoy lo
unico que se puede hacer con una foto que no deberia estar es borrarla a mano en la base.
Mientras el club sea gente conocida no pasa nada; el dia que entre cualquiera, esto hace falta
antes que despues. La palanca ya existe (`FotoDePerfil.quitar`), lo que falta es el boton de
denunciar y a quien le llega.

## 148. La mesa habla venezolano (2026-09-12)

Raul, del equipo de PrivoyTruco, lo pidio: el juego es venezolano y toda la mesa hablaba en
voseo rioplatense. «Tocá una ficha», «Levantá una», «No podés jugar», «Sos el primero: poné una
ficha en el centro», «vos», «tenés», «querés», «acá». En Venezuela nadie habla asi: se tutea.
Toca, levanta, no puedes, eres el primero, tu, tienes, quieres, aqui.

### Que se cambio

Solo las palabras. Ni el sentido ni el humor de los consejos, ni el layout, ni un color, ni un
tamaño. Cada cambio es un renglon de texto y alrededor no se reformateo nada, para que la mezcla
con lo que otros estan tocando en paralelo (el 2v2, los grises, las fichas WebP, el bot) sea
limpia.

Ejemplos, antes → despues:

- «Tocá una ficha tuya y después el imán azul para ponerla» → «Toca una ficha tuya y después el
  imán azul para ponerla» (el Panita).
- «Sos el primero: poné una ficha en el centro» → «Eres el primero: pon una ficha en el centro».
- «Levantá una · quedan 7» → «Levanta una · quedan 7» (el pozo).
- «No podés jugar. Levantá una ficha del montón.» → «No puedes jugar. Levanta una ficha del montón.»
- «Por qué no podés jugar» → «Por qué no puedes jugar».
- «JUGÁ» → «JUEGA» (el reloj del turno).
- «¿Salir? La mesa se cierra y perdés lo jugado.» → «... y pierdes lo jugado.»
- «Todavía no dijo nada nadie. Empezá vos.» → «Todavía nadie ha dicho nada. Empieza tú.» (chat global).
- «Escribí algo...» → «Escribe algo...» (los dos chats).
- «No tenés avisos todavía. Acá van a llegar...» → «No tienes avisos todavía. Aquí van a llegar...».
- «Entrá, ganá la llave y llevate los puntos» → «Entra, gana la llave y llévate los puntos» (torneos).
- «Dominó venezolano, doble seis. Sentate en la mesa.» → «... Siéntate en la mesa.» (portada).
- «Jugá 2 partidas», «Ganá un torneo», «Saludá en el chat global», «Traé 3 panas» → «Juega»,
  «Gana», «Saluda», «Trae» (las misiones del pase).
- «No podés retarte a vos mismo» → «No puedes retarte a ti mismo» (servidor, retos).
- «Iniciá sesión para escribir» → «Inicia sesión para escribir» (servidor, chats).
- «pasás de ronda» → «pasas de ronda» (aviso del torneo; `test-torneos.js` buscaba ese titulo
  y se actualizo con el).

«Pana» se queda: es venezolano. El «Dale pues» del bot Chuo tambien.

### La placa del marcador

Decia VOS y ELLOS. Ahora:

- **1 vs 1** (con persona o con bot): los NOMBRES, el tuyo a la izquierda y el del rival a la
  derecha, en mayusculas. Si un nombre pasa de 9 caracteres se recorta y se le pone «…», para
  que no pise el centro de la placa en un telefono.
- **2 vs 2**: NOSOTROS y ELLOS.

Los nombres salen del estado de la partida (`players`, cada uno con su `seat`): el mio es
`miJugador` y el rival en 1 vs 1 es el unico otro asiento. `Tablero` recibe los dos rotulos ya
resueltos (`myLabel`, `theirLabel`) y no sabe nada de equipos.

### Numeros

84 cadenas de texto en 33 archivos (24 del frontend, 9 del backend), mas la placa
(`Tablero.jsx` y `Game.jsx`). `npm run build` del frontend pasa. Un grep de voseo (vos, sos,
podés, tenés, querés, levantá, jugá, tocá, poné, acá y las demas formas) sobre `frontend/src` y
`backend/src` da cero en textos de usuario.

### Lo que se dejo a proposito

Quedan formas de vos en **comentarios de codigo**, que no ve nadie: `Board.jsx` («cuando te
toca a vos»), `Game.jsx` («cuando no podés jugar», «sos el equipo 2»), `Landing.jsx`,
`Perfil.jsx`, `MesaIcono.jsx`, `AvisoDeTorneo.jsx`, `Pase.jsx` («traé a tus panas») y
`DominoGame.js`. Y en `backend/src/game/test.js` el jugador de prueba se llama «Vos»: es un
test, no le llega a nadie.

### Lo que NO se comprobo

Se construyo el frontend y se paso el grep; no se abrio el juego a jugar una partida. La placa
con nombres se razono sobre el estado que ya traia la mesa, no se vio pintada.
---

## 149. Rótulos que se leen y la solapa a la vista (2026-09-12)

Raúl revisa la mesa por capturas en el teléfono, y tiene una regla: **nada de gris flojo sobre
fondo oscuro**. Un texto al 40 % de opacidad se ve bien en un monitor grande y en un teléfono
de 375 px al sol no se ve. La respuesta cuando algo se ve tenue es subir tono y peso, no
achicarlo. Y la solapa de los controles (sonido, color de mesa, consejos, gestos, chat) era un
chevron de 13 px en una lengüeta de 16 px de ancho pegada a la baranda: nadie la descubría.

### Los tonos, antes y después

Todo lo de la mesa (`Game.jsx`, `Tablero.jsx` y los componentes de `components/game/`). El
patrón es siempre el mismo: cuerpo en crema con peso 500, rótulos chiquitos en mayúscula con
peso 600 o 700 y espaciado entre letras. Crema es `domino-cream` (#f4ecd8) y crema apagada
`domino-cream-dim` (#c9bfa3); ninguna de las dos lleva opacidad.

| Dónde | Antes | Después |
|---|---|---|
| "TU MANO · 7" sobre la mano | `cream/50`, peso 400 | crema, peso 700, espaciado 0,2 em |
| "ESPERANDO" | `cream/40`, peso 400 | crema, peso 700 |
| "TU TURNO" | esmeralda 300, peso 700 | igual, ya era brillante |
| "Arrastra una ficha válida a la mesa" | `slate-500` cursiva, 10 px | crema apagada, peso 500, cursiva, 11 px |
| Rótulo "POR QUÉ NO PODÉS JUGAR · EXTREMOS 2 Y 6" | `slate-500`, peso 400 | crema, peso 600, espaciado 0,18 em |
| Filas de ese panel (motivo por ficha) | `slate-400` | crema apagada, peso 500; la jugable en esmeralda 300 |
| Código de la sala en la placa | `amber-100/40`, peso 400, pelado sobre la madera | cartucho oscuro (el mismo degradado de los demás), dorado `accent-bright` (#f5cf5c), peso 700, espaciado 0,24 em |
| "SIN POZO" en la placa | `amber-100/45` | `amber-100/85`, peso 600 |
| "compa" bajo el compañero (2v2) | `sky-200/70`, 9 px, peso 400 | `sky-200`, mayúscula, peso 600, espaciado 0,16 em |
| Número de fichas del rival | `cream/60`, 9 px | crema, 10 px, peso 700 |
| "PUNTOS" y "Quedaste #N" en el cierre | `cream/40` y `cream/60` | crema apagada, 600 y 500 |
| Desglose de la ronda (`RoundBreakdown`) | `slate-300/400/500` | crema y crema apagada, 500 y 600 |
| Chat de la mesa | cabecera `accent/80`, nombres `cream/85`, mensajes `cream/80`, vacío `cream/45` | dorado pleno, crema, crema 500, crema apagada 500 |

El código de la sala merecía atención aparte: es lo que uno le dicta a un pana para que entre,
y estaba en crema al 40 % sobre la veta clara del nogal, o sea invisible. Sobre madera clara
lo que salva un texto es fondo oscuro, no más opacidad: por eso va en un cartucho como el de
"Ronda 1 · a 100". El cartucho **no lleva relleno vertical** para que la placa no crezca:
medida antes y después, sigue en **72 px** de alto.

`Hud.jsx`, `Scoreboard.jsx`, `PlayerInfo.jsx` y `OpponentHand.jsx` se alinearon con el mismo
criterio aunque hoy no se pintan en la mesa del teléfono (van en el bloque `hidden` o no se
usan): si algún día vuelven, que vuelvan bien.

### La versión, solo en desarrollo

El "v0.0.54" de la esquina de abajo sirve para saber si el navegador corre el build nuevo o
uno cacheado. Eso es para nosotros, no para el que juega: ahora `Version.jsx` devuelve nada si
no es `import.meta.env.DEV`. Comprobado en el bundle de producción: la cadena "0.0.54" no
aparece.

### La solapa: una pestaña que se ve

La lengüeta pasó de 16 x 76 px a **44 x 64 px**, que además es la zona de toque mínima. Va
pegada al borde izquierdo de la mesa, con fondo oscuro translúcido (`domino-dark` al 85 %
con desenfoque), borde de 2 px en dorado `domino-accent` y esquinas redondeadas solo a la
derecha, para que se lea como una pestaña que sale de la baranda.

- **Cerrada** muestra un icono a color de ajustes. Regla del repo (CLAUDE.md 1.1): los iconos
  de la mesa son de Fluent Emoji a color, nunca a mano ni de lucide. Se agregó `ajustes:
  'control-knobs'` a la lista `QUIERO` de `tools/extraer-iconos.cjs` y se volvió a correr:
  `iconosColor.js` pasó de 7 a 8 iconos. Se eligió `control-knobs` y no `gear` porque el
  engranaje de ese set es gris pelado y no se ve "a color".
- **Abierta** muestra una flecha hacia la izquierda (dorado brillante, trazo grueso) que dice
  "guárdame", y los botones de siempre se despliegan en columna a su derecha. Abre y cierra
  la misma solapa que antes; no cambió nada de lo que hay adentro.

**Dónde va a lo alto.** A media altura de lo que se ve de la mesa, descontando la mano:
medido, el centro de la pestaña cae a 286 px del borde de arriba de una mesa cuyo paño
visible mide 572. En 2v2 el rival de la izquierda vive justo a media altura, así que ahí la
pestaña sube al primer cuarto (centro a 183 px de 730); con la columna abierta tampoco lo
pisa. No tapa la cadena en ningún modo: la cadena nunca llega a menos de 50 px del borde en
1v1 ni de 90 en 2v2.

El contenedor de la pestaña ocupa toda la altura del lado izquierdo pero no captura toques
(`pointer-events-none`); solo la pestaña, los botones y el selector de paño los reciben. El
botón de salir, arriba a la izquierda sobre la placa, no se tocó.

### Comprobado

Con el guion de puppeteer a 375 px, 1v1 y 2v2 contra bots: los rótulos de la mano, el panel
de "por qué no", el desglose de la ronda, la etiqueta "compa", los contadores de los rivales,
el código de la sala y la pestaña cerrada y abierta. `npm run build` pasa.
---

## 150. Las placas del 2 vs 2 a las esquinas de arriba (2026-09-12)

Estaba anotado como pendiente en `contexto/PROMPT-NUEVO-CHAT.md`: en 2 vs 2 las fichas de la
mesa salen chiquitas, y "ponerlas en las esquinas de arriba las devolveria". Se hizo.

### Que habia

En 2 vs 2 los dos rivales iban a los COSTADOS del paño, a media altura, y para que la cadena
no les creciera encima el rectangulo de juego cedia **60 px por cada lado**
(`MARGEN_MESA.lados`). En un telefono de 375 el paño mide 331 de ancho: 120 px de 331 se
iban en dos placas de 58. La cadena vivia en **211 x 438**.

Medido en 375x812 con bots, ANTES:

| | 1 vs 1 | 2 vs 2 |
|---|---|---|
| Rectangulo de la cadena | 315 x 436 | 211 x 438 |
| Primera ficha (parada) | 35 px de ancho | 35,2 px |
| Con 4 fichas en la mesa | 24,2 (cadena acostada) | 35,0 (cadena parada) |
| Con 12 fichas | — | 20,1 px |

Y dos choques mas, los dos en el reparto:

- **"Sos el primero: pone una ficha en el centro"** iba clavado a 56 px del borde de la mesa
  (`top-14`), o sea de 153 a 183 de la pantalla. La placa del de enfrente termina a 175: la
  pastilla caia **encima de las fichas boca abajo y del "compa"** del compañero. Se leia
  montado.
- **"Esperando que comience la ronda..."** se centraba en el paño ENTERO (424 a 470), justo
  a la altura de las placas de los costados (411 a 483): les pasaba por encima a las dos.

### Que se hizo

**1. Los rivales, a las esquinas de arriba.** El compañero sigue arriba en el centro; el
rival de la izquierda va arriba a la izquierda (`left-5 top-2`) y el de la derecha arriba a
la derecha (`right-5 top-2`). Misma placa de siempre: retrato de 38, nombre debajo en un
renglon, abanico boca abajo con el numero, punto verde de turno. Las tres en una fila:

| Placa | x | ancho | alto |
|---|---|---|---|
| Rival izquierdo | 20 a 78 | 58 | 71,5 |
| Compañero | 144,5 a 230,5 | 86 | 71,5 |
| Rival derecho | 297 a 355 | 58 | 71,5 |

Suman 202 px de los 355 que da la pantalla, con 66,5 px de aire entre una y otra. La de la
izquierda arranca en 20 para no pisar la lengueta de los controles (que va de 0 a 16).

**2. "compa" en la fila de las fichas, no debajo.** La placa del compañero llevaba un cuarto
renglon ("compa") y media 84,8 de alto contra 71,5 de las otras: con las tres en fila, ese
renglon de mas bajaba el techo de la cadena para todo el mundo. Ahora va al lado del numero
(`7 compa`) y la placa se ensancha a 86 px para que quepa. Las tres miden lo mismo y la fila
termina a **54,5 px del paño**.

**3. Los margenes, en 2 vs 2.** `lados: 60` desaparece; los dos costados quedan con el puro
borde (8 px), y arriba se reserva `arribaConEsquinas: 56` (la fila mas 1,5 de aire). En 1 vs
1 no cambia nada: arriba 44, lados 8, igual que estaba. Los dos consumidores (`Board` y
`PozoEnLaMesa`) reciben el mismo objeto `margenesMesa`, que antes iba repetido a mano.

| | antes | despues |
|---|---|---|
| Arriba | 44 | 56 |
| Lados | 60 y 60 | 8 y 8 |
| Rectangulo de la cadena | 211 x 438 | **315 x 426** |

**4. Los carteles, al centro del RECTANGULO UTIL.** "Sos el primero" y "Esperando que
comience la ronda" ya no se posicionan a ojo respecto del paño: van dentro del paño con
`top/right/bottom/left` iguales a los margenes que recibe `Board`, centrados ahi. Los
margenes son exactamente lo que las placas y la mano NO ocupan, asi que ahi adentro no pisan
a nadie, en ningun modo. La pastilla sigue siendo una linea fina y sigue desapareciendo en
cuanto agarras una ficha (§127): los imanes nunca quedan detras de ella.

**5. Burbujas de chat y gestos.** Con los rivales en las esquinas, sus burbujas salen por
debajo de la fila de placas (`top-[84px]`, la fila termina en 79,5) y no a media altura; en
2 vs 2 la del compañero baja tambien a 84 (en 1 vs 1 sigue en `top-16`). Los stickers de los
rivales salen en su esquina (`left-4 top-8` / `right-4 top-8`), como el del de enfrente sale
en la suya. Esto se dejo por geometria: con bots no hay chat ni gestos ajenos que disparar.

### Medido despues

| | 1 vs 1 | 2 vs 2 antes | 2 vs 2 despues |
|---|---|---|---|
| Rectangulo de la cadena | 315 x 436 | 211 x 438 | 315 x 426 |
| Primera ficha (parada) | — | 35,2 | **40,1** |
| Con 4 fichas en la mesa | — | 35,0 | **40,1** (+15 %) |
| Fila de placas termina en | 163,5 | 174,8 (la de arriba) | 161,5 |
| "Sos el primero" | 361 a 391 | 153 a 183 (montado) | **366 a 396** |
| "Esperando..." | 364 a 410 | 424 a 470 (sobre los costados) | **370 a 416** |

Con 4 fichas la cadena todavia va parada y ahi manda el alto, que apenas cambio: por eso el
+15 % y no mas. La ganancia grande llega cuando la cadena dobla: el ancho util paso de 211 a
315 (+49 %), y con la mesa ancha la cadena se tiende como en 1 vs 1 en vez de bajar en
palo. Con 15 fichas se midio 17,5 px de celda; con el rectangulo viejo ese mismo tendido
hubiera dado 11,7. No hay medida "antes" con las mismas 15 fichas: cada partida arma su
cadena.

En 1 vs 1 la placa del rival (158,5; 92; 58 x 71,5) y la lengueta de los controles (0; 96)
dan las mismas coordenadas antes y despues, y los margenes son los de siempre. Lo unico que
se movio en 1 vs 1 son los dos carteles del reparto, que ahora se centran en el rectangulo
util y no en el paño: "Sos el primero" tambien ahi pisaba el abanico del rival (la placa
termina en 163,5 y la pastilla arrancaba en 140).

### Lo que NO se comprobo a mano

Las burbujas de chat y los gestos de los rivales en 2 vs 2 se colocaron por medida, no
mirandolos: con bots en la mesa nadie chatea ni manda stickers. Y la lengueta de los
controles, cuando se abre, tapa la placa del rival izquierdo mientras esta abierta; se cierra
y vuelve. Antes tapaba paño vacio.
---

## 151. Las fichas en WebP, precargadas y en caché (2026-09-12)

### Que habia

Cada pinta de fichas son 28 PNG en `frontend/public/tiles*/`, de 100 a 200 KB cada uno:
clasicas 3,9 MB, hueso 2,9 MB (la de fabrica), marmol 3,5, oro 4,6, jade 4,9, madera 5,5.
24,8 MB en total. Los carteles de fin de ronda (`frontend/public/carteles/*.png`) tambien
eran PNG, de unos 210 KB cada uno.

Se bajaban una por una, la primera vez que cada ficha aparecia en la mesa: no habia precarga
(`new Image` no estaba en ningun lado) y el service worker guardaba solo `/` (§98). Medido en
la primera mano contra el bot, en un telefono de 375 y con el navegador limpio: **1,43 MB de
fichas** para ver siete fichas en la mano. En una red 3G rapida emulada (1,6 Mb/s, 150 ms de
ida) la mano tardaba **11,3 s** en verse completa. Y la segunda mesa volvia a pedir las quince
al servidor, aunque fuera solo para que le contestara "no cambio" (304).

### Que se hizo

1. **Un WebP al lado de cada PNG.** Con Pillow, calidad 85, `method=6`, con el canal alfa tal
   cual (`frontend/scripts/generar-webp.py`, `npm run webp`). **Los PNG no se tocaron**: los
   recorto Jonathan a mano, siguen en su sitio y son el respaldo. Bytes por carpeta, PNG →
   WebP:

   | Carpeta | PNG | WebP | Queda |
   |---|---:|---:|---:|
   | tiles (clasicas) | 3.903.223 | 423.208 | 11% |
   | tiles-hueso | 2.945.515 | 125.826 | 4% |
   | tiles-marmol | 3.473.687 | 180.122 | 5% |
   | tiles-oro | 4.555.152 | 439.018 | 10% |
   | tiles-jade | 4.880.114 | 239.920 | 5% |
   | tiles-madera | 5.500.813 | 567.666 | 10% |
   | carteles | 655.301 | 106.904 | 16% |
   | **Total** | **25.913.805** | **2.082.664** | **8%** |

   Comprobado a ojo, PNG y WebP lado a lado y con una esquina ampliada tres veces: los
   puntos, el relieve y la filigrana del marco estan iguales. La transparencia es identica
   pixel por pixel, y en los pixeles visibles la diferencia media con el PNG es de 1 a 3
   sobre 255 en las fichas (ningun pixel pasa de 33) y de 3 en los carteles.

2. **`Tile` pide `.webp` y cae al `.png` una sola vez** si el navegador no lo carga
   (`onError`). Lo mismo en `CargandoFichas`, en las muestras del selector de pinta y en el
   `Cartel` de fin de ronda, que ya caia al texto y ahora va WebP → PNG → texto. La ruta se
   arma en un solo sitio, `rutaDeFicha` en `MesaTheme.jsx`, y `VERSION_FICHAS` subio a 6
   para que nadie mezcle versiones.

3. **Precarga.** Al entrar a la mesa (`Game.jsx`, junto a `prepararSonidos`),
   `precargarPinta(carpeta)` pide las 28 fichas de la pinta activa con `new Image()`, sin
   bloquear nada: el navegador las baja por detras. Si el jugador cambia de pinta, se
   precarga la nueva. Cada pinta se pide una vez por sesion.

4. **Cache de assets en el service worker.** Una cache aparte, `domino-assets-v1`,
   cache-first para `/tiles*/`, `/carteles/`, `/sonidos/`, `/avatares/` e `/iconos/`; solo
   guarda respuestas 200 del mismo origen, y al activarse borra las caches de versiones
   anteriores. **La pagina y el JS siguen exactamente como estaban (§98):** eso no se guarda,
   a proposito, para que nadie se quede con una version vieja del juego. Las imagenes y los
   sonidos si se pueden guardar porque no cambian con cada despliegue, y cuando cambian,
   cambian de direccion (`?v=N`).

### Por que

Una ficha de domino no necesita 140 KB. El PNG guarda cada pixel sin perder nada, que es
lo que uno quiere para editar, pero no para servir: el WebP con perdida a calidad 85 deja el
dibujo indistinguible a tamaño real (una ficha en la mesa mide 64x32) con un 4% a un 11% del
peso. Y con las fichas pesando 5 a 20 KB, pedir las 28 de golpe al entrar ya no cuesta nada
(126 KB la pinta de fabrica), asi que la mano nunca muestra huecos esperando un dibujo. La
cache del service worker es el tercer tramo: la segunda mesa no pide ni una ficha.

### Medidas

Puppeteer, mesa 1 vs bot, telefono de 375, con el build publicado y `vite preview`. No se
midio con `vite dev` porque el service worker se registra solo en la version publicada (§98),
y sin el no hay cache que medir. Lo que "salio a la red" se leyo desde el propio worker
(sesion CDP sobre el), porque la pagina ve todo como "lo dio el service worker", lo haya
bajado o no.

| | Antes | Despues |
|---|---|---|
| Primera entrada: fichas que salieron a la red | 12 PNG (mas 2 revalidaciones) | 35 WebP: las 7 de la mano, las 5 de la espera, el logo y las 28 de la precarga |
| Primera entrada: bytes de fichas por la red | 1.428.248 | 210.290 (15%) |
| Segunda entrada: peticiones de fichas a la red | 15 (14 revalidaciones 304 y 1 ficha nueva de 104 KB) | **0** (las 35 salen de `domino-assets-v1`) |
| 3G rapida emulada: mano completa, primera entrada | 11,3 s | 3,0 s |
| 3G rapida emulada: mano completa, segunda entrada | 1,4 s | 0,7 s |

En local sin freno las dos versiones tardan lo mismo (unos 200 ms): la ganancia esta en la
red, que es donde estan los jugadores.

### Lo que hay que saber

- **Si se rehace una pinta o un cartel, hay que correr `npm run webp`** ademas de subir
  `VERSION_FICHAS`. El juego pide primero el WebP: si queda uno viejo al lado del PNG nuevo,
  se ve el dibujo viejo.
- Lo que se pide SIN `?v=` desde esas carpetas (el logo, las muestras del pase y de la
  tienda, los iconos, los sonidos) se queda en la cache hasta que cambie el nombre de
  `CACHE_ASSETS` en `sw.js`. Si cambia uno de esos sin cambiar de nombre de archivo, subir a
  `domino-assets-v2`.
- Quedaron en PNG, fuera de la mesa: el logo (`Logo.jsx`, dos fichas clasicas de 140 KB en
  cada pagina), las muestras del pase (`Pase.jsx`) y de la tienda (`Tienda.jsx`). Son un
  cambio de una linea cada uno, cuando se toque esos archivos.
- La espera de la mesa (`CargandoFichas`) pinta cinco fichas clasicas aunque la pinta
  elegida sea otra, porque se dibuja fuera del `ContextoFichas.Provider`. Antes eran 700 KB de
  mas; ahora son 75 KB. Moverla adentro del proveedor es cosa del armado de `Game.jsx`.
- `frontend/public/banner-berkana.png` (7,1 MB) y `banner-publicidad.png` (6,3 MB) no los
  pide nadie: el codigo pide los `.webp`. Van en cada build. Se quedan hasta que Jonathan
  decida.
---

## 152. El bot piensa un tiempo variable (2026-09-12)

### Lo que habia

`BOT_DELAY_MS = 3000`, un solo numero para todo. Cada bot dormia tres segundos antes de
jugar, daba igual que tuviera siete fichas para elegir o que solo pudiera pasar. En 2v2
hay tres bots entre una jugada de la persona y la siguiente: **nueve segundos por vuelta,
siempre iguales**. Medido por socket contra un servidor limpio: 9,03 s de media, minimo
9,03, maximo 9,05. Un metronomo.

La jugada de la persona ya es instantanea desde §118 (`HUMAN_DELAY_MS` en cero); lo que
quedaba lento era esperar a la maquina.

### Lo que se hizo

En `backend/src/RoomManager.js`, `playBotTurns` ya no duerme un numero fijo: le pregunta
a `_botThinkMs` cuanto pensar, y eso depende de lo que el bot tenga que decidir.

| situacion | espera |
|---|---|
| tiene varias jugadas posibles | entre 1100 y 2100 ms, uniforme |
| una sola jugada, o solo puede pasar o robar | entre 500 y 800 ms |
| la primera ficha de la ronda | entre 1500 y 2400 ms |

`BOT_DELAY_MS` por variable de entorno **sigue funcionando, pero como tope**: si esta
puesta, ningun tiempo la supera. Las pruebas que la ponen en `0` siguen corriendo una
partida entera en segundos (`test-e2e-bot.js` en 1v1bot y 2v2bots, comprobado).

El azar de la espera es `Math.random()`, y esta bien que lo sea: es la capa de
transporte, no el motor. El motor sigue sin relojes y sin azar propio.

**La estrategia del bot no se toco.** Esto es solo cuanto tarda, no que ficha elige.

### Por que estos rangos

Una persona no piensa lo mismo para poner la unica ficha que le sirve que para elegir entre
cinco. Con tres bots en la mesa, si los tres pensaran lo mismo la espera seguiria siendo
una suma fija; al depender de la situacion, las vueltas salen distintas y la mesa se
siente viva en vez de programada. Y la primera ficha de la ronda se piensa un poco mas
porque es la unica decision sin nada en la mesa que la apure.

### Medido antes y despues

`backend/src/medir-vuelta-bots.js` levanta un servidor propio en `:4100` con una base
aparte (`data-prueba.db`, se borra al terminar), se registra, arma un 2v2bots, juega la
primera jugada valida y cronometra cuanto tarda en volverle el turno. Diez vueltas cada
vez, dentro de la misma ronda.

| | media | minimo | maximo |
|---|---|---|---|
| antes (3000 fijos) | 9,03 s | 9,03 s | 9,05 s |
| despues (rangos) | 3,89 s | 2,70 s | 5,24 s |
| tope `BOT_DELAY_MS=0` | 0,05 s | 0,04 s | 0,05 s |
| tope `BOT_DELAY_MS=1000` | 2,69 s | 2,32 s | 3,03 s |

La meta era bajar de ~8 s a ~4,5 s; quedo en 3,9 porque en una vuelta de tres bots casi
siempre alguno tiene una sola jugada o pasa, y ese piensa poco.

### La fuerza de los bots, medida de nuevo

De paso se reviso como esta programado el bot (`packages/domino-engine/src/bot.js`) y se
dejo una herramienta para medir su fuerza cuando haga falta:
`packages/domino-engine/tools/medir-fuerza.mjs [partidas] [puntos]`. Juega cada cruce en
1v1 con pozo y en 2v2 sin pozo, alternando en que equipo cae cada dificultad para que no
pese quien sale. El bot solo recibe `viewFor`, igual que en el servidor.

Victorias del primero, 1000 partidas por cruce, a 50 puntos (margen del 95%: unos 3 puntos):

| cruce | 1v1 con pozo | 2v2 sin pozo |
|---|---|---|
| hard (maestro) vs easy (facil) | 64,5% | 62,3% |
| hard vs normal | 57,1% | 55,7% |
| normal vs easy | 60,7% | 61,1% |
| easy vs easy (control) | 49,9% | 51,1% |

`INTEGRATION.md` decia 69 / 51 / 61 para el 2v2 con 200 partidas (margen de unos 7
puntos): entra dentro del error, salvo que el maestro le gana al normal mas de lo que decia
(56 contra 51). La escalera de §35 (150 partidas) daba numeros mas altos por lo mismo:
con pocas partidas el margen es grande.

A 100 puntos, que es a lo que se juega de verdad, la diferencia se nota mas porque la
partida es mas larga y el azar del reparto pesa menos (500 partidas por cruce, margen de
unos 4 puntos): hard vs easy 70,8% en 1v1 y 71,0% en 2v2; hard vs normal 60,6% y 59,4%;
normal vs easy 60,6% y 67,4%; easy vs easy 47,4% y 48,8%.

### Lo que se vio y NO se toco (para decidir aparte)

- **En 2v2bots los tres bots juegan con la fuerza del primero.** `startGame` guarda
  `room.botDifficulty = elegidos[0].difficulty` y `playBotTurns` se la pasa a los tres,
  aunque cada jugador tenga su propia `difficulty` y sus estrellas en pantalla. La Zurda
  y Nano en la misma mesa juegan igual. El arreglo es una linea
  (`current.difficulty`), pero cambia cuanto gana la casa: se mide antes.
- **El bot no recuerda a que numero paso cada uno.** Ve los pases en `events` (asiento y
  cuantos van), pero no mira con que puntas estaba la mesa en ese momento, asi que no
  deduce que a ese jugador le falta ese numero. Es lo que mas lo separa de alguien que
  juega bien en parejas. Se propone con su A/B en el informe de esta sesion.
- En `scorePlay`, el castigo de 4 puntos cuando al companero le quedan dos fichas o
  menos se aplica a todas las jugadas por igual: no cambia ninguna decision.

## 153. El iman de bronce, con tres piezas para elegir (2026-09-12)

El iman era un circulo azul electrico con un emoji de iman adentro, y era lo unico en la
mesa que no era verde, madera ni oro. Raul (PrivoyTruco) lo vio en la auditoria en telefono
y lo mando liquidar: "traeme tres opciones ya desarrolladas".

Las tres son piezas generadas con IA (regla 1.1: nada dibujado a mano), sobre un fondo
magenta liso para poder recortarlas, y guardadas a 128 px en WebP en `public/imanes/`:

- **tachuela**: cabeza de tachuela de bronce martillado, la de una baranda de cuero.
- **punto**: un punto de domino de oro pulido, media esfera con brillo.
- **sello**: un medallon de bronce con una ficha grabada.

El recorte del magenta necesito dos pasadas: la primera dejaba un filo rosado por la
sombra tenida, y a 30 px se veia. Se erosiona la mascara 35 px sobre la imagen de 2048
y ademas se descarta cualquier pixel con tinte magenta. Comprobado: cero pixeles rosados
visibles en las tres.

El componente es `Iman.jsx`. La pieza late despacio mientras espera (escala 1 a 1,12 en
1,6 s) con un aro de oro que se abre, y se planta quieta, mas grande y con halo cuando la
ficha ya esta imantada. Ademas **la silueta punteada entera recibe el toque**, no solo la
pieza: 24 px era poco para un dedo.

Mientras se decide, la pieza se elige con `?iman=tachuela|punto|sello` en la URL (queda
guardada en el navegador). Cuando Raul y Jonathan elijan, las otras dos y el interruptor
se van. Por defecto sale la tachuela.

## 154. El cartel de cierre, como el del club (2026-09-12)

El panel de fin de ronda decia "¡Gano el equipo 2!" en un 1 contra 1 y "Un jugador se
quedo sin fichas" sin decir quien. Y era un cuadro plano. Raul pidio copiarse del cierre
de mano de privoytruco.com.

`CartelDeRonda.jsx` es ese cartel con los MISMOS valores del RoundEndCard y la
VictoryCeremony del truco: fondo negro verdoso (#10231B a #080d0a), borde de oro con halo,
Cinzel en el titulo (se agrego la fuente a index.html; los rotulos van en Inter porque en
Cinzel el 1 parece una I romana y "RONDA 1" se leia "RONDA I"). Tres bloques en orden:

1. Quien gano y por que, con nombres: "Gano La Comadre" / "Ganaron Yubi y La Zurda" /
   "Ganaste" / "Ganamos", y debajo "La Comadre se quedo sin fichas" o "Se tranco y tenias
   menos puntos".
2. Con que fichas: las manos que quedaron y sus puntos. Los puntos del que perdio siguen
   volando hasta el total (`PuntosQueVuelan` y `useNumeroQueSube` quedaron iguales).
3. Como va la partida: dos plaquetas, la del que va ganando en oro, con el "+N" de esta
   ronda y "Faltan N para 100".

Regla de color del club: VERDE es lo que ganaste tu; ORO es quien va ganando y el marco;
CREMA es lo de ellos, que se informa y no se castiga. En 1v1 las plaquetas dicen "Tu" y el
nombre del rival; en 2v2, "Nosotros" y "Ellos".

El mismo cartel sirve para el fin de la partida (`modo="partida"`): el arte de "ganaste"
si ganaste, y si no, "Gano El Tigre" con las plaquetas finales y el cambio de ranking.

Dos cosas mas que salieron de la misma captura:

- El grito de fin de ronda ahora lleva el nombre debajo ("¡Domino!" y abajo "Gano La
  Comadre" en crema, o "Ganaste" en oro). `tituloDeRonda` recibe los jugadores.
- Al ganar por domino con la mano vacia, `canPlay` es falso y el servidor manda
  `canDraw`: el pozo desparramado y el panel de "por que no puedes jugar" salian ENCIMA del
  grito. Los dos se apagan cuando la ronda no esta en `playing`.

El anuncio (`TopBanner`) que iba dentro del panel se quito de ahi: en la plataforma la
publicidad es cosa de la casa, no de la mesa. El componente sigue existiendo.

`RoundBreakdown.jsx` ya no lo usa nadie; se deja para que el diff sea legible y se borra
en la limpieza siguiente.

## 155. Los avisos de la mesa, con tres familias para elegir (2026-09-12)

La mesa tenia dos sonidos (el clac y el clac del pozo, grabaciones CC0) y uno fabricado
con osciladores para robar, que es justo el camino que la seccion 124 descarto. Faltaban
los momentos que la gente espera oir: te toca, ronda ganada, ronda perdida, tranque y la
ficha que no va.

`soundEffects.js` tiene ahora `sonar(aviso)` con seis avisos y TRES familias, para que
Raul elija oyendolas en el telefono (pagina `/sonidos`, solo en desarrollo):

- **fichas**: solo las dos grabaciones, repetidas y afinadas (te toca = un clac agudo y
  bajito; ronda ganada = cuatro clacs subiendo; perdida = dos clacs graves; tranque = tres
  clacs iguales; no va = un golpe sordo del pozo; robar = dos golpes del pozo). Es la que
  sigue al pie la conclusion de la 124: lo grabado suena a ficha.
- **madera**: golpes secos de madera sintetizados, la familia del Ludo de la casa.
- **club**: campanitas suaves de dos parciales.

La eleccion se guarda en el navegador (`?sonidos=fichas|madera|club` o el boton de la
pagina). Por defecto suena `fichas`. Cuando Raul elija, las otras dos se van.

Donde suenan: "te toca" cuando el turno pasa a ser tuyo con la ronda viva; el resultado
120 ms despues de que arranca el grito (con tranque, primero el tranque y el resultado a
los 520 ms); "no va" al tocar una ficha apagada en tu turno (`Hand` avisa con `onNoVa`);
"robar" reemplaza al oscilador de antes. Todo va envuelto en try/catch: el sonido jamas
puede romper una jugada.
---

## 156. Los puntos se llaman puntos (2026-09-12)

En el cartel de cierre decia "13 pips". Raul: en la mesa venezolana eso se dice
"puntos" o "tantos", y "pips" suena a manual. Se cambia en lo que ve el jugador; en
el motor y en el estado el campo sigue siendo `pips`, que es su nombre tecnico.

`RoundBreakdown.jsx` se borra: desde la seccion 154 no lo usaba nadie.

## 157. Las placas del 2 vs 2 vuelven a los costados (2026-09-12)

Raul vio la seccion 150 en el telefono y la deshizo: "las placas de los rivales estan
bien donde estaban, donde deben ir si estan sentados en una mesa". Tiene razon en lo
que importa: en una mesa de domino los rivales estan a los lados, y el dibujo tiene que
decir eso antes que ganar pixeles.

Lo que se conserva de la 150: la placa compacta (avatar de 40, nombre debajo, fichas
boca abajo con el numero), la etiqueta "compa" en la fila de las fichas, y los avisos
"Eres el primero" y "Esperando que comience la ronda" centrados en el rectangulo util
de la cadena, que era el choque real.

Lo que cambia: la placa del rival mide 52 px en vez de 58, y el margen lateral pasa de
60 a 52. En un telefono de 375 el rectangulo de la cadena pasa de 211 a 227 px de ancho
(con las esquinas eran 315). Con cuatro fichas en la mesa, la ficha midio 31,3 px
en la partida de prueba; la forma de la cadena cambia en cada partida, asi que ese numero
es solo una referencia.

## 158. El bot piensa un segundo (2026-09-12)

Raul probo la seccion 152 y pidio menos: "bajalo a 1 segundo". Los rangos quedan asi:
con varias jugadas, entre 850 y 1150 ms; con una sola o solo pasar, entre 400 y 600 ms;
la primera ficha de la ronda, entre 1000 y 1300 ms. Sigue variando cada vez para que no
suene a metronomo, y `BOT_DELAY_MS` sigue siendo el tope para las pruebas.

En 2 vs 2 con tres bots la vuelta queda alrededor de tres segundos.

## 159. El iman es un efecto sobre la casilla, no una pieza (2026-09-12)

Raul vio en el telefono las tres piezas de bronce de la seccion 153 y las tumbo: "una
cochinada, vamos a hacer algo que no contamine la mesa; en vez de imagenes, efectos que
indiquen que puede tocar ahi y poner la pieza". Tiene razon: cualquier cosa puesta encima
del paño compite con las fichas.

Se borran las tres piezas (`public/imanes/`) y `Iman.jsx` pasa a ser el EFECTO sobre la
silueta punteada de la casilla, sin ninguna imagen. Tres para elegir, con `?iman=`:

- **respira**: la silueta se enciende y se apaga despacio en oro (1,6 s).
- **fantasma**: tu ficha, al 50 %, flotando en la casilla donde caeria (1,8 s).
- **onda**: un anillo de oro nace en el centro de la casilla y se abre (1,4 s, dos anillos
  desfasados).

En los tres, la silueta entera recibe el toque, y cuando la ficha arrastrada ya esta
imantada la silueta se planta en oro solido. Se grabaron los tres en movimiento con
puppeteer (16 cuadros a 110 ms) para que Raul decida viendolos, no leyendolos.

Por defecto queda `respira`. Cuando Raul elija, los otros dos y el interruptor se van.

## 160. El cierre, segunda vuelta: fichas paradas y el cartel del rival (2026-09-12)

Raul sobre la seccion 154: "el cierre me gusta, pero las fichas vamos a ponerlas en
vertical", y del grito: le encanto el "¡DOMINÓ!" pintado de cuando ganas, y "Gano La
Comadre" en letra pelada cuando pierdes no le gusto; quiere uno parecido.

Tres cosas:

1. En "Fichas que quedaron" las fichas van paradas (`orientation="vertical"`, 30 px de
   ancho). Nueve fichas caben en dos filas.
2. El rival tiene su cartel pintado: `domino-rival` y `tranca-rival`, generados con IA
   usando el `domino.png` de Jonathan como referencia exacta de la letra, pero en plata y
   acero en vez de oro. Recortados a 220 px de alto como los otros (seccion 138), en PNG
   y WebP. Sale un poco mas chico que el de oro (72 % del ancho contra 86 %): la fiesta es
   del que gano. La seccion 130 decia que los de perder se quedaban en tipografia a
   proposito; Raul lo decidio distinto y aqui manda el.
3. Bug visto en la captura de Raul: al ganar por domino con la mano vacia, el panel de
   "por que no puedes jugar" y el aviso de robar seguian saliendo debajo del grito
   (`canPlay` falso con la ronda cerrada). Los tres avisos de la mano se apagan cuando la
   ronda no esta en `playing`.

## 161. Decidido: el iman es la silueta que respira (2026-09-12)

Raul vio los tres efectos de la seccion 159 en movimiento y eligio el primero: la silueta
punteada de la casilla se enciende y se apaga despacio, en oro. Se van la ficha fantasma,
la onda y el interruptor `?iman=`. `Iman.jsx` queda en veinte lineas.

## 162. La ceremonia de fin de ronda, con GANASTE y PERDISTE (2026-09-12)

Raul, sobre la seccion 160: le gustaron las letras pintadas, pero no la palabra. Las letras
grandes tienen que decir lo que le paso a uno, GANASTE o PERDISTE, y la jugada (domino,
tranca) va debajo. Y pidio "efectos bonitos, animaciones profesionales, confeti y tal".

Los carteles: `ganaste` es el de Jonathan (ya existia para el fin de partida y sirve tal
cual); `ganamos`, `perdiste` y `perdimos` se generaron con IA usando `domino.png` como
referencia exacta de la letra, los de ganar en oro y los de perder en plata. Recortados a
220 px de alto, PNG y WebP. Los `domino-rival` y `tranca-rival` de la seccion 160 se borran.

La ceremonia (`CelebracionDeRonda.jsx`, 2,6 s):

- Al ganar: un destello dorado que se apaga en 700 ms, los rayos que se encienden mientras
  giran, el cartel que entra de un golpe desde el doble de su tamaño con un rebote corto,
  catorce chispas titilando alrededor, dos cañones de confeti tricolor desde las esquinas
  de abajo (60 papelitos cada uno) mas una lluvia de 70 desde arriba, la linea de la jugada
  subiendo a los 320 ms y los puntos saltando a los 520 ms.
- Al perder: la mesa se oscurece hacia los bordes y el cartel de plata baja con un rebote
  corto; debajo, quien gano. Sin confeti ni rayos: respeto al que perdio.

El confeti va con la Web Animations API (`element.animate`), igual que la ceremonia de fin
de partida del truco de la casa: corre una vez al montar y cada papelito se borra solo. El
confeti viejo por CSS (36 papelitos) y la entrada `grito-entra` se van. Con
`prefers-reduced-motion` no hay confeti ni entradas: todo aparece quieto.

Se grabo con puppeteer (26 cuadros con su tiempo real cada uno) para que Raul lo vea en
movimiento antes de decidir.

## 163. El marco de telefono en la PC (2026-09-12)

Raul: "acomoda para que en la PC se vea como en el telefono y asi poder probar y jugar
bien, como hicimos con el Ludo". Es la misma receta del truco y del Ludo de la casa:
`MarcoDeTelefono.jsx` envuelve la app en `main.jsx`. En un monitor la app vive en una
columna del ancho de un telefono, centrada (ancho = alto de la ventana por 0,58, tope 620
px), y a los lados queda la mesa desenfocada y apagada. En el telefono manda el
`min(100%)` y no cambia nada.

La columna no lleva transform: lo que va en `position: fixed` (la ceremonia, el cartel de
cuentas, los velos) sigue midiendose contra la ventana entera, y como todo eso va
centrado, cae igual sobre la columna. El paño se mide con su ResizeObserver, asi que la
camara y la mano se calculan con el ancho de la columna, como en un telefono.

## 164. La camara mas quieta, menos zoom y un solo sitio por punta (2026-09-12)

Raul, jugando en la PC: "la primera ficha se juega y empieza muy grande, es mucho zoom; y
no me gusta como se van acomodando las fichas desde que las colocas". Tres cambios:

1. **Menos zoom.** El tope de la ficha baja de 0,22 a 0,15 del lado corto del paño: en un
   telefono de 375, la primera ficha mide 47 px de alto en vez de 69. Sigue siendo mas
   grande que las 35 de la seccion 88 y las dos puntas siguen a la vista.
2. **La camara se queda quieta mientras pueda.** Antes se reencuadraba en cada jugada,
   aunque fuera un poco, y esa correccion es lo que se sentia como que las fichas "se
   acomodaban" despues de puestas. Ahora guarda el encuadre y solo lo cambia cuando lo que
   hay que mostrar (la cadena mas dos celdas por punta) ya no entra en lo que se ve, o
   cuando arranca una mano nueva. Y cuando se mueve, se desliza en 650 ms en vez de 420.
3. **Un solo sitio por punta.** Antes se ofrecian TODAS las casillas posibles (hasta ocho
   imanes) y la cadena salia como cada uno la fuera doblando. Ahora se ofrece por punta
   la casilla que el motor considera mas derecha (`straightestPlacement`, la misma regla
   que usa el bot y la que el motor aplica cuando no llega colocacion), y para la primera
   ficha, una sola. Arrastrar sigue igual: se imanta a esos sitios.

Lo que se queda: la colocacion libre del motor (la rejilla de 16, `placementsFor`, la
pasada de rescate) no se toco; solo se ofrecen menos opciones al dedo. La medicion de
fichas trabadas de la seccion 81 sigue valiendo porque el motor valida igual.

Se grabo la cadena armandose, antes y despues, cuadro por jugada, para que Raul lo vea.

## 165. La fluidez: la cadena morfaba, y cinco remates (2026-09-12)

Raul, jugando en la PC: "se ve mucho mejor; menos zoom todavia, y siento que puedes
mejorar la fluidez, que todo se vea mas fluido, no desencajado". Se grabo una jugada
cuadro a cuadro (20 cuadros con su tiempo real) y se miro el DOM a los 120, 250, 340 y
500 ms de tocar el iman. Ahi estaba lo desencajado:

**El bug.** Las fichas de la mesa llevaban de llave su INDICE (`tile-0`, `tile-1`...).
Cuando una ficha entra por la punta IZQUIERDA, todos los indices corren uno, y React le
da a cada nodo la ficha de al lado: cada ficha ya puesta pasaba a dibujar otra, con otra
cara y a veces otra orientacion, y como `Tile` llevaba `transition-all`, ese cambio de
tamaño y giro se ANIMABA 300 ms. Medido: a los 120 ms de la jugada, la ficha 0 media
50x54 (a medio camino entre acostada y parada) y el relieve de la que volaba media
137x169, un rectangulo negro encima de la cadena. La cadena entera se veia morfando en
cada jugada por la izquierda.

Arreglo: la llave es la ficha (`5-3`), que en la mesa es unica; solo entra el nodo nuevo.
Y `Tile` transiciona solo `transform`, nunca tamaño.

**Los remates:**

1. Menos zoom: el tope baja de 0,15 a 0,11 del lado corto. En un telefono de 375 la
   primera ficha mide 35 px de alto, como en la seccion 88.
2. La camara espera a que la ficha aterrice: la transicion del encuadre lleva 300 ms de
   retraso (lo que dura el vuelo), asi que primero cae la ficha y despues, si hace
   falta, se corre la camara. Y `will-change: transform` para que la capa este lista.
3. La ficha que acaba de aterrizar se asienta: 220 ms de un toque de escala (1,09 a 1)
   y brillo, como el clac, en cuanto termina el vuelo.
4. La mano se reacomoda deslizando (FLIP: se mide donde estaba cada ficha, donde
   quedo, y se la trae desde su sitio viejo en 260 ms). Antes las fichas saltaban a su
   sitio nuevo al jugar o al robar. Las fichas de la mano llevan de llave la ficha, no
   el indice, por lo mismo de arriba.
5. La ficha que llega a la mano (reparto o robada) entra creciendo, 280 ms.

Nota de medicion: el "1 s de la primera jugada" que se anoto en la auditoria no era del
juego, era del propio guion de capturas, que sacaba dos fotos antes de mirar si la
jugada se habia confirmado. Con la rafaga de veinte fotos "tardaba" 5,8 s. La jugada
se confirma en 10 ms desde la primera.

## 166. La ultima ficha, pareja con las demas (2026-09-13)

Raul, despues de la 165: "me encanta, pero todavia hay algo: cuando entra una nueva se ve
rara, como a otra altura, no se ve parejo". Se miro con zoom, ficha por ficha: la rejilla
esta bien, los dobles centrados y las esquinas donde toca. Lo que no estaba parejo era la
ULTIMA ficha: se dibujaba un 5 % mas grande (`scale-105`), con un aro de dos pixeles y un
resplandor fuerte, por encima de las vecinas. Eso se lee como una ficha levantada.

Ahora todas miden lo mismo. La ultima lleva solo un brillo dorado suave, para saber cual
fue, y el asiento de la 165 baja de 1,09 a 1,04: un toque, no un salto.

## 167. La cadena sigue derecho y solo dobla contra el borde (2026-09-13)

Con zoom en la mesa de Raul se vio la otra mitad de "no se ve parejo": la cadena bajaba un
escalon en medio del paño. Una ficha acostada, la siguiente parada colgando de su punta,
la siguiente acostada otra vez: escalera. No era el borde; era el "cerebro"
(`aperturaFutura`) eligiendo doblar porque asi dejaba el tablero mas abierto. La seccion
81 lo puso primero porque se trababa un pelo menos (0,034 % contra 0,068 %).

Ahora SEGUIR DERECHO manda, en `straightestPlacement` (layout.js) y en el bot (bot.js),
que lleva su propia copia de la regla: si se puede seguir en linea, se sigue; el cerebro,
el aire y el sitio libre solo deciden entre las que ya van derecho, o cuando no hay
recta y toca doblar contra el borde. Si el extremo es un doble, "derecho" es cruzado,
como siempre.

Medido con `tools/medir-destranque.mjs 400` (183.000 turnos), antes y despues:

  veto parcial (podia jugar otra)     0,290 %  ->  0,117 %
  veto total   (no podia jugar nada)  0,232 %  ->  0,073 %
  rondas con algun veto total         3,35 %   ->  1,18 %
  sin solucion                        0        ->  0

Al reves de lo que decia la 81: con el rescate y el destranque de por medio, la cadena
recta se traba MENOS que la que dobla por apertura. Y la mesa se lee de un vistazo.

Las cuatro pruebas del destranque armaban su posicion jugando 39 jugadas de bot con la
semilla `veto-118`; con la regla nueva esa partida ya no se tranca. `tools/buscar-veto.mjs`
barre semillas y encuentra posiciones trancadas con la regla vigente: la prueba usa ahora
`veto-15` a las 42 jugadas (el 0|6). Las 85 pruebas en verde.

## 168. La mano ya no salta al agarrar una ficha (2026-09-13)

Raul, en la PC: "cuando agarras el domino para arrastrarlo hay un movimiento de todas las
fichas que es incomodo". Se midio con el raton: al hacer mousedown y mover, las siete
fichas de la mano bajaban 24 px de golpe. La causa era el aviso "Arrastra una
ficha valida a la mesa", que se desmontaba mientras se arrastra (`!draggedTile`): al irse,
la mano entera caia en su hueco. Y lo mismo pasaba al cambiar el turno, porque el aviso
solo existe cuando te toca.

Ahora el aviso vive en una fila de alto fijo (20 px) que esta siempre, con o sin texto: al
arrastrar solo se desvanece, y "No puedes jugar. Levanta una ficha del monton" ocupa esa
misma fila. Medido despues: 0 px.

Dos remates del mismo momento: las fichas apagadas ya no se encienden todas al agarrar una
(`canPlay` de la mano no depende de `draggedTile`; los gestos ya lo comprobaban por su
cuenta), y el apagado de una ficha transiciona opacidad y filtro en 300 ms en vez de
cambiar de golpe.

Pendiente, del mismo estilo: el panel "por que no puedes jugar" y el boton "Pasar" siguen
entrando en flujo debajo de la mano y la suben cuando aparecen. Son momentos raros (solo
cuando no tienes jugada); si molestan, van encima de la mano como capa.

## 169. Elegir hacia donde dobla la culebra, y el vigilante de las montadas (2026-09-13)

Raul, con una captura: "aqui quedo montada, ¿que paso? Ahora hazlo bien, tirate las pruebas
necesarias. ¿Y pusiste para que solo vaya en una direccion? La gente no puede elegir hacia
que lado hacer la culebra".

**Elegir el lado.** La 164 dejaba una sola casilla por punta y la cadena salia recta, pero
le quitaba al jugador la eleccion. Ahora se ofrecen TODAS las casillas validas por punta,
con la que sigue derecho marcada como SUGERIDA: respira en oro. Las otras se ven apagadas
y quietas, pero se tocan igual, y al arrastrar la ficha se imanta a cualquiera. El bot
sigue la sugerida. Asi la mesa arranca recta por defecto y la gente dobla donde quiera.

**La montada.** No se pudo reproducir: `tools/buscar-montadas.mjs` (partidas enteras de
bots con destranque, todas las parejas de fichas revisadas tras cada jugada: 16.000 turnos,
2.051 dobles, cero), `tools/buscar-montadas-relayout.mjs` (388 cadenas por las cuatro
formas del destranque: cero) y cinco rondas jugadas en el navegador midiendo el DOM
(cero). `medir-dobles.mjs` da lo mismo con la regla vieja y con la nueva: 0 % de dobles en
paralelo. El motor rechaza al colocar cualquier casilla que se solape visualmente
(`solapa-visualmente`), asi que si paso fue despues de colocar, o en un estado que no
alcanzamos.

En vez de adivinar, el servidor lleva un vigilante (`backend/src/game/vigilanteMontadas.js`):
despues de cada jugada y de cada destranque revisa el dibujo con los mismos corrimientos
que dibuja el cliente, y si dos fichas se solapan mas de un cuarto guarda la mesa entera en
`backend/montadas.log` (fuera de git). La proxima vez que Raul la vea, la mesa exacta queda
anotada y se reproduce con ella. No toca el juego: solo mira y anota.

## 170. La estructura del telefono: la culebra va por donde menos se aleja la camara (2026-09-13)

Raul, sobre la 169 (todas las casillas para elegir hacia donde dobla la culebra): "prefiero que
la gente no elija, pero si lo hacemos bien: quitarle la libertad a la gente siempre y cuando
hagas un trabajo excepcional en como se va a estructurar la cosa". Y el objetivo: "que la
culebra vaya por el camino que haga menos zoom-out, para que las fichas no se vean minusculas".

**La vara.** La pantalla del telefono, a la escala mas cercana que permite la mesa, mide unas
9 celdas de ancho por 14 de alto (`VENTANA_TELEFONO` en `layout.js`). Cada colocacion se mide
contra esa ventana: `alejamiento = max(ancho/9, alto/14)` de la caja de la cadena con la ficha
puesta. 1 es que cabe justo; mas de 1 es que la camara tiene que alejarse. `tools/medir-compacta.mjs`
lo promedia sobre 200 partidas de bots, turno por turno.

**La regla, en `straightestPlacement` (la misma para la casilla del jugador y para el bot):**

1. La primera ficha se pone para que la cadena SALGA A LO LARGO de la pantalla. La cadena
   sale por el eje de una ficha suelta y por los costados de un doble: una suelta va parada
   y un doble va acostado. Casi siempre abre un doble.
2. Si el extremo es un doble, cruzada (como siempre, seccion 76).
3. No salirse de la ventana: si hay casillas que caben en la pantalla y otras que no, se
   descartan las que no caben (`preferirCompactas`). Solo eso.
4. Seguir derecho entre las que quedan (seccion 167). Despues los desempates de siempre.

El bot ya no lleva su copia de la regla: `bot.js` le pasa sus opciones a
`straightestPlacement` con la ficha orientada (`fichaOrientada`), y la primera ficha con la
ficha real. Antes las dos copias se separaban solas.

**Lo que se probo y se descarto**, medido con `medir-compacta.mjs` (zoom) y
`medir-destranque.mjs` (fichas trabadas):

| regla                                   | alejamiento 1v1 | turnos con camara alejada | veto total |
|-----------------------------------------|-----------------|---------------------------|------------|
| derecho primero (seccion 167, la vieja) | 1,030           | 50,9 %                    | 0,073 %    |
| siempre la mas compacta                 | 0,731           | 10,8 %                    | 1,66 %     |
| columnas (parada siempre que quepa)     | 0,883           | 23,8 %                    | 0,563 %    |
| **no salirse de la ventana (esta)**     | **0,921**       | **26,9 %**                | **0,154 %**|

"Siempre la mas compacta" enrosca la cadena sobre si misma y multiplica por veinte las
trabadas. "Columnas" (crecer parada, puente acostado al tocar el borde, y otra vez parada)
aleja un poco menos la camara pero traba ocho veces mas y tumba cinco pruebas del motor. La
que queda es la que menos sacrifica: la camara alejada baja de la mitad de los turnos a uno
de cada cuatro (2v2: de 58,2 % a 38,8 %), la caja media pasa de 7,9 x 11,2 a 6,8 x 11,5 (alta y
angosta, como la pantalla), y el veto total sube de 0,073 % a 0,154 %, todos destrancados
(106 de 106; 2,35 % de las rondas ven alguno). Montadas: cero en `buscar-montadas.mjs`.

**En la mesa.** Vuelve UNA sola casilla por punta (`Board.jsx`), la que dicta esta regla: se
fue la clase `iman-opcion` y la propiedad `sugerida` del iman. El jugador no elige el lado;
la culebra va sola por donde menos se aleja la camara.

Pruebas: motor 85/85, servidor 87/87. El fixture de `test/destrancar.test.js` (`veto-15`,
42 jugadas, ficha 0-6) sigue valiendo con la regla nueva; `tools/buscar-veto.mjs` lo confirma.

## 171. La mesa minuscula al reenganchar, y el vigilante del dibujo (2026-09-13)

Raul, probando 1 contra 1 con un amigo desde dos telefonos, mando dos capturas: en la ronda 1
dos fichas paradas en linea que se pisaban un cuarto ("solapamiento"), y en la ronda 3 la
cadena entera minuscula en medio del paño ("no se que paso, se puso asi, super alejado").

**La mesa minuscula: reproducida y arreglada.** `diag-recarga.mjs` (scratchpad) juega tres
fichas, recarga la pagina (el juego se reengancha a la misma sala por `CLAVE_PARTIDA`) y mide
las fichas de la mesa: antes de recargar, escala 0,497 y fichas de 32 px; despues, escala 0,25
y fichas de 16 px. La causa esta en la camara quieta de la 164: al montar el tablero con la
mesa ya puesta, el primer dibujo sale ANTES de medir el paño, con el minimo de 120 px de
`anchoUtil`/`altoUtil`, y esa vista alejadisima se guardaba en `vistaRef`; como en ella
"cabe" todo, la histeresis no la soltaba nunca. En el telefono pasa sin recargar a mano:
iOS recarga la pestaña al volver de otra app, y el servidor mostro a Ajaiajaba
reconectando tres veces en esa partida. Tres candados en `Board.jsx`:

1. Sin paño medido (`pano.ancho`/`alto` en 0) no se guarda ninguna vista.
2. La vista guardada lleva el tamaño del paño con que se calculo; si cambio, no vale.
3. Una vista mas de una vez y media mas lejos que la ideal tampoco vale.

Despues del arreglo la misma prueba da la misma escala antes y despues de recargar
(0,873 y 0,873). Sin errores de consola en una ronda entera.

**La montada: no reproducida, y ahora se vigila el dibujo.** El vigilante del servidor
(seccion 169) no anoto nada, y no puede: en el motor dos fichas paradas en linea llevan
corrimiento cero, y `placementsFor` para un doble en la punta solo ofrece casillas cruzadas,
asi que ninguna version de la regla arma ese dibujo en coordenadas. Seis rondas mas en el
navegador midiendo el DOM (umbral 20 %): cero. Lo que se pisa es el DIBUJO en el telefono
(alguna animacion o nodo que se queda donde no va), asi que el vigilante nuevo mira eso:
`frontend/src/components/game/vigilanteDeDibujo.js`, llamado desde `Board.jsx` 900 ms
despues de cada cambio de la mesa con la mesa quieta (sin vuelo ni asiento), mide las fichas
en pantalla y si dos se pisan mas de un quinto manda al servidor la mesa, los corrimientos,
las medidas, clases, `transform` y estilo de los dos nodos, la escala, el paño, la
visibilidad y el navegador. El servidor lo guarda en `backend/montadas-cliente.log` (ruta
`POST /api/diag/montada`, `routes/diag.js`, fuera de git). Solo en desarrollo, y no toca el
juego. La proxima vez que Raul la vea, la mesa exacta y su dibujo quedan anotados.

## 172. La ficha nueva ya no brilla, y el vigilante del dibujo mira mas fino (2026-09-13)

Raul, con un recorte: la ficha recien puesta, con su brillo, montada un cuarto sobre la
vecina de abajo. "Ese efecto no me gusta". Se fue el brillo y el `z-10` de la nueva
(`Tile.jsx`, `Board.jsx`): todas iguales, ninguna por encima.

El pisado de su captura es chico, un 12 % de la ficha, por debajo del umbral de los dos
vigilantes (25 % el del servidor, 20 % el del dibujo). El del dibujo baja a 3 % y manda mas:
`offsetTop`/`offsetLeft`/`offsetHeight`, la animacion activa, y las clases, `transform` y
rectangulo del nodo de adentro. En esta PC no se reproduce: `diag-rects.mjs` (scratchpad)
mide caja e imagen de cada ficha tras cada jugada, en telefono (375x812 a 2x) y en escritorio
a 1, 1,25, 1,5 y 1,75 de escala de Windows: cero pisados (uno de 1 % por redondeo a 1,75).
Queda esperar el registro de `montadas-cliente.log` de la maquina de Raul.

## 173. Las fichas "montadas" eran la sombra: resuelto (2026-09-13)

Con el modo `?diag=1` (seccion 172) la maquina de Raul mando la mesa entera, ficha por ficha:
Edge en Windows, monitor de 3440 x 1440, escala de la camara 1,83. Las cajas de las trece
fichas se tocaban justo (por ejemplo `top` 613,2 + alto 117 = 730,3, la siguiente en 730,3),
cero pisado. Lo que se montaba no eran las fichas sino su SOMBRA y su CANTO: `.tile-3d`
llevaba `drop-shadow(0 2px 1px) drop-shadow(0 5px 6px)` y `.tile-edge` asomaba 3 px por
debajo de la casilla. En un telefono la camara dibuja a 0,5 y eso son 3 px que no se ven; en
el monitor de Raul, a 1,83, son unos 20 px de silueta oscura con la forma de la ficha cayendo
sobre la de abajo, que se lee como "una ficha encima de la otra". Reproducido aqui con
`diag-rects.mjs` a 3440 x 1440: el mismo dibujo.

Arreglo en `index.css`: en la mesa la sombra es `drop-shadow(0 1px 1px)` y el canto se queda
dentro de la casilla (`.tile-3d .tile-edge { bottom: 0 }`). La mano no cambia. Despues, a la
misma escala, cada ficha termina donde empieza la siguiente.

De paso Raul vio la culebra "pegada": la punta izquierda bajo en columna al lado de la punta
derecha, con media celda dibujada de por medio. El motor no deja rozar en celdas, pero el
corrimiento de los dobles (media celda por cada uno) acerca el dibujo. Queda anotado, no se
toco.

## 174. La culebra pegada a si misma: lo que se pudo, y lo que cuesta lo demas (2026-09-13)

Raul, con la punta izquierda bajando en columna al lado de la derecha: "mira como se pego eso".
En celdas habia una columna libre entre las dos (x = 6 y x = 8); en el dibujo, el corrimiento de
los dobles (media celda por cada uno) las dejo a media celda.

**La medida.** `tools/medir-pegadas.mjs`: turnos en los que dos fichas que no son vecinas en
la cadena quedan dibujadas a menos de una celda. Con la regla de la 170: 27,7 % de los turnos
en 1v1 (55 % de las rondas), 39,9 % en 2v2. Casi siempre es la cadena que llega a la pared de
la rejilla, planta un doble de canto (rescate) y vuelve en paralelo.

**Lo que se hizo: `preferirDespegadas`**, en la misma regla compartida, despues de no salirse de
la ventana y antes de seguir derecho: si hay casillas que quedan a una celda entera en el
dibujo de toda ficha que no sea la punta, se descartan las que quedan mas cerca; si ninguna
se salva, se dejan todas. Cuesta nada (85/85, veto total 0,154 % igual, zoom igual) y quita
poco: 27,7 % -> 27,5 % en 1v1, 39,9 % -> 38,9 % en 2v2. Se queda porque es gratis, pero no
resuelve: cuando la cadena vuelve de la pared no hay casilla que no quede cerca.

**Lo que se probo y no se dejo**, medido:

| variante                                   | pegada 1v1 | veto total | camara alejada 1v1 | pruebas |
|--------------------------------------------|------------|------------|--------------------|---------|
| la 170 (base)                              | 27,7 %     | 0,154 %    | 26,9 %             | 85/85   |
| + despegadas (esta)                        | 27,5 %     | 0,154 %    | 27,0 %             | 85/85   |
| + doblar una ficha antes de la pared       | 26,5 %     | 0,179 %    | 23,5 %             | 80/85   |
| rozar en el dibujo prohibido en el motor   | 20,2 %     | 0,163 %    | 27,6 %             | 80/85   |
| rejilla de 20 x 20 (era 16, seccion 88)    | 18,9 %     | 0,023 %    | 37,3 %             | 81/85   |

"Doblar antes de la pared" mueve poco y tumba el fixture de destranque y la prueba del bot
dificil (58/100, borde del 60 %). Prohibir rozar en el dibujo tumba la prueba de los dobles
cruzados y deja el 20 % igual, porque lo que queda viene del rescate. La rejilla de 20 es la
que mas destraba (siete veces menos vetos) y despega mas, pero la camara se aleja mas: la
cadena se estira antes de doblar. Jonathan eligio 16 en la seccion 88 cuando la camara
dibujaba la rejilla entera; hoy la camara encuadra la cadena, asi que el tamaño de la rejilla
ya no manda en el tamaño de la ficha. Decision para Raul (y para el informe a Jonathan):
rejilla 16 con la cadena mas apretada, o 20 con la cadena mas suelta y siete veces menos
destranques.

## 175. El camino fijo del telefono, como opcion del motor (mockup C) (2026-09-14)

Raul, ante la rejilla de 20 de la seccion 174: "¿no podemos hacer formas tipo predeterminadas?".
Jonathan las probo y las descarto en la 19 (serpiente y zigzag fijos) cuando la camara dibujaba
la rejilla entera; hoy la camara encuadra la cadena, asi que se volvio a mirar, como mockup
corriendo y medido, para que Raul decida viendolo.

**Como funciona.** `layout.camino = 'telefono'` (opcional; sin eso todo sigue igual). En
`straightestPlacement`, `preferirCamino` reemplaza a "no salirse de la ventana" y "despegadas":
cada punta baja o sube en columna (`sentidoDeLaPunta`: el sentido de la ultima ficha parada
suelta de ese lado, o el que marca el ultimo puente: si el puente esta abajo, la columna nueva
sube; si esta arriba, baja), las columnas viven entre la fila 1 y la penultima (la ventana del
telefono mide 14), y cuando la parada no cabe entra un puente acostado de una ficha hacia afuera
(la punta derecha a la derecha, la izquierda a la izquierda). Los dobles van cruzados como
siempre. El bot lo lee de `view.layout`; la mesa lo recibe en `gameState.layout` (`Board`
tiene prop `layout`); el servidor lo enciende con `DOMINO_CAMINO=telefono` (`DominoGame`).
Las herramientas de medida lo aceptan con la misma variable.

**Medido, 200 partidas por regla:**

| | A (seccion 170, hoy) | C camino fijo | C con puente de dos fichas |
|---|---|---|---|
| camara alejada 1v1 | 27,0 % | **22,6 %** | 30,8 % |
| camara alejada 2v2 | 38,9 % | **30,4 %** | 42,2 % |
| caja 1v1 | 6,8 x 11,5 | 5,9 x 11,2 | 6,8 x 11,1 |
| cadena pegada 1v1 | **27,5 %** | 40,2 % | 27,2 % |
| veto total | **0,154 %** | 0,289 % | 0,315 % |
| montadas | 0 | 0 | 0 |

C aleja menos la camara, pero las columnas quedan a dos celdas y los dobles cruzados asoman una
celda a cada lado: un doble queda a media celda de la columna vecina (por eso "pegada" sube), y
las trabadas se duplican. Con puente de dos fichas (columnas a cuatro) se despega pero la camara
se aleja mas que hoy. Primera version (columnas hasta la pared y sentido por conteo de puentes)
se descarto: un doble en la esquina la desviaba y la cadena vagaba (40,8 % alejada).

Capturas reales con `jugar.mjs` y `DOMINO_CAMINO=telefono`: hoja "El Camino Fijo de la
Culebra" para Raul, con A y C jugada por jugada. Recomendacion: quedarse con A; si Raul prefiere
C por como se ve, se enciende con la bandera. 85/85, 87/87.

## 176. Los avisos de la mesa son grabaciones (2026-09-14)

Raul tumbo las tres familias sintetizadas de la 161 ("una puta mierda") y pidio grabaciones
reales; el 13 de septiembre dijo "escoge los sonidos". Se bajaron tres paquetes CC0 (el de
rubberduck de donde salio el clac, y "Casino Audio" y "Music Jingles" de Kenney) y se eligio
por analisis, no de oido: duracion, energia, brillo (centroide espectral) y, para las
fanfarrias, si la melodia sube o baja (contorno de tono por FFT). Quedaron seis WAV mono de
32 kHz, recortados desde el golpe y nivelados con `loudnorm`, en `frontend/public/sonidos/`
(origen y licencia en su `LEEME.md`): te-toca (golpe de madera suave), no-va (golpe sordo),
robar (carta deslizando), tranque (portazo de madera), ronda-ganada (steel drum que sube,
1,4 s), ronda-perdida (steel drum que baja, 0,9 s).

`soundEffects.js` ya no fabrica nada: `sonar(aviso)` toca la grabacion (los golpes con un
poco de variacion de tono, las fanfarrias no), `prepararAvisos()` las precarga al entrar a
la mesa. `FAMILIAS` queda con una sola entrada ("Grabaciones") para que la pagina /sonidos y
el mockup sigan funcionando. Verificado jugando: las ocho grabaciones se piden al entrar y
la consola queda limpia. El mockup "Los Sonidos de la Mesa" se rehizo con estas.

## 177. El umbral y la identidad ligera (2026-09-14)

Primera tanda de "el domino por fuera", calcando el Ludo y la casa. Raul decidio: identidad
ligera (sin cuentas) y arrancar por el umbral.

**El umbral** (`frontend/src/umbral/Umbral.jsx`) vive en `/`; la landing de Jonathan queda
intacta en `/viejo` para el informe. Portada 9:16 generada con nano banana
(`public/umbral/portada-a|b|c.webp`: A el salon del club de noche, B las fichas en macro, C el
patio caribeño al atardecer; se elige con `?portada=a|b|c` mientras Raul decide), titulo
"Domino" en serif oro, JUEGA YA, EL RELAMPAGO (a /torneos) y LAS REGLAS (seis renglones).

**La identidad ligera** (`umbral/identidad.js`, `IdentidadLigera.jsx`): al primer JUEGA YA sale
la tarjeta "¿Como te llaman?" con nombre (2 a 14 letras) y uno de los doce retratos de
Jonathan; se guarda en el telefono (`domino-identidad`) y el umbral la muestra arriba a la
derecha. El socket manda `guestName` en el handshake y el servidor (`gameSocket.js`) lo
limpia y lo usa como nombre del invitado: la mesa marca "RAUL" en vez de "Invitado".

**Lo que hubo que destrabar:** el interceptor de `api.js` mandaba a /login ante cualquier 401,
y un invitado en la mesa recibe cuatro (stickers, fotos, monedas, desbloqueos). Ahora solo
rebota a quien tenia sesion, y esas cuatro llamadas no se hacen sin sesion (`haySesion()`).
Verificado con `shots/diag-umbral.mjs` en telefono: las tres portadas, la tarjeta, la entrada a
la mesa con el nombre y la consola limpia. Siguiente tanda: la antesala con panas por codigo.

**La portada que quedo (14-sep, mañana).** Raul pidio "algo intermedio entre A y C" y que
Claude escogiera. Se generaron tres puntos medios (terraza al atardecer, club con las
persianas abiertas al patio, noche tropical en la veranda) y de la mejor, la noche tropical,
dos mas sin letras (la primera traia una plaquita con texto en la baranda). Quedo la del farol
y el cafecito: `public/umbral/portada-d.webp`, por defecto. Las otras siguen con `?portada=`.

## 178. La culebra intermedia: libre, pero dobla una ficha antes de la pared (2026-09-14)

Raul, sobre A (libre, seccion 170) y C (camino fijo, seccion 175): "¿podemos buscar algo
intermedio entre A y C? Piensa cual es la mejor opcion". Lo unico que vale la pena tomar de C es
doblar antes de la pared: en A la recta llega hasta el borde, el doble siguiente se planta de
canto y la cadena vuelve pegada a si misma. `layout.camino = 'intermedio'`: la regla libre
(ventana, despegadas, derecho) mas un filtro que descarta las casillas que dejan la punta
clavada en el borde de la rejilla, si hay otras. Medido, 200 partidas por regla:

| | A libre | B intermedia | C camino fijo |
|---|---|---|---|
| camara alejada 1v1 / 2v2 | 27,0 / 38,9 % | **23,5 / 35,9 %** | 22,6 / 30,4 % |
| cadena pegada 1v1 / 2v2 | 27,5 / 38,9 % | **26,5 / 34,7 %** | 40,2 / 42,8 % |
| veto total | 0,154 % | **0,179 %** | 0,289 % |

B queda ENCENDIDA en la mesa: `DominoGame` pone `layout.camino = 'intermedio'` salvo que
`DOMINO_CAMINO` diga `telefono` o `libre`. Las pruebas del motor siguen con la regla libre
como base (`DEFAULT_LAYOUT`, 85/85): la 174 ya midio que este mismo filtro como base tumba el
fixture de destranque y deja la prueba del bot dificil en 58/100, al borde; como configuracion
de la mesa no toca ninguna prueba y cumple la regla 7 del motor (toda regla variable va en
config). Capturas reales 1v1 y 2v2 en la hoja de la culebra. 87/87.

## 179. Ver el destranque, y la portada con la culebra bien puesta (2026-09-14)

Raul: "¿que pasa cuando se traba?" y "grabame como se reacomoda". Ruta de diagnostico
`POST /api/diag/destrancar { code, forma }` (solo fuera de produccion): vuelve a trazar la
cadena de esa sala con `reconstruirCadena(board.map(t => t.tile), layout, forma)` y la manda
a todos, igual que el destranque real pero a pedido. `shots/grabar-destranque.mjs` juega hasta
tener cadena, la pide con la forma "giro" y saca cuadros con el reloj lento (CDP
`Animation.setPlaybackRate` al 15 %; los tiempos se dividen al armar el clip): se ven las
fichas deslizando de la forma vieja a la nueva en 420 ms y la camara reencuadrando despues.
Dos clips en la hoja de la culebra, a velocidad real y a un tercio.

La portada del umbral traia fichas de la IA pegadas a fichas que no eran sus vecinas (Raul se
rio, pero lo vio). Se regenero con una culebra REAL del juego como segunda referencia y la
instruccion de copiarla: ahora las fichas van punta con punta en U. `portada-d.webp` nueva.

**La culebra de la portada es real (14-sep, mediodía).** Raul vio que aun con la referencia la IA
pintaba fichas que no pegaban ("ese 1 con el blanco"). Se dejo de pedirle domino a la IA: el
fondo se genero con el paño VACIO (`umbral/gem_portada_g.py`), una cadena de 14 fichas la jugo
el motor (bots 2v2, regla intermedia) y se dibujo con las fichas del juego
(`tiles-hueso`, mismos giros que `Tile.jsx`, corrimientos de `computeBoardOffsets`), y se
puso en perspectiva sobre el paño con PIL (`Image.PERSPECTIVE`, sombra difuminada, tinte
calido). Cada ficha pega con su vecina porque la jugo el motor. `portada-d.webp` nueva.

**Y al final, a mano (14-sep, tarde).** Raul: la culebra real compuesta "es horrible, jajaja";
volvio la portada de la IA que le encanto, y la ficha que no cuadraba (marcada por el con un
circulo rojo: mitad en blanco pegada a un 1) se arreglo pintandole el puntito con PIL: elipse
oscura de 24 x 17 con brillo arriba a la izquierda y borde suave, en (456, 1390) de la imagen de
1536 x 2752 (`umbral/salida/E1-fix.png`). Leccion: para una portada, la IA con un retoque a mano
gana a la composicion exacta.

## 180. El marcador de arriba: tres direcciones para elegir (2026-09-15)

Raul: "las fichas ya estan bien pero necesito cambiar un poco el tablero; la parte de arriba no
me gusta como se ve". `Tablero.jsx` guarda la placa de nogal de siempre y suma tres variantes,
elegibles con `?marcador=a|b|c` (queda en `domino-marcador`; `Game.jsx` la lee con
`varianteDelMarcador()`): A la banda de paño (franja verde oscura con filo de bronce, puntos
grandes en Cinzel, el que va ganando en oro, codigo chiquito en la esquina); B el tablero del
club (laca casi negra, los dos numeros grandes con un punto de bronce en medio y una linea de
bronce con ronda, meta, pozo y codigo); C al aire (dos fichas flotantes sobre el paño y una
pastilla al centro; recorta nombres largos). Capturas reales 1v1 y 2v2 con `jugar.mjs` y
`DOMINO_QUERY`; hoja "El Marcador de la Mesa" con recomendacion B. Sin decision, la placa de
nogal sigue por defecto.

## 181. El tablero del club es el marcador (2026-09-15)

Raul: "B totalmente". `Tablero.jsx` queda con el tablero del club por defecto (laca casi
negra, numeros grandes en Cinzel con el que va ganando en oro, punto de bronce en medio, linea
de bronce con ronda, meta, pozo y codigo). A y C se borraron. La placa de nogal de Jonathan
sigue con `?marcador=nogal`, para el informe del antes y despues. Verificado en 1v1 y 2v2 sin
errores de consola.

## 182. El reparto animado (2026-09-15)

Raul: "el reparto de las piezas tenemos que hacer uno animado y no lo tenemos". Antes la mano
aparecia de golpe. `RepartoDeFichas.jsx`: una capa fija encima de todo que, al llegar la mano
de una ronda nueva con la mesa vacia (`Game.jsx`, estado `reparto`; al reengancharse a media
ronda no reparte), mide con el DOM donde queda cada ficha de la mano (`data-ficha-mano`) y cada
placa de rival (`data-mano-rival`), y hace volar COPIAS desde el centro de la mesa
(`data-mesa-centro`), boca abajo y en rueda: una para ti, una para cada rival, otra para ti...
(95 ms entre fichas en 1v1, 75 en 2v2, 650 ms de revoltijo antes). Las tuyas al llegar cierran
el dorso y abren la cara en dos tiempos (`reparto-dorso-se-cierra` / `reparto-cara-se-abre`;
el giro en 3D no pintaba la cara en Chrome); las de los rivales se encogen sobre la placa.
Cada llegada suena con `playDealSound()` (el golpe corto del pozo, bajito). Mientras vuela, la
mano de verdad y los abanicos de los rivales estan escondidos con `visibility: hidden` (misma
medida, mismo sitio: cuando la capa se va no se mueve un pixel). El fin lo marca el
`animationend` de la ultima copia, no un temporizador: asi la grabacion con reloj lento
(`shots/grabar-reparto.mjs`, CDP `Animation.setPlaybackRate`) muestra lo mismo que la mesa.

El bot no abre encima del reparto: `BOT_THINK_MS.opening` pasa de 1,0-1,3 s a 2,6-2,9 s
(`RoomManager.js`). Verificado en 1v1 y 2v2 sin errores de consola; clips en la hoja.

## 183. El dorso de hueso y el pozo ordenado (2026-09-15)

Raul, antes de dormir: "cuando hay que recoger ficha parecen unas cucarachas; vamos a hacer
algo mas bonito y pongamos la parte de atras del domino blanca". Dos cosas:

- **El dorso** (`.pool-tile`, `index.css`) deja de ser madera oscura: es hueso como la cara
  (tiles-hueso), con canto claro arriba, sombra abajo, filo fino de bronce por dentro y un
  rombo apenas grabado en el centro. Lo usan el pozo, los abanicos de los rivales
  (`ManoBocaAbajo`) y el reparto.
- **El pozo** (`PozoEnLaMesa.jsx`) ya no cae regado con giros de 0 a 360: filas parejas de hasta
  siete fichas paradas de 34 px, centradas en el paño, con un pelin de giro (±4,5°) y de
  corrimiento para que parezcan puestas por una mano. El barajeo y la regla de "las que
  quedan no se mueven" siguen igual. El hover ya no quema el hueso (`brightness-150` fuera;
  se levanta 4 px con aro).

Capturado jugando (`jugar.mjs` hasta que toco robar): antes y despues en la hoja.

## 184. La ficha que levantas del pozo vuela a la mano (2026-09-15)

Raul: "falta acomodar el efecto cuando eliges el domino volteado y llega a tus manos". Antes
aparecia en la mano de golpe (con el `ficha-llega` de la 165). Ahora `PozoEnLaMesa` manda con
`onRobar(j, rect)` de donde se toco; `Game.jsx` lo guarda (`roboPendiente`) y, cuando la mano
crece con una ficha que no estaba, monta `FichaRobada.jsx`: una copia boca abajo que vuela
desde ese sitio hasta la casilla de la ficha nueva en la mano y ahi cierra el dorso y abre la
cara, con la misma mecanica y las mismas clases del reparto (182). La ficha de verdad esta
escondida en su sitio mientras (`fichaOculta` en `Hand`), asi que al terminar no se mueve
nada. Grabado con `shots/grabar-robo.mjs` (reloj lento) y puesto en la hoja.

## 185. El dorso es la misma ficha, vista por detras (2026-09-15)

Raul, jugando con el reparto nuevo: "la ficha por detras se ve horrible; hay que ponerla mas
grande y con la misma forma de la ficha por delante". El dorso de la 183 era un rectangulo
pintado con CSS (`.pool-tile`): plano, con un marco por dentro que lo hacia parecer un naipe,
esquinas distintas, sin canto. Al lado de la cara —que es una foto con relieve— cantaba.

Ahora el dorso ES la ficha. `Dorso.jsx` usa la misma caja que `Tile` (mismo `tile-3d`, mismo
canto, mismo brillo, mismas esquinas) con el dibujo de la 0-0 de la pinta elegida SIN la raya
del medio: `public/dorsos/<pinta>.webp` (+ `.png` de respaldo), uno por carpeta de fichas,
generados con `scripts/generar-dorsos.py` (`npm run dorsos`; la raya se tapa con una franja
espejo de la propia ficha, bordes fundidos; la clasica y la de oro llevan un parche mas ancho
por el boton y el barrote).
`rutaDelDorso(carpeta)` vive en `MesaTheme.jsx` al lado de `rutaDeFicha`, `precargarPinta`
lo pide junto con las 28, y el service worker lo guarda como a las fichas (`/dorsos/`).
Cambias de pinta y el dorso cambia con ella. `.pool-tile` se fue del CSS.

Lo usan los cuatro sitios donde una ficha se ve por detras, y todos crecieron:

- **El pozo** (`PozoEnLaMesa`): de 34 a 44 px de ancho, filas de seis (antes siete).
- **El abanico del rival** (`ManoBocaAbajo`): de 9 a 12 px, solape 55 %.
- **El reparto** (`RepartoDeFichas`): las copias que vuelan a los rivales pasan a 18x36
  (proporcion de ficha; antes 18x24).
- **La ficha que levantas** (`FichaRobada`).

Verificado grabando 2v2 y el robo del pozo (`grabar-reparto.mjs`, `grabar-robo.mjs`): sin
errores de consola; el boton del pozo ahora se llama `.ficha-del-pozo`.

## 186. El consejo lo dice la casa, en una placa (2026-09-15)

Raul, en la version para la PAM: "ese domino que habla, vamos a cambiarlo". Se le mostraron
tres caminos sobre la mesa real (la placa de la casa, un señor del club con globo, un renglon
fino) y escogio la placa: "totalmente la casa A".

`ConsejoDeMesa.jsx` deja de dibujar el sticker del Panita con el globo (§126). Ahora es una
placa bronce y crema, con la misma letra del marcador: cejilla "LA CASA" en Cinzel con un
punto bronce, el consejo en Inter 600 crema, fondo oscuro con filo bronce. Misma entrada desde
abajo (`consejo-entra`; `panita-entra`/`panita-saluda` fuera del CSS). Los consejos, cuando
salen y cuanto duran, no cambian. El Panita sigue en el pase y en los gestos.

Jonathan lo habia pedido con la mascota; en el informe antes/despues vera las dos versiones.

## 187. Las tachuelas de bronce y el chat en el marcador (2026-09-16)

Raul, sobre la solapa de controles de la izquierda (la lengueta con el dado azul, §140):
"eso esta feo". Se le mostraron seis caminos sobre la mesa real; escogio las tachuelas ("me
gusta la tachuela pero nos jode en el 2 vs 2"), y para el 2v2 la variante F3: "vamos a
implementar el chat tambien".

- **La solapa se va.** Ya no hay lengueta, ni columna que se abre, ni `BotonMesa`. El estado
  `solapa` desaparece; `IconoColor` (Fluent Emoji) deja de usarse en la mesa (el componente
  sigue en el repo porque lo genera `tools/extraer-iconos.cjs`).
- **Cuatro tachuelas** (`Tachuela` en `Game.jsx`): botones redondos de 32 px con bronce en
  degradado radial, clavados en la baranda derecha, uno por control: sonido, color de la
  mesa, consejos, gestos. Icono de linea oscuro (lucide: Volume2/VolumeX, Palette,
  Lightbulb/LightbulbOff, Smile). Un control apagado apaga su tachuela (menos brillo, icono
  tachado). El color de la mesa abre su panel hacia la izquierda, pegado a la tachuela.
- **Donde van.** En 1 contra 1, centradas en lo que se ve de la mesa por encima de la mano
  (`bottom: altoMano`). En 2 contra 2 el rival de la derecha vive a media altura, asi que
  suben al tramo libre entre el marcador y el (`bottom: 58%`).
- **El chat sube al marcador**, gemelo del boton de salir pero en la esquina derecha, con su
  contador de sin leer. Solo se dibuja en mesas entre personas (`mesaEntrePersonas`), como
  antes.

Verificado con fotos: 1v1 y 2v2 contra la casa (tachuelas, panel de color, apagadas) y una
mesa entre dos cuentas (`capturas170` y `capturas171` por emparejamiento rapido): el boton
del chat, el "1" sin leer, la burbuja y el panel. Sin errores de consola.

## 188. La antesala: arma tu mesa (2026-09-19)

Tanda 2 de "el domino por fuera" (§176). Raul escogio, entre tres direcciones dibujadas en
telefono, la mesa con sillas —"como la antesala 2v2 del truco que me encanto"— con dos ajustes:
"las cabezas de la gente deben ir en las sillas" y "quitar el fondo blanco de las sillas".

**Que es.** `/mesa` (`frontend/src/antesala/`): la mesa ilustrada con sus cuatro sillas de
cuero (`public/antesala/mesa.webp`, nano banana recortada), tu retrato sentado en la tuya
(abajo a la izquierda), las demas con un "+". Tocas una silla vacia y escoges quien la ocupa:
la casa (un bot) o un pana. 1 vs 1 usa la tuya y la de enfrente; 2 vs 2 las cuatro (la de
enfrente es el companero). "Sentarse": si no queda silla para nadie mas, arranca de una contra
la casa; si hay silla para un pana, la mesa recibe un codigo de CUATRO letras (sin I, O ni Q,
para dictarlo por telefono) en una chapa de bronce, un boton para mandarlo por WhatsApp
(`/mesa?codigo=KMZA` entra solo), y aqui mismo ves llegar a la gente en sus sillas. El dueno
puede "Arrancar ya" (las sillas vacias las ocupa la casa) o seguir marcando sillas; la mesa
arranca sola cuando se sienta el ultimo. Abajo, el tablon: las mesas de otros que tienen
silla, con los retratos de los que ya estan, y "Tengo un codigo" para entrar a mano. El umbral
("Juega ya") ahora lleva aqui y no directo a un 1v1 contra el bot.

**Servidor** (`RoomManager`, `gameSocket`): `room:create` acepta `armada: { casaEn, publica }`;
la sala guarda `asiento` por jugador y `casaEn`; `joinRoom` sienta al pana en la primera
silla libre que no sea de la casa; `startGame` de una mesa armada rellena con `elegirBots`
las sillas vacias respetando los asientos (en 2v2 los equipos son por asiento: 0 y 2 contra 1 y
3); `mesa:silla` (solo el dueno, solo sillas vacias), `mesas:listar` (publicas, sin arrancar,
con silla), arranque solo al llenarse. `lobby:update` lleva `armada`, `sillas` y `hostId`.

**Identidad ligera en linea.** Los invitados (nombre y retrato del umbral) juegan con sus
panas: `DOMINO_INVITADOS_EN_LINEA` (por defecto encendida; `=0` devuelve la regla de Jonathan
de "necesitas registrarte"). El retrato viaja en el handshake (`guestRetrato`) y se ve en la
antesala, en el tablon y en la mesa (`player.avatar`). `Game.jsx` deja pasar a un invitado que
llega con `?join=`. El emparejamiento rapido y la sala privada de Jonathan siguen como estaban.

Verificado de punta a punta con tres invitados en tres navegadores (`shots/antesala.mjs`):
Raul arma 2v2 con una silla de la casa, Chela entra escribiendo el codigo, Nano entra por el
link, la mesa arranca sola y los tres caen en la partida en sus sillas (Chela de companera, el
bot El Tigre en la silla de la casa). Y `antesala-casa.mjs`: sentarse con todo de la casa
arranca de una en 1v1 y 2v2. Sin errores de consola. Motor 85/85, backend 87/87.

## 189. Sentarse juega contra la casa; la mesa fantasma se cierra (2026-09-19)

Raul, probando la antesala recien armada: "le doy juega ya pero no me deja jugar contra
bots". Tenia razon: las sillas vacias se trataban como "para un pana" y "Sentarse" mandaba a
la sala de espera con codigo. Ahora es al reves: sin tocar nada, todas las sillas son de la
casa y "Sentarse" arranca de una contra los bots. Solo la silla que uno marca "Un pana"
(queda con su etiqueta) abre la sala con codigo. La pista de abajo lo dice en cada caso.

De paso, la mesa fantasma: si el dueno cierra el telefono con la mesa abierta, la mesa se
borra (`disconnect` en `gameSocket`), los panas sentados reciben `lobby:cerrada` y vuelven a
la antesala con el aviso "El dueno cerro la mesa"; un pana que se va se levanta de su silla.
Antes el tablon acumulaba mesas de gente que ya no estaba. Probado con tres navegadores
(`shots/antesala-fantasma.mjs`): el pana esperaba, el dueno cerro, el pana volvio, el tablon
quedo vacio.

## 190. Piso 0 de la plantilla: el telefono barato, medido (2026-09-19)

Raul: "revisa la plantilla del truco y el ludo y empieza a construir lo que falte". La
plantilla (`truco-venezolano/PLANTILLA-DE-LA-CASA.md`) arranca por el piso 0: medir cuanto
dibuja cada pantalla con la mesa quieta, antes de seguir montando cosas. Los scripts del ludo
se adaptaron al domino en `frontend/scripts/perf/` (`cuentas.mjs`, `traza.mjs`, LEEME).

Medido a 360x740 (invitado, 1 contra la casa):

| pantalla | recalculos / 4 s | layouts | pintura + raster con CPU 4x |
|---|---|---|---|
| umbral | 0 | 0 | 0 % |
| antesala | 0 | 0 | 0 % |
| mesa quieta, mi turno | 1 | 1 | 0 % |
| mesa con ficha elegida (el iman respirando) | 577 (20 ms) | 1 | 2 % |
| el reparto | - | - | 1 % |
| jugada y respuesta del bot | 150 | 7 | 1 % |

Dibujar cuesta entre 0 y 2 % del tiempo con la CPU frenada cuatro veces (el umbral de la
plantilla es 30 %): la mesa esta hecha en capas y nada repinta el paño. Lo unico que latia
en bucle sobre propiedades caras era el iman: animaba borde, fondo y sombra. Ahora la
silueta apagada es fija y el brillo es un elemento encima (`.iman-brillo`) que solo cambia
de opacidad (regla 1 de la ficha 0.1). Chrome sigue contando un recalculo por cuadro
mientras respira, pero cuesta 20 ms cada 4 s.

Dos relojes tocaban el estado sesenta veces por segundo (regla 5): `RelojDeTurno` y
`AvisoDeAusente` hacian `setState` en cada cuadro. Ahora solo cuando cambia el segundo que
se ve, y el anillo del reloj se desliza entre segundos con una transicion de CSS de 1 s
sobre su propia capa. Verificado entre dos cuentas: 8 -> 6 en dos segundos, el anillo
avanzando. Y se fue el CSS muerto de `.tile-newest` (el brillo de la ultima ficha, retirado
en la 172).

Lo que la plantilla pide y aqui no aplica todavia: sonido sintetizado (los seis avisos son
grabaciones chicas, decision de la 176) y el peso del JS (se mide cuando haya build de
produccion de esta rama).

## 191. Piso 2 de la plantilla: las cuatro reglas de las mesas, strikes y gracia (2026-09-19)

La plantilla de la casa (ficha 2.1) dice que el enganche de las mesas no se copia del truco:
se copian LAS REGLAS y se arman aqui. Diez de las catorce peleas del truco nacieron de la
oferta en dos pasos y de repartir sin mirar si habia alguien; las reglas las matan de raiz.
Todo sobre la mesa armada de la 188; el emparejamiento rapido y la sala privada de Jonathan
siguen como estaban.

1. **Sentarse es aceptar, y un jugador tiene UN asiento.** `candado(userId)` en `RoomManager`
   es la unica puerta: si estas JUGANDO en otra mesa, no te sientas y se te devuelve esa
   (`YA_TIENES_MESA` + codigo; la antesala te lleva); si estabas esperando en otra mesa
   armada, se te suelta ese puesto (si eras el dueno, esa mesa se cierra) y sigues.
2. **No se reparte a una silla vacia.** Al llenarse la mesa, o cuando el dueno toca "Arrancar
   ya", el servidor pregunta "estas?" (`mesa:estas`) y cada app contesta SOLA (`mesa:estoy`),
   sin boton: 3 s con todos conectados, 40 s si a alguno le falta el socket. Al que no
   contesta se le suelta el puesto (`mesa:soltado`: "se te solto la silla, puedes volver a
   entrar") y la mesa sigue con los demas, esperando a otro. Solo con todos presentes se
   reparte. Con una sola persona (todo la casa) no hay llamada.
3. **El umbral es el reparto.** Antes: "Levantarse" y "Cerrar la mesa" no cuestan nada, y el
   que cierra el telefono se levanta solo (189). Despues: te quedas. Gracia de reconexion
   `DOMINO_GRACIA_MS` (70 s, como en el truco) con el cartel "Se te cayo la conexion" y la
   cuenta en grande para EL QUE SE CAYO (`CartelSinConexion.jsx`; sale con el `offline` del
   telefono, que es inmediato, no con el socket, que tarda hasta 20 s en darse cuenta; se va
   al volver la red o al reconectar). Reloj de turno con strikes: `DOMINO_STRIKES` (3)
   vencimientos y pierdes la partida (forfeit, el rival cobra la partida); tras el primero,
   reloj corto `DOMINO_RELOJ_CORTO_MS` (15 s). El aviso dice "se le paso el turno · 1 de 3" y
   al tercero "dejo correr el reloj 3 veces: pierde la partida". Perillas por variable de
   entorno hasta que el domino tenga su Config con botones (piso 8).
4. **La mesa muere con su partida.** `leaveRoom` cierra la sala cuando no queda ninguna
   persona, tenga o no bots (antes las mesas contra la casa vivian para siempre). El invitado
   que sale de la partida vuelve a la antesala.

Probado corriendo (`shots/piso2.mjs`, `cartel.mjs`): "estas?" con tres conectados reparte en
1,8 s; con Juana sin red se le suelta la silla a los 3,5 s, la mesa sigue con silla libre en el
tablon y Juana ve el aviso al volver; el candado devuelve al que ya esta jugando a su mesa;
el tercer strike termina la partida ("Gano capturas171"); el cartel sale al segundo de
quedarse sin red con 69 y baja de a uno, y se va al volver la red. Y en `backend/src/game/test.js` quedaron
las pruebas de las cuatro reglas y de los strikes con reloj corto (el contrato, como pide
la plantilla): backend 118/118.

Ojo de Tailwind: `bg-[#09160f]/97` no existe (la opacidad tiene que ser de las del tema, o
`/[0.97]`) y dejaba el cartel transparente; quedo `/95`.
