// EL CHAT DE LA MESA como quedo el 23-sep (seccion 201, ficha 5.2): dos personas
// en una mesa; el que habla le sale en burbuja al otro y la burbuja se va sola;
// al abrir el chat sale la TIRA de lo ultimo con quien lo dijo y se cierra sola.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
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

// Chuo abre una mesa 1v1 con una silla para un pana; Raul entra por el codigo.
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
await chuo.waitForSelector('[data-ficha-mano]', { timeout: 25000 });
await sleep(1500);

// El invitado (sin cuenta) escribe: la llave «abrirlo a todos» viene prendida.
await clic(chuo, '[aria-label="Chat de la mesa"]'); await sleep(600);
await chuo.type('[data-tira-entrada]', 'epa Raúl, juega rápido pana');
await chuo.keyboard.press('Enter'); await sleep(900);
const escribio = !/Ponte un nombre|cuenta/.test((await chuo.evaluate(() => document.querySelector('[data-tira-chat]')?.innerText)) ?? '');

// Al otro le sale la burbuja, sin abrir nada.
const burbuja = await raul.evaluate(() => document.body.innerText.includes('juega rápido pana'));
await raul.screenshot({ path: path.join(OUT, 'chat-1-burbuja.png') });

// Raul abre el chat: sale la TIRA con quien lo dijo, y no hay burbujas.
await clic(raul, '[aria-label="Chat de la mesa"]'); await sleep(700);
const tiraTexto = await raul.evaluate(() => document.querySelector('[data-tira-chat]')?.innerText ?? '');
const laTiraDice = /Chuo/.test(tiraTexto) && /juega rápido pana/.test(tiraTexto);
await raul.screenshot({ path: path.join(OUT, 'chat-2-tira.png') });

// La tira se cierra sola a los 5 s (sin tocarla).
await sleep(6000);
const seCerroSola = await raul.evaluate(() => !document.querySelector('[data-tira-chat]'));

// Y la burbuja tambien se fue (6 s).
const burbujaSeFue = !(await raul.evaluate(() => document.body.innerText.includes('juega rápido pana')));

const r = { codigo, escribio, burbuja, laTiraDice, seCerroSola, burbujaSeFue, consola };
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(escribio && burbuja && laTiraDice && seCerroSola && burbujaSeFue && consola.length === 0 ? 0 : 1);
