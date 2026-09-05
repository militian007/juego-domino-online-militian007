import * as Ranking from '../models/Ranking.js';

/**
 * La clasificacion, con las tres vistas de PrivoyTruco.
 *
 * Va SIN sesion a proposito: un invitado que entra tiene que poder ver quienes
 * son los mejores. Es la mitad de la gracia de tener clasificacion.
 */
export const clasificacion = async (req, res) => {
  const vista = ['general', 'semana', 'torneos'].includes(req.query.vista)
    ? req.query.vista
    : 'general';

  try {
    if (vista === 'torneos') {
      // Los torneos todavia no existen en el domino. Se contesta la vista vacia
      // y con el aviso, en vez de inventar copas que nadie gano.
      return res.json({ vista, tabla: [], clasificados: 0, hayTorneos: false });
    }

    const [tabla, clasificados] = await Promise.all([
      vista === 'semana' ? Ranking.tablaSemanal(req.query.cuantos) : Ranking.tablaGeneral(req.query.cuantos),
      Ranking.cuantosClasificados()
    ]);

    res.json({ vista, tabla, clasificados, semana: Ranking.semanaActual() });
  } catch (err) {
    console.error('Error armando la clasificacion:', err.message);
    res.status(500).json({ error: 'No se pudo cargar la clasificación' });
  }
};

/**
 * Lo propio: puntos, puesto y lo de la semana.
 *
 * Existe aparte de `/api/perfil` porque la cabecera del menu necesita esto y
 * nada mas: traer el historial completo de partidas para pintar un puesto seria
 * pedirle a la base mucho mas de lo que hace falta.
 */
export const miPuesto = async (req, res) => {
  try {
    const ficha = await Ranking.de(req.userId);
    const [puesto, semana] = await Promise.all([
      Ranking.puestoDe(ficha.puntos),
      Ranking.semanaDe(req.userId)
    ]);

    res.json({
      puntos: ficha.puntos,
      partidas: ficha.partidas,
      ganadas: ficha.ganadas,
      porcentaje: ficha.porcentaje,
      mejorPuntos: ficha.mejorPuntos,
      // Sin partidas jugadas el puesto no significa nada: estaria empatado con
      // todos los que tampoco jugaron.
      puesto: ficha.partidas > 0 ? puesto : null,
      semana
    });
  } catch (err) {
    console.error('Error leyendo el puesto:', err.message);
    res.status(500).json({ error: 'No se pudo cargar tu puesto' });
  }
};
