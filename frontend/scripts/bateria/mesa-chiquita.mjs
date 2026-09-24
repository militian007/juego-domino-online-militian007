// LA CADENA SE PONE CHIQUITA (Raul, 23-sep, foto de su iPhone en la ronda 4):
// se juega contra la casa varias rondas a 390x844 y, despues de cada jugada, se
// mide el lado largo de las fichas de la mesa. Si baja de 30 px con poca cadena
// puesta, se saca foto y se anota la caja de la cadena y de la vista.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MINUTOS = Number(process.env.MINUTOS || 6);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
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
  const largo = Math.min(...fichas.map((r) => Math.max(r.width, r.height)));
  const x1 = Math.min(...fichas.map((r) => r.left)); const x2 = Math.max(...fichas.map((r) => r.right));
  const y1 = Math.min(...fichas.map((r) => r.top)); const y2 = Math.max(...fichas.map((r) => r.bottom));
  const pano = document.querySelector('[data-mesa-centro]')?.getBoundingClientRect();
  const ronda = (document.body.innerText.match(/RONDA (\d+)/) || [])[1];
  return { n: fichas.length, largo: Math.round(largo), caja: [Math.round(x1), Math.round(y1), Math.round(x2 - x1), Math.round(y2 - y1)], pano: pano && [Math.round(pano.width), Math.round(pano.height)], ronda };
});
const texto = () => page.evaluate(() => document.body.innerText);
const hayPozo = () => page.evaluate(() => !!document.querySelector('button.ficha-del-pozo:not([disabled])'));

const registro = [];
let chiquitas = 0;
const hasta = Date.now() + MINUTOS * 60000;
while (Date.now() < hasta) {
  const t = await texto();
  if (/Fin de la partida|¡GANASTE!|¡PERDISTE!|Revancha/i.test(t) && !/Siguiente ronda/.test(t)) break;
  if (/Siguiente ronda/.test(t)) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Siguiente ronda/.test(b.innerText))?.click());
    await sleep(3500);
    continue;
  }
  if (!/TU TURNO/.test(t)) { await sleep(250); continue; }
  if (await hayPozo()) { await page.evaluate(() => document.querySelector('button.ficha-del-pozo:not([disabled])')?.click()); await sleep(900); continue; }
  const total = await page.evaluate(() => document.querySelectorAll('[data-ficha-mano]').length);
  let jugo = false;
  for (let i = 0; i < total && !jugo; i += 1) {
    await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i);
    await sleep(200);
    jugo = await page.evaluate(() => {
      const im = document.querySelector('.iman-slot') || [...document.querySelectorAll('.cursor-pointer.pointer-events-auto.z-30')][0];
      if (im) { im.click(); return true; }
      return false;
    });
    if (!jugo) { await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i); await sleep(60); }
  }
  await sleep(1300);
  const m = await medir();
  if (m) {
    registro.push(m);
    if (m.largo < 30 && chiquitas < 4) {
      chiquitas += 1;
      await page.screenshot({ path: path.join(OUT, `chiquita-${chiquitas}.png`) });
    }
  }
  if (!jugo) await sleep(800);
}
const peores = [...registro].sort((a, b) => a.largo - b.largo).slice(0, 6);
console.log(JSON.stringify({ jugadas: registro.length, rondas: [...new Set(registro.map((r) => r.ronda))], peores, chiquitas }, null, 1));
await browser.close();
