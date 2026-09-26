// FOTOS DE LA MANO (seccion 208): para escoger entre las opciones de `?mano=`.
// Contra la casa a 390x844: foto con la mano del reparto (7) y otra con la
// mano llena (11, pasadas del pozo por la ruta de DEV /api/diag/mano). Anota
// el paño libre que queda para la cadena en cada caso.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const resultado = {};
for (const mano of (process.env.LISTA ?? ',a,b,c').split(',')) {
  const nombre = mano || 'actual';
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((m) => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Raúl', retrato: 'catire' })); if (m) localStorage.setItem('domino-mano-prueba', m); else localStorage.removeItem('domino-mano-prueba'); }, mano);
  await page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-silla="0"]');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '1 VS 1')?.click());
  await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
  await page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
  await sleep(4500);
  const leer = () => page.evaluate(() => {
    const f = document.querySelector('[data-ficha-mano]')?.getBoundingClientRect();
    return { n: document.querySelectorAll('[data-ficha-mano]').length, ficha: f ? Math.round(f.width) : 0, pano: (document.querySelector('[data-camara]')?.dataset.camara || '').split('@')[0] };
  });
  const codigo = await page.evaluate(() => (document.body.innerText.match(/·\s*([A-Z]{4})\s*$/m) || document.body.innerText.match(/([A-HJ-NP-Z]{4})/))?.[1]);
  resultado[nombre] = { inicio: await leer() };
  await page.screenshot({ path: path.join(OUT, `${nombre}-7.png`) });
  const r = await fetch(`${API}/api/diag/mano`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: codigo, cuantas: 4 }) }).then((x) => x.json()).catch((e) => ({ error: e.message }));
  await sleep(2000);
  resultado[nombre].llena = { ...(await leer()), ruta: r.mano ?? r.error };
  await page.screenshot({ path: path.join(OUT, `${nombre}-11.png`) });
  await ctx.close();
}
console.log(JSON.stringify(resultado, null, 1));
await browser.close();
