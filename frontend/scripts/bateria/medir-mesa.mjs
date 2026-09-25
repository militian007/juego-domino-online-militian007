// CUANTO PAÑO USA LA CADENA (seccion 207): contra la casa a 390x844 se juega
// una partida y despues de cada jugada se anota el rectangulo util de la mesa
// (lo que dejan las placas y la mano), la caja de la cadena y el largo de la
// ficha. Sirve para ver si la cadena crece hacia donde hay sitio.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
const MINUTOS = Number(process.env.MINUTOS || 4);
const ANCHO = Number(process.env.ANCHO || 390);
const ALTO = Number(process.env.ALTO || 844);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 2, isMobile: true });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Raúl', retrato: 'catire' })); });
await page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' });
await page.waitForSelector('[data-silla="0"]');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '1 VS 1')?.click());
await sleep(300);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
await page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
await sleep(3000);

const medir = () => page.evaluate(() => {
  const fichas = [...document.querySelectorAll('[data-ficha-mesa]')].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
  if (!fichas.length) return null;
  const cam = document.querySelector('[data-camara]')?.dataset.camara || '';
  const [util] = cam.split('@');
  const [uw, uh] = util.split('x').map(Number);
  const x1 = Math.min(...fichas.map((r) => r.left)); const x2 = Math.max(...fichas.map((r) => r.right));
  const y1 = Math.min(...fichas.map((r) => r.top)); const y2 = Math.max(...fichas.map((r) => r.bottom));
  const largo = Math.round(Math.min(...fichas.map((r) => Math.max(r.width, r.height))));
  return { n: fichas.length, largo, util: [uw, uh], caja: [Math.round(x2 - x1), Math.round(y2 - y1)], usoAncho: +((x2 - x1) / uw).toFixed(2), usoAlto: +((y2 - y1) / uh).toFixed(2) };
});
const hayPozo = () => page.evaluate(() => !!document.querySelector('button.ficha-del-pozo:not([disabled])'));

const registro = [];
const hasta = Date.now() + MINUTOS * 60000;
const fotos = new Set();
while (Date.now() < hasta) {
  const t = await page.evaluate(() => document.body.innerText);
  if (/Revancha/i.test(t) && !/Siguiente ronda/.test(t)) break;
  if (/Siguiente ronda/.test(t)) { await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Siguiente ronda/.test(b.innerText))?.click()); await sleep(3500); continue; }
  if (!/TU TURNO/.test(t)) { await sleep(250); continue; }
  if (await hayPozo()) { await page.evaluate(() => document.querySelector('button.ficha-del-pozo:not([disabled])')?.click()); await sleep(900); continue; }
  const total = await page.evaluate(() => document.querySelectorAll('[data-ficha-mano]').length);
  let jugo = false;
  for (let i = 0; i < total && !jugo; i += 1) {
    await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i);
    await sleep(200);
    jugo = await page.evaluate(() => { const im = document.querySelector('.iman-slot') || [...document.querySelectorAll('.cursor-pointer.pointer-events-auto.z-30')][0]; if (im) { im.click(); return true; } return false; });
    if (!jugo) { await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i); await sleep(60); }
  }
  await sleep(1300);
  const m = await medir();
  if (m) {
    registro.push(m);
    const tramo = [18, 12, 8].find((k) => m.n >= k);
    if (tramo && !fotos.has(tramo)) { fotos.add(tramo); await page.screenshot({ path: path.join(OUT, `mesa-${ANCHO}-${tramo}.png`) }); }
  }
}
const porN = {};
for (const r of registro) (porN[r.n] ||= []).push(r.largo);
const resumen = Object.entries(porN).map(([n, l]) => `${n} fichas: ${Math.round(l.reduce((a, b) => a + b, 0) / l.length)} px`);
console.log(JSON.stringify({ util: registro[0]?.util, resumen, ultimas: registro.slice(-4) }, null, 1));
await browser.close();
