import puppeteer from 'puppeteer-core';
import path from 'node:path';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
async function cuenta(token, user) {
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate((t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', u); }, token, user);
  await page.goto('http://localhost:5173/game?mode=1v1', { waitUntil: 'networkidle2' }); await sleep(1200);
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
console.log(JSON.stringify({ salio: /Se te cayó la conexión/i.test(t1), seg1: seg(t1), seg2: seg(t2), seFue: !/Se te cayó la conexión/i.test(t3), sigueEnMesa: /TU MANO/.test(t3) }));
await browser.close();
