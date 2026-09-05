import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import fs from 'node:fs';
import os from 'node:os';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

let isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

function initSqlite() {
  console.log('Initializing SQLite Database...');
  const saferDbPath =
    process.env.DATABASE_PATH ||
    path.join(process.env.APPDATA || os.homedir(), 'domino-online', 'data.db');
  const dir = path.dirname(saferDbPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.error('No se pudo crear carpeta de base de datos:', e);
  }
  sqliteDb = new DatabaseSync(saferDbPath);
}

if (isPostgres) {
  console.log('Attempting to use PostgreSQL Database...');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5, // Keep the pool small for free/hobby tiers
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  // Handle unexpected idle client errors to prevent Node process crashes
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err.message);
  });
} else {
  initSqlite();
}

export async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_history (
      id SERIAL PRIMARY KEY,
      room_code VARCHAR(50) NOT NULL,
      winner_team VARCHAR(50),
      team1_score INTEGER,
      team2_score INTEGER,
      mode VARCHAR(50),
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Una fila por partida terminada. Solo se guardan las partidas entre
    -- personas: las que son contra la maquina no cuentan para el record, si no
    -- cualquiera se lo infla ganandole al bot toda la noche.
    CREATE TABLE IF NOT EXISTS partidas (
      id SERIAL PRIMARY KEY,
      room_code VARCHAR(50) NOT NULL,
      modo VARCHAR(50) NOT NULL,
      equipo_ganador INTEGER,
      motivo VARCHAR(50),
      puntos_equipo1 INTEGER DEFAULT 0,
      puntos_equipo2 INTEGER DEFAULT 0,
      jugada_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Una fila por jugador por partida. Es lo que permite responder "mis
    -- partidas" con una sola consulta, que es lo que la tabla vieja
    -- (game_history) no podia hacer: no guardaba quien jugo.
    CREATE TABLE IF NOT EXISTS partida_jugadores (
      id SERIAL PRIMARY KEY,
      partida_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      asiento INTEGER NOT NULL,
      equipo INTEGER,
      gano INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_partida_jugadores_user ON partida_jugadores(user_id);
    CREATE INDEX IF NOT EXISTS idx_partida_jugadores_partida ON partida_jugadores(partida_id);

    -- El chat del menu principal. Escribe el que tiene cuenta; el invitado lee.
    -- Se guarda el nombre ademas del id porque el mensaje tiene que seguir
    -- leyendose aunque despues la cuenta cambie de nombre o desaparezca.
    CREATE TABLE IF NOT EXISTS chat_global (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username VARCHAR(255) NOT NULL,
      texto VARCHAR(300) NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chat_global_creado ON chat_global(id);

    -- El buzon de cada uno: retos que le hacen, torneos, y lo que venga.
    -- La columna datos lleva un JSON con lo que necesite cada tipo (el id del
    -- reto, el codigo de la sala...). Va como texto a proposito: los tipos
    -- nuevos no tienen que obligar a cambiar la tabla.
    --
    -- (Sin comillas invertidas en estos comentarios: el esquema vive dentro de
    --  una plantilla de JavaScript y una comilla invertida la corta en dos.)
    CREATE TABLE IF NOT EXISTS notificaciones (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      titulo VARCHAR(200) NOT NULL,
      cuerpo VARCHAR(500),
      datos TEXT,
      leida INTEGER NOT NULL DEFAULT 0,
      creada_en TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id);

    -- El ranking. Una fila por jugador, con sus puntos de club.
    --
    -- Va en su propia tabla y no como columnas de users porque el esquema se
    -- crea con CREATE TABLE IF NOT EXISTS: a una tabla que ya existe no se le
    -- agregan columnas solas, y users ya existe en produccion.
    CREATE TABLE IF NOT EXISTS ranking (
      user_id INTEGER PRIMARY KEY,
      puntos INTEGER NOT NULL DEFAULT 1000,
      partidas INTEGER NOT NULL DEFAULT 0,
      ganadas INTEGER NOT NULL DEFAULT 0,
      mejor_puntos INTEGER NOT NULL DEFAULT 1000,
      actualizado_en TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ranking_puntos ON ranking(puntos);

    -- Los puntos de la semana, aparte.
    --
    -- La clasificacion semanal arranca de cero cada lunes, asi que no se puede
    -- guardar en la misma fila que los puntos de siempre: haria falta borrarla
    -- todos los lunes y alguien que no juegue esa semana perderia su historial.
    -- Con una fila por persona y por semana, la semana nueva simplemente no
    -- tiene filas todavia.
    CREATE TABLE IF NOT EXISTS ranking_semana (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      semana VARCHAR(10) NOT NULL,
      puntos INTEGER NOT NULL DEFAULT 0,
      victorias INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ranking_semana_uno ON ranking_semana(user_id, semana);
    CREATE INDEX IF NOT EXISTS idx_ranking_semana_tabla ON ranking_semana(semana, puntos);

    -- Los torneos, con la misma forma que los de PrivoyTruco: uno cada media
    -- hora, gratis, se anota quien quiera y el que gana la llave se lleva el
    -- premio. Aca el premio son puntos y una copa, no plata: todavia no hay
    -- pasarela de pago. Decision de Jonathan.
    CREATE TABLE IF NOT EXISTS torneos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(80) NOT NULL,
      empieza_en TIMESTAMP NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'anunciado',
      premio_puntos INTEGER NOT NULL DEFAULT 100,
      campeon_id INTEGER,
      terminado_en TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_torneos_empieza ON torneos(empieza_en);
    CREATE INDEX IF NOT EXISTS idx_torneos_estado ON torneos(estado);

    -- Quien esta anotado en cada torneo y hasta que ronda llego.
    CREATE TABLE IF NOT EXISTS torneo_inscritos (
      id SERIAL PRIMARY KEY,
      torneo_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      ronda INTEGER NOT NULL DEFAULT 0,
      eliminado INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_torneo_inscrito_uno ON torneo_inscritos(torneo_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_torneo_inscritos_torneo ON torneo_inscritos(torneo_id);
  `;

  if (isPostgres) {
    try {
      // Test the connection
      await pgPool.query('SELECT 1');
      console.log('PostgreSQL connection successful! Initializing schema...');
      await pgPool.query(schema);
      
      // Setup periodic heartbeat ping to prevent connection timeouts (every 2 minutes)
      // This keeps Neon serverless instances active and prevents Supabase from sleeping.
      setInterval(async () => {
        try {
          await pgPool.query('SELECT 1');
        } catch (pingErr) {
          console.warn('Database heartbeat ping failed:', pingErr.message);
        }
      }, 2 * 60 * 1000);
      
    } catch (err) {
      console.error('Failed to connect to PostgreSQL. Falling back to SQLite to prevent crash!', err.message);
      isPostgres = false;
      if (pgPool) {
        pgPool.end().catch(() => {});
        pgPool = null;
      }
      initSqlite();
      runSqliteSchema(schema);
    }
  } else {
    runSqliteSchema(schema);
  }
}

function runSqliteSchema(schema) {
  // SQLite schema adjustments
  const sqliteSchema = schema
    .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/VARCHAR\(\d+\)/g, 'TEXT')
    // Ojo con el : sin el, este reemplazo tambien pisaba CURRENT_TIMESTAMP y
    // lo dejaba en CURRENT_DATETIME, que SQLite no conoce y guarda como texto
    // literal. El sintoma era una fecha que decia "CURRENT_DATETIME" en vez de
    // una fecha.
    .replace(/TIMESTAMP/g, 'DATETIME');
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${sqliteSchema}
  `);
}

export async function query(sql, params = []) {
  if (isPostgres) {
    try {
      // Convert SQLite style ? placeholders to Postgres $1, $2, etc.
      let pgSql = sql;
      let count = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${count++}`);
      }
      const res = await pgPool.query(pgSql, params);
      return {
        rows: res.rows,
        info: { lastInsertRowid: res.rows[0]?.id }
      };
    } catch (err) {
      console.error('PostgreSQL query error, falling back to SQLite query:', err.message);
      // Fallback query to SQLite in case of connection loss during operation
      return querySqlite(sql, params);
    }
  } else {
    return querySqlite(sql, params);
  }
}

function querySqlite(sql, params = []) {
  if (!sqliteDb) {
    initSqlite();
  }
  const stmt = sqliteDb.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT') || sql.includes('RETURNING')) {
    const rows = stmt.all(...params);
    return { rows };
  } else {
    const info = stmt.run(...params);
    return {
      rows: [],
      info: { lastInsertRowid: info.lastInsertRowid }
    };
  }
}

const db = { query, initDatabase };
export default db;
