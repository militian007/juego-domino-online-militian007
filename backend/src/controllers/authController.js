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

    const existedByUsername = await User.findByUsername(username);
    if (existedByUsername) {
      return res.status(400).json({ error: 'Ese usuario ya existe' });
    }

    const existedByEmail = await User.findByEmail(email);
    if (existedByEmail) {
      return res.status(400).json({ error: 'Ese email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash });
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

    const user = await User.findByUsername(username);
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

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (err) {
    console.error('Error en me:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Faltan la contraseña actual y la nueva' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'La contraseña nueva tiene que ser distinta de la actual' });
    }

    // authMiddleware pone req.username desde el token verificado: nadie puede
    // cambiar la contraseña de otro aunque mande otro usuario en el cuerpo.
    // Se busca por username porque findById no trae el hash.
    const user = await User.findByUsername(req.username);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const coincide = await bcrypt.compare(currentPassword, user.password_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hash);

    res.json({ ok: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
};
