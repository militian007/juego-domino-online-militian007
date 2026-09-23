// REPORTAR LA PARTIDA (seccion 202, Raul escogio la 1): al final de la partida
// sale el renglon «¿Pasó algo raro? Repórtalo»; la nota llega al buzon del socio
// con la mesa, y desde ahi se abre la libreta de esa partida.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const LLAVE = process.env.DOMINO_BUZON_LLAVE || 'llave-de-prueba';
const OUT = process.env.DOMINO_OUT || 'out';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
async function invitado(nombre, retrato) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${nombre} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`${nombre} pageerror: ${e.message}`));
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((n, r) => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: n, retrato: r })); }, nombre, retrato);
  return page;
}
const clic = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const boton = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === t); if (!b) return false; b.click(); return true; }, t);
const texto = (p) => p.evaluate(() => document.body.innerText);

// Una mesa entre dos personas, y se termina a la fuerza (la ruta de DEV).
const chuo = await invitado('Chuo', 'chuo');
await chuo.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' });
await chuo.waitForSelector('[data-silla="0"]');
await boton(chuo, '1 VS 1'); await sleep(300);
await clic(chuo, '[data-silla="2"] button'); await sleep(200); await clic(chuo, '[data-escoger="pana"]'); await sleep(200);
await boton(chuo, 'SENTARSE'); await sleep(1200);
const codigo = ((await texto(chuo)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const raul = await invitado('Raúl', 'catire');
await raul.goto(`${FRONT}/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await raul.waitForSelector('[data-ficha-mano]', { timeout: 25000 });
await sleep(2500);

const idChuo = await chuo.evaluate(() => localStorage.getItem('domino-guest-id'));
await fetch(`${API}/api/diag/terminar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: codigo, userId: idChuo }) });
await sleep(2500);

// Raul ve el cartel y el renglon.
const salioElRenglon = await raul.evaluate(() => Boolean(document.querySelector('[data-reportar]')));
await raul.screenshot({ path: path.join(OUT, 'reportar-1-cartel.png') });
await clic(raul, '[data-reportar]'); await sleep(700);
const dice = await raul.evaluate(() => document.querySelector('[data-buzon-texto]')?.parentElement?.innerText ?? '');
const nombraLaMesa = dice.includes(codigo);
await raul.type('[data-buzon-texto]', 'me sacó de la mesa cuando iba ganando');
await raul.screenshot({ path: path.join(OUT, 'reportar-2-hoja.png') });
await clic(raul, '[data-buzon-enviar]');
let gracias = false;
for (let i = 0; i < 20 && !gracias; i += 1) { await sleep(200); gracias = await raul.evaluate(() => Boolean(document.querySelector('[data-buzon-gracias]'))); }

// El socio la ve con su mesa y salta a la libreta.
const socio = await invitado('Socio', 'tigre');
await socio.goto(`${FRONT}/buzon?llave=${LLAVE}`, { waitUntil: 'networkidle2' }); await sleep(1000);
const enElBuzon = await texto(socio);
const conLibreta = enElBuzon.includes(`VER LA LIBRETA · ${codigo}`);
await socio.screenshot({ path: path.join(OUT, 'reportar-3-buzon.png') });
await socio.goto(`${FRONT}/disputas?llave=${LLAVE}&mesa=${codigo}`, { waitUntil: 'networkidle2' }); await sleep(1200);
const laLibreta = await texto(socio);
const abrioLaLibreta = laLibreta.includes(`LIBRETA DE LA PARTIDA ${codigo}`);
await socio.screenshot({ path: path.join(OUT, 'reportar-4-libreta.png') });

const r = { codigo, salioElRenglon, nombraLaMesa, gracias, conLibreta, abrioLaLibreta, consola };
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(salioElRenglon && nombraLaMesa && gracias && conLibreta && abrioLaLibreta && consola.length === 0 ? 0 : 1);
