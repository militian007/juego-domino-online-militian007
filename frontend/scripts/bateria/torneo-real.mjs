// UN TORNEO DE VERDAD, DE PUNTA A PUNTA (seccion 212): el socio crea un torneo
// a 24 con la casa rellenando el cuadro; una persona (invitado con su nombre)
// se anota desde la vitrina, le llega «tu mesa esta lista», la pantalla la
// SIENTA sola, juega su partida hasta el final, pasa o queda fuera, mira una
// mesa en vivo y ve el podio cuando el torneo termina. Todo a 390x844.
//
//   BATERIA_FRONT  la pantalla (http://localhost:5173)
//   BATERIA_API    el servidor (http://127.0.0.1:4000)
//   BATERIA_LLAVE  la llave del socio (llave-de-prueba, la del banco de la bateria)
//   BATERIA_CUADRO cuantos en el cuadro (8; 16 para la noche entera)
//   BATERIA_BOT_NIVEL como juega la casa (novato)
//   DOMINO_OUT     donde van las fotos
//
// Sale 0 si todo el camino se cumplio; 1 si algo fallo (con el motivo).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://127.0.0.1:4000';
const LLAVE = process.env.BATERIA_LLAVE || 'llave-de-prueba';
const CUADRO = Number(process.env.BATERIA_CUADRO || 8);
const ARRANCA_S = Number(process.env.BATERIA_ARRANCA_S || 70);
const TOPE_MIN = Number(process.env.BATERIA_TOPE_MIN || 25);
// La casa en novato: asi la persona suele pasar de ronda y se prueba el «te llevo a tu siguiente mesa».
const BOT_NIVEL = process.env.BATERIA_BOT_NIVEL || 'novato';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out', 'torneo-real');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`, ...a);
const pasos = [];
const cumplido = (paso, ok = true, nota = '') => { pasos.push({ paso, ok, nota }); log(ok ? 'OK ' : 'MAL', paso, nota); };

async function socio(ruta, { method = 'GET', body } = {}) {
  const r = await fetch(`${API}/api/socio/torneos${ruta}`, { method, headers: { 'X-Llave': LLAVE, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${ruta}: ${r.status} ${j.error || ''}`);
  return j;
}
async function perilla(clave, valor) {
  const r = await fetch(`${API}/api/config?llave=${encodeURIComponent(LLAVE)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave, valor }) });
  return r.ok;
}
async function perillas() {
  const r = await fetch(`${API}/api/config?llave=${encodeURIComponent(LLAVE)}`);
  const j = await r.json().catch(() => ({}));
  return Object.fromEntries((j.perillas ?? []).map((p) => [p.clave, p.valor]));
}
// Los torneos son SOLO con cuenta (Raul, 26-sep: «invitados no pueden jugar el
// torneo, tienen que crearse la cuenta»). La bateria registra la cuenta y pasa
// su llave en DOMINO_TOKEN / DOMINO_USER, como a las fotos de la mesa.
const TOKEN = process.env.DOMINO_TOKEN || '';
const CUENTA = (() => { try { return JSON.parse(process.env.DOMINO_USER || 'null'); } catch { return null; } })();
if (!TOKEN || !CUENTA?.id) { console.error('Falta la cuenta: DOMINO_TOKEN y DOMINO_USER'); process.exit(1); }
let guestId = String(CUENTA.id);
async function detalle(id) {
  const r = await fetch(`${API}/api/torneos/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return r.json();
}

let browser;
let torneoId = null;
const antes = {};
let foto = 0;

async function fin(codigo, motivo) {
  if (motivo) log('FIN:', motivo);
  for (const [k, v] of Object.entries(antes)) await perilla(k, v).catch(() => {});
  if (codigo !== 0 && torneoId) await socio(`/${torneoId}/cancel`, { method: 'POST' }).catch(() => {});
  await browser?.close().catch(() => {});
  console.log(JSON.stringify({ torneoId, pasos }, null, 1));
  process.exit(codigo);
}
process.on('unhandledRejection', (e) => fin(1, `se rompio: ${e?.message || e}`));

try {
  // La mano siguiente sale sola: se acorta para que la noche no dure una hora.
  const p = await perillas();
  if (p['torneos.siguienteManoMs'] != null) { antes['torneos.siguienteManoMs'] = p['torneos.siguienteManoMs']; await perilla('torneos.siguienteManoMs', 2500); }

  const nombre = `Copa Bateria ${new Date().toTimeString().slice(0, 5)}`;
  const creado = await socio('/', { method: 'POST', body: { nombre, empiezaEn: new Date(Date.now() + ARRANCA_S * 1000).toISOString(), puntos: 24, cupo: CUADRO, relleno: true, cuadroMinimo: CUADRO, premios: [100, 50, 25], botNivel: BOT_NIVEL } });
  torneoId = creado.torneo.id;
  cumplido('el socio crea el torneo', true, `#${torneoId} «${nombre}» a 24, cuadro de ${CUADRO}, arranca en ${ARRANCA_S} s`);

  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  const sacar = async (n) => { foto += 1; await page.screenshot({ path: path.join(OUT, `${String(foto).padStart(2, '0')}-${n}.png`) }); };

  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((token, user) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('token', token);
    localStorage.setItem('user', user);
    localStorage.setItem('instalar.tarjeta.quitada', String(Date.now()));
  }, TOKEN, JSON.stringify(CUENTA));
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await sacar('umbral');

  // LA VITRINA: el torneo sale con su pancarta ENTRAR.
  await page.goto(`${FRONT}/torneos`, { waitUntil: 'networkidle2' });
  await page.waitForSelector(`[data-testid="entrar-torneo-${torneoId}"]`, { timeout: 20000 });
  await sleep(600);
  await sacar('vitrina');
  await page.click(`[data-testid="entrar-torneo-${torneoId}"]`);
  await page.waitForSelector('[data-testid="button-confirmar-entrar"]', { timeout: 5000 });
  await sacar('confirmar');
  await page.click('[data-testid="button-confirmar-entrar"]');
  await page.waitForFunction((id) => location.pathname === `/torneos/${id}`, { timeout: 10000 }, String(torneoId));
  await page.waitForSelector('[data-testid="torneo-ya-estas-adentro"]', { timeout: 10000 });
  const d0 = await detalle(torneoId);
  cumplido('se anota desde la vitrina', Boolean(d0.me?.registered), `inscritos ${d0.torneo?.inscritos}`);
  await sleep(800);
  await sacar('detalle-anotado');

  // A LA HORA: la mesa sale y la pantalla lo sienta sola (gameSocket: entrar = presentarse).
  const hayMesa = () => page.waitForFunction(() => location.pathname === '/game' && new URLSearchParams(location.search).get('join'), { timeout: (ARRANCA_S + 120) * 1000 });
  await hayMesa();
  const primera = await page.evaluate(() => new URLSearchParams(location.search).get('join'));
  cumplido('tu mesa esta lista: la pantalla lo sienta sola', true, `mesa ${primera}`);

  const mios = new Set();
  let partidas = 0;
  let quedeFuera = false;
  const hasta = Date.now() + TOPE_MIN * 60000;

  const miCruceAbierto = (d) => d.cuadro?.find((c) => !c.ganadorId && (c.a?.userId === guestId || c.b?.userId === guestId) && ['ready', 'playing'].includes(c.estado));

  // Juega la partida de la mesa en la que esta sentado hasta que su cruce cierre.
  async function jugarMiPartida(code) {
    await page.waitForSelector('[data-ficha-mano]', { timeout: 90000 });
    await sleep(1500);
    await sacar(`mesa-${code}`);
    let fotoMitad = false;
    let jugadas = 0;
    let cruceId = null;
    let vuelta = 0;
    while (Date.now() < hasta) {
      if (vuelta++ % 3 === 0) {
        const d = await detalle(torneoId);
        const c = cruceId ? d.cuadro?.find((x) => x.id === cruceId) : d.cuadro?.find((x) => x.mesa?.code?.toUpperCase() === code.toUpperCase());
        if (c) { cruceId = c.id; mios.add(c.id); }
        if (c?.ganadorId) break;
      }
      const t = await page.evaluate(() => document.body.innerText);
      if (!/TU TURNO|LEVANTA DEL MONT/i.test(t)) { await sleep(400); continue; }
      const pozo = await page.evaluate(() => { const b = document.querySelector('button.ficha-del-pozo:not([disabled])'); if (b) { b.click(); return true; } return false; });
      if (pozo) { await sleep(900); continue; }
      // Primero la mas pesada: botarla temprano es lo que hace un jugador de verdad.
      const orden = await page.evaluate(() => [...document.querySelectorAll('[data-ficha-mano]')]
        .map((el) => ({ i: Number(el.dataset.fichaMano), pips: String(el.dataset.fichaId || '0-0').split('-').reduce((a, b) => a + Number(b), 0) }))
        .sort((x, y) => y.pips - x.pips).map((x) => x.i));
      let jugo = false;
      for (const i of orden) {
        if (jugo) break;
        await page.evaluate((k) => { const el = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); el?.click(); }, i);
        await sleep(220);
        jugo = await page.evaluate(() => { const im = document.querySelector('.iman-slot') || [...document.querySelectorAll('.cursor-pointer.pointer-events-auto.z-30')][0]; if (im) { im.click(); return true; } return false; });
        if (!jugo) { await page.evaluate((k) => { const el = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); el?.click(); }, i); await sleep(60); }
      }
      if (jugo) jugadas += 1;
      if (jugadas >= 4 && !fotoMitad) { fotoMitad = true; await sleep(900); await sacar(`mesa-${code}-jugando`); }
      await sleep(1000);
    }
    await sleep(2500);
    await sacar(`mesa-${code}-final`);
    return { jugadas, cruceId };
  }

  let mesa = primera;
  while (Date.now() < hasta) {
    const { jugadas, cruceId } = await jugarMiPartida(mesa);
    partidas += 1;
    const d = await detalle(torneoId);
    const mio = d.cuadro.find((c) => c.id === cruceId);
    const gane = mio?.ganadorId === guestId;
    const marcador = mio?.marcador ? `${mio.marcador.a}-${mio.marcador.b}` : mio?.motivo;
    cumplido(`partida ${partidas} jugada hasta el final`, Boolean(mio?.ganadorId), `${jugadas} jugadas propias · ${gane ? 'GANO' : 'perdio'} (${marcador}) en la ronda ${mio?.ronda}`);
    if (!gane) { quedeFuera = !(d.cuadro.some((c) => c.tercerPuesto && !c.ganadorId && (c.a?.userId === guestId || c.b?.userId === guestId))); }
    if (d.torneo.estado === 'completed') break;
    const siguiente = miCruceAbierto(d) || (await (async () => {
      for (let i = 0; i < 60; i += 1) { await sleep(3000); const x = await detalle(torneoId); const c = miCruceAbierto(x); if (c || x.torneo.estado === 'completed') return c; if (!x.cuadro.some((k) => (k.a?.userId === guestId || k.b?.userId === guestId) && !k.ganadorId)) return null; }
      return null;
    })());
    if (!siguiente) { quedeFuera = true; break; }
    // La mesa siguiente: la pantalla lo lleva sola al terminar la partida.
    try {
      await page.waitForFunction((viejo) => { const j = new URLSearchParams(location.search).get('join'); return location.pathname === '/game' && j && j.toUpperCase() !== viejo; }, { timeout: 240000 }, mesa.toUpperCase());
    } catch {
      cumplido('la pantalla lo lleva a su siguiente mesa', false, 'no navego sola');
      await fin(1, 'no llego a la siguiente mesa');
    }
    mesa = await page.evaluate(() => new URLSearchParams(location.search).get('join'));
    cumplido('la pantalla lo lleva a su siguiente mesa', true, `mesa ${mesa}`);
  }

  // EL QUE QUEDO FUERA: ve su camino y mira una mesa en vivo.
  await page.goto(`${FRONT}/torneos/${torneoId}`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await sacar('detalle-despues');
  let miro = false;
  for (let i = 0; i < 40 && !miro; i += 1) {
    const d = await detalle(torneoId);
    if (d.torneo.estado === 'completed') break;
    const viva = d.cuadro.find((c) => c.mesa?.empezada && !c.ganadorId);
    if (viva) {
      await page.goto(`${FRONT}/torneos/${torneoId}/mirar/${viva.id}?mesa=${viva.mesa.code}`, { waitUntil: 'networkidle2' });
      try {
        await page.waitForSelector('[data-testid="mirar-mesa"] [data-ficha-mesa]', { timeout: 15000 });
        await sleep(2500);
        await sacar('mirando-en-vivo');
        const manos = await page.evaluate(() => document.querySelectorAll('[data-ficha-mano]').length);
        cumplido('mira una mesa en vivo (manos tapadas)', manos === 0, `cruce ${viva.id} mesa ${viva.mesa.code}`);
        miro = true;
      } catch {
        await sacar('mirando-fallo');
        const txt = await page.evaluate(() => document.body.innerText.slice(0, 200));
        cumplido('mira una mesa en vivo (manos tapadas)', false, txt.replace(/\s+/g, ' '));
        miro = true;
      }
    } else await sleep(3000);
  }
  if (!miro) log('nota: no quedaba ninguna mesa empezada para mirar');

  // EL PODIO: al terminar, el detalle lo muestra.
  let d = await detalle(torneoId);
  while (d.torneo.estado !== 'completed' && Date.now() < hasta) { await sleep(5000); d = await detalle(torneoId); }
  if (d.torneo.estado !== 'completed') await fin(1, `el torneo no termino en ${TOPE_MIN} min (estado ${d.torneo.estado})`);
  await page.goto(`${FRONT}/torneos/${torneoId}`, { waitUntil: 'networkidle2' });
  const conPodio = await page.waitForSelector('[data-testid="podio-del-torneo"]', { timeout: 20000 }).then(() => true).catch(() => false);
  await sleep(1500);
  // Si gano, la estampa sale sola: se cierra para ver el podio.
  await page.evaluate(() => document.querySelector('[data-testid="button-cerrar-estampa"]')?.click());
  await sleep(500);
  await sacar('podio');
  cumplido('ve el podio del torneo terminado', conPodio, (d.podio ?? []).map((p) => `${p.puesto}.º ${p.username}`).join(' · '));

  await page.goto(`${FRONT}/torneos`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  const palmares = await page.evaluate((id) => Boolean(document.querySelector(`[data-testid="palmares-${id}"]`)), String(torneoId));
  await sacar('vitrina-palmares');
  cumplido('el palmares de la vitrina lo trae', palmares);

  if (errores.length) cumplido('sin errores de la pagina', false, errores.slice(0, 3).join(' | '));
  const malos = pasos.filter((p) => !p.ok);
  await fin(malos.length ? 1 : 0, malos.length ? `${malos.length} pasos en rojo` : `VERDE: ${partidas} partidas, ${quedeFuera ? 'quedo fuera' : 'llego al final'}`);
} catch (err) {
  await fin(1, `se rompio: ${err.message}`);
}
