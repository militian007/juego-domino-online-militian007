/* EL ENJAMBRE DEL DOMINO: jugadores sinteticos caza-paralisis.
 *
 * Copiado del truco (truco-venezolano/scripts/dev-local/synthetic-swarm.cjs) y
 * adaptado al domino: robots con identidad ligera (guestId + nombre + retrato
 * en el handshake) arman mesas por la antesala de verdad (room:create armada,
 * room:join por el codigo, "estas?" -> mesa:estoy), juegan partidas enteras
 * contra el servidor local por Socket.IO con jugadas al azar pero legales, y
 * hacen lo que hace la gente: doble toque, alguna jugada que no vale, cortes de
 * conexion a mitad de partida, dormirse en el turno (la mesa juega por el),
 * "Siguiente ronda" apretado por varios a la vez, revancha o salir al final.
 *
 * Perro guardian por mesa: si en 20 s no llega NINGUN evento de esa mesa (y no
 * hay un reloj de turno corriendo que lo explique) -> PARALIZADA, con la
 * radiografia de lo ultimo que vio cada robot.
 *
 * Uso (desde la raiz del repo):
 *   node backend/scripts/enjambre/enjambre.mjs [mesas=4] [minutos=2] [modo=1v1]
 *     modo = 1v1  (2 robots, mesa entre personas)
 *            2v2  (4 robots, mesa entre personas)
 *            casa (1 robot contra la casa, mesa armada con la silla de la casa)
 *   o: npm --prefix backend run enjambre -- 20 4 1v1
 *
 * Variables:
 *   ENJAMBRE_API        servidor (por defecto http://127.0.0.1:4000)
 *   ENJAMBRE_PUNTOS     a cuantos puntos (50/100/150/200; por defecto el de la mesa)
 *   ENJAMBRE_DISTRAIDOS probabilidad (0..1) de que en un fin de ronda NADIE
 *                       apriete "Siguiente" (por defecto 0)
 *   ENJAMBRE_LLAVE      la llave de socio (DOMINO_BUZON_LLAVE del servidor): si
 *                       esta, la radiografia de una paralizada trae la libreta
 *   ENJAMBRE_REPORTES   carpeta del reporte JSON (por defecto ./reportes junto a este archivo)
 *
 * Los minutos son para ARRANCAR mesas: la partida que esta en juego al vencer
 * el plazo se termina. Sale con codigo 1 (ROJO) si hubo paralisis o errores
 * inesperados.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.ENJAMBRE_API || 'http://127.0.0.1:4000';
const MESAS = Number(process.argv[2] ?? 4);
const DURACION_MS = Number(process.argv[3] ?? 2) * 60_000;
const MODO = String(process.argv[4] ?? '1v1');
const PUNTOS = process.env.ENJAMBRE_PUNTOS ? Number(process.env.ENJAMBRE_PUNTOS) : undefined;
const DISTRAIDOS = Number(process.env.ENJAMBRE_DISTRAIDOS ?? 0);
const STALL_MS = 20_000;
const LLAVE = process.env.ENJAMBRE_LLAVE || '';
const REPORTES = process.env.ENJAMBRE_REPORTES || path.join(AQUI, 'reportes');

const MODOS = {
  '1v1': { robots: 2, mode: '1v1', casaEn: [], tope: 6 * 60_000 },
  '2v2': { robots: 4, mode: '2v2', casaEn: [], tope: 8 * 60_000 },
  casa: { robots: 1, mode: '1v1', casaEn: [1], tope: 10 * 60_000 }
};
const RETRATOS = ['catire', 'chela', 'chuo', 'comadre', 'juana', 'musiu', 'nano', 'pancho', 'paula', 'tigre', 'yubi', 'zurda'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);
const chance = (p) => Math.random() < p;
const TANDA = Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);

const stats = {
  modo: MODO,
  api: API,
  mesasArmadas: 0,
  partidasCompletas: 0,
  partidasPorAbandono: 0,
  rondas: 0,
  revanchas: 0,
  acciones: 0,
  doblesToques: 0,
  travesuras: 0,
  siestas: 0,
  reconexiones: 0,
  salidas: { leave: 0, cerroLaApp: 0 },
  siguienteRonda: { ok: 0, rebotes: 0 },
  paralizadas: [],
  topes: 0,
  errores: {},
  incidentes: [],
  rechazosEsperados: {},
  salasVivas: { inicio: null, fin: null }
};

const anotar = (caja, clave) => { caja[clave] = (caja[clave] ?? 0) + 1; };
const error = (clave) => anotar(stats.errores, clave);

async function salasVivas() {
  try {
    const r = await fetch(`${API}/api/health`);
    return (await r.json()).rooms ?? null;
  } catch {
    return null;
  }
}

/** Emite con acuse; si el servidor no contesta en 6 s, devuelve null. */
function pedir(sock, evento, datos) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 6000);
    sock.emit(evento, datos, (r) => { clearTimeout(t); resolve(r); });
  });
}

/** Un jugador sintetico. Guarda su identidad entre conexiones: asi vuelve a su silla. */
class Robot {
  constructor(etiqueta) {
    this.id = `guest-enj${TANDA}${etiqueta}`.toLowerCase();
    this.nombre = `Robot ${etiqueta}`.slice(0, 14);
    this.retrato = RETRATOS[rnd(RETRATOS.length)];
    this.sock = null;
    this.mesa = null;
    this.ultimo = null;
    this.hecho = null;
    this.rebotes = 0;
    this.bitacora = [];
  }

  apuntar(texto) {
    this.bitacora.push(`${new Date().toISOString().slice(11, 23)} ${texto}`);
    if (this.bitacora.length > 12) this.bitacora.shift();
  }

  conectar() {
    return new Promise((resolve, reject) => {
      const s = io(API, {
        auth: { guestId: this.id, guestName: this.nombre, guestRetrato: this.retrato },
        transports: ['websocket'],
        reconnection: false,
        forceNew: true
      });
      const t = setTimeout(() => { s.close(); reject(new Error('no conecto')); }, 8000);
      s.on('game:state', (st) => this.mesa?.alEstado(this, st));
      s.on('lobby:update', (l) => this.mesa?.latido(this, 'lobby:update', l?.code));
      s.on('mesa:estas', ({ code }) => {
        this.mesa?.latido(this, 'mesa:estas', code);
        s.emit('mesa:estoy', { code });
      });
      s.on('mesa:revancha', (r) => this.mesa?.alRevancha(this, r));
      s.on('lobby:cerrada', (r) => { this.mesa?.latido(this, 'lobby:cerrada', r?.code); error('lobby:cerrada'); });
      s.on('mesa:soltado', (r) => { this.mesa?.latido(this, 'mesa:soltado', r?.code); error(`mesa:soltado:${r?.motivo}`); });
      s.once('connect', () => { clearTimeout(t); resolve(s); });
      s.once('connect_error', (e) => { clearTimeout(t); reject(e); });
      this.sock = s;
    });
  }

  cerrar() {
    try { this.sock?.removeAllListeners(); this.sock?.disconnect(); } catch { /* ya estaba */ }
    this.sock = null;
  }
}

/** Una mesa del enjambre: sus robots juegan partida tras partida hasta el plazo. */
class Mesa {
  constructor(idx, cfg) {
    this.idx = idx;
    this.cfg = cfg;
    const letras = 'ABCD';
    this.robots = Array.from({ length: cfg.robots }, (_, i) => new Robot(`${idx}${letras[i]}`));
    this.robots.forEach((r) => { r.mesa = this; });
    this.code = null;
    this.monitor = null;
  }

  latido(robot, que, code) {
    if (!this.monitor || (code && this.code && code !== this.code && que !== 'mesa:revancha')) return;
    this.monitor.ultimo = Date.now();
    this.monitor.que = `${robot.nombre}: ${que}`;
  }

  /** Lo que hace la app cuando le llega el estado de la mesa. */
  alEstado(robot, st) {
    if (!st || st.roomCode !== this.code) return;
    this.latido(robot, `game:state ${st.status}`);
    robot.ultimo = st;
    const m = this.monitor;
    if (!m) return;
    if (st.status === 'playing' && !m.jugando) { m.jugando = true; m.alArrancar?.(); }
    if (st.status === 'game-over') {
      if (st.endReason === 'forfeit') m.abandono = true;
      m.terminar('completa');
      return;
    }
    if (st.status === 'round-end') {
      const clave = `${st.round}`;
      if (m.rondaVista === clave) return;
      m.rondaVista = clave;
      stats.rondas += 1;
      if (chance(DISTRAIDOS)) { m.distraidos = true; return; }
      // Todos ven el cartel y apretan "Siguiente" cuando les da la gana: el
      // primero arranca la ronda, los demas rebotan (doble toque entre panas).
      for (const r of this.robots) {
        setTimeout(async () => {
          if (m.fin || !r.sock?.connected) return;
          const res = await pedir(r.sock, 'game:next-round', { code: this.code });
          if (res?.ok) stats.siguienteRonda.ok += 1;
          else if (res) stats.siguienteRonda.rebotes += 1;
          else error('sin-respuesta:game:next-round');
        }, 700 + rnd(2500));
      }
      return;
    }
    if (st.status !== 'playing' || String(st.currentPlayerId) !== robot.id) return;
    this.jugar(robot, st);
  }

  jugar(robot, st) {
    const m = this.monitor;
    const clave = `${st.round}:${st.board?.length}:${st.myHand?.length}:${st.poolCount}`;
    if (robot.hecho === clave) return;
    robot.hecho = clave;
    robot.rebotes = 0;

    // La siesta: el robot no toca nada y la mesa juega por el a los 25 s (una por partida, solo con reloj).
    if (st.turnRestanteMs && !m.siesta && chance(0.015)) {
      m.siesta = true;
      stats.siestas += 1;
      robot.apuntar(`siesta (reloj ${st.turnRestanteMs} ms)`);
      return;
    }
    setTimeout(() => this.accion(robot, st, clave), 80 + rnd(320));
  }

  async accion(robot, st, clave) {
    const m = this.monitor;
    if (!m || m.fin || robot.hecho !== clave || !robot.sock?.connected) return;
    const code = this.code;

    // Travesura: algo que NO vale (pasar teniendo jugada, o levantar sin necesidad). Debe rebotar.
    if (chance(0.03)) {
      stats.travesuras += 1;
      const ev = st.canPlay ? 'game:pass' : 'game:play';
      const r = await pedir(robot.sock, ev, { code, tileIndex: 99, side: 'left' });
      if (r?.ok) error(`travesura-aceptada:${ev}`);
      else anotar(stats.rechazosEsperados, `travesura:${ev}:${r?.error ?? 'sin-respuesta'}`);
    }

    let ev;
    let datos;
    if (st.canPlay && st.validMoves?.length) {
      const mov = st.validMoves[rnd(st.validMoves.length)];
      ev = 'game:play';
      datos = { code, tileIndex: mov.index, side: mov.side };
    } else if (st.canDraw) {
      ev = 'game:draw';
      datos = chance(0.3) && st.poolCount > 0 ? { code, poolIndex: rnd(st.poolCount) } : { code };
    } else if (st.canPass) {
      ev = 'game:pass';
      datos = { code };
    } else {
      error('estado-sin-accion');
      robot.apuntar('le toca pero no puede jugar, levantar ni pasar');
      return;
    }

    stats.acciones += 1;
    const doble = chance(0.05);
    const sock = robot.sock;
    const envio = pedir(sock, ev, datos);
    let eco = null;
    if (doble) {
      stats.doblesToques += 1;
      eco = pedir(sock, ev, datos);
    }
    const r = await envio;
    // Sin acuse porque el socket se cerro (corte de conexion, o la partida termino y el robot se fue): no es del servidor.
    if (!r && !sock.connected) { anotar(stats.rechazosEsperados, `sin-acuse-socket-cerrado:${ev}`); return; }
    if (!r) {
      stats.incidentes.push({
        que: `sin-respuesta:${ev}`,
        cuando: new Date().toISOString(),
        mesa: this.idx,
        datos,
        conectado: Boolean(robot.sock?.connected),
        estadoAlMandar: { round: st.round, fichasEnMesa: st.board?.length, mano: st.myHand, validMoves: st.validMoves, pozo: st.poolCount, status: st.status },
        estadoAhora: robot.ultimo && { status: robot.ultimo.status, turnoDe: robot.ultimo.currentPlayerId, fichasEnMesa: robot.ultimo.board?.length }
      });
    }
    robot.apuntar(`${ev} ${JSON.stringify(datos)} -> ${r ? (r.ok ? 'ok' : r.error) : 'SIN RESPUESTA'}${doble ? ' (doble toque)' : ''}`);
    if (eco) {
      const r2 = await eco;
      // El eco de un "levantar" en 1v1 puede valer (sigue siendo su turno sin jugada): es legal.
      if (r2 && !r2.ok) anotar(stats.rechazosEsperados, `doble-toque:${ev}:${r2.error}`);
      else if (!r2 && sock.connected) error(`sin-respuesta-eco:${ev}`);
    }
    if (!r) { error(`sin-respuesta:${ev}`); return this.reintentar(robot, clave); }
    if (!r.ok) {
      // Si el turno ya se fue (el reloj jugo por el, o llego un estado nuevo) no es un error del servidor.
      const ahora = robot.ultimo;
      if (ahora && String(ahora.currentPlayerId) !== robot.id) anotar(stats.rechazosEsperados, `turno-ya-paso:${ev}:${r.error}`);
      else error(`rechazo-inesperado:${ev}:${r.error}`);
      return this.reintentar(robot, clave);
    }
  }

  reintentar(robot, clave) {
    if (robot.rebotes >= 6) return;
    robot.rebotes += 1;
    setTimeout(() => {
      const st = robot.ultimo;
      if (!st || this.monitor?.fin || st.status !== 'playing' || String(st.currentPlayerId) !== robot.id) return;
      robot.hecho = null;
      this.jugar(robot, st);
    }, 300 + rnd(400));
  }

  alRevancha(robot, { code }) {
    this.latido(robot, 'mesa:revancha', code);
    if (!this.monitor?.revancha) return;
    this.monitor.revancha(robot, code);
  }

  /** Arma la mesa por la antesala, como la app. Devuelve el codigo. */
  async armar() {
    const [dueno, ...panas] = this.robots;
    const armada = { casaEn: this.cfg.casaEn, publica: panas.length > 0 };
    const c = await pedir(dueno.sock, 'room:create', { mode: this.cfg.mode, puntos: PUNTOS, armada });
    if (!c?.ok) throw new Error(`room:create:${c?.error ?? 'sin-respuesta'}`);
    this.code = c.code;
    if (!panas.length) {
      const s = await pedir(dueno.sock, 'room:start', { code: c.code });
      if (!s?.ok) throw new Error(`room:start:${s?.error ?? 'sin-respuesta'}`);
      return c.code;
    }
    for (const p of panas) {
      await sleep(100 + rnd(600));
      // De vez en cuando el pana mira el tablon antes de entrar, como en la app.
      if (chance(0.3)) {
        const t = await pedir(p.sock, 'mesas:listar');
        if (t?.ok && !t.mesas.some((x) => x.code === c.code)) error('tablon:mesa-no-aparece');
      }
      const j = await pedir(p.sock, 'room:join', { code: c.code });
      if (!j?.ok) throw new Error(`room:join:${j?.error ?? 'sin-respuesta'}`);
    }
    return c.code;
  }

  /** Una partida entera, de la llamada al fin. Devuelve como termino. */
  partida(desdeLaRevancha = false) {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const m = {
        ultimo: Date.now(),
        que: 'arranque',
        jugando: false,
        fin: null,
        siesta: false,
        distraidos: false,
        abandono: false,
        rondaVista: null,
        terminar: (motivo) => {
          if (m.fin) return;
          m.fin = motivo;
          clearInterval(perro);
          clearTimeout(tope);
          resolve(motivo);
        }
      };
      this.monitor = m;
      this.robots.forEach((r) => { r.hecho = null; r.ultimo = null; });

      // Caos: un corte de conexion a mitad de partida (30 % de las partidas).
      m.alArrancar = () => {
        if (!chance(0.3)) return;
        setTimeout(() => this.corte(m), 4000 + rnd(20000));
      };

      const perro = setInterval(() => {
        if (m.fin) return;
        const silencio = Date.now() - m.ultimo;
        // Un reloj de turno corriendo explica el silencio (la siesta): se le da hasta que venza + 8 s.
        const conReloj = this.robots.map((r) => r.ultimo?.turnRestanteMs ?? 0).reduce((a, b) => Math.max(a, b), 0);
        const limite = Math.max(STALL_MS, conReloj + 8000);
        if (silencio < limite) return;
        const dump = this.radiografia(silencio);
        stats.paralizadas.push(dump);
        if (LLAVE) {
          fetch(`${API}/api/config/libreta/${this.code}?llave=${encodeURIComponent(LLAVE)}`)
            .then((r) => r.json()).then((j) => { dump.libreta = j.reporte ?? j; }).catch(() => {});
        }
        console.log(`PARALIZADA mesa ${this.code} (mesa ${this.idx}, ${this.cfg.mode}) tras ${Math.round(silencio / 1000)} s; ultimo: ${m.que}`);
        m.terminar('paralizada');
      }, 2000);

      const tope = setTimeout(() => m.terminar('tope'), this.cfg.tope + (desdeLaRevancha ? 45_000 : 0));
      this.inicioPartida = inicio;
    });
  }

  async corte(m) {
    if (m.fin) return;
    const victima = this.robots[rnd(this.robots.length)];
    stats.reconexiones += 1;
    victima.apuntar('corte de conexion');
    victima.cerrar();
    await sleep(1000 + rnd(3000));
    if (m.fin) return;
    try {
      await victima.conectar();
      // La app vuelve a entrar y mira el estado de nuevo: lo que tenia a medias se rehace.
      victima.hecho = null;
      const r = await pedir(victima.sock, 'room:join', { code: this.code });
      victima.apuntar(`volvio: room:join -> ${r?.ok ? 'ok' : r?.error ?? 'SIN RESPUESTA'}`);
      if (!r?.ok) error(`reconexion:room:join:${r?.error ?? 'sin-respuesta'}`);
    } catch (e) {
      error(`reconexion:${e.message}`);
    }
  }

  radiografia(silencio) {
    return {
      mesa: this.idx,
      code: this.code,
      modo: this.cfg.mode,
      cuando: new Date().toISOString(),
      segundosCallada: Math.round(silencio / 1000),
      ultimoEvento: this.monitor?.que,
      distraidos: this.monitor?.distraidos,
      robots: this.robots.map((r) => {
        const st = r.ultimo;
        return {
          id: r.id,
          conectado: Boolean(r.sock?.connected),
          bitacora: r.bitacora,
          estado: st && {
            status: st.status,
            round: st.round,
            turnoDe: st.currentPlayerId,
            meToca: String(st.currentPlayerId) === r.id,
            turnRestanteMs: st.turnRestanteMs,
            fichasEnMesa: st.board?.length,
            puntas: st.ends,
            mano: st.myHand,
            validMoves: st.validMoves,
            canPlay: st.canPlay,
            canDraw: st.canDraw,
            canPass: st.canPass,
            pozo: st.poolCount,
            marcador: st.teamScores,
            manos: st.handCounts,
            ausentes: st.ausentes,
            ultimaJugada: st.lastAction,
            saltadoPorTiempo: st.saltadoPorTiempo,
            endReason: st.endReason
          }
        };
      })
    };
  }

  /** Al final: revancha (40 %) o salir. Devuelve el codigo nuevo si hubo revancha. */
  async despues(deadline) {
    const viejo = this.code;
    if (Date.now() < deadline && chance(0.4)) {
      const esperados = new Set(this.robots.map((r) => r.id));
      let nuevo = null;
      const llegaron = new Promise((resolve) => {
        const t = setTimeout(() => resolve(null), 10_000);
        this.monitor.revancha = (robot, code) => {
          nuevo = code;
          esperados.delete(robot.id);
          // La app va a la antesala con el codigo y se sienta: sentarse es contestar.
          setTimeout(async () => {
            const j = await pedir(robot.sock, 'room:join', { code });
            if (!j?.ok) error(`revancha:room:join:${j?.error ?? 'sin-respuesta'}`);
          }, 200 + rnd(1500));
          if (esperados.size === 0) { clearTimeout(t); resolve(code); }
        };
      });
      const quien = this.robots[rnd(this.robots.length)];
      const r = await pedir(quien.sock, 'mesa:revancha', { code: viejo });
      // Doble toque en la revancha: dos panas la piden casi a la vez.
      if (this.robots.length > 1 && chance(0.3)) {
        const otro = this.robots.find((x) => x !== quien);
        const r2 = await pedir(otro.sock, 'mesa:revancha', { code: viejo });
        if (r2?.ok && r?.ok && r2.code !== r.code) error('revancha:doble-mesa');
      }
      if (!r?.ok) { error(`revancha:${r?.error ?? 'sin-respuesta'}`); return null; }
      const code = await llegaron;
      if (!code) { error('revancha:aviso-no-llego-a-todos'); return null; }
      stats.revanchas += 1;
      this.code = nuevo;
      return nuevo;
    }
    // Salir: casi siempre con el boton (room:leave); a veces cerrando la app.
    for (const r of this.robots) {
      if (chance(0.2)) {
        stats.salidas.cerroLaApp += 1;
        r.cerrar();
        await r.conectar();
      } else {
        stats.salidas.leave += 1;
        r.sock?.emit('room:leave', { code: viejo });
      }
    }
    return null;
  }

  async correr(deadline) {
    try {
      for (const r of this.robots) await r.conectar();
    } catch (e) {
      error(`conectar:${e.message}`);
      return;
    }
    let revancha = null;
    while (revancha || Date.now() < deadline) {
      try {
        let esperar;
        if (revancha) {
          esperar = this.partida(true);
        } else {
          this.code = null;
          esperar = this.partida();
          await this.armar();
          stats.mesasArmadas += 1;
        }
        const como = await esperar;
        this.monitor.revancha = null;
        if (como === 'completa') {
          stats.partidasCompletas += 1;
          if (this.monitor.abandono) stats.partidasPorAbandono += 1;
          revancha = await this.despues(deadline);
          continue;
        }
        if (como === 'tope') {
          stats.topes += 1;
          console.log(`TOPE mesa ${this.code} (mesa ${this.idx}): la partida no termino en ${this.cfg.tope / 60000} min`);
        }
        // Mesa paralizada o eterna: se sale y se arma otra.
        revancha = null;
        for (const r of this.robots) {
          r.sock?.emit('room:leave', { code: this.code });
          r.cerrar();
          await r.conectar();
        }
      } catch (e) {
        error(`mesa:${e.message}`);
        if (this.monitor && !this.monitor.fin) this.monitor.terminar('error');
        revancha = null;
        await sleep(1000);
      }
      await sleep(300 + rnd(500));
    }
    for (const r of this.robots) {
      r.sock?.emit('room:leave', { code: this.code });
      r.cerrar();
    }
  }
}

(async () => {
  const cfg = MODOS[MODO];
  if (!cfg) {
    console.error(`Modo desconocido "${MODO}". Modos: ${Object.keys(MODOS).join(', ')}`);
    process.exit(2);
  }
  console.log(`Enjambre del domino [${MODO}]: ${MESAS} mesas x ${DURACION_MS / 60000} min contra ${API}${PUNTOS ? ` (a ${PUNTOS})` : ''}`);
  stats.salasVivas.inicio = await salasVivas();
  if (stats.salasVivas.inicio == null) {
    console.error(`No contesta ${API}/api/health: levanta el servidor primero.`);
    process.exit(2);
  }
  const inicio = Date.now();
  const deadline = inicio + DURACION_MS;
  const latido = setInterval(async () => {
    const vivas = await salasVivas();
    const errs = Object.values(stats.errores).reduce((a, b) => a + b, 0);
    console.log(`${new Date().toLocaleTimeString()} - mesas ${stats.mesasArmadas}, completas ${stats.partidasCompletas}, rondas ${stats.rondas}, acciones ${stats.acciones}, reconexiones ${stats.reconexiones}, paralizadas ${stats.paralizadas.length}, errores ${errs}, salas vivas ${vivas}`);
  }, 30_000);

  const mesas = Array.from({ length: MESAS }, (_, i) => new Mesa(i + 1, cfg));
  await Promise.all(mesas.map(async (m, i) => { await sleep(i * 150); return m.correr(deadline); }));
  clearInterval(latido);
  await sleep(3000);
  stats.salasVivas.fin = await salasVivas();
  stats.segundos = Math.round((Date.now() - inicio) / 1000);

  fs.mkdirSync(REPORTES, { recursive: true });
  const archivo = path.join(REPORTES, `enjambre-${MODO}.json`);
  fs.writeFileSync(archivo, JSON.stringify(stats, null, 2));

  const inesperados = Object.values(stats.errores).reduce((a, b) => a + b, 0);
  console.log('\n====== RESUMEN ======');
  console.log(`Modo:                 ${MODO} (${MESAS} mesas, ${stats.segundos} s)`);
  console.log(`Mesas armadas:        ${stats.mesasArmadas}  (+ ${stats.revanchas} revanchas)`);
  console.log(`Partidas completas:   ${stats.partidasCompletas}  (por abandono: ${stats.partidasPorAbandono})`);
  console.log(`Rondas:               ${stats.rondas}  (Siguiente ok ${stats.siguienteRonda.ok}, rebotes ${stats.siguienteRonda.rebotes})`);
  console.log(`Acciones:             ${stats.acciones}  (dobles toques ${stats.doblesToques}, travesuras ${stats.travesuras}, siestas ${stats.siestas})`);
  console.log(`Reconexiones:         ${stats.reconexiones}`);
  console.log(`Salidas:              leave ${stats.salidas.leave}, cerro la app ${stats.salidas.cerroLaApp}`);
  console.log(`PARALIZADAS:          ${stats.paralizadas.length}`);
  console.log(`Partidas eternas:     ${stats.topes}`);
  console.log(`Errores inesperados:  ${JSON.stringify(stats.errores)}`);
  console.log(`Rechazos esperados:   ${JSON.stringify(stats.rechazosEsperados)}`);
  console.log(`Salas vivas:          ${stats.salasVivas.inicio} al empezar -> ${stats.salasVivas.fin} al terminar`);
  console.log(`Detalle en ${archivo}`);
  const rojo = stats.paralizadas.length > 0 || inesperados > 0;
  console.log(rojo ? '\n====== ENJAMBRE: ROJO ======' : '\n====== ENJAMBRE: VERDE ======');
  setTimeout(() => process.exit(rojo ? 1 : 0), 200);
})().catch((e) => {
  console.error('\n====== ENJAMBRE: ROJO (se cayo antes de terminar) ======');
  console.error(e?.stack ?? e);
  setTimeout(() => process.exit(1), 200);
});
