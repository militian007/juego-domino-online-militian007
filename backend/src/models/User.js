import db from '../config/database.js';

const stmtFindByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
const stmtFindByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtFindById = db.prepare('SELECT id, username, email, games_played, games_won, created_at FROM users WHERE id = ?');
const stmtInsert = db.prepare(`
  INSERT INTO users (username, email, password_hash)
  VALUES (?, ?, ?)
`);
const stmtUpdateStats = db.prepare(`
  UPDATE users
  SET games_played = games_played + 1,
      games_won = games_won + ?
  WHERE id = ?
`);

export const findByUsername = (username) => stmtFindByUsername.get(username);

export const findByEmail = (email) => stmtFindByEmail.get(email);

export const findById = (id) => stmtFindById.get(id);

export const create = ({ username, email, passwordHash }) => {
  const info = stmtInsert.run(username, email, passwordHash);
  return findById(info.lastInsertRowid);
};

export const updateStats = (id, won) => {
  stmtUpdateStats.run(won ? 1 : 0, id);
};
