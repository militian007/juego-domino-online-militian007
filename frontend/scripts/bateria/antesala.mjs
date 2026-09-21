// La antesala (seccion 188) de punta a punta, con dos invitados de identidad ligera:
// Raul arma un 2v2 (una silla de la casa, una para un pana), Chela entra por el
// codigo, la mesa arranca sola y los dos caen en la partida. Fotos por el camino.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
async function invitado(nombre, retrato) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: false });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${nombre} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`${nombre} pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((n, r) => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    localStorage.setItem('domino-identidad', JSON.stringify({ nombre: n, retrato: r }));
  }, nombre, retrato);
  return page;
}
const foto = (page, n) => page.screenshot({ path: path.join(OUT, n + '.png') });
const clic = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const texto = (page) => page.evaluate(() => document.body.innerText);

// 1. Raul arma la mesa
const raul = await invitado('Raúl', 'catire');
await raul.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
await sleep(600);
await clic(raul, '[data-juega-ya]');              // la pancarta JUEGA YA -> /mesa
await raul.waitForSelector('[data-silla="0"]', { timeout: 15000 });
await sleep(800);
await foto(raul, '01-arma-2v2');
// sillas 2 y 3: para panas (la 1 queda de la casa sin tocarla)
await clic(raul, '[data-silla="2"] button'); await sleep(300); await foto(raul, '02-escoger');
await clic(raul, '[data-escoger="pana"]'); await sleep(300);
await clic(raul, '[data-silla="3"] button'); await sleep(200); await clic(raul, '[data-escoger="pana"]'); await sleep(400);
await foto(raul, '03-dos-para-panas');
// 1 vs 1 de reojo
await raul.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '1 VS 1')?.click());
await sleep(400); await foto(raul, '04-1v1');
await raul.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '2 VS 2')?.click());
await sleep(300);
await clic(raul, '[data-silla="2"] button'); await sleep(200); await clic(raul, '[data-escoger="pana"]'); await sleep(200);
await clic(raul, '[data-silla="3"] button'); await sleep(200); await clic(raul, '[data-escoger="pana"]'); await sleep(300);
// SENTARSE -> sala con codigo
await raul.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
await sleep(1200);
await foto(raul, '05-esperando');
const t = await texto(raul);
const codigo = (t.match(/DICTA ESTE CÓDIGO\s+([A-Z]{4})/) || [])[1];
console.log('codigo', codigo);

// 2. Chela ve el tablon y entra por el codigo (escribiendolo)
const chela = await invitado('Chela', 'chela');
await chela.goto('http://localhost:5173/mesa', { waitUntil: 'networkidle2' });
await chela.waitForSelector('[data-tablon]', { timeout: 15000 });
await sleep(4500); // el tablon se refresca cada 4 s
await foto(chela, '06-tablon-chela');
await chela.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'TENGO UN CÓDIGO')?.click());
await sleep(300);
await chela.type('input[placeholder="KMZA"]', codigo.toLowerCase());
await sleep(200); await foto(chela, '07-codigo-escrito');
await chela.keyboard.press('Enter');
await sleep(1500);
await foto(chela, '08-chela-sentada');
await foto(raul, '09-raul-ve-llegar');

// 3. Nano entra por el link de WhatsApp: la mesa se llena y arranca sola
const nano = await invitado('Nano', 'nano');
await nano.goto(`http://localhost:5173/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await sleep(2500);
await foto(nano, '10-nano-por-link');
for (const [p, n] of [[raul, 'raul'], [chela, 'chela'], [nano, 'nano']]) {
  try { await p.waitForSelector('[data-ficha-mano]', { timeout: 20000 }); } catch { consola.push(`${n}: no llego a la mesa`); }
}
await sleep(5000);
await foto(raul, '11-partida-raul'); await foto(chela, '12-partida-chela'); await foto(nano, '13-partida-nano');
console.log(JSON.stringify({ codigo, consola }));
await browser.close();
