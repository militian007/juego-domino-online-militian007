// Piso 2 de la plantilla en el domino (seccion 191): el candado, "estas?", los strikes con
// reloj corto, y el cartel de "se te cayo la conexion". Tres invitados y dos cuentas.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
const res = {};
async function pagina(nombre, { retrato, token, user } = {}) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${nombre} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`${nombre} pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((n, r, t, u) => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    if (t) { localStorage.setItem('token', t); localStorage.setItem('user', u); }
    else localStorage.setItem('domino-identidad', JSON.stringify({ nombre: n, retrato: r }));
  }, nombre, retrato, token, user);
  return { page, ctx };
}
const texto = (p) => p.evaluate(() => document.body.innerText);
const clic = (p, sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
const boton = (p, t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === t); if (!b) return false; b.click(); return true; }, t);
const foto = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });

// ---- 1. "ESTAS?" con todos conectados: 3 s y reparte; y el candado ----
const raul = await pagina('Raúl', { retrato: 'catire' });
await raul.page.goto('http://localhost:5173/mesa', { waitUntil: 'networkidle2' });
await raul.page.waitForSelector('[data-silla="0"]');
for (const s of [2, 3]) { await clic(raul.page, `[data-silla="${s}"] button`); await sleep(200); await clic(raul.page, '[data-escoger="pana"]'); await sleep(200); }
await boton(raul.page, 'SENTARSE'); await sleep(1200);
const codigo = ((await texto(raul.page)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const chela = await pagina('Chela', { retrato: 'chela' });
await chela.page.goto(`http://localhost:5173/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' }); await sleep(1500);
const nano = await pagina('Nano', { retrato: 'nano' });
const t0 = Date.now();
await nano.page.goto(`http://localhost:5173/mesa?codigo=${codigo}`, { waitUntil: 'networkidle2' });
await sleep(700);
res.llamandoSeVio = /Llamando a la mesa/.test(await texto(raul.page));
await foto(raul.page, '01-llamando');
try { await raul.page.waitForSelector('[data-ficha-mano]', { timeout: 15000 }); res.repartioEnMs = Date.now() - t0; } catch { res.repartioEnMs = null; }
// el candado: Raul, jugando, abre otra antesala y se sienta -> lo devuelve a su mesa
const raul2 = await raul.ctx.newPage();
await raul2.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
await raul2.goto('http://localhost:5173/mesa', { waitUntil: 'networkidle2' });
await raul2.waitForSelector('[data-silla="0"]');
await boton(raul2, 'SENTARSE');
await sleep(2500);
res.candadoLoDevolvio = raul2.url().includes(`join=${codigo}`);
await raul2.close();

// ---- 2. "ESTAS?" con uno que no contesta: se le suelta la silla y la mesa sigue ----
const dueno = await pagina('Dueño', { retrato: 'tigre' });
await dueno.page.goto('http://localhost:5173/mesa', { waitUntil: 'networkidle2' });
await dueno.page.waitForSelector('[data-silla="0"]');
for (const s of [2, 3]) { await clic(dueno.page, `[data-silla="${s}"] button`); await sleep(200); await clic(dueno.page, '[data-escoger="pana"]'); await sleep(200); }
await boton(dueno.page, 'SENTARSE'); await sleep(1200);
const cod2 = ((await texto(dueno.page)).match(/CÓDIGO\s+([A-Z]{4})/) || [])[1];
const juana = await pagina('Juana', { retrato: 'juana' });
await juana.page.goto(`http://localhost:5173/mesa?codigo=${cod2}`, { waitUntil: 'networkidle2' }); await sleep(1500);
// Juana deja de contestar: su pagina queda sin red
await juana.page.setOfflineMode(true);
await sleep(500);
await boton(dueno.page, 'ARRANCAR YA');
await sleep(1500);
res.llamada2 = (await texto(dueno.page)).match(/Llamando a la mesa[^\n]*/)?.[0] || null;
await foto(dueno.page, '02-llamando-a-juana');
const t1 = Date.now();
let soltada = false;
while (Date.now() - t1 < 60000) { const t = await texto(dueno.page); if (!/Llamando/.test(t)) { soltada = true; break; } await sleep(1000); }
res.llamadaCerroEnMs = soltada ? Date.now() - t1 + 1500 : null;
res.mesaSigueSinJuana = /Faltan 2 sillas|Falta 1 silla/.test(await texto(dueno.page));
await foto(dueno.page, '03-mesa-sigue');
await juana.page.setOfflineMode(false); await sleep(2500);
res.juanaVolvioALaAntesala = /arrancó sin ti|dueño cerró/.test(await texto(juana.page)) || !/DICTA ESTE CÓDIGO/.test(await texto(juana.page));
await foto(juana.page, '04-juana-soltada');

// ---- 3. Strikes y reloj corto, y el cartel sin conexion (dos cuentas, 1v1) ----
const a = await pagina('A', { token: process.env.DOMINO_TOKEN, user: process.env.DOMINO_USER });
const b = await pagina('B', { token: process.env.DOMINO_TOKEN2, user: process.env.DOMINO_USER2 });
for (const p of [a.page, b.page]) {
  await p.goto('http://localhost:5173/game?mode=1v1', { waitUntil: 'networkidle2' }); await sleep(1200);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button, [role=button], a')].find((x) => /Emparejamiento r/i.test(x.innerText)); x && x.click(); });
}
await a.page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
await sleep(4000);
// el cartel: A se queda sin red 6 s
await a.page.setOfflineMode(true); await sleep(2500);
res.cartelSalio = /Se te cayó la conexión/.test(await texto(a.page));
res.cartelSegundos = ((await texto(a.page)).match(/conexión[\s\S]*?(\d+)\s*\n?\s*segundos/) || [])[1] || null;
await foto(a.page, '05-cartel-sin-conexion');
await a.page.setOfflineMode(false); await sleep(4000);
res.cartelSeFue = !/Se te cayó la conexión/.test(await texto(a.page));
// los strikes: nadie juega. 25 + 15 + 15 s = 55 s hasta el tercero del que le toque
const tStrikes = Date.now();
let final = null;
while (Date.now() - tStrikes < 95000) {
  const t = await texto(a.page);
  if (/dejó correr el reloj/.test(t)) { final = { ms: Date.now() - tStrikes, texto: t.match(/[^\n]*dejó correr el reloj[^\n]*/)[0] }; break; }
  await sleep(1000);
}
res.tercerStrike = final;
await foto(a.page, '06-tercer-strike');
await sleep(1500);
res.partidaTermino = /Salir de la partida|Ganaste|Perdiste|Dominó|abandon/i.test(await texto(a.page));
await foto(a.page, '07-fin');
console.log(JSON.stringify({ res, consola }, null, 1));
await browser.close();
