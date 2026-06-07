import { query } from '../config/database.js';

export const findByUsername = async (username) => {
  const { rows } = await query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] || null;
};

export const findByEmail = async (email) => {
  const { rows } = await query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(
    'SELECT id, username, email, games_played, games_won, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

export const create = async ({ username, email, passwordHash }) => {
  const { rows } = await query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, games_played, games_won, created_at',
    [username, email, passwordHash]
  );
  return rows[0];
};

export const updateStats = async (id, won) => {
  await query(
    'UPDATE users SET games_played = games_played + 1, games_won = games_won + ? WHERE id = ?',
    [won ? 1 : 0, id]
  );
};
