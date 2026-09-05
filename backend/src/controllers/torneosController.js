import * as Torneo from '../models/Torneo.js';

/**
 * La vitrina: los proximos torneos y el palmares.
 *
 * Va SIN sesion, igual que la clasificacion: el que entra de visita tiene que
 * poder ver que hay torneos y a que hora, que es justo lo que lo hace anotarse.
 */
export const vitrina = async (req, res) => {
  try {
    const [proximos, palmares] = await Promise.all([
      Torneo.proximos(10),
      Torneo.palmares(10)
    ]);

    res.json({ proximos, palmares });
  } catch (err) {
    console.error('Error armando la vitrina de torneos:', err.message);
    res.status(500).json({ error: 'No se pudieron cargar los torneos' });
  }
};

/** En cuales esta anotado quien tiene la sesion abierta. */
export const misTorneos = async (req, res) => {
  try {
    res.json({ anotado: await Torneo.misProximos(req.userId) });
  } catch (err) {
    console.error('Error leyendo tus torneos:', err.message);
    res.status(500).json({ error: 'No se pudo cargar' });
  }
};
