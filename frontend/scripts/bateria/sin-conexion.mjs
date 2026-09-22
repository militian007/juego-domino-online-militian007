import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
async function cuenta(token, user) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', u); }, token, user);
  await page.goto(`${FRONT}/game?mode=1v1`, { waitUntil: 'networkidle2' }); await sleep(1200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=button], a')].find((x) => /Emparejamiento r/i.test(x.innerText)); b && b.click(); });
  return page;
}
const a = await cuenta(process.env.DOMINO_TOKEN, process.env.DOMINO_USER);
const b = await cuenta(process.env.DOMINO_TOKEN2, process.env.DOMINO_USER2);
await a.waitForSelector('[data-ficha-mano]', { timeout: 30000 }); await sleep(3000);
await a.setOfflineMode(true); await sleep(1500);
const t1 = await a.evaluate(() => document.body.innerText);
await a.screenshot({ path: path.join(process.env.DOMINO_OUT || 'out', '05-cartel-sin-conexion.png') });
await sleep(3000);
const t2 = await a.evaluate(() => document.body.innerText);
await a.setOfflineMode(false); await sleep(5000);
const t3 = await a.evaluate(() => document.body.innerText);
const seg = (t) => (t.match(/Tienes\s+(\d+)\s+segundos/) || [])[1];
// La otra persona se queda sin red hasta que el cartel llega a cero: salen los
// dos botones (seccion 199) y SALIR AL SALON la lleva a /mesa.
await b.setOfflineMode(true);
let botones = false;
for (let i = 0; i < 100 && !botones; i += 1) { await sleep(1000); botones = await b.evaluate(() => Boolean(document.querySelector('[data-reintentar]') && document.querySelector('[data-salir-salon]'))); }
await b.screenshot({ path: path.join(process.env.DOMINO_OUT || 'out', '05b-cartel-en-cero.png') });
await b.setOfflineMode(false); await sleep(800);
await b.evaluate(() => document.querySelector('[data-salir-salon]')?.click()); await sleep(1500);
const salioAlSalon = b.url().includes('/mesa');
const r = { salio: /Se te cayó la conexión/i.test(t1), seg1: seg(t1), seg2: seg(t2), seFue: !/Se te cayó la conexión/i.test(t3), sigueEnMesa: /TU MANO/.test(t3), botonesEnCero: botones, salioAlSalon };
console.log(JSON.stringify(r));
await browser.close();
process.exit(r.salio && r.seFue && r.sigueEnMesa && r.botonesEnCero && r.salioAlSalon ? 0 : 1);
