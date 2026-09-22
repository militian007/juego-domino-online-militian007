// Sentarse con todas las sillas de la casa: arranca de una, sin codigo. 1v1 y 2v2.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const OUT = path.resolve(process.env.DOMINO_OUT || 'out'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
for (const modo of ['1 VS 1', '2 VS 2']) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(`${modo} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => consola.push(`${modo} pageerror: ${e.message}`));
  await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Raúl', retrato: 'catire' })); });
  await page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-silla="0"]', { timeout: 15000 });
  await page.evaluate((m) => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === m)?.click(), modo);
  await sleep(300);
  // sin tocar nada: todas las sillas son de la casa
  await page.screenshot({ path: path.join(OUT, `casa-${modo.replace(/ /g, '')}-armada.png`) });
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
  try { await page.waitForSelector('[data-ficha-mano]', { timeout: 20000 }); } catch { consola.push(`${modo}: no arranco`); }
  await sleep(4000);
  await page.screenshot({ path: path.join(OUT, `casa-${modo.replace(/ /g, '')}-partida.png`) });
  console.log(modo, (await page.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ').slice(0, 160));
  await page.close();
}
console.log(JSON.stringify({ consola }));
await browser.close();
process.exit(consola.length === 0 ? 0 : 1);
