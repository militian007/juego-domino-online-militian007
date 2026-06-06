# 🎲 Dominó Online

Juego de dominó clásico doble 6 online, multijugador con bots.

## Stack

- **Backend**: Node.js 24 + Express + Socket.io + SQLite (nativo, `node:sqlite`)
- **Frontend**: React 18 + Vite + TailwindCSS + Socket.io-client
- **Auth**: JWT + bcrypt

## Modos de juego

- **1 vs 3 Bots** – Juegas solo contra 3 bots
- **2 vs 2 Bots** – Tú y un amigo contra 2 bots, en equipos
- **2 vs 2 Jugadores** – 2 humanos contra 2 humanos (en sala con código)

## Reglas implementadas

- 28 fichas doble 6, 7 por jugador
- Empieza el doble más alto (o la ficha más alta)
- Sin compra (clásico): si no puedes jugar, pasas
- Tranque: si todos pasan consecutivamente
- Gana el que se queda sin fichas, o el equipo con menos puntos al trancarse
- Se juega a 100 puntos
- Soporte de equipos en 2v2

## Estructura

```
.
├── backend/   # API REST + WebSockets
│   └── src/
│       ├── config/database.js     # SQLite nativo
│       ├── controllers/           # Lógica de auth
│       ├── middleware/            # JWT
│       ├── models/                # User
│       ├── routes/                # /api/auth
│       ├── game/
│       │   ├── Tile.js            # Ficha, pips, dobles
│       │   ├── DominoGame.js      # Lógica principal
│       │   ├── Bot.js             # Estrategia media
│       │   └── test.js            # Tests unitarios
│       ├── RoomManager.js         # Salas
│       ├── sockets/gameSocket.js  # Eventos WebSocket
│       └── server.js
└── frontend/  # React + Vite
    └── src/
        ├── components/
        │   ├── Navbar.jsx
        │   └── game/
        │       ├── Tile.jsx       # Ficha visual con pips
        │       ├── Board.jsx      # Tablero
        │       ├── Hand.jsx       # Mi mano
        │       ├── OpponentHand.jsx
        │       ├── PlayerInfo.jsx
        │       ├── Scoreboard.jsx
        │       └── SidePicker.jsx # Modal para elegir lado
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   └── Game.jsx
        ├── context/AuthContext.jsx
        ├── services/{api,socket}.js
        └── App.jsx
```

## Instalación

Necesitas **Node.js 22+** (para `node:sqlite`).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Servidor en: `http://localhost:4000`

### 2. Frontend (en otra terminal)

```bash
cd frontend
npm install
npm run dev
```

App en: `http://localhost:5173`

## Estado actual del proyecto
- Backend y frontend están funcionando en local.
- Modos confirmados: 1v1, 1v1 bot, 2v2.
- Próxima iteración: mejoras UI en modo oscuro neon y hardening de conexión socket.

## Tests

```bash
cd backend
node src/game/test.js        # Tests unitarios de la lógica
node src/test-e2e.js         # Test end-to-end (requiere servidor corriendo)
```

## API REST

- `POST /api/auth/register` – Registro
- `POST /api/auth/login` – Login
- `GET /api/auth/me` – Perfil (requiere token)

## Eventos WebSocket (autenticados con JWT)

Cliente → Servidor:
- `room:create` `{ mode }` – Crea sala
- `room:join` `{ code }` – Une a sala
- `room:start` `{ code }` – Inicia partida (anfitrión)
- `game:play` `{ code, tileIndex, side }` – Juega ficha
- `game:pass` `{ code }` – Pasa turno
- `game:next-round` `{ code }` – Siguiente ronda

Servidor → Cliente:
- `lobby:update` – Estado del lobby
- `game:state` – Estado completo del juego (con `myHand`, manos ajenas ocultas)

## Estrategia del bot

1. Si puede ganar (mano vacía), juega
2. Evita dejar al compañero sin jugadas si tiene pocos puntos
3. Si el rival siguiente tiene pocas fichas, le tira las más altas
4. Minimiza sus propios pips en mano (juega las de más valor)
5. Preferencia leve por dobles
