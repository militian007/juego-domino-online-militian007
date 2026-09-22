// El dueno cierra el telefono con la mesa abierta: la mesa desaparece del tablon y el pana vuelve a la antesala.
import puppeteer from 'puppeteer-core';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
async function invitado(nombre, retrato) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true });
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate((n, r) => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: n, retrato: r })); }, nombre, retrato);
  return { page, ctx };
}
const a = await invitado('Dueño', 'tigre');
await a.page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' });
await a.page.waitForSelector('[data-silla="0"]');
await a.page.evaluate(() => document.querySelector('[data-silla="2"] button').click()); await sleep(200);
await a.page.evaluate(() => document.querySelector('[data-escoger="pana"]').click()); await sleep(200);
await a.page.evaluate(() => document.querySelector('[data-silla="3"] button').click()); await sleep(200);
await a.page.evaluate(() => document.querySelector('[data-escoger="pana"]').click()); await sleep(200);
await a.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE').click());
await sleep(1200);
const codigo = ((await a.page.evaluate(() => document.body.innerText)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const b = await invitado('Pana', 'juana');
await b.page.goto(`${FRONT}/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await sleep(1500);
const antes = await b.page.evaluate(() => document.body.innerText.includes('ESPERANDO A QUE ARRANQUE'));
await a.ctx.close();          // el dueno cierra el telefono
await sleep(1500);
const despues = await b.page.evaluate(() => document.body.innerText);
const c = await invitado('Mirón', 'musiu');
await c.page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' }); await sleep(1500);
const tablon = await c.page.evaluate(() => document.body.innerText.includes('Ninguna ahora'));
const volvio = despues.includes('El dueño cerró la mesa');
console.log(JSON.stringify({ codigo, panaEsperaba: antes, panaVolvio: volvio, tablonVacio: tablon }));
await browser.close();
process.exit(antes && volvio && tablon ? 0 : 1);
