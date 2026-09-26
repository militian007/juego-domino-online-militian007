// LA PUERTA DEL CLUB en la pantalla (seccion 203): con las cuentas de la PAM,
// el umbral dice «ENTRA CON TU CUENTA DE PRIVOYTRUCO.COM» y JUEGA YA lleva al
// club; con una ficha en la URL, el jugador entra como cuenta y la ficha se
// borra de la barra. El servidor se prueba aparte (backend/src/test-pam.js);
// aqui se le pone una PAM de mentira al navegador para no levantar otro juego.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const OUT = process.env.DOMINO_OUT || 'out';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const consola = [];
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
// Los 401 del socket son los esperados: la llave de mentira no la firmo nadie.
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/401/.test(m.text())) consola.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));

// La PAM de mentira, para el navegador: solo las dos rutas de la puerta.
await page.setRequestInterception(true);
let pidioEntrar = null;
// En la bateria la pantalla y el servidor viven en puertos distintos: las
// respuestas de mentira llevan sus cabeceras de CORS, como las de verdad.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
page.on('request', (req) => {
  const u = req.url();
  // El club no se visita de verdad: basta saber que el boton lleva alla.
  if (u.startsWith('https://privoytruco.com')) {
    return req.respond({ status: 200, contentType: 'text/html', body: '<p>el club</p>' });
  }
  if (req.method() === 'OPTIONS' && /\/api\/(pam|auth\/me)/.test(u)) {
    return req.respond({ status: 204, headers: CORS, body: '' });
  }
  if (u.endsWith('/api/pam')) {
    return req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ modo: 'pam', club: 'https://privoytruco.com', operador: 'domino' }) });
  }
  if (u.endsWith('/api/pam/entrar')) {
    pidioEntrar = JSON.parse(req.postData() || '{}');
    return req.respond({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'llave-de-mentira', user: { id: 4242, username: 'RaulDelClub', email: 'r@pam.local' }, saldo: '1250000', moneda: 'VES' })
    });
  }
  // La llave de mentira no la puede firmar el navegador: se le contesta el
  // «quien soy» para poder seguir el camino del jugador hasta la mesa.
  if (u.endsWith('/api/auth/me')) {
    return req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ user: { id: 4242, username: 'RaulDelClub', email: 'r@pam.local' } }) });
  }
  // Los torneos de la cuenta (seccion 211) se piden con la llave de mentira, que
  // el servidor de la bateria no reconoce: contestaria 401 y la pantalla cerraria
  // la sesion. Se contesta «no tienes torneos», como a una cuenta nueva.
  if (req.method() === 'OPTIONS' && /\/api\/torneos\/mios/.test(u)) return req.respond({ status: 204, headers: CORS, body: '' });
  if (/\/api\/torneos\/mios/.test(u)) {
    return req.respond({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ torneos: [] }) });
  }
  return req.continue();
});

// ---- 1. Sin ficha: la puerta es el club ----
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.clear(); });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await sleep(1500);
const diceElClub = await page.evaluate(() => Boolean(document.querySelector('[data-club]')));
await page.screenshot({ path: path.join(OUT, 'pam-1-umbral.png') });
await Promise.all([
  page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
  page.evaluate(() => document.querySelector('[data-juega-ya]')?.click())
]);
const llevaAlClub = page.url().includes('privoytruco.com') && page.url().includes('juego=domino');

// ---- 2. Con ficha: entra como cuenta y la ficha se borra de la barra ----
await page.goto(`${FRONT}/?launchToken=ficha-de-raul-12345678&moneda=VES`, { waitUntil: 'networkidle2' });
await sleep(1800);
const canjeo = pidioEntrar?.launchToken === 'ficha-de-raul-12345678';
const sinFichaEnLaUrl = !page.url().includes('launchToken=') && !page.url().includes('moneda=');
const guardo = await page.evaluate(() => ({ token: localStorage.getItem('token'), user: localStorage.getItem('user') }));
const entroComoCuenta = guardo.token === 'llave-de-mentira' && String(guardo.user).includes('RaulDelClub');
const conNombreDelClub = (await page.evaluate(() => document.body.innerText)).includes('RaulDelClub');
await page.screenshot({ path: path.join(OUT, 'pam-2-entro.png') });

const r = { diceElClub, llevaAlClub, canjeo, sinFichaEnLaUrl, entroComoCuenta, conNombreDelClub, consola };
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(diceElClub && llevaAlClub && canjeo && sinFichaEnLaUrl && entroComoCuenta && conNombreDelClub && consola.length === 0 ? 0 : 1);
