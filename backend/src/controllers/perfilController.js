import * as User from '../models/User.js';
import * as Partida from '../models/Partida.js';
import * as Ranking from '../models/Ranking.js';

/**
 * El perfil de quien esta con la sesion iniciada.
 *
 * El id sale del token que ya verifico authMiddleware, NO de la peticion: si
 * viniera por parametro cualquiera podria pedir el perfil de otro.
 */
export const miPerfil = async (req, res) => {
  try {
    const userId = req.userId;

    const [usuario, resumen, historial, ficha] = await Promise.all([
      User.findById(userId),
      Partida.resumenDe(userId),
      Partida.historialDe(userId, req.query.limite),
      Ranking.de(userId)
    ]);

    if (!usuario) {
      return res.status(404).json({ error: 'La cuenta no existe' });
    }

    // Con quienes jugo cada una. Se piden todas juntas en vez de una consulta
    // por partida.
    const rivalesPorPartida = await Partida.rivalesDe(historial.map((h) => h.id));

    const conRivales = historial.map((h) => {
      const todos = rivalesPorPartida[h.id] ?? [];
      return {
        ...h,
        contra: todos
          .filter((j) => j.username !== usuario.username)
          .map((j) => j.username)
      };
    });

    const puesto = await Ranking.puestoDeRetador(userId, ficha.puntos);

    res.json({
      usuario: {
        id: usuario.id,
        username: usuario.username,
        desde: usuario.created_at
      },
      resumen,
      historial: conRivales,
      ranking: {
        puntos: ficha.puntos,
        rango: ficha.rango,
        mejorPuntos: ficha.mejorPuntos,
        // Solo tiene puesto quien llego a Retador. Abajo de ahi no significa
        // nada y mostrarlo confunde.
        puesto,
        distincion: Ranking.distincionDeRetador(puesto),
        siguiente: Ranking.faltaParaElSiguiente(ficha.puntos)
      }
    });
  } catch (err) {
    console.error('Error armando el perfil:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el perfil' });
  }
};
