// Las fotos del "antes" (el main de Jonathan, 3fb314f) para el informe: la
// portada, la mesa 1v1 y 2v2 al arrancar, y jugando hasta que toque robar.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';

const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: false });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await sleep(1500);
await page.screenshot({ path: path.join(OUT, 'portada.png') });
await page.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', u); }, process.env.DOMINO_TOKEN, process.env.DOMINO_USER);
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await sleep(1500);
await page.screenshot({ path: path.join(OUT, 'menu.png') });

for (const modo of ['2v2bots', '1v1bot']) {
  await page.goto(`${FRONT}/game?mode=${modo}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
  await sleep(4500);
  await page.screenshot({ path: path.join(OUT, `${modo}-arranque.png`) });
}

// Jugar 1v1 hasta que toque robar (o 25 jugadas), sacando fotos por el camino
const esMiTurno = () => page.evaluate(() => /tu turno/i.test(document.body.innerText));
const hayPozo = () => page.evaluate(() => !!document.querySelector('button.ficha-del-pozo:not([disabled]), button.pool-tile:not([disabled])'));
let fotos = 0;
for (let j = 0; j < 30; j += 1) {
  const t0 = Date.now();
  while (!(await esMiTurno()) && Date.now() - t0 < 15000) await sleep(120);
  if (!(await esMiTurno())) break;
  const t1 = Date.now(); let pozo = false;
  while (Date.now() - t1 < 2500) { if (await hayPozo()) { pozo = true; break; } await sleep(80); }
  if (pozo) { await sleep(900); await page.screenshot({ path: path.join(OUT, 'pozo.png') }); await page.evaluate(() => { const b = document.querySelectorAll('button.ficha-del-pozo:not([disabled]), button.pool-tile:not([disabled])'); b[0] && b[0].click(); }); await sleep(1500); continue; }
  const total = await page.evaluate(() => document.querySelectorAll('[data-ficha-mano]').length);
  let jugo = false;
  for (let i = 0; i < total && !jugo; i += 1) {
    await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i);
    await sleep(250);
    const ok = await page.evaluate(() => {
      const im = document.querySelector('.iman-slot') || [...document.querySelectorAll('.cursor-pointer.pointer-events-auto.z-30')][0];
      if (im) { im.click(); return true; }
      return false;
    });
    if (ok) { jugo = true; await sleep(1500); fotos += 1; if (fotos >= 3) { await page.screenshot({ path: path.join(OUT, `jugada-${j}.png`) }); } }
    else { await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i); await sleep(80); }
  }
  if (!jugo) { await page.screenshot({ path: path.join(OUT, `sin-jugada-${j}.png`) }); await sleep(1200); }
}
await page.screenshot({ path: path.join(OUT, 'final.png') });
console.log('listo', fs.readdirSync(OUT).join(' '));
await browser.close();
