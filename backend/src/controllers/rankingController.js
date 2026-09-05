import * as Ranking from '../models/Ranking.js';

/**
 * La tabla de posiciones.
 *
 * Va SIN sesion a proposito: un invitado que entra tiene que poder ver quienes
 * son los mejores. Es la mitad de la gracia de tener ranking.
 */
export const tablaDePosiciones = async (req, res) => {
  try {
    const [tabla, retadores] = await Promise.all([
      Ranking.tabla(req.query.cuantos),
      Ranking.cuantosRetadores()
    ]);

    res.json({
      tabla: tabla.map((f) => ({
        ...f,
        // El puesto de la tabla general solo es "puesto de Retador" para los
        // que llegaron; para el resto es su lugar en la lista y nada mas.
        distincion: f.puntos >= Ranking.PUNTOS_DE_RETADOR
          ? Ranking.distincionDeRetador(f.puesto)
          : null
      })),
      retadores,
      rangos: Ranking.RANGOS,
      puntosDeRetador: Ranking.PUNTOS_DE_RETADOR
    });
  } catch (err) {
    console.error('Error armando la tabla de posiciones:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el ranking' });
  }
};

/**
 * Solo el rango de quien esta con la sesion iniciada.
 *
 * Existe aparte de `/api/perfil` porque la cabecera del menu necesita el rango
 * y nada mas: traer el historial completo de partidas para pintar una insignia
 * seria pedirle a la base mucho mas de lo que hace falta.
 */
export const miRango = async (req, res) => {
  try {
    const ficha = await Ranking.de(req.userId);
    const puesto = await Ranking.puestoDeRetador(req.userId, ficha.puntos);

    res.json({
      puntos: ficha.puntos,
      rango: ficha.rango,
      puesto,
      distincion: Ranking.distincionDeRetador(puesto),
      siguiente: Ranking.faltaParaElSiguiente(ficha.puntos)
    });
  } catch (err) {
    console.error('Error leyendo el rango:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el rango' });
  }
};
