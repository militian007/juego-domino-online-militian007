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
    .replace(/TIMESTAMP/g, 'DATETIME');
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
