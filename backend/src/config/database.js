import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';

const saferDbPath =
  process.env.DATABASE_PATH ||
  path.join(process.env.APPDATA || os.homedir(), 'domino-online', 'data.db');

const dir = path.dirname(saferDbPath);
try {
  fs.mkdirSync(dir, { recursive: true });
} catch (e) {
  console.error('No se pudo crear carpeta de base de datos:', e);
}

const db = new DatabaseSync(saferDbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    winner_team TEXT,
    team1_score INTEGER,
    team2_score INTEGER,
    mode TEXT,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
