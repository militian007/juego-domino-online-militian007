// LA CAMARA DESPUES DEL REACOMODO (seccion 205, foto de Raul en la ronda 4):
// contra la casa a 390x844, primero se estira la cadena en RECTA (la camara se
// aleja para que quepa), despues se la reacomoda en COMPACTA (la forma del
// destranque). Antes la camara se quedaba lejos y la cadena salia chiquitica.
// La vara: despues del reacomodo la mesa tiene que verse IGUAL que si uno
// entrara de nuevo a esa partida (camara fresca), no «mas cerca»: a veces la
// forma compacta es mas ancha y en un telefono angosto debe verse mas chica.
// Usa la ruta de DEV /api/diag/destrancar.
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
const codigo = await page.evaluate(() => (document.body.innerText.match(/·\s*([A-Z]{4})\s*$/m) || document.body.innerText.match(/\b([A-HJ-NP-Z]{4})\b/))?.[1]);

const medir = () => page.evaluate(() => {
  const fichas = [...document.querySelectorAll('[data-ficha-mesa]')].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
  return fichas.length ? { n: fichas.length, largo: Math.round(Math.min(...fichas.map((r) => Math.max(r.width, r.height)))) } : null;
});
const hayPozo = () => page.evaluate(() => !!document.querySelector('button.ficha-del-pozo:not([disabled])'));

// Jugar hasta tener 12 fichas en la mesa (o que se acabe la ronda).
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  const m = await medir();
  if (m && m.n >= 12) break;
  const t = await page.evaluate(() => document.body.innerText);
  if (/Siguiente ronda|Revancha/.test(t)) break;
  if (!/TU TURNO/.test(t)) { await sleep(250); continue; }
  if (await hayPozo()) { await page.evaluate(() => document.querySelector('button.ficha-del-pozo:not([disabled])')?.click()); await sleep(900); continue; }
  const total = await page.evaluate(() => document.querySelectorAll('[data-ficha-mano]').length);
  for (let i = 0; i < total; i += 1) {
    await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i);
    await sleep(200);
    const ok = await page.evaluate(() => { const im = document.querySelector('.iman-slot') || [...document.querySelectorAll('.cursor-pointer.pointer-events-auto.z-30')][0]; if (im) { im.click(); return true; } return false; });
    if (ok) break;
    await page.evaluate((k) => { const d = document.querySelector(`[data-ficha-mano="${k}"] > div`) || document.querySelector(`[data-ficha-mano="${k}"]`); d && d.click(); }, i);
    await sleep(60);
  }
  await sleep(1200);
}

const destrancar = async (forma) => {
  const r = await fetch(`${API}/api/diag/destrancar`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: codigo, forma }) });
  return r.json();
};
const recta = await destrancar('recta'); await sleep(1500);
const enRecta = await medir();
await page.screenshot({ path: path.join(OUT, 'camara-1-recta.png') });
const compacta = await destrancar('compacta'); await sleep(1500);
const enCompacta = await medir();
await page.screenshot({ path: path.join(OUT, 'camara-2-compacta.png') });

// La camara fresca: recargar y volver a la misma mesa.
await page.reload({ waitUntil: 'networkidle2' });
await page.waitForSelector('[data-ficha-mesa]', { timeout: 20000 }).catch(() => {});
await sleep(2500);
const fresca = await medir();
await page.screenshot({ path: path.join(OUT, 'camara-3-fresca.png') });

const igualQueFresca = Boolean(enCompacta && fresca && Math.abs(enCompacta.largo - fresca.largo) <= 3);
const r = { codigo, recta, compacta, enRecta, enCompacta, fresca, igualQueFresca };
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(igualQueFresca ? 0 : 1);
