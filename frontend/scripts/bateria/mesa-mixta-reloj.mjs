// Dos personas + dos bots en 2v2: nadie juega. A los 25 s salta el turno de la persona y la
// casa tiene que jugar (antes se quedaba pegada). Se mira el estado cada 2 s durante 80 s.
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
  return page;
}
const texto = (p) => p.evaluate(() => document.body.innerText);
const boton = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === t); if (!b) return false; b.click(); return true; }, t);
const clic = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const d = await invitado('Dueño', 'tigre');
await d.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' }); await d.waitForSelector('[data-silla="0"]');
await clic(d, '[data-silla="2"] button'); await sleep(200); await clic(d, '[data-escoger="pana"]'); await sleep(200);
await boton(d, 'SENTARSE'); await sleep(1200);
const codigo = ((await texto(d)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const p = await invitado('Pana', 'juana');
await p.goto(`${FRONT}/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await d.waitForSelector('[data-ficha-mano]', { timeout: 20000 }); await sleep(5000);
const cuentas = () => d.evaluate(() => [...document.querySelectorAll('[data-mano-rival]')].map((el) => el.innerText.trim().split('\n')[0]));
const antes = { mias: (await texto(d)).match(/TU MANO · (\d+)/)?.[1], rivales: await cuentas() };
const avisos = new Set(); let saltos = 0; let ultimo = '';
for (let i = 0; i < 40; i += 1) {
  await sleep(2000);
  const t = await texto(d);
  const m = t.match(/[^\n]*(se le pasó el turno|dejó correr el reloj|la mesa jugó por)[^\n]*/);
  if (m && m[0] !== ultimo) { saltos += 1; ultimo = m[0]; avisos.add(m[0]); }
}
const despues = { mias: (await texto(d)).match(/TU MANO · (\d+)/)?.[1], rivales: await cuentas(), fichasEnMesa: await d.evaluate(() => document.querySelectorAll('[data-ficha-mesa]').length) };
console.log(JSON.stringify({ codigo, saltos, avisos: [...avisos], antes, despues, terminada: /Fin de la partida|Ganó|Ganaron/.test(await texto(d)) }));
await browser.close();
