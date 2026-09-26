// LOS ANUNCIOS DE LA CASA (seccion 214, copiados del truco): el socio publica
// uno en cada forma (sobre, pizarra, casa) y un invitado lo ve UNA vez en la
// puerta: le sale, lo cierra, recarga y ya no esta. La casa se publica desde
// el formulario del socio, las otras dos por la ruta. Al final se baja, para
// no dejarle un sobre tapando la pantalla a las otras pruebas.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const LLAVE = process.env.BATERIA_LLAVE || 'llave-de-prueba';
const OUT = process.env.DOMINO_OUT || 'out';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socio = (metodo, cuerpo) => fetch(`${API}/api/socio/anuncios`, {
  method: metodo,
  headers: { 'content-type': 'application/json', 'x-llave': LLAVE },
  body: cuerpo ? JSON.stringify(cuerpo) : undefined
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const enMin = (m) => new Date(Date.now() + m * 60_000).toISOString();

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const errores = [];
const r = { formas: {} };
let ok = true;
try {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));

  // Un invitado con su identidad ligera ya puesta.
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Anunciado', retrato: 'chela' }));
    localStorage.removeItem('domino-anuncio-marcas');
  });

  const hay = (forma) => page.evaluate((f) => Boolean(document.querySelector(`[data-testid="anuncio-${f}"]`)), forma);

  const probar = async (forma) => {
    const f = { forma };
    await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
    f.salio = await page.waitForSelector(`[data-testid="anuncio-${forma}"]`, { timeout: 12000 }).then(() => true, () => false);
    await sleep(900);
    f.reloj = await page.evaluate(() => (document.body.innerText.match(/Faltan \d+ minutos/i) || [''])[0]);
    await page.screenshot({ path: path.join(OUT, `anuncio-${forma}.png`) });
    // Recargar SIN cerrarlo: tiene que seguir ahi (la marca es al cerrar).
    await page.reload({ waitUntil: 'networkidle2' });
    f.sigueSinCerrar = await page.waitForSelector(`[data-testid="anuncio-${forma}"]`, { timeout: 12000 }).then(() => true, () => false);
    await sleep(700);
    await page.click(`[data-testid="anuncio-${forma}"] [data-anuncio-cerrar]`);
    await sleep(500);
    f.seFue = !(await hay(forma));
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);
    f.noVuelve = !(await hay(forma));
    r.formas[forma] = f;
    return f.salio && f.sigueSinCerrar && f.seFue && f.noVuelve && /faltan/i.test(f.reloj);
  };

  // 1. El sobre, por la ruta.
  const p1 = await socio('POST', { titulo: 'Torneo esta noche', cuerpo: 'A las 8 hay Relámpago en la mesa de dominó. Entra con tu cuenta y anótate.', forma: 'sobre', publico: 'todos', veces: 'una', eventoAt: enMin(25) });
  r.publicoSobre = p1.status;
  ok = (await probar('sobre')) && ok;

  // 2. La pizarra, por la ruta.
  const p2 = await socio('POST', { titulo: 'Mesa dorada', cuerpo: 'Esta noche las mesas de 2v2 juegan a 150 puntos.', forma: 'pizarra', publico: 'invitados', veces: 'una', eventoAt: enMin(25) });
  r.publicoPizarra = p2.status;
  ok = (await probar('pizarra')) && ok;

  // 3. La casa, desde el formulario del socio.
  await page.goto(`${FRONT}/socio-anuncios?llave=${encodeURIComponent(LLAVE)}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-anuncio-publicar]', { timeout: 12000 });
  await page.click('[data-anuncio-opcion="forma:casa"]');
  await page.type('[data-anuncio-titulo]', 'Llegó la tienda');
  await page.type('[data-anuncio-cuerpo]', 'Ya puedes cambiar el paño y las fichas con tus monedas.');
  await page.click('[data-anuncio-opcion="hasta:4 h"]');
  // La hora del evento, a mano, en hora local (como la escribe el socio).
  const local = await page.evaluate(() => {
    const d = new Date(Date.now() + 26 * 60_000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  await page.$eval('[data-anuncio-evento]', (el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, local);
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'anuncio-socio-formulario.png') });
  await page.click('[data-anuncio-publicar]');
  await page.waitForFunction(() => /Ya les está saliendo/.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await sleep(600);
  r.publicoCasaDesdeElFormulario = await page.evaluate(() => /Ya les está saliendo/.test(document.body.innerText));
  ok = r.publicoCasaDesdeElFormulario && (await probar('casa')) && ok;

  // 4. La lista del socio: el de ahora activo, los otros dos bajados (reemplazados).
  await page.goto(`${FRONT}/socio-anuncios?llave=${encodeURIComponent(LLAVE)}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-anuncio-linea]', { timeout: 12000 });
  await sleep(500);
  r.lista = await page.evaluate(() => [...document.querySelectorAll('[data-anuncio-linea]')].slice(0, 3).map((e) => e.getAttribute('data-anuncio-linea')));
  await page.screenshot({ path: path.join(OUT, 'anuncio-socio.png') });
  await page.evaluate(() => [...document.querySelectorAll('p')].find((p) => /Los que se han puesto/.test(p.textContent))?.scrollIntoView());
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'anuncio-socio-lista.png') });
  ok = ok && r.lista[0] === 'activo' && r.lista[1] === 'bajado' && r.lista[2] === 'bajado';

  // 5. Sin llave no se publica.
  r.sinLlave = (await fetch(`${API}/api/socio/anuncios`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status;
  ok = ok && r.publicoSobre === 201 && r.publicoPizarra === 201 && r.sinLlave === 403;
} catch (err) {
  errores.push(`se rompio: ${err.message}`);
  ok = false;
} finally {
  await socio('DELETE').catch(() => {});
  await browser.close();
}

r.errores = errores;
console.log(JSON.stringify(r, null, 1));
process.exitCode = ok && errores.length === 0 ? 0 : 1;
