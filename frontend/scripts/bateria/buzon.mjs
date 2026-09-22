// EL BUZON (seccion 200): Raul deja una idea desde el umbral; el socio la ve en
// /buzon con su llave, copia lo nuevo y la nota queda marcada como copiada.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const LLAVE = process.env.DOMINO_BUZON_LLAVE || 'llave-de-prueba';
const OUT = process.env.DOMINO_OUT || 'out';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Raúl', retrato: 'catire' })); });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' }); await sleep(800);
await page.click('[data-buzon]'); await sleep(600);
await page.click('[data-tipo="falla"]'); await sleep(150);
const texto = `El reloj se me quedó pegado en la mesa 2v2 (${Date.now()})`;
await page.type('[data-buzon-texto]', texto);
await page.screenshot({ path: path.join(OUT, 'buzon-1-hoja.png') });
await page.click('[data-buzon-enviar]');
let gracias = false;
for (let i = 0; i < 20 && !gracias; i += 1) { await sleep(200); gracias = await page.evaluate(() => Boolean(document.querySelector('[data-buzon-gracias]'))); }
await page.screenshot({ path: path.join(OUT, 'buzon-2-gracias.png') });

// El socio
const socio = await ctx.newPage();
await socio.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
await socio.goto(`${FRONT}/buzon?llave=${LLAVE}`, { waitUntil: 'networkidle2' }); await sleep(1200);
const antes = await socio.evaluate(() => document.body.innerText);
const laVe = antes.includes(texto) && /FALLA · Raúl/.test(antes);
await socio.screenshot({ path: path.join(OUT, 'buzon-3-socio.png') });
// Copiar lo nuevo (el portapapeles no existe en headless: sale el texto a mano, y se marca la copia)
await socio.evaluate(() => [...document.querySelectorAll('button')].find((b) => /COPIAR LO NUEVO/.test(b.innerText))?.click()); await sleep(1500);
const despues = await socio.evaluate(() => document.body.innerText);
const marcada = /0 sin copiar/.test(despues);
const sinLlave = await (await fetch(`${process.env.BATERIA_API || 'http://localhost:4000'}/api/buzon?llave=mala`)).status;
const r = { gracias, laVe, marcada, sinLlave, consola };
console.log(JSON.stringify(r));
await browser.close();
process.exit(gracias && laVe && marcada && sinLlave === 403 && consola.length === 0 ? 0 : 1);
