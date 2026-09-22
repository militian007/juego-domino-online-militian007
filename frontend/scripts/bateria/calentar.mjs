// Calienta la pantalla de la bateria: abre las rutas una vez para que Vite las
// compile antes de que corran las pruebas con reloj (la primera carga en frio
// tarda segundos y hacia fallar las esperas cortas).
import puppeteer from 'puppeteer-core';
const FRONT = process.env.BATERIA_FRONT || 'http://localhost:5173';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
await page.goto(`${FRONT}/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.setItem('domino-identidad', JSON.stringify({ nombre: 'Calentador', retrato: 'nano' })));
for (const ruta of ['/mesa', '/game?mode=1v1', '/ranking', '/torneos', '/']) {
  await page.goto(`${FRONT}${ruta}`, { waitUntil: 'networkidle2' });
}
await browser.close();
console.log('caliente');
