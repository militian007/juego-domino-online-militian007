import * as torneos from '../services/torneos.js';

/**
 * LOS TORNEOS POR EL SOCKET (seccion 211).
 *
 *   table:spectate   { code }  -> ack { ok } y luego table:spectator_state
 *   table:unspectate { code }
 *   torneo:anotarse  { torneoId, anotarse }  (el de la pantalla vieja, ahora
 *                                             por el motor nuevo)
 *
 * Y la presencia: «se arma con los que estan» cuenta a todo el que paso por
 * la ventana, no solo al que tenia senal en el segundo del cierre.
 *
 * Los avisos del torneo (tournament:table_ready, :updated, :armando,
 * :llegaste_tarde, :podium...) salen del servicio a la sala `user:<id>`, que
 * es la que abre retosSocket para cada identidad estable.
 */
const ID_ESTABLE = /^guest-[a-z0-9]{6,40}$/i;
const RETRATOS = ['catire', 'chela', 'chuo', 'comadre', 'juana', 'musiu', 'nano', 'pancho', 'paula', 'tigre', 'yubi', 'zurda'];

export function registrarTorneos(io, socket, roomManager) {
  const identidadEstable = Boolean(socket.userId) && (!socket.isGuest || (ID_ESTABLE.test(socket.userId) && socket.userId !== `guest-${socket.id}`));
  if (identidadEstable) torneos.marcarVisto(socket.userId);

  socket.on('table:spectate', async ({ code } = {}, callback) => {
    const sala = roomManager.rooms.get(String(code || '').trim().toUpperCase());
    if (!sala?.torneo) return callback?.({ ok: false, code: 'NOT_SPECTATABLE', error: 'Esa mesa no se puede mirar' });
    try {
      // El candado de verdad es este: el boton se puede esconder, el evento
      // se puede mandar a mano.
      if (!(await torneos.puedeMirar(identidadEstable ? socket.userId : null, sala))) {
        return callback?.({ ok: false, code: 'NOT_ALLOWED', error: 'Solo los inscritos pueden mirar; la semifinal y la final son abiertas' });
      }
    } catch (err) {
      return callback?.({ ok: false, code: 'NOT_ALLOWED', error: 'No se pudo comprobar' });
    }
    if (!sala.game) return callback?.({ ok: false, code: 'NO_GAME', error: 'La partida no está en curso' });
    sala.espectadores ??= new Set();
    sala.espectadores.add(socket.id);
    const vista = roomManager.vistaDeEspectador(sala);
    if (vista) socket.emit('table:spectator_state', vista);
    callback?.({ ok: true });
  });

  socket.on('table:unspectate', ({ code } = {}, callback) => {
    roomManager.rooms.get(String(code || '').trim().toUpperCase())?.espectadores?.delete(socket.id);
    callback?.({ ok: true });
  });

  socket.on('torneo:anotarse', async ({ torneoId, anotarse } = {}, callback) => {
    if (!identidadEstable) return callback?.({ ok: false, error: 'Ponte un nombre en el umbral para anotarte' });
    if (anotarse !== false && socket.isGuest) return callback?.({ ok: false, error: 'Los torneos se juegan con tu cuenta.', code: 'necesita_cuenta' });
    const yo = { id: socket.userId, nombre: socket.username, avatar: RETRATOS.includes(socket.retrato) ? socket.retrato : null };
    try {
      const r = anotarse === false ? await torneos.borrarse(torneoId, yo.id) : await torneos.inscribirse(torneoId, yo);
      if (r.error) return callback?.({ ok: false, error: r.error, code: r.code });
      callback?.({ ok: true, anotado: anotarse !== false });
    } catch (err) {
      console.error('Torneos: anotarse por el socket:', err.message);
      callback?.({ ok: false, error: 'No se pudo anotar' });
    }
  });

  socket.on('disconnect', () => {
    if (identidadEstable) torneos.marcarVisto(socket.userId);
    for (const sala of roomManager.rooms.values()) sala.espectadores?.delete(socket.id);
  });
}
