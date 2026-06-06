import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existedByUsername = User.findByUsername(username);
    if (existedByUsername) {
      return res.status(400).json({ error: 'Ese usuario ya existe' });
    }

    const existedByEmail = User.findByEmail(email);
    if (existedByEmail) {
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = User.create({ username, email, passwordHash });
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        games_played: user.games_played,
        games_won: user.games_won
      }
    });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        games_played: user.games_played,
        games_won: user.games_won
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const me = (req, res) => {
  const user = User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
};
