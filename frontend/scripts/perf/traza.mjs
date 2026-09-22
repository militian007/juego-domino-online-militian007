// Traza de Chrome por pantalla del domino, con la CPU frenada 4x: cuanto se va en script,
// estilo, layout, pintura y raster en 4 s (lo que mata al telefono barato).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
const THROTTLE = Number(process.argv[2] || 4);
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink.user_timing'];
const CUENTA = { script: ['FunctionCall', 'EvaluateScript', 'TimerFire', 'EventDispatch', 'RunMicrotasks', 'V8.Execute'], estilo: ['UpdateLayoutTree', 'RecalculateStyles', 'ScheduleStyleRecalculation'], layout: ['Layout', 'PrePaint', 'UpdateLayerTree'], pintura: ['Paint', 'PaintImage', 'Decode Image', 'Decode LazyPixelRef'], raster: ['RasterTask', 'Rasterize'], compuesto: ['CompositeLayers', 'Commit', 'Layerize'] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.emulateCPUThrottling(THROTTLE);
const filas = [];
const trazar = async (nombre, ms = 4000) => {
  await page.tracing.start({ categories: CATS, path: 'traza.json' });
  await sleep(ms);
  await page.tracing.stop();
  const crudo = JSON.parse(fs.readFileSync('traza.json', 'utf8'));
  const ev = Array.isArray(crudo) ? crudo : crudo.traceEvents;
  const tot = {}; let frames = 0;
  for (const e of ev) { if (e.name === 'DrawFrame') frames++; if (!e.dur) continue; for (const [k, names] of Object.entries(CUENTA)) if (names.includes(e.name)) tot[k] = (tot[k] ?? 0) + e.dur / 1000; }
  const fila = Object.entries(CUENTA).map(([k]) => `${k} ${String(Math.round(tot[k] ?? 0)).padStart(5)}`).join(' · ');
  const dibujo = Math.round(((tot.pintura ?? 0) + (tot.raster ?? 0)) / ms * 100);
  console.log(`${nombre.padEnd(26)} ${fila}  ms/${ms / 1000}s · ${frames} frames · dibujo ${dibujo}%`);
  filas.push({ pantalla: nombre, ...Object.fromEntries(Object.keys(CUENTA).map((k) => [k, Math.round(tot[k] ?? 0)])), frames, dibujoPct: dibujo });
};
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Medidor', retrato: 'nano' })); });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' }); await sleep(800);
await trazar('umbral');
await page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' }); await sleep(1200);
await trazar('antesala');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
await page.waitForSelector('[data-ficha-mano]', { timeout: 30000 });
await trazar('mesa · el reparto');
await sleep(5000);
const miTurno = () => page.evaluate(() => /tu turno/i.test(document.body.innerText));
const t0 = Date.now(); while (!(await miTurno()) && Date.now() - t0 < 15000) await sleep(150);
await trazar('mesa · mi turno, quieta');
await page.evaluate(() => { for (const d of document.querySelectorAll('[data-ficha-mano] > div')) { d.click(); if (document.querySelector('.iman-slot')) return; d.click(); } });
await sleep(1500);
await trazar('mesa · ficha elegida (imán)');
await page.evaluate(() => { const im = document.querySelector('.iman-slot'); im && im.click(); });
await trazar('mesa · juega y el bot contesta');
fs.writeFileSync('traza-domino.json', JSON.stringify(filas, null, 1));
await browser.close();
