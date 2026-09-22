// Fotos de las tachuelas (seccion 187): 1v1 contra la casa, 2v2 contra la casa,
// y una mesa entre dos personas (cuenta + invitado) para ver el chat en el marcador.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';

const OUT = path.resolve(process.env.DOMINO_OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
async function pagina(conCuenta, token = process.env.DOMINO_TOKEN, user = process.env.DOMINO_USER) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: false });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  if (conCuenta) await page.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', u); }, token, user);
  return page;
}

// 1v1 y 2v2 contra la casa
for (const modo of ['1v1bot', '2v2bots']) {
  if (fs.existsSync(path.join(OUT, `${modo}-apagadas.png`))) continue;
  const page = await pagina(true);
  await page.goto(`${FRONT}/game?mode=${modo}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
  await sleep(4500);
  await page.screenshot({ path: path.join(OUT, `${modo}.png`) });
  // el color de la mesa abierto desde su tachuela
  await page.evaluate(() => document.querySelector('button[title="Color de la mesa"]')?.click());
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${modo}-color.png`) });
  await page.evaluate(() => document.querySelector('button[title="Color de la mesa"]')?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('button[title="Silenciar"]')?.click());
  await page.evaluate(() => document.querySelector('button[title="Apagar los consejos de la casa"]')?.click());
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${modo}-apagadas.png`) });
  await page.close();
}

// Dos personas: la cuenta crea, el invitado entra por codigo
const rapido = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=button], a')].find((x) => /Emparejamiento r/i.test(x.innerText)); b && b.click(); });
const a = await pagina(true);
await a.goto(`${FRONT}/game?mode=1v1`, { waitUntil: 'networkidle2' });
await sleep(1500); await rapido(a);
const b = await pagina(true, process.env.DOMINO_TOKEN2, process.env.DOMINO_USER2);
await b.goto(`${FRONT}/game?mode=1v1`, { waitUntil: 'networkidle2' });
await sleep(1500); await rapido(b);
await sleep(2500);
await a.screenshot({ path: path.join(OUT, 'dbg-a.png') }); await b.screenshot({ path: path.join(OUT, 'dbg-b.png') });
console.log('A:', (await a.evaluate(() => document.body.innerText)).slice(0, 300).split(String.fromCharCode(10)).join(' | '));
console.log('B:', (await b.evaluate(() => document.body.innerText)).slice(0, 300).split(String.fromCharCode(10)).join(' | '));
await a.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
await sleep(4500);
await a.screenshot({ path: path.join(OUT, 'personas.png') });
await b.evaluate(() => document.querySelector('button[title="Chat de la mesa"]')?.click());
await sleep(300);
await b.waitForSelector('input[maxlength]', { timeout: 5000 }); await b.type('input[maxlength]', 'Buenas, que tal la mesa');
await b.keyboard.press('Enter');
await sleep(900);
await a.screenshot({ path: path.join(OUT, 'personas-sinleer.png') });
await a.evaluate(() => document.querySelector('button[title="Chat de la mesa"]')?.click());
await sleep(500);
await a.screenshot({ path: path.join(OUT, 'personas-chat.png') });
console.log(JSON.stringify({ consola }));
await browser.close();
