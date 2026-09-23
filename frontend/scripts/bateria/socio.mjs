// EL CUARTO DEL SOCIO (seccion 201): las perillas se guardan con su boton, los
// guardianes encienden con una queja de la tanda, y la libreta de una partida
// sale con su reporte copiable. Todo con la llave; sin llave, nada.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const LLAVE = process.env.DOMINO_BUZON_LLAVE || 'llave-de-prueba';
const OUT = process.env.DOMINO_OUT || 'out';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));

// ---- 1. Las perillas: cambiar el reloj corto y guardarlo ----
await page.goto(`${FRONT}/config?llave=${LLAVE}`, { waitUntil: 'networkidle2' });
await page.waitForSelector('[data-perilla="reloj.cortoMs"]', { timeout: 15000 });
await sleep(400);
await page.screenshot({ path: path.join(OUT, 'socio-1-config.png') });
await page.click('[data-valor="reloj.cortoMs"]');
await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
await page.keyboard.type('12');
const escrito = await page.evaluate(() => document.querySelector('[data-valor="reloj.cortoMs"]')?.value);
await sleep(300);
const salioGuardar = await page.evaluate(() => Boolean(document.querySelector('[data-guardar="reloj.cortoMs"]')));
await page.click('[data-guardar="reloj.cortoMs"]');
await sleep(1200);
const enElServidor = await (await fetch(`${API}/api/config?llave=${LLAVE}`)).json();
const guardo = enElServidor.perillas.find((p) => p.clave === 'reloj.cortoMs')?.valor === 12000;
// y se deja como estaba
await fetch(`${API}/api/config?llave=${LLAVE}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave: 'reloj.cortoMs', valor: 15000 }) });

// ---- 2. Los guardianes: una queja de la tanda los enciende ----
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Raúl', retrato: 'catire' })));
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' }); await sleep(600);
await page.click('[data-buzon]'); await sleep(500);
await page.click('[data-tipo="falla"]'); await sleep(150);
await page.type('[data-buzon-texto]', `se me quedó pegado el reloj en la mesa (${Date.now()})`);
await page.click('[data-buzon-enviar]'); await sleep(1200);
await page.goto(`${FRONT}/guardianes?llave=${LLAVE}`, { waitUntil: 'networkidle2' }); await sleep(900);
const textoGuardianes = await page.evaluate(() => document.body.innerText);
const sono = /Guardián · se quejan de «reloj»/.test(textoGuardianes);
await page.screenshot({ path: path.join(OUT, 'socio-2-guardianes.png') });

// ---- 3. Las disputas: la libreta de la ultima partida ----
await page.goto(`${FRONT}/disputas?llave=${LLAVE}`, { waitUntil: 'networkidle2' }); await sleep(900);
const hayPartidas = await page.evaluate(() => document.querySelectorAll('[data-libreta]').length);
let reporteOk = false;
if (hayPartidas > 0) {
  // La de MAS anotaciones: en la bateria quedan mesas que apenas arrancaron y
  // esas no tienen ninguna ficha puesta todavia.
  await page.evaluate(() => {
    const filas = [...document.querySelectorAll('[data-libreta]')];
    const cuantas = (b) => Number((b.innerText.match(/(\d+) anotaciones/) || [])[1] || 0);
    filas.sort((a, b) => cuantas(b) - cuantas(a))[0]?.click();
  });
  await sleep(1000);
  const t = await page.evaluate(() => document.body.innerText);
  reporteOk = /LIBRETA DE LA PARTIDA/.test(t) && /LO QUE PASÓ/.test(t) && /pone la/.test(t);
  await page.screenshot({ path: path.join(OUT, 'socio-3-libreta.png') });
}

// ---- 4. Sin llave no se entra ----
const sinLlave = (await fetch(`${API}/api/config?llave=mala`)).status;

const r = { escrito, salioGuardar, guardo, sono, hayPartidas, reporteOk, sinLlave, consola };
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(salioGuardar && guardo && sono && hayPartidas > 0 && reporteOk && sinLlave === 403 && consola.length === 0 ? 0 : 1);
