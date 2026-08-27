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
