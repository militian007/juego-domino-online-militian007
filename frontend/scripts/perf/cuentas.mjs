// Piso 0 de la plantilla, sobre el domino: cuantos recalculos de estilo y layouts hace
// cada pantalla en 4 s sin tocar nada (CDP Performance.getMetrics), que anima y sobre que
// propiedad (getAnimations) y cuantas mutaciones del DOM por cuadro. 360x740, como el ludo.
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const cdp = await page.createCDPSession(); await cdp.send('Performance.enable');
const foto = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics; const o = {}; for (const x of m) o[x.name] = x.value; return o; };
const salida = [];
const medir = async (nombre, ms = 4000) => {
  await page.evaluate(() => { window.__mut = 0; window.__obs?.disconnect(); window.__obs = new MutationObserver((l) => { window.__mut += l.length; }); window.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
  const a = await foto(); await sleep(ms); const z = await foto();
  const d = (k) => Math.round((z[k] - a[k]) * (k.endsWith('Duration') ? 1000 : 1));
  const mut = await page.evaluate(() => window.__mut);
  const anims = await page.evaluate(() => document.getAnimations().map((an) => {
    const ef = an.effect; const kf = ef?.getKeyframes ? ef.getKeyframes() : [];
    const props = new Set(); kf.forEach((k) => Object.keys(k).forEach((p) => { if (!['offset', 'computedOffset', 'easing', 'composite'].includes(p)) props.add(p); }));
    const t = ef?.target; const cls = t ? (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ').slice(0, 2).join('.') : t.tagName) : '?';
    return `${an.animationName || an.constructor.name}${an.effect?.getTiming?.().iterations === Infinity ? '∞' : ''}[${[...props].join(',')}]@${cls}`;
  }));
  const fila = { pantalla: nombre, estilos: d('RecalcStyleCount'), estilosMs: d('RecalcStyleDuration'), layouts: d('LayoutCount'), layoutsMs: d('LayoutDuration'), scriptMs: d('ScriptDuration'), tareasMs: d('TaskDuration'), mutaciones: mut, animaciones: anims };
  salida.push(fila);
  console.log(`${nombre.padEnd(26)} estilos ${fila.estilos} (${fila.estilosMs} ms) · layouts ${fila.layouts} (${fila.layoutsMs} ms) · script ${fila.scriptMs} ms · mut ${mut}`);
  if (anims.length) console.log('   anima:', [...new Set(anims)].join(' | '));
};

await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Medidor', retrato: 'nano' })); });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' }); await sleep(800);
await medir('umbral');
await page.goto(`${FRONT}/mesa`, { waitUntil: 'networkidle2' }); await sleep(1200);
await medir('antesala');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'SENTARSE')?.click());
await page.waitForSelector('[data-ficha-mano]', { timeout: 20000 });
await sleep(9000); // que pase el reparto y se vaya el primer consejo
const miTurno = () => page.evaluate(() => /tu turno/i.test(document.body.innerText));
const t0 = Date.now(); while (!(await miTurno()) && Date.now() - t0 < 15000) await sleep(150);
await medir('mesa · mi turno, quieta');
await page.evaluate(() => { for (const d of document.querySelectorAll('[data-ficha-mano] > div')) { d.click(); if (document.querySelector('.iman-slot')) return; d.click(); } });
await sleep(1500);
await medir('mesa · ficha elegida (imán)');
await page.evaluate(() => { const im = document.querySelector('.iman-slot'); im && im.click(); });
await sleep(2500);
await medir('mesa · turno del bot', 2500);
import fs from 'node:fs';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const API = process.env.BATERIA_API || 'http://localhost:4000';
fs.writeFileSync('cuentas-domino.json', JSON.stringify(salida, null, 1));
await browser.close();
