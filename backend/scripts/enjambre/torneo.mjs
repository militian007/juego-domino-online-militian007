/* EL ENJAMBRE DE TORNEO DEL DOMINO (seccion 213): robots con CUENTA juegan un
 * torneo entero contra un servidor de banco, como el simulacro de torneo del
 * truco (truco-venezolano/scripts/dev-local/synthetic-tourney.cjs).
 *
 * Los torneos solo aceptan cuentas (el invitado rebota con 403
 * necesita_cuenta), asi que cada robot se crea su cuenta (POST
 * /api/auth/register) y entra al socket con su token. La jugada es la del
 * enjambre de mesas (enjambre.mjs): fichas al azar pero legales, doble toque,
 * alguna jugada que no vale, siesta, cortes de conexion a mitad de partida.
 * En la mesa del torneo la mano siguiente sale sola; algunos robots igual
 * aprietan «Siguiente» (el impaciente).
 *
 * Escenarios:
 *   normal     32 cuentas, cupo 32, arranca a los ~90 s. 15 % fantasmas (se
 *              anotan y jamas vienen: walkover), 2 dicen NO VOY, 3 dicen VOY
 *              «ocupados» y llegan DESPUES del plazo original (dentro de la
 *              prorroga), cortes de conexion a mitad de partida.
 *   relampago  la grilla publica el Relampago (PUT /api/socio/torneos/relampago)
 *              a ~2 min; 20 cuentas se anotan con cupo 12 (overbooking), 3 no
 *              aparecen a la ventana, 2 llegan tarde y entran por la puerta
 *              abierta, uno sin cupo prueba la puerta; uno-a-la-vez contra la
 *              franja siguiente. Al final apaga la grilla, restaura la config y
 *              cancela las franjas sobrantes.
 *   reinicio   12 cuentas + la casa rellenando a 16; en plena ronda 2 se MATA
 *              el servidor del banco y se levanta otra vez con la misma base:
 *              el torneo tiene que retomar y terminar.
 *   todos      los tres, uno detras del otro, cada uno en su banco limpio.
 *
 * Uso (desde la raiz del repo):
 *   node backend/scripts/enjambre/torneo.mjs [normal|relampago|reinicio|todos] [robots]
 *
 * EL BANCO: por defecto el script levanta SU PROPIO servidor (node
 * backend/src/server.js) en el puerto TORNEO_PUERTO (4230) con una base sqlite
 * desechable en la carpeta temporal, DOMINO_CUENTAS=propio y la llave
 * TORNEO_LLAVE (llave-enjambre). Ahi, y solo ahi, acorta las perillas
 * (plazo 1 min, prorroga 1 min, ventana 30 s, mano siguiente 2 s, bots 250 ms).
 * Con TORNEO_API=http://... corre contra un servidor ajeno SIN tocar perillas
 * (el escenario reinicio se niega: nunca se mata un servidor compartido).
 *
 * Variables: TORNEO_PUERTO, TORNEO_LLAVE, TORNEO_API, TORNEO_REPORTES.
 * Reporte JSON en ./reportes/torneo-<escenario>.json y el log del servidor en
 * ./reportes/torneo-<escenario>-servidor.log. Sale con 1 (ROJO) si algun
 * escenario no corono campeon con podio, si hubo mesas paralizadas, errores
 * inesperados o alguna regla que no se porto.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(AQUI, '..', '..');
const REPORTES = process.env.TORNEO_REPORTES || path.join(AQUI, 'reportes');
const PUERTO = Number(process.env.TORNEO_PUERTO ?? 4230);
const LLAVE = process.env.TORNEO_LLAVE || 'llave-enjambre';
const API_AJENA = process.env.TORNEO_API || '';
const ESCENARIO = String(process.argv[2] ?? 'normal');
const ROBOTS_ARG = process.argv[3] ? Number(process.argv[3]) : null;

// Perillas del banco (solo en el banco propio).
const PERILLAS_BANCO = {
  'torneos.presentacionMin': 1,
  'torneos.prorrogaMin': 1,
  'torneos.ventanaMs': 30_000,
  'torneos.segundaLlamadaMs': 10_000,
  'torneos.puertaAbiertaMs': 180_000
};
const ENV_BANCO = { TORNEO_SIGUIENTE_MANO_MS: '2000', BOT_DELAY_MS: '250' };

const STALL_MS = 25_000;
const TORNEO_QUIETO_MS = 5 * 60_000;
const TOPE_ESCENARIO_MS = 35 * 60_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);
const chance = (p) => Math.random() < p;
const anotar = (caja, clave, n = 1) => { caja[clave] = (caja[clave] ?? 0) + n; };
const TANDA = Date.now().toString(36).slice(-4);
const hora = () => new Date().toLocaleTimeString();
const barajar = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Emite con acuse; si el servidor no contesta en 6 s, devuelve null. */
function pedir(sock, evento, datos) {
  return new Promise((resolve) => {
    if (!sock?.connected) return resolve(null);
    const t = setTimeout(() => resolve(null), 6000);
    sock.emit(evento, datos, (r) => { clearTimeout(t); resolve(r); });
  });
}

// ====================================================================== el banco

class Banco {
  constructor(nombre, extraEnv = {}) {
    this.nombre = nombre;
    this.api = `http://127.0.0.1:${PUERTO}`;
    this.db = path.join(os.tmpdir(), `domino-torneo-${nombre}-${Date.now()}.db`);
    this.log = path.join(REPORTES, `torneo-${nombre}-servidor.log`);
    this.extraEnv = extraEnv;
    this.proc = null;
    fs.mkdirSync(REPORTES, { recursive: true });
    fs.writeFileSync(this.log, '');
  }

  async levantar() {
    if (await this.contesta()) throw new Error(`El puerto ${PUERTO} ya esta ocupado: usa TORNEO_PUERTO=otro`);
    const env = {
      ...process.env,
      PORT: String(PUERTO),
      HOST: '127.0.0.1',
      DATABASE_PATH: this.db,
      DATABASE_URL: '',
      DOMINO_BUZON_LLAVE: LLAVE,
      DOMINO_CUENTAS: 'propio',
      // La PAM del .env de la PC no entra al banco.
      VENTANILLA_URL: '',
      VENTANILLA_OPERADOR: '',
      VENTANILLA_SECRETO: '',
      NODE_ENV: 'development',
      CLIENT_URL: 'http://127.0.0.1:5199',
      ...ENV_BANCO,
      ...this.extraEnv
    };
    const out = fs.openSync(this.log, 'a');
    this.proc = spawn(process.execPath, ['src/server.js'], { cwd: BACKEND, env, stdio: ['ignore', out, out] });
    this.proc.on('exit', () => fs.closeSync(out));
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      if (await this.contesta()) return;
    }
    throw new Error(`El banco no levanto (ver ${this.log})`);
  }

  async contesta() {
    try {
      const r = await fetch(`${this.api}/api/health`, { signal: AbortSignal.timeout(1500) });
      return r.ok;
    } catch {
      return false;
    }
  }

  /** Muerte subita (el reinicio de verdad): sin cerrar nada con cuidado. */
  async matar() {
    if (!this.proc) return;
    const p = this.proc;
    this.proc = null;
    const salio = new Promise((r) => p.once('exit', r));
    p.kill('SIGKILL');
    await Promise.race([salio, sleep(5000)]);
    for (let i = 0; i < 20 && (await this.contesta()); i++) await sleep(250);
  }

  async bajar() {
    await this.matar();
    for (const f of [this.db, `${this.db}-wal`, `${this.db}-shm`]) {
      try { fs.unlinkSync(f); } catch { /* ya no estaba */ }
    }
  }

  /** Lo que el servidor se quejo en su log (lo de torneos, y las excepciones). */
  quejas() {
    let txt = '';
    try { txt = fs.readFileSync(this.log, 'utf8'); } catch { return []; }
    return txt.split(/\r?\n/).filter((l) => /Torneos:|Relámpago:|TypeError|ReferenceError|RangeError|Unhandled|uncaught|FATAL/i.test(l)).slice(0, 80);
  }
}

// ====================================================================== el contexto de un escenario

class Contexto {
  constructor(escenario, api, { propio }) {
    this.escenario = escenario;
    this.api = api;
    this.propio = propio;
    this.robots = [];
    this.porId = new Map();
    this.torneoId = null;
    this.mesas = new Map();
    this.pausaHasta = 0;
    this.caido = false;
    this.primeraVista = new Map();
    this.detalle = null;
    this.cerrado = false;
    this.stats = {
      escenario,
      api,
      bancoPropio: propio,
      inicio: new Date().toISOString(),
      perillas: propio ? PERILLAS_BANCO : 'las del servidor',
      robots: {},
      torneo: null,
      cruces: { total: 0, porMotivo: {} },
      mesas: { llamados: 0, porSondeo: 0, unidas: 0, arrancadas: 0, completas: 0, porAbandono: 0, cerradas: {} },
      acciones: 0,
      doblesToques: 0,
      travesuras: 0,
      siestas: 0,
      impacientes: { ok: 0, rebotes: 0 },
      reconexiones: { cortesAMitad: 0, volvieron: 0, porCaida: 0, fallidas: 0 },
      paralizadas: [],
      crucesTrancados: [],
      torneoParalizado: null,
      errores: {},
      rechazosEsperados: {},
      reglas: {},
      servidor: { quejas: [] },
      veredicto: null
    };
  }

  error(clave) { anotar(this.stats.errores, clave); }
  esperado(clave) { anotar(this.stats.rechazosEsperados, clave); }

  /** Anota como se porto una regla: ok true/false (null = no se pudo probar). */
  regla(nombre, ok, detalle) {
    const antes = this.stats.reglas[nombre];
    // Una regla que ya fallo no se «arregla» con otra prueba que paso.
    if (antes && antes.ok === false && ok !== false) return;
    this.stats.reglas[nombre] = { ok, detalle };
    if (ok === false) console.log(`  REGLA ROJA ${nombre}: ${JSON.stringify(detalle)}`);
  }

  async http(metodo, url, { token, body, socio } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (socio) headers['X-Llave'] = LLAVE;
    try {
      const r = await fetch(`${this.api}${url}`, { method: metodo, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000) });
      let j = null;
      try { j = await r.json(); } catch { /* sin cuerpo */ }
      return { status: r.status, j };
    } catch (e) {
      return { status: 0, j: null, e: e.message };
    }
  }

  async perilla(clave, valor) {
    const r = await this.http('PUT', '/api/config', { body: { llave: LLAVE, clave, valor } });
    if (r.status !== 200) throw new Error(`perilla ${clave}: ${r.status} ${JSON.stringify(r.j)}`);
  }

  pausar(ms) { this.pausaHasta = Math.max(this.pausaHasta, Date.now() + ms); }

  /** La mesa en el monitor (una por code). */
  mesa(code) {
    let m = this.mesas.get(code);
    if (!m) {
      m = { code, arranco: false, fin: false, lastAt: Date.now(), turno: 0, que: 'creada', status: null };
      this.mesas.set(code, m);
    }
    return m;
  }

  latido(code, st, robot) {
    const m = this.mesa(code);
    m.lastAt = Date.now();
    m.turno = st.turnRestanteMs ?? 0;
    m.status = st.status;
    m.que = `${robot.nombre}: ${st.status} ronda ${st.round}`;
    if (st.status === 'playing' && !m.arranco) {
      m.arranco = true;
      this.stats.mesas.arrancadas += 1;
      // Caos: un corte de conexion a mitad de partida (30 % de las mesas).
      if (chance(0.3)) setTimeout(() => this.cortarEn(code), 3000 + rnd(12_000));
    }
    if (st.status === 'game-over' && !m.fin) {
      m.fin = true;
      this.stats.mesas.completas += 1;
      if (st.endReason === 'forfeit') this.stats.mesas.porAbandono += 1;
    }
  }

  cortarEn(code) {
    const m = this.mesas.get(code);
    if (!m || m.fin || this.caido) return;
    const suyos = this.robots.filter((r) => r.mesa === code && r.sock?.connected);
    if (!suyos.length) return;
    suyos[rnd(suyos.length)].corte();
  }

  /** El perro guardian de las mesas arrancadas. */
  vigilar() {
    if (this.caido || Date.now() < this.pausaHasta) {
      // Mientras el banco esta caido nadie recibe nada: no es paralisis.
      for (const m of this.mesas.values()) m.lastAt = Date.now();
      return;
    }
    for (const m of this.mesas.values()) {
      if (!m.arranco || m.fin) continue;
      const limite = Math.max(STALL_MS, (m.turno ?? 0) + 8000);
      const silencio = Date.now() - m.lastAt;
      if (silencio < limite) continue;
      // Una mesa que ya no esta en el cuadro (cerrada por el servidor) no cuenta.
      const enCuadro = this.detalle?.cuadro?.some((c) => c.mesa?.code === m.code);
      if (!enCuadro) { m.fin = true; this.esperado('mesa-salio-del-cuadro-a-mitad'); continue; }
      m.fin = true;
      const dump = {
        code: m.code,
        segundosCallada: Math.round(silencio / 1000),
        ultimo: m.que,
        robots: this.robots.filter((r) => r.mesa === m.code).map((r) => ({ nombre: r.nombre, conectado: Boolean(r.sock?.connected), bitacora: r.bitacora, estado: r.ultimo && { status: r.ultimo.status, turnoDe: r.ultimo.currentPlayerId, canPlay: r.ultimo.canPlay, canDraw: r.ultimo.canDraw, canPass: r.ultimo.canPass } }))
      };
      this.stats.paralizadas.push(dump);
      console.log(`  PARALIZADA mesa ${m.code} tras ${dump.segundosCallada} s (${m.que})`);
    }
  }
}

// ====================================================================== el robot

class Robot {
  constructor(ctx, i, rol) {
    this.ctx = ctx;
    this.i = i;
    this.rol = rol; // normal | fantasma | noVoy | voyOcupado | ausente | tarde | sinCupo(se sabe despues)
    this.nombre = `t${TANDA}${ctx.escenario[0]}${i}`;
    this.token = null;
    this.userId = null;
    this.sock = null;
    this.mesa = null;
    this.ultimo = null;
    this.hecho = null;
    this.rebotes = 0;
    this.bitacora = [];
    this.llamados = new Set();
    this.rolUsado = false;
    this.premios = [];
    this.cerrando = false;
    this.volviendo = false;
    this.rondasVistas = new Set();
    this.eventos = {};
  }

  apuntar(t) {
    this.bitacora.push(`${new Date().toISOString().slice(11, 23)} ${t}`);
    if (this.bitacora.length > 14) this.bitacora.shift();
  }

  async crearCuenta() {
    const password = 'Enjambre-213';
    const r = await this.ctx.http('POST', '/api/auth/register', { body: { username: this.nombre, email: `${this.nombre}@enjambre.local`, password } });
    if (r.status !== 201) throw new Error(`register ${this.nombre}: ${r.status} ${JSON.stringify(r.j)}`);
    // Y el login, como la app (el token del registro valdria igual).
    const l = await this.ctx.http('POST', '/api/auth/login', { body: { username: this.nombre, password } });
    if (l.status !== 200) throw new Error(`login ${this.nombre}: ${l.status}`);
    this.token = l.j.token;
    this.userId = String(l.j.user.id);
  }

  conectar() {
    return new Promise((resolve, reject) => {
      const s = io(this.ctx.api, { auth: { token: this.token }, transports: ['websocket'], reconnection: false, forceNew: true });
      const t = setTimeout(() => { s.close(); reject(new Error('no conecto')); }, 8000);
      const ctx = this.ctx;
      s.on('tournament:table_ready', (d) => {
        anotar(this.eventos, 'table_ready');
        if (Number(d?.tournamentId) !== Number(ctx.torneoId)) return;
        this.alLlamado(d.code, d, 'aviso');
      });
      s.on('tournament:mesa_cerrada', (d) => {
        anotar(ctx.stats.mesas.cerradas, d?.motivo ?? '?');
        this.apuntar(`mesa_cerrada ${d?.code} ${d?.motivo}`);
        if (d?.code === this.mesa) this.mesa = null;
        const m = ctx.mesas.get(d?.code);
        if (m) m.fin = true;
      });
      s.on('tournament:armando', (d) => { if (Number(d?.tournamentId) === Number(ctx.torneoId)) anotar(this.eventos, 'armando'); });
      s.on('tournament:llegaste_tarde', (d) => { if (Number(d?.tournamentId) === Number(ctx.torneoId)) { this.llegasteTarde = d; anotar(this.eventos, `llegaste_tarde:${d?.motivo}`); } });
      s.on('tournament:podium', (d) => { if (Number(d?.tournamentId) === Number(ctx.torneoId)) { ctx.podioEvento ??= d; anotar(this.eventos, 'podium'); } });
      s.on('ranking:cambio', (c) => { if (!('partidas' in (c ?? {}))) this.premios.push(c); });
      s.on('game:state', (st) => this.alEstado(st));
      s.on('disconnect', (motivo) => {
        if (this.cerrando || this.sock !== s) return;
        this.apuntar(`se cayo (${motivo})`);
        this.volver(true);
      });
      s.once('connect', () => { clearTimeout(t); resolve(s); });
      s.once('connect_error', (e) => { clearTimeout(t); s.close(); reject(e); });
      this.sock = s;
    });
  }

  cerrar() {
    this.cerrando = true;
    try { this.sock?.removeAllListeners(); this.sock?.disconnect(); } catch { /* ya */ }
    this.sock = null;
    this.cerrando = false;
  }

  /** La app volvio (corte propio o el servidor se cayo): reconecta y se sienta de nuevo. */
  async volver(porCaida) {
    if (this.volviendo) return;
    this.volviendo = true;
    const ctx = this.ctx;
    if (porCaida) ctx.stats.reconexiones.porCaida += 1;
    this.cerrar();
    let ok = false;
    for (let i = 0; i < 150 && !ctx.cerrado; i++) {
      try { await this.conectar(); ok = true; break; } catch { await sleep(1000); }
    }
    this.volviendo = false;
    if (!ok) { if (!ctx.cerrado) { ctx.stats.reconexiones.fallidas += 1; ctx.error('reconexion:no-volvio'); } return; }
    ctx.stats.reconexiones.volvieron += 1;
    this.hecho = null;
    const vieja = this.mesa;
    if (vieja) {
      const r = await pedir(this.sock, 'room:join', { code: vieja });
      this.apuntar(`volvio: room:join ${vieja} -> ${r?.ok ? 'ok' : r?.error ?? 'SIN RESPUESTA'}`);
      if (r?.ok) return;
      // Tras un reinicio la mesa vieja ya no existe: el reconciliador lanza otra.
      if (ctx.reiniciado) ctx.esperado('mesa-vieja-tras-reinicio');
      else if (!(await this.mesaSigueEnElCuadro(vieja))) ctx.esperado('volvio-y-la-mesa-ya-cerro');
      else ctx.error(`reconexion:room:join:${r?.error ?? 'sin-respuesta'}`);
      this.mesa = null;
    }
    // Como la app al volver: pide el detalle y se sienta en SU mesa, si la hay.
    const d = await ctx.http('GET', `/api/torneos/${ctx.torneoId}`, { token: this.token });
    const code = d.j?.me?.code;
    if (code) this.alLlamado(code, null, 'vuelta');
  }

  async tieneCruce() {
    const d = await this.ctx.http('GET', `/api/torneos/${this.ctx.torneoId}`, { token: this.token });
    return Boolean(d.j?.me?.cruce);
  }

  async mesaSigueEnElCuadro(code) {
    const d = await this.ctx.http('GET', `/api/torneos/${this.ctx.torneoId}`);
    return Boolean(d.j?.cuadro?.some((c) => c.mesa?.code === code && c.ganadorId == null));
  }

  /** Le llego el llamado a una mesa (por el aviso, por el sondeo o al volver). */
  async alLlamado(code, datos, fuente) {
    const ctx = this.ctx;
    if (!code || this.rol === 'fantasma' || this.llamados.has(code)) return;
    this.llamados.add(code);
    ctx.stats.mesas.llamados += 1;
    if (fuente === 'sondeo') ctx.stats.mesas.porSondeo += 1;
    this.apuntar(`llamado ${code} (${fuente})`);

    if (this.rol === 'noVoy' && !this.rolUsado) {
      this.rolUsado = true;
      const r = await ctx.http('POST', `/api/torneos/${ctx.torneoId}/no-voy`, { token: this.token });
      if (r.status === 404 && !(await this.tieneCruce())) {
        // El rival cedio primero (o ya cerro): lo intenta en su proximo cruce.
        ctx.esperado('no-voy-sin-cruce-ya-cerro');
        this.rolUsado = false;
        return;
      }
      this.noVoy = { status: r.status, j: r.j, code };
      if (r.status !== 200) ctx.error(`no-voy:${r.status}:${r.j?.error ?? ''}`);
      return;
    }
    if (this.rol === 'voyOcupado' && !this.rolUsado) {
      this.rolUsado = true;
      const r1 = await ctx.http('POST', `/api/torneos/${ctx.torneoId}/voy`, { token: this.token });
      if (r1.status === 404 && !(await this.tieneCruce())) {
        ctx.esperado('voy-sin-cruce-ya-cerro');
        this.rolUsado = false;
        return;
      }
      const r2 = await ctx.http('POST', `/api/torneos/${ctx.torneoId}/voy`, { token: this.token });
      const plazoOriginal = datos?.deadlineAt ? Date.parse(datos.deadlineAt) : Date.now() + 60_000;
      const plazoNuevo = r1.j?.deadlineAt ? Date.parse(r1.j.deadlineAt) : null;
      const yo = await ctx.http('GET', `/api/torneos/${ctx.torneoId}`, { token: this.token });
      this.voy = { primera: r1.j, segunda: r2.j, plazoOriginal: new Date(plazoOriginal).toISOString(), cruceId: yo.j?.me?.cruce?.id ?? null };
      if (r1.status !== 200 || r2.status !== 200) ctx.error(`voy:${r1.status}/${r2.status}`);
      // Esta ocupado: llega DESPUES del plazo original pero dentro de la prorroga.
      const hueco = plazoNuevo && plazoNuevo > plazoOriginal ? Math.min(plazoNuevo - 25_000, plazoOriginal + 15_000 + rnd(10_000)) : plazoOriginal - 10_000;
      const espera = Math.max(1000, hueco - Date.now());
      this.voy.llegaA = new Date(Date.now() + espera).toISOString();
      this.apuntar(`voy (ocupado): llega en ${Math.round(espera / 1000)} s`);
      setTimeout(() => this.entrar(code), espera);
      return;
    }
    setTimeout(() => this.entrar(code), 300 + rnd(2500));
  }

  async entrar(code) {
    const ctx = this.ctx;
    if (ctx.cerrado) return;
    if (!this.sock?.connected) { this.apuntar(`queria entrar a ${code} sin conexion`); this.llamados.delete(code); return; }
    this.mesa = code;
    const r = await pedir(this.sock, 'room:join', { code });
    this.apuntar(`room:join ${code} -> ${r ? (r.ok ? 'ok' : r.error) : 'SIN RESPUESTA'}`);
    if (r?.ok) { ctx.stats.mesas.unidas += 1; ctx.mesa(code); return; }
    if (this.mesa === code) this.mesa = null;
    if (!r && !this.sock?.connected) { ctx.esperado('join-sin-acuse-socket-cerrado'); this.llamados.delete(code); return; }
    // La mesa pudo cerrarse en el medio (el rival dijo NO VOY, walkover, reinicio).
    if (!(await this.mesaSigueEnElCuadro(code))) ctx.esperado(`join-mesa-ya-no-cuenta:${r?.error ?? 'sin-respuesta'}`);
    else ctx.error(`room:join:${r?.error ?? 'sin-respuesta'}`);
  }

  alEstado(st) {
    const ctx = this.ctx;
    if (!st?.torneo || !st.roomCode) return;
    const code = st.roomCode;
    ctx.latido(code, st, this);
    this.ultimo = st;
    this.mesa = code;
    if (st.status === 'game-over') {
      this.mesa = null;
      // Como la app: a veces vuelve a la pantalla del torneo (se levanta de la mesa).
      if (chance(0.5)) setTimeout(() => this.sock?.emit('room:leave', { code }), 1000 + rnd(2000));
      return;
    }
    if (st.status === 'round-end') {
      const clave = `${code}:${st.round}`;
      if (this.rondasVistas.has(clave)) return;
      this.rondasVistas.add(clave);
      // En el torneo la mano sale sola; el impaciente aprieta «Siguiente» igual.
      if (chance(0.1)) {
        setTimeout(async () => {
          const r = await pedir(this.sock, 'game:next-round', { code });
          if (r?.ok) ctx.stats.impacientes.ok += 1;
          else ctx.stats.impacientes.rebotes += 1;
        }, 300 + rnd(1200));
      }
      return;
    }
    if (st.status !== 'playing' || String(st.currentPlayerId) !== this.userId) return;
    this.jugar(st);
  }

  jugar(st) {
    const clave = `${st.roomCode}:${st.round}:${st.board?.length}:${st.myHand?.length}:${st.poolCount}`;
    if (this.hecho === clave) return;
    this.hecho = clave;
    this.rebotes = 0;
    const m = this.ctx.mesa(st.roomCode);
    // La siesta: no toca nada y la mesa juega por el (una por mesa, solo con reloj).
    if (st.turnRestanteMs && !m.siesta && chance(0.01)) {
      m.siesta = true;
      this.ctx.stats.siestas += 1;
      this.apuntar(`siesta (reloj ${st.turnRestanteMs} ms)`);
      return;
    }
    setTimeout(() => this.accion(st, clave), 80 + rnd(320));
  }

  /** La jugada, copiada del enjambre de mesas (enjambre.mjs). */
  async accion(st, clave) {
    const ctx = this.ctx;
    if (this.hecho !== clave || !this.sock?.connected) return;
    const code = st.roomCode;
    if (chance(0.03)) {
      ctx.stats.travesuras += 1;
      const ev = st.canPlay ? 'game:pass' : 'game:play';
      const r = await pedir(this.sock, ev, { code, tileIndex: 99, side: 'left' });
      if (r?.ok) ctx.error(`travesura-aceptada:${ev}`);
      else ctx.esperado(`travesura:${ev}`);
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
      ctx.error('estado-sin-accion');
      return;
    }
    ctx.stats.acciones += 1;
    const sock = this.sock;
    const doble = chance(0.05);
    const envio = pedir(sock, ev, datos);
    const eco = doble ? (ctx.stats.doblesToques += 1, pedir(sock, ev, datos)) : null;
    const r = await envio;
    this.apuntar(`${ev} ${JSON.stringify(datos)} -> ${r ? (r.ok ? 'ok' : r.error) : 'SIN RESPUESTA'}${doble ? ' (doble)' : ''}`);
    if (eco) {
      const r2 = await eco;
      if (r2 && !r2.ok) ctx.esperado(`doble-toque:${ev}`);
      else if (!r2 && sock.connected) ctx.error(`sin-respuesta-eco:${ev}`);
    }
    if (!r && !sock.connected) { ctx.esperado(`sin-acuse-socket-cerrado:${ev}`); return; }
    if (!r) { ctx.error(`sin-respuesta:${ev}`); return this.reintentar(clave); }
    if (!r.ok) {
      const ahora = this.ultimo;
      if (ahora && (String(ahora.currentPlayerId) !== this.userId || ahora.status !== 'playing')) ctx.esperado(`turno-ya-paso:${ev}`);
      else ctx.error(`rechazo-inesperado:${ev}:${r.error}`);
      return this.reintentar(clave);
    }
  }

  reintentar(clave) {
    if (this.rebotes >= 6) return;
    this.rebotes += 1;
    setTimeout(() => {
      const st = this.ultimo;
      if (!st || st.status !== 'playing' || String(st.currentPlayerId) !== this.userId) return;
      this.hecho = null;
      this.jugar(st);
    }, 300 + rnd(400));
  }

  /** Corte de conexion a mitad de partida: se va 1-4 s y vuelve a su mesa. */
  async corte() {
    const ctx = this.ctx;
    ctx.stats.reconexiones.cortesAMitad += 1;
    this.apuntar('corte de conexion');
    const mesa = this.mesa;
    this.cerrar();
    this.mesa = mesa;
    await sleep(1000 + rnd(3000));
    await this.volver(false);
  }
}

// ====================================================================== el torneo, de punta a punta

async function crearRobots(ctx, roles) {
  const robots = roles.map((rol, i) => new Robot(ctx, i + 1, rol));
  for (let k = 0; k < robots.length; k += 8) {
    await Promise.all(robots.slice(k, k + 8).map((r) => r.crearCuenta()));
  }
  for (const r of robots) ctx.porId.set(r.userId, r);
  ctx.robots = robots;
  const porRol = {};
  for (const r of robots) anotar(porRol, r.rol);
  ctx.stats.robots = { total: robots.length, porRol };
  return robots;
}

async function anotarTodos(ctx, robots, torneoId) {
  const res = {};
  await Promise.all(robots.map(async (r) => {
    const x = await ctx.http('POST', `/api/torneos/${torneoId}/register`, { token: r.token });
    anotar(res, String(x.status));
    if (x.status !== 201) ctx.error(`register:${x.status}:${x.j?.code ?? x.j?.error}`);
  }));
  return res;
}

/**
 * El bucle central: sondea el detalle, despacha las mesas que un robot no
 * haya recibido por el aviso (como la app al refrescar), vigila cruces
 * vencidos y el torneo quieto. Termina cuando el torneo cierra.
 */
async function seguirTorneo(ctx, { alSondear } = {}) {
  const inicio = Date.now();
  let firma = '';
  let cambioEn = Date.now();
  let latido = 0;
  const perro = setInterval(() => ctx.vigilar(), 2000);
  try {
    for (;;) {
      if (Date.now() - inicio > TOPE_ESCENARIO_MS) {
        ctx.stats.torneoParalizado = { motivo: 'tope del escenario', minutos: TOPE_ESCENARIO_MS / 60_000 };
        break;
      }
      const d = await ctx.http('GET', `/api/torneos/${ctx.torneoId}`);
      if (d.status !== 200) {
        if (!ctx.caido) ctx.error(`detalle:${d.status}`);
        await sleep(2000);
        continue;
      }
      const det = d.j;
      ctx.detalle = det;
      const t = det.torneo;
      if (t.estado === 'live' && !ctx.vivoDesde) {
        ctx.vivoDesde = Date.now();
        console.log(`  ${hora()} el torneo arranco (${det.cuadro.length} cruces, ${det.rondas} rondas)`);
      }

      // Despacho por sondeo: la mesa viva que el robot no tiene (aviso perdido o al volver).
      for (const c of det.cuadro) {
        const code = c.mesa?.code;
        if (!code || c.ganadorId != null) continue;
        if (!ctx.primeraVista.has(code)) ctx.primeraVista.set(code, Date.now());
        if (Date.now() - ctx.primeraVista.get(code) < 6000) continue;
        for (const lado of [c.a, c.b]) {
          const r = lado ? ctx.porId.get(lado.userId) : null;
          if (!r || r.rol === 'fantasma' || !r.sock?.connected || r.llamados.has(code)) continue;
          r.alLlamado(code, { deadlineAt: c.plazoEn }, 'sondeo');
        }
      }

      // Cruces vencidos que nadie resuelve (el barrido pasa cada 15 s).
      if (!ctx.caido && Date.now() > ctx.pausaHasta) {
        for (const c of det.cuadro) {
          if (c.ganadorId != null || !['ready', 'playing'].includes(c.estado) || !c.plazoEn || c.mesa?.empezada) continue;
          const pasado = Date.now() - Date.parse(c.plazoEn);
          if (pasado > 60_000 && !ctx.stats.crucesTrancados.some((x) => x.id === c.id)) {
            ctx.stats.crucesTrancados.push({ id: c.id, ronda: c.ronda, estado: c.estado, plazoEn: c.plazoEn, segundosVencido: Math.round(pasado / 1000), presentes: c.presentes, mesa: c.mesa });
            console.log(`  CRUCE TRANCADO ${c.id} (ronda ${c.ronda}) vencido hace ${Math.round(pasado / 1000)} s`);
          }
        }
      }

      if (alSondear) await alSondear(det);

      const nueva = JSON.stringify([t.estado, det.cuadro.map((c) => [c.estado, c.ganadorId, c.mesa?.code, c.mesa?.mano])]);
      if (nueva !== firma) { firma = nueva; cambioEn = Date.now(); }
      if (Date.now() - cambioEn > TORNEO_QUIETO_MS && !ctx.caido) {
        ctx.stats.torneoParalizado = { motivo: `${TORNEO_QUIETO_MS / 60_000} min sin ningun cambio`, pendientes: det.cuadro.filter((c) => c.ganadorId == null).map((c) => ({ id: c.id, ronda: c.ronda, estado: c.estado, plazoEn: c.plazoEn, mesa: c.mesa })) };
        console.log('  TORNEO PARALIZADO');
        break;
      }
      if (Date.now() - latido > 20_000) {
        latido = Date.now();
        const porRonda = {};
        for (const c of det.cuadro) { const x = (porRonda[c.ronda] ??= [0, 0]); x[1] += 1; if (c.ganadorId != null) x[0] += 1; }
        console.log(`  ${hora()} ${t.estado} ${Object.entries(porRonda).map(([r, [a, b]]) => `R${r}:${a}/${b}`).join(' ')} - mesas ${ctx.stats.mesas.completas}/${ctx.stats.mesas.arrancadas}, acciones ${ctx.stats.acciones}, reconexiones ${ctx.stats.reconexiones.cortesAMitad + ctx.stats.reconexiones.porCaida}, paralizadas ${ctx.stats.paralizadas.length}`);
      }
      if (t.estado === 'completed' || t.estado === 'cancelled') break;
      await sleep(2000);
    }
  } finally {
    clearInterval(perro);
  }
  // Los avisos del podio y de los puntos llegan en el mismo instante: un respiro.
  await sleep(3000);
  const fin = await ctx.http('GET', `/api/torneos/${ctx.torneoId}`);
  if (fin.status === 200) ctx.detalle = fin.j;
}

/** Lo que dejo el torneo: duracion, cruces por motivo, podio, 3.º, puntos. */
async function cerrarCuentas(ctx) {
  const det = ctx.detalle;
  const t = det?.torneo;
  if (!t) return;
  const porMotivo = {};
  for (const c of det.cuadro) if (c.ganadorId != null) anotar(porMotivo, c.motivo ?? 'sin-motivo');
  ctx.stats.cruces = { total: det.cuadro.length, cerrados: det.cuadro.filter((c) => c.ganadorId != null).length, porMotivo };
  const rondaFinal = det.rondas;
  const final = det.cuadro.find((c) => c.ronda === rondaFinal && !c.tercerPuesto);
  const tercero = det.cuadro.find((c) => c.tercerPuesto);
  ctx.stats.torneo = {
    id: t.id,
    nombre: t.nombre,
    tipo: t.tipo,
    estado: t.estado,
    cupo: t.cupo,
    empiezaEn: t.empiezaEn,
    terminadoEn: t.terminadoEn,
    duracionSegundos: t.terminadoEn ? Math.round((Date.parse(t.terminadoEn) - Date.parse(t.empiezaEn)) / 1000) : null,
    desdeElArranqueSegundos: t.terminadoEn && ctx.vivoDesde ? Math.round((Date.parse(t.terminadoEn) - ctx.vivoDesde) / 1000) : null,
    rondas: det.rondas,
    anotados: det.jugadores.length,
    jugadores: det.jugadores.filter((j) => j.estado === 'registered').length,
    bots: det.jugadores.filter((j) => j.esBot).length,
    campeon: t.campeon,
    podio: det.podio,
    tercerPuesto: det.tercerPuesto
  };

  // El podio: tres puestos, distintos, leidos de la final y del cruce por el 3.º.
  const p = det.podio ?? [];
  const okPodio = t.estado === 'completed' && p.length === 3 && new Set(p.map((x) => x.userId)).size === 3 && p.map((x) => x.puesto).join() === '1,2,3'
    && final?.ganadorId === p[0].userId && [final.a?.userId, final.b?.userId].includes(p[1].userId) && p[1].userId !== final.ganadorId
    && t.campeon?.userId === p[0].userId;
  ctx.regla('podio', okPodio, { campeon: t.campeon, podio: p.map((x) => `${x.puesto}:${x.username}${x.esBot ? ' (bot)' : ''}:${x.puntos}`), final: final && { a: final.a?.username, b: final.b?.username, ganador: final.ganadorId, motivo: final.motivo } });
  ctx.regla('tercerPuesto', Boolean(tercero && tercero.ganadorId && p[2]?.userId === tercero.ganadorId && ctx.detalle.tercerPuesto?.ganadorId === tercero.ganadorId),
    tercero ? { a: tercero.a?.username, b: tercero.b?.username, ganador: tercero.ganadorId, motivo: tercero.motivo } : 'no hubo cruce por el 3.º');
  ctx.regla('avisoDelPodio', Boolean(ctx.podioEvento && ctx.podioEvento.podio?.length === 3), ctx.podioEvento ? `llego a ${ctx.robots.filter((r) => r.eventos.podium).length} robots` : 'no llego tournament:podium');

  // Los puntos del premio: solo a las cuentas del podio, exactos, y nada a nadie mas.
  const problemas = [];
  for (const x of p) {
    if (x.esBot) {
      if (/^\d+$/.test(x.userId)) problemas.push(`${x.username} es bot con id de cuenta`);
      continue;
    }
    const r = ctx.porId.get(x.userId);
    if (!r) { problemas.push(`${x.username} no es un robot conocido`); continue; }
    if (r.sock) {
      const premio = r.premios.filter((c) => c.cambio === x.puntos);
      if (x.puntos > 0 && premio.length !== 1) problemas.push(`${x.username} (puesto ${x.puesto}) recibio ${JSON.stringify(r.premios)} en vez de +${x.puntos}`);
    } else {
      // Sin socket (fantasma): no jugo nada, asi que su clasificacion es el premio.
      const mio = await ctx.http('GET', '/api/ranking/mio', { token: r.token });
      if (mio.j?.puntos !== x.puntos) problemas.push(`${x.username} (fantasma, puesto ${x.puesto}) tiene ${mio.j?.puntos} puntos, esperaba ${x.puntos}`);
    }
  }
  const podioIds = new Set(p.map((x) => x.userId));
  for (const r of ctx.robots) if (!podioIds.has(r.userId) && r.premios.length) problemas.push(`${r.nombre} no esta en el podio y recibio ${JSON.stringify(r.premios)}`);
  const tabla = await ctx.http('GET', '/api/ranking?cuantos=500');
  const filas = tabla.j?.tabla ?? [];
  const noCuentas = filas.filter((f) => !/^\d+$/.test(String(f.userId ?? f.user_id ?? f.id ?? '0')));
  if (noCuentas.length) problemas.push(`la clasificacion tiene ${noCuentas.length} filas que no son cuentas`);
  ctx.regla('puntosSoloACuentas', problemas.length === 0, problemas.length ? problemas : `podio: ${p.map((x) => `${x.username}${x.esBot ? '(bot, sin puntos)' : ` +${x.puntos}`}`).join(', ')}`);
}

function veredicto(ctx) {
  const s = ctx.stats;
  const inesperados = Object.values(s.errores).reduce((a, b) => a + b, 0);
  const reglasRojas = Object.entries(s.reglas).filter(([, v]) => v.ok === false).map(([k]) => k);
  const quejasGraves = s.servidor.quejas.filter((l) => /TypeError|ReferenceError|RangeError|Unhandled|uncaught|FATAL|falló|no se pudo avanzar/i.test(l));
  const motivos = [];
  if (s.torneo?.estado !== 'completed') motivos.push(`el torneo quedo ${s.torneo?.estado ?? 'sin datos'}`);
  if (!s.torneo?.campeon) motivos.push('sin campeon');
  if (s.paralizadas.length) motivos.push(`${s.paralizadas.length} mesas paralizadas`);
  if (s.crucesTrancados.length) motivos.push(`${s.crucesTrancados.length} cruces trancados`);
  if (s.torneoParalizado) motivos.push('torneo paralizado');
  if (inesperados) motivos.push(`${inesperados} errores inesperados`);
  if (reglasRojas.length) motivos.push(`reglas en rojo: ${reglasRojas.join(', ')}`);
  if (quejasGraves.length) motivos.push(`${quejasGraves.length} quejas graves en el log del servidor`);
  s.veredicto = motivos.length ? { color: 'ROJO', motivos } : { color: 'VERDE', motivos: [] };
  return !motivos.length;
}

function escribir(ctx) {
  fs.mkdirSync(REPORTES, { recursive: true });
  const archivo = path.join(REPORTES, `torneo-${ctx.escenario}.json`);
  ctx.stats.fin = new Date().toISOString();
  ctx.stats.segundosDelEscenario = Math.round((Date.parse(ctx.stats.fin) - Date.parse(ctx.stats.inicio)) / 1000);
  fs.writeFileSync(archivo, JSON.stringify(ctx.stats, null, 2));
  const s = ctx.stats;
  console.log(`\n====== ${ctx.escenario.toUpperCase()} ======`);
  console.log(`Torneo:        ${s.torneo?.nombre} (${s.torneo?.estado}), ${s.torneo?.jugadores} en el cuadro (${s.torneo?.bots} de la casa, ${s.torneo?.anotados} anotados), ${s.torneo?.rondas} rondas`);
  console.log(`Duracion:      ${s.torneo?.duracionSegundos} s desde la hora de arranque (${s.torneo?.desdeElArranqueSegundos} s desde que se armo el cuadro)`);
  console.log(`Campeon:       ${s.torneo?.campeon?.username ?? '-'}  Podio: ${(s.torneo?.podio ?? []).map((x) => `${x.puesto}.${x.username}`).join('  ')}`);
  console.log(`Cruces:        ${s.cruces.cerrados}/${s.cruces.total} ${JSON.stringify(s.cruces.porMotivo)}`);
  console.log(`Mesas:         ${JSON.stringify(s.mesas)}`);
  console.log(`Acciones:      ${s.acciones} (dobles ${s.doblesToques}, travesuras ${s.travesuras}, siestas ${s.siestas}, impacientes ${JSON.stringify(s.impacientes)})`);
  console.log(`Reconexiones:  ${JSON.stringify(s.reconexiones)}`);
  if (s.reinicio) console.log(`Reinicio:      ${JSON.stringify(s.reinicio)}`);
  console.log(`PARALIZADAS:   ${s.paralizadas.length}  cruces trancados ${s.crucesTrancados.length}  torneo quieto ${s.torneoParalizado ? 'SI' : 'no'}`);
  console.log(`Errores:       ${JSON.stringify(s.errores)}`);
  console.log(`Esperados:     ${JSON.stringify(s.rechazosEsperados)}`);
  console.log('Reglas:');
  for (const [k, v] of Object.entries(s.reglas)) console.log(`  ${v.ok === true ? 'OK   ' : v.ok === false ? 'ROJO ' : 'n/a  '} ${k}: ${typeof v.detalle === 'string' ? v.detalle : JSON.stringify(v.detalle)}`);
  if (s.servidor.quejas.length) console.log(`Log del servidor (${s.servidor.quejas.length} lineas de torneo/excepcion): ver ${archivo}`);
  console.log(`Veredicto:     ${s.veredicto.color}${s.veredicto.motivos.length ? ` - ${s.veredicto.motivos.join('; ')}` : ''}`);
  console.log(`Detalle en ${archivo}`);
}

// ====================================================================== los escenarios

async function prepararBanco(nombre, extraEnv) {
  if (API_AJENA) return { banco: null, api: API_AJENA };
  const banco = new Banco(nombre, extraEnv);
  await banco.levantar();
  return { banco, api: banco.api };
}

async function ponerPerillas(ctx) {
  if (!ctx.propio) return;
  for (const [k, v] of Object.entries(PERILLAS_BANCO)) await ctx.perilla(k, v);
}

async function crearTorneoDelSocio(ctx, datos) {
  const r = await ctx.http('POST', '/api/socio/torneos', { socio: true, body: datos });
  if (r.status !== 201) throw new Error(`crear torneo: ${r.status} ${JSON.stringify(r.j)}`);
  return r.j.torneo;
}

/** 1. El torneo normal: 32 cuentas, fantasmas, NO VOY, VOY ocupados, cortes. */
async function escenarioNormal(ctx) {
  const N = ROBOTS_ARG ?? 32;
  const fantasmas = Math.round(N * 0.15);
  const roles = barajar([
    ...Array(fantasmas).fill('fantasma'),
    ...Array(2).fill('noVoy'),
    ...Array(3).fill('voyOcupado'),
    ...Array(Math.max(0, N - fantasmas - 5)).fill('normal')
  ]);
  const robots = await crearRobots(ctx, roles);
  // Un invitado no se puede anotar (solo cuentas).
  const empiezaEn = Date.now() + 90_000;
  const t = await crearTorneoDelSocio(ctx, { nombre: `Enjambre ${TANDA} normal`, empiezaEn, puntos: 24, cupo: N, relleno: true, cuadroMinimo: Math.min(16, N), premios: [100, 50, 25], botNivel: 'casa' });
  ctx.torneoId = t.id;
  console.log(`  ${hora()} torneo ${t.id} «${t.nombre}» arranca ${new Date(empiezaEn).toLocaleTimeString()}`);
  const inv = await ctx.http('POST', `/api/torneos/${t.id}/register`, { body: { guestId: `guest-enj${TANDA}inv`, guestName: 'Invitado Enj' } });
  ctx.regla('soloCuentas', inv.status === 403 && inv.j?.code === 'necesita_cuenta', { status: inv.status, code: inv.j?.code });
  const anotados = await anotarTodos(ctx, robots, t.id);
  console.log(`  ${hora()} anotados: ${JSON.stringify(anotados)}; roles ${JSON.stringify(ctx.stats.robots.porRol)}`);
  for (const r of robots) if (r.rol !== 'fantasma') await r.conectar();

  await seguirTorneo(ctx);
  await cerrarCuentas(ctx);

  // Reglas del escenario.
  const det = ctx.detalle;
  const esFantasma = (id) => ctx.porId.get(id)?.rol === 'fantasma';
  const conFantasma = det.cuadro.filter((c) => c.a && c.b && (esFantasma(c.a.userId) || esFantasma(c.b.userId)));
  const malos = conFantasma.filter((c) => {
    const fa = esFantasma(c.a.userId);
    const fb = esFantasma(c.b.userId);
    if (fa && fb) return c.motivo !== 'no_show';
    // Contra un fantasma: pasa el que vino, por walkover. (Si el que vino dijo NO VOY, cede.)
    const vino = fa ? c.b.userId : c.a.userId;
    const r = ctx.porId.get(vino);
    if (r?.noVoy?.code && c.motivo === 'cedio_el_cruce') return false;
    return !(c.motivo === 'no_show' && c.ganadorId === vino);
  });
  ctx.regla('walkoverDelFantasma', conFantasma.length > 0 && malos.length === 0, { crucesConFantasma: conFantasma.length, mal: malos.map((c) => ({ id: c.id, motivo: c.motivo, ganador: c.ganadorId })) });
  const noVoy = robots.filter((r) => r.rol === 'noVoy' && r.noVoy);
  const noVoyOk = noVoy.every((r) => r.noVoy?.status === 200 && det.cuadro.some((c) => c.motivo === 'cedio_el_cruce' && (c.a?.userId === r.userId || c.b?.userId === r.userId) && c.ganadorId !== r.userId));
  ctx.regla('noVoyCedeElCruce', noVoy.length ? noVoyOk : null, noVoy.map((r) => ({ robot: r.nombre, respuesta: r.noVoy?.status })));
  const voy = robots.filter((r) => r.rol === 'voyOcupado' && r.voy);
  const voyDet = voy.map((r) => {
    const suyo = det.cuadro.find((c) => c.id === r.voy.cruceId);
    const perdioPorNoVenir = suyo && suyo.motivo === 'no_show' && suyo.ganadorId !== r.userId;
    return { robot: r.nombre, prorroga1: r.voy?.primera?.prorrogaMinutos, prorroga2: r.voy?.segunda?.prorrogaMinutos, plazoOriginal: r.voy?.plazoOriginal, plazoNuevo: r.voy?.primera?.deadlineAt, llegoA: r.voy?.llegaA, cruce: suyo && { motivo: suyo.motivo, gano: suyo.ganadorId === r.userId }, perdioPorNoVenir };
  });
  const voyOk = voyDet.every((x) => x.prorroga1 === PERILLAS_BANCO['torneos.prorrogaMin'] && x.prorroga2 === 0 && !x.perdioPorNoVenir);
  ctx.regla('voyDaProrrogaUnaVez', voy.length && ctx.propio ? voyOk : null, voyDet);
}

/** Hora y minuto en Caracas de un instante. */
function enCaracas(ms) {
  const partes = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ms));
  return { hora: Number(partes.find((p) => p.type === 'hour').value) % 24, minuto: Number(partes.find((p) => p.type === 'minute').value) };
}

/** 2. El Relampago que publica la grilla. */
async function escenarioRelampago(ctx) {
  const N = ROBOTS_ARG ?? 20;
  const CUPO = 12;
  const roles = barajar([...Array(3).fill('ausente'), ...Array(2).fill('tarde'), ...Array(N - 5).fill('normal')]);
  const robots = await crearRobots(ctx, roles);

  const antes = await ctx.http('GET', '/api/socio/torneos/relampago', { socio: true });
  if (antes.status !== 200) throw new Error(`relampago GET: ${antes.status}`);
  const cfgVieja = antes.j.relampago;
  const yaHabia = new Set(((await ctx.http('GET', '/api/socio/torneos', { socio: true })).j?.torneos ?? []).map((t) => t.id));
  ctx.stats.relampagoAntes = cfgVieja;

  // La franja 1 a ~2 min (al minuto redondo), la 2 cinco minutos despues.
  const f1 = Math.ceil((Date.now() + 120_000) / 60_000) * 60_000;
  const d = enCaracas(f1);
  const h = enCaracas(f1 + 5 * 60_000);
  const cruzaMedianoche = h.hora * 60 + h.minuto < d.hora * 60 + d.minuto;
  const put = await ctx.http('PUT', '/api/socio/torneos/relampago', {
    socio: true,
    body: {
      on: true, prendidoPor: 'enjambre-213', desdeFecha: null, hastaFecha: null,
      desdeHora: d.hora, desdeMinuto: d.minuto, hastaHora: cruzaMedianoche ? d.hora : h.hora, hastaMinuto: cruzaMedianoche ? d.minuto : h.minuto,
      cadaMinutos: 5, anticipacionHoras: 1, capacidad: CUPO, cuadroMinimo: 8, puntos: 24, botNivel: 'casa'
    }
  });
  if (put.status !== 200) throw new Error(`relampago PUT: ${put.status} ${JSON.stringify(put.j)}`);
  const lista = (await ctx.http('GET', '/api/socio/torneos', { socio: true })).j?.torneos ?? [];
  const nuevos = lista.filter((t) => t.tipo === 'relampago' && !yaHabia.has(t.id)).sort((a, b) => Date.parse(a.empiezaEn) - Date.parse(b.empiezaEn));
  const t1 = nuevos.find((t) => Date.parse(t.empiezaEn) === f1);
  const t2 = nuevos.find((t) => Date.parse(t.empiezaEn) === f1 + 5 * 60_000) ?? null;
  ctx.regla('grillaPublica', Boolean(t1), { publicados: nuevos.map((t) => `${t.id} ${t.nombre} ${t.empiezaEn}`) });
  if (!t1) throw new Error('la grilla no publico la franja');
  ctx.torneoId = t1.id;
  ctx.stats.franjas = { f1: t1 && { id: t1.id, nombre: t1.nombre, empiezaEn: t1.empiezaEn }, f2: t2 && { id: t2.id, nombre: t2.nombre, empiezaEn: t2.empiezaEn } };
  console.log(`  ${hora()} la grilla publico «${t1.nombre}» (${t1.id}) y ${t2 ? `«${t2.nombre}» (${t2.id})` : 'ninguna mas'}`);

  try {
    // Se anotan los 20 con cupo 12: el Relampago admite overbooking.
    const anotados = await anotarTodos(ctx, robots, t1.id);
    ctx.regla('overbooking', anotados['201'] === N, { anotados, cupo: CUPO });
    // Uno a la vez: anotado en el 1, no se puede anotar en el 2.
    if (t2) {
      const x = await ctx.http('POST', `/api/torneos/${t2.id}/register`, { token: robots[0].token });
      ctx.regla('unoALaVez.anotado', x.status === 409 && x.j?.code === 'relampago_pendiente' && x.j?.pendienteId === t1.id, { status: x.status, code: x.j?.code, error: x.j?.error });
    } else ctx.regla('unoALaVez.anotado', null, 'no hubo franja siguiente (medianoche)');

    // A la ventana llegan los normales; los ausentes nunca y los tarde despues del armado.
    for (const r of robots) if (r.rol === 'normal') await r.conectar();
    console.log(`  ${hora()} ${robots.filter((r) => r.sock).length} robots conectados esperando la ventana`);

    let armado = false;
    let puertaHecha = false;
    let cerradaProbada = false;
    let eliminadoProbado = false;
    const ausentes = robots.filter((r) => r.rol === 'ausente');
    const tarde = robots.filter((r) => r.rol === 'tarde');
    await seguirTorneo(ctx, {
      alSondear: async (det) => {
        const t = det.torneo;
        if (!armado && t.estado === 'live') {
          armado = true;
          const personas = det.jugadores.filter((j) => !j.esBot);
          const por = {};
          for (const j of personas) anotar(por, j.estado);
          const ausentesVistos = personas.filter((j) => j.estado === 'ausente').map((j) => j.userId);
          const debenFaltar = [...ausentes, ...tarde].map((r) => r.userId);
          const presentesNormales = robots.filter((r) => r.rol === 'normal').length;
          ctx.regla('seArmaConLosQueEstan', por.registered === Math.min(CUPO, presentesNormales) && por.ausente === debenFaltar.length && debenFaltar.every((id) => ausentesVistos.includes(id)) && (por.sin_cupo ?? 0) === Math.max(0, presentesNormales - CUPO),
            { estados: por, ausentesEsperados: debenFaltar.length, sinCupoEsperados: Math.max(0, presentesNormales - CUPO) });
          ctx.regla('ventanaSientateYa', robots.filter((r) => r.eventos.armando).length >= presentesNormales, `${robots.filter((r) => r.eventos.armando).length} robots recibieron tournament:armando`);
          for (const r of robots) if (personas.find((j) => j.userId === r.userId)?.estado === 'sin_cupo') r.rol = 'sinCupo';
          // Uno a la vez con el torneo en juego: el vivo no; el ausente si.
          if (t2) {
            const vivo = robots.find((r) => personas.find((j) => j.userId === r.userId)?.estado === 'registered');
            const x = await ctx.http('POST', `/api/torneos/${t2.id}/register`, { token: vivo.token });
            ctx.regla('unoALaVez.vivo', x.status === 409 && x.j?.code === 'relampago_pendiente', { status: x.status, code: x.j?.code });
            const y = await ctx.http('POST', `/api/torneos/${t2.id}/register`, { token: ausentes[0].token });
            const z = y.status === 201 ? await ctx.http('POST', `/api/torneos/${t2.id}/unregister`, { token: ausentes[0].token }) : null;
            ctx.regla('unoALaVez.ausenteLibre', y.status === 201 && z?.status === 200, { register: y.status, unregister: z?.status, code: y.j?.code });
          }
          // Los que llegan tarde: abren la app, ven la puerta y entran.
          const puerta = [];
          for (const r of tarde) {
            await r.conectar();
            const dd = await ctx.http('GET', `/api/torneos/${t.id}`, { token: r.token });
            const e = await ctx.http('POST', `/api/torneos/${t.id}/entrar-tarde`, { token: r.token });
            puerta.push({ robot: r.nombre, estado: dd.j?.me?.registrationStatus, puertaHasta: dd.j?.me?.puertaHasta, status: e.status, ok: e.j?.ok, codigo: e.j?.codigo });
            if (e.j?.ok) r.rol = 'normal';
          }
          // Uno sin cupo tambien prueba la puerta (vale para ausente y sin_cupo).
          const sc = robots.find((r) => r.rol === 'sinCupo');
          if (sc) {
            const e = await ctx.http('POST', `/api/torneos/${t.id}/entrar-tarde`, { token: sc.token });
            puerta.push({ robot: sc.nombre, estado: 'sin_cupo', status: e.status, ok: e.j?.ok, codigo: e.j?.codigo, llegasteTarde: sc.llegasteTarde?.motivo });
            if (e.j?.ok) sc.rol = 'normal';
          }
          ctx.stats.puerta = puerta;
          const tardeOk = puerta.filter((x) => tarde.some((r) => r.nombre === x.robot));
          ctx.regla('puertaAbierta', tardeOk.length === tarde.length && tardeOk.every((x) => x.estado === 'ausente' && x.puertaHasta && x.ok === true),
            puerta);
          const avisoSinCupo = robots.filter((r) => r.eventos['llegaste_tarde:sin_cupo']).length;
          ctx.regla('llegasteTardeSinCupo', (por.sin_cupo ?? 0) === 0 ? null : avisoSinCupo === por.sin_cupo, `${avisoSinCupo} de ${por.sin_cupo ?? 0} sin cupo recibieron tournament:llegaste_tarde`);
          ctx.puertaHasta = puerta.find((x) => x.puertaHasta)?.puertaHasta ?? null;
        }
        // Eliminado del 1: ya se puede anotar en el 2 (si sigue abierto).
        if (armado && t2 && !eliminadoProbado) {
          const perdido = det.cuadro.find((c) => c.ganadorId != null && c.motivo === 'partida' && !c.tercerPuesto);
          const perdedorId = perdido && (perdido.a?.userId === perdido.ganadorId ? perdido.b?.userId : perdido.a?.userId);
          const r = perdedorId && ctx.porId.get(perdedorId);
          const sigue = r && det.cuadro.some((c) => c.ganadorId == null && (c.a?.userId === r.userId || c.b?.userId === r.userId));
          if (r && !sigue) {
            eliminadoProbado = true;
            const y = await ctx.http('POST', `/api/torneos/${t2.id}/register`, { token: r.token });
            const z = y.status === 201 ? await ctx.http('POST', `/api/torneos/${t2.id}/unregister`, { token: r.token }) : null;
            const cerrada = y.status === 400 && y.j?.code === 'cerrada';
            ctx.regla('unoALaVez.eliminadoLibre', cerrada ? null : y.status === 201 && z?.status === 200, cerrada ? 'la franja 2 ya habia cerrado la inscripcion' : { register: y.status, code: y.j?.code, unregister: z?.status });
          }
        }
        // La puerta se cierra a su hora.
        if (armado && ctx.puertaHasta && !cerradaProbada && Date.now() > Date.parse(ctx.puertaHasta) + 3000) {
          cerradaProbada = true;
          const e = await ctx.http('POST', `/api/torneos/${t.id}/entrar-tarde`, { token: ausentes[1].token });
          ctx.regla('puertaSeCierra', e.status === 409 && e.j?.codigo === 'cerrada', { status: e.status, codigo: e.j?.codigo });
        }
      }
    });
    if (!cerradaProbada) {
      // Termino antes de que venciera la puerta: con el torneo cerrado tambien es «cerrada».
      const e = await ctx.http('POST', `/api/torneos/${t1.id}/entrar-tarde`, { token: ausentes[1].token });
      ctx.regla('puertaSeCierra', e.status === 409 && e.j?.codigo === 'cerrada', { status: e.status, codigo: e.j?.codigo, nota: 'probada con el torneo ya terminado' });
    }
    // Los de la puerta jugaron de verdad.
    const jugaron = tarde.filter((r) => ctx.detalle.cuadro.some((c) => c.motivo === 'partida' && (c.a?.userId === r.userId || c.b?.userId === r.userId)));
    ctx.stats.puertaJugaron = jugaron.map((r) => r.nombre);
    await cerrarCuentas(ctx);
    ctx.regla('puertaJuegan', jugaron.length === tarde.length, `${jugaron.length} de ${tarde.length} de los que entraron por la puerta jugaron su cruce`);
  } finally {
    // Apagar la grilla, dejar la config como estaba y cancelar las franjas sobrantes.
    const { proximaFranja, premios, modo, ...vieja } = cfgVieja;
    const r = await ctx.http('PUT', '/api/socio/torneos/relampago', { socio: true, body: { ...vieja, on: false } });
    const despues = await ctx.http('GET', '/api/socio/torneos/relampago', { socio: true });
    const sobrantes = ((await ctx.http('GET', '/api/socio/torneos', { socio: true })).j?.torneos ?? []).filter((t) => t.tipo === 'relampago' && !yaHabia.has(t.id) && t.estado === 'registration');
    for (const t of sobrantes) await ctx.http('POST', `/api/socio/torneos/${t.id}/cancel`, { socio: true });
    const d2 = despues.j?.relampago ?? {};
    const restaurada = r.status === 200 && d2.on === false && ['desdeHora', 'desdeMinuto', 'hastaHora', 'hastaMinuto', 'cadaMinutos', 'capacidad', 'cuadroMinimo', 'anticipacionHoras'].every((k) => d2[k] === vieja[k]);
    ctx.stats.relampagoRestaurado = { apagada: d2.on === false, restaurada, sobrantesCancelados: sobrantes.map((t) => t.id) };
    ctx.regla('grillaApagadaYRestaurada', restaurada, ctx.stats.relampagoRestaurado);
  }
}

/** 3. El reinicio: se mata el banco en plena ronda 2 y se levanta con la misma base. */
async function escenarioReinicio(ctx, banco) {
  if (!banco) throw new Error('El reinicio solo corre en el banco propio (nunca contra un servidor compartido)');
  const N = ROBOTS_ARG ?? 12;
  const robots = await crearRobots(ctx, Array(N).fill('normal'));
  const empiezaEn = Date.now() + 60_000;
  const t = await crearTorneoDelSocio(ctx, { nombre: `Enjambre ${TANDA} reinicio`, empiezaEn, puntos: 24, cupo: 16, relleno: true, cuadroMinimo: 16, premios: [100, 50, 25], botNivel: 'casa' });
  ctx.torneoId = t.id;
  console.log(`  ${hora()} torneo ${t.id} «${t.nombre}» arranca ${new Date(empiezaEn).toLocaleTimeString()} (la casa rellena a 16)`);
  await anotarTodos(ctx, robots, t.id);
  for (const r of robots) await r.conectar();
  let matado = false;
  const rein = { hecho: false };
  ctx.stats.reinicio = rein;
  await seguirTorneo(ctx, {
    alSondear: async (det) => {
      if (matado) {
        // Despues del reinicio: la primera mesa NUEVA de un cruce que se corto.
        if (!rein.primeraMesaNuevaSeg) {
          const nueva = det.cuadro.find((c) => rein.crucesCortados?.includes(c.id) && c.mesa?.code && !rein.codesViejos.includes(c.mesa.code));
          if (nueva) rein.primeraMesaNuevaSeg = Math.round((Date.now() - rein.volvioEnMs) / 1000);
        }
        return;
      }
      // En plena ronda 2 de verdad: la 1 cerrada entera y una mesa de la 2 con una persona jugando.
      const r1Cerrada = det.cuadro.filter((c) => c.ronda === 1).every((c) => c.ganadorId != null);
      const enR2 = det.cuadro.find((c) => c.ronda === 2 && c.mesa?.empezada && (!c.a?.esBot || !c.b?.esBot));
      if (!r1Cerrada || !enR2) return;
      matado = true;
      rein.ganadoresAntes = Object.fromEntries(det.cuadro.filter((c) => c.ganadorId != null).map((c) => [c.id, c.ganadorId]));
      rein.codesViejos = det.cuadro.map((c) => c.mesa?.code).filter(Boolean);
      rein.crucesCortados = det.cuadro.filter((c) => c.ganadorId == null && c.mesa?.code).map((c) => c.id);
      rein.mesasEnJuegoAlCaer = det.cuadro.filter((c) => c.mesa?.empezada).length;
      console.log(`  ${hora()} MATANDO el banco en plena ronda 2 (${rein.mesasEnJuegoAlCaer} mesas en juego, ${rein.crucesCortados.length} cruces con mesa)`);
      ctx.caido = true;
      rein.caidaEn = new Date().toISOString();
      await banco.matar();
      for (const m of ctx.mesas.values()) if (!m.fin) { m.fin = true; m.perdidaEnReinicio = true; }
      await sleep(3000);
      await banco.levantar();
      ctx.reiniciado = true;
      rein.volvioEnMs = Date.now();
      rein.volvioEn = new Date().toISOString();
      rein.segundosCaido = Math.round((rein.volvioEnMs - Date.parse(rein.caidaEn)) / 1000);
      ctx.caido = false;
      ctx.pausar(20_000);
      rein.hecho = true;
      console.log(`  ${hora()} el banco volvio (${rein.segundosCaido} s caido)`);
    }
  });
  await cerrarCuentas(ctx);
  const det = ctx.detalle;
  const perdidos = Object.entries(rein.ganadoresAntes ?? {}).filter(([id, g]) => det.cuadro.find((c) => String(c.id) === id)?.ganadorId !== g);
  rein.ganadoresConservados = perdidos.length === 0;
  const noShow = det.cuadro.filter((c) => c.motivo === 'no_show').map((c) => ({ id: c.id, ronda: c.ronda, a: c.a?.username, b: c.b?.username }));
  ctx.regla('reinicioRetoma', rein.hecho && det.torneo.estado === 'completed', { segundosCaido: rein.segundosCaido, primeraMesaNuevaSeg: rein.primeraMesaNuevaSeg ?? null });
  ctx.regla('reinicioConservaElCuadro', rein.hecho ? perdidos.length === 0 : null, perdidos.length ? perdidos : `${Object.keys(rein.ganadoresAntes ?? {}).length} cruces cerrados antes del reinicio, intactos`);
  // Nadie pierde por un reinicio nuestro: sin fantasmas, ningun cruce se cierra por no venir.
  ctx.regla('nadiePierdePorElReinicio', rein.hecho ? noShow.length === 0 : null, noShow.length ? noShow : 'ningun walkover');
}

// ====================================================================== main

const ESCENARIOS = {
  normal: { fn: escenarioNormal, env: { TORNEO_GRACIA_REINICIO_MS: '20000' } },
  relampago: { fn: escenarioRelampago, env: { TORNEO_GRACIA_REINICIO_MS: '20000' } },
  reinicio: { fn: escenarioReinicio, env: { TORNEO_GRACIA_REINICIO_MS: '45000' } }
};

async function correr(nombre) {
  const esc = ESCENARIOS[nombre];
  console.log(`\n>>> Escenario ${nombre} ${API_AJENA ? `contra ${API_AJENA}` : `en el banco propio (puerto ${PUERTO})`}`);
  if (nombre === 'reinicio' && API_AJENA) {
    console.log('  El reinicio nunca corre contra un servidor ajeno: se salta.');
    return true;
  }
  const { banco, api } = await prepararBanco(nombre, esc.env);
  const ctx = new Contexto(nombre, api, { propio: Boolean(banco) });
  let ok = false;
  try {
    await ponerPerillas(ctx);
    await esc.fn(ctx, banco);
  } catch (e) {
    ctx.error(`escenario:${e.message}`);
    console.error(`  se cayo el escenario: ${e.stack ?? e}`);
  } finally {
    ctx.cerrado = true;
    for (const r of ctx.robots) r.cerrar();
    if (banco) ctx.stats.servidor.quejas = banco.quejas();
    ok = veredicto(ctx);
    escribir(ctx);
    if (banco) await banco.bajar();
  }
  return ok;
}

(async () => {
  const lista = ESCENARIO === 'todos' ? Object.keys(ESCENARIOS) : [ESCENARIO];
  if (!lista.every((n) => ESCENARIOS[n])) {
    console.error(`Escenario desconocido "${ESCENARIO}". Escenarios: ${Object.keys(ESCENARIOS).join(', ')}, todos`);
    process.exit(2);
  }
  const resultados = [];
  for (const n of lista) resultados.push([n, await correr(n)]);
  console.log('\n====== ENJAMBRE DE TORNEO ======');
  for (const [n, ok] of resultados) console.log(`  ${ok ? 'VERDE' : 'ROJO '}  ${n}`);
  const rojo = resultados.some(([, ok]) => !ok);
  setTimeout(() => process.exit(rojo ? 1 : 0), 300);
})().catch((e) => {
  console.error('\n====== ENJAMBRE DE TORNEO: ROJO (se cayo) ======');
  console.error(e?.stack ?? e);
  setTimeout(() => process.exit(1), 300);
});
