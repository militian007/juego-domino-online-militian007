// La revancha (seccion 192): Raul y Chela juegan 1v1 armado; la partida se termina a la
// fuerza (ruta DEV); Raul pide revancha; los dos caen en la antesala, se sientan solos,
// contestan solos y arranca la mesa nueva.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
async function invitado(nombre, retrato) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${nombre} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`${nombre} pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((n, r) => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: n, retrato: r })); }, nombre, retrato);
  const guestId = await page.evaluate(() => localStorage.getItem('domino-guest-id'));
  return { page, guestId };
}
const texto = (p) => p.evaluate(() => document.body.innerText);
const clic = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const boton = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === t); if (!b) return false; b.click(); return true; }, t);

const raul = await invitado('Raúl', 'catire');
await raul.page.goto('http://localhost:5173/mesa', { waitUntil: 'networkidle2' });
await raul.page.waitForSelector('[data-silla="0"]');
await boton(raul.page, '1 VS 1'); await sleep(300);
await clic(raul.page, '[data-silla="2"] button'); await sleep(200); await clic(raul.page, '[data-escoger="pana"]'); await sleep(200);
await boton(raul.page, 'SENTARSE'); await sleep(1200);
const codigo = ((await texto(raul.page)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const chela = await invitado('Chela', 'chela');
await chela.page.goto(`http://localhost:5173/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await raul.page.waitForSelector('[data-ficha-mano]', { timeout: 20000 });
await chela.page.waitForSelector('[data-ficha-mano]', { timeout: 20000 });
await sleep(5000);
// la partida termina a la fuerza: Chela abandona
const chelaId = await chela.page.evaluate(() => localStorage.getItem('domino-guest-id'));
const r = await fetch('http://localhost:4000/api/diag/terminar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: codigo, userId: chelaId }) }).then((x) => x.json());
await sleep(2500);
const finRaul = await texto(raul.page);
await raul.page.screenshot({ path: path.join(OUT, '08-fin-con-revancha.png') });
const hayBoton = /Revancha/.test(finRaul);
await boton(raul.page, 'Revancha');
await sleep(2500);
const urls = { raul: raul.page.url(), chela: chela.page.url() };
await raul.page.screenshot({ path: path.join(OUT, '09-revancha-antesala.png') });
let arranco = false;
try { await raul.page.waitForSelector('[data-ficha-mano]', { timeout: 20000 }); await chela.page.waitForSelector('[data-ficha-mano]', { timeout: 20000 }); arranco = true; } catch {}
await sleep(4000);
await raul.page.screenshot({ path: path.join(OUT, '10-revancha-jugando.png') });
const nuevoCodigo = ((await texto(raul.page)).match(/\b([A-HJ-NP-Z]{4})\b\s*$/m) || [])[1];
console.log(JSON.stringify({ codigo, terminar: r, hayBoton, urls, arranco, mismaMesa: raul.page.url().includes(codigo), consola }));
await browser.close();
