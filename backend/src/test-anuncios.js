// LOS ANUNCIOS DE LA CASA (seccion 214), copiados del truco.
//
// La promesa de Raul: «que les salga UNA VEZ a los jugadores». Aqui van las
// pruebas del truco (anuncios.test.ts) pasadas a esta casa: el publico, la
// ventana, una vez / cada vez / recordatorio, el reemplazo que cuenta como
// bajado, el estado calculado al leer, las marcas al cerrar (con cuenta en la
// base, sin cuenta en el telefono) y la llave del socio.
//
//   node src/test-anuncios.js
//
// Base SQLite propia en un archivo temporal. Sale con process.exitCode.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const BASE = path.join(os.tmpdir(), `domino-anuncios-${process.pid}.db`);
for (const f of [BASE, `${BASE}-wal`, `${BASE}-shm`]) fs.rmSync(f, { force: true });
for (const f of fs.readdirSync(os.tmpdir()).filter((n) => /^domino-anuncios-\d+\.db/.test(n))) {
  try {
    const ruta = path.join(os.tmpdir(), f);
    if (Date.now() - fs.statSync(ruta).mtimeMs > 3600_000) fs.rmSync(ruta, { force: true });
  } catch { /* en uso */ }
}
process.env.DATABASE_PATH = BASE;
delete process.env.DATABASE_URL;
process.env.DOMINO_BUZON_LLAVE = 'llave-anuncios';
process.env.JWT_SECRET = 'secreto-anuncios';

const { initDatabase, query } = await import('./config/database.js');
const A = await import('./services/anuncios.js');
const { jugador, socio } = await import('./routes/anuncios.js');
const express = (await import('express')).default;
const jwt = (await import('jsonwebtoken')).default;

let pasados = 0;
let fallados = 0;
async function prueba(texto, fn) {
  try {
    await fn();
    console.log(`  ✓ ${texto}`);
    pasados++;
  } catch (err) {
    console.log(`  ✗ ${texto}\n      ${err.message}`);
    fallados++;
  }
}

const BASE_ANUNCIO = {
  id: 'anuncio-1',
  titulo: 'Torneo del sábado',
  cuerpo: 'A las 8, con premio.',
  forma: 'sobre',
  publico: 'todos',
  desde: '2026-08-15T20:00:00.000Z',
  hasta: '2026-08-16T00:00:00.000Z',
  veces: 'una',
  recordarMin: null,
  eventoAt: null
};
const DENTRO = new Date('2026-08-15T21:00:00.000Z');
const nadie = { invitado: false, visto: null, recordado: null };

console.log('\nLas reglas, sin base');

await prueba('la ventana manda: antes no, dentro sí, después no', () => {
  assert.equal(A.estaVigente(BASE_ANUNCIO, new Date('2026-08-15T19:59:00.000Z')), false);
  assert.equal(A.estaVigente(BASE_ANUNCIO, DENTRO), true);
  assert.equal(A.estaVigente(BASE_ANUNCIO, new Date('2026-08-16T00:01:00.000Z')), false);
});

await prueba('sin fecha de fin, vive hasta que lo bajen', () => {
  assert.equal(A.estaVigente({ ...BASE_ANUNCIO, hasta: null }, new Date('2027-01-01T00:00:00.000Z')), true);
});

await prueba('el público elige a quién le sale', () => {
  const cuenta = { invitado: false };
  const invitado = { invitado: true };
  assert.equal(A.alcanzaAlJugador({ publico: 'todos' }, cuenta), true);
  assert.equal(A.alcanzaAlJugador({ publico: 'todos' }, invitado), true);
  assert.equal(A.alcanzaAlJugador({ publico: 'cuenta' }, cuenta), true);
  assert.equal(A.alcanzaAlJugador({ publico: 'cuenta' }, invitado), false);
  assert.equal(A.alcanzaAlJugador({ publico: 'invitados' }, cuenta), false);
  assert.equal(A.alcanzaAlJugador({ publico: 'invitados' }, invitado), true);
  assert.equal(A.loQueLeToca({ ...BASE_ANUNCIO, publico: 'invitados' }, nadie, DENTRO), null);
});

await prueba('«una vez y ya»: la segunda vez no le sale', () => {
  assert.equal(A.loQueLeToca(BASE_ANUNCIO, nadie, DENTRO)?.motivo, 'vista');
  assert.equal(A.loQueLeToca(BASE_ANUNCIO, { ...nadie, visto: BASE_ANUNCIO.id }, DENTRO), null);
});

await prueba('«cada vez que entre» no se cansa nunca', () => {
  const a = { ...BASE_ANUNCIO, veces: 'siempre' };
  assert.equal(A.loQueLeToca(a, { ...nadie, visto: a.id }, DENTRO)?.motivo, 'vista');
});

await prueba('el recordatorio llega sólo en la antesala del evento, y una sola vez', () => {
  const a = { ...BASE_ANUNCIO, veces: 'recordar', recordarMin: 30, eventoAt: '2026-08-15T23:00:00.000Z' };
  const yaLoVio = { ...nadie, visto: a.id };
  assert.equal(A.loQueLeToca(a, yaLoVio, new Date('2026-08-15T20:30:00.000Z')), null);
  assert.equal(A.loQueLeToca(a, yaLoVio, new Date('2026-08-15T22:40:00.000Z'))?.motivo, 'recordatorio');
  assert.equal(A.loQueLeToca(a, yaLoVio, new Date('2026-08-15T23:10:00.000Z')), null);
  assert.equal(A.loQueLeToca(a, { ...yaLoVio, recordado: a.id }, new Date('2026-08-15T22:40:00.000Z')), null);
  // Antes de haberlo visto, lo primero es la vista, no el recordatorio.
  assert.equal(A.loQueLeToca(a, nadie, new Date('2026-08-15T22:40:00.000Z'))?.motivo, 'vista');
});

await prueba('al jugador no le llega quién lo puso ni sus reglas', () => {
  const r = A.loQueLeToca({ ...BASE_ANUNCIO, creadoPor: 'socio' }, nadie, DENTRO);
  assert.deepEqual(Object.keys(r).sort(), ['cuerpo', 'eventoAt', 'forma', 'id', 'motivo', 'titulo']);
});

await prueba('recordar sin hora del evento se rebota', () => {
  assert.ok(A.validar({ titulo: 't', cuerpo: 'c', forma: 'sobre', publico: 'todos', veces: 'recordar', recordarMin: 30 }).error);
  assert.ok(A.validar({ titulo: 't', cuerpo: 'c', forma: 'otra', publico: 'todos', veces: 'una' }).error);
  assert.ok(A.validar({ titulo: '', cuerpo: 'c', forma: 'sobre', publico: 'todos', veces: 'una' }).error);
  assert.ok(A.validar({ titulo: 't', cuerpo: 'c', forma: 'sobre', publico: 'todos', veces: 'una', hasta: 'mañana' }).error);
  assert.ok(A.validar({ titulo: 't', cuerpo: 'c', forma: 'pizarra', publico: 'cuenta', veces: 'una' }).datos);
});

console.log('\nLa base');
await initDatabase();

const nuevo = (extra = {}) => A.validar({ titulo: 'Aviso', cuerpo: 'Texto', forma: 'sobre', publico: 'todos', veces: 'una', ...extra }).datos;

await prueba('publicar deja uno vivo; publicar otro deja al anterior BAJADO aunque nadie lo toque', async () => {
  const uno = await A.publicarAnuncio(nuevo({ titulo: 'Uno' }));
  assert.equal((await A.anuncioGuardado()).id, uno.id);
  const dos = await A.publicarAnuncio(nuevo({ titulo: 'Dos' }));
  assert.equal((await A.anuncioGuardado()).id, dos.id);
  const lista = await A.historialDeAnuncios();
  assert.equal(lista[0].id, dos.id);
  assert.equal(lista[0].estado, 'activo');
  assert.equal(lista.find((h) => h.id === uno.id).estado, 'bajado');
  assert.ok(lista.find((h) => h.id === uno.id).bajadoAt);
});

await prueba('bajarlo lo cierra y ya no hay vivo', async () => {
  const vivo = await A.anuncioGuardado();
  await A.bajarAnuncio();
  assert.equal(await A.anuncioGuardado(), null);
  assert.equal((await A.historialDeAnuncios()).find((h) => h.id === vivo.id).estado, 'bajado');
});

await prueba('el estado se calcula al leer: programado, activo, vencido con la misma fila', async () => {
  const desde = new Date(Date.now() + 3600_000).toISOString();
  const hasta = new Date(Date.now() + 7200_000).toISOString();
  const a = await A.publicarAnuncio(nuevo({ desde, hasta }));
  const estado = async (ms) => (await A.historialDeAnuncios(new Date(Date.now() + ms))).find((h) => h.id === a.id).estado;
  assert.equal(await estado(0), 'programado');
  assert.equal(await estado(5400_000), 'activo');
  assert.equal(await estado(10_800_000), 'vencido');
  const { rows } = await query('SELECT datos FROM anuncios WHERE id = ?', [a.id]);
  assert.equal(JSON.parse(rows[0].datos).estado, undefined, 'el estado no se guarda');
});

await prueba('la lista guarda los últimos 30', async () => {
  for (let i = 0; i < 33; i++) await A.publicarAnuncio(nuevo({ titulo: `N${i}` }));
  const lista = await A.historialDeAnuncios();
  assert.equal(lista.length, 30);
  assert.equal(lista[0].titulo, 'N32');
  const { rows } = await query('SELECT COUNT(*) AS c FROM anuncios');
  assert.equal(Number(rows[0].c), 30);
  assert.equal(lista.filter((h) => h.estado === 'activo').length, 1);
});

await prueba('las marcas de la cuenta se pisan con el id de turno y no crecen', async () => {
  await A.marcarVisto(7, 'a1');
  await A.marcarVisto(7, 'a2');
  await A.marcarVisto(7, 'a2', 'recordatorio');
  assert.deepEqual(await A.marcasDe(7), { visto: 'a2', recordado: 'a2' });
  const { rows } = await query("SELECT COUNT(*) AS c FROM preferencias WHERE user_id = 7 AND clave LIKE 'anuncio.%'");
  assert.equal(Number(rows[0].c), 2);
});

console.log('\nLas rutas');
const app = express();
app.use(express.json());
app.use('/api/anuncios', jugador);
app.use('/api/socio/anuncios', socio);
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const URL_BASE = `http://127.0.0.1:${server.address().port}/api`;
const LLAVE = { 'x-llave': 'llave-anuncios', 'content-type': 'application/json' };
const token = jwt.sign({ id: 42, username: 'pana' }, 'secreto-anuncios');
const conCuenta = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
const pedir = async (ruta, opciones = {}) => {
  const r = await fetch(`${URL_BASE}${ruta}`, opciones);
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const publicar = (cuerpo) => pedir('/socio/anuncios', { method: 'POST', headers: LLAVE, body: JSON.stringify({ titulo: 'Esta noche', cuerpo: 'Hay torneo', forma: 'sobre', publico: 'todos', veces: 'una', ...cuerpo }) });

try {
  await prueba('sin llave no se publica ni se mira', async () => {
    assert.equal((await pedir('/socio/anuncios')).status, 403);
    assert.equal((await pedir('/socio/anuncios', { method: 'POST', headers: { 'content-type': 'application/json', 'x-llave': 'mala' }, body: '{}' })).status, 403);
    assert.equal((await pedir('/socio/anuncios', { method: 'DELETE' })).status, 403);
  });

  await prueba('con cuenta: le sale, lo cierra, y ya no le sale (la marca es al cerrar)', async () => {
    const p = await publicar({ forma: 'pizarra' });
    assert.equal(p.status, 201);
    const id = p.body.anuncio.id;
    const a = await pedir('/anuncios/vigente', { headers: conCuenta });
    assert.equal(a.body.anuncio.id, id);
    assert.equal(a.body.anuncio.forma, 'pizarra');
    // Mostrarlo no marca nada: si se pierde por un reload, sigue ahi.
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio?.id, id);
    const v = await pedir('/anuncios/visto', { method: 'POST', headers: conCuenta, body: JSON.stringify({ id, tipo: 'vista' }) });
    assert.equal(v.status, 200);
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio, null);
  });

  await prueba('el invitado trae sus marcas del teléfono: sin marca le sale, con marca no', async () => {
    const id = (await publicar({ forma: 'casa' })).body.anuncio.id;
    assert.equal((await pedir('/anuncios/vigente')).body.anuncio?.id, id);
    assert.equal((await pedir(`/anuncios/vigente?visto=${id}`)).body.anuncio, null);
    // Marcar sin cuenta no se puede en el servidor.
    assert.equal((await pedir('/anuncios/visto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })).status, 401);
  });

  await prueba('el público se respeta por la ruta', async () => {
    await publicar({ publico: 'invitados' });
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio, null);
    assert.ok((await pedir('/anuncios/vigente')).body.anuncio);
    await publicar({ publico: 'cuenta' });
    assert.ok((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio);
    assert.equal((await pedir('/anuncios/vigente')).body.anuncio, null);
  });

  await prueba('republicar es otro anuncio: al que ya vio el anterior le sale de nuevo', async () => {
    const id1 = (await publicar({})).body.anuncio.id;
    await pedir('/anuncios/visto', { method: 'POST', headers: conCuenta, body: JSON.stringify({ id: id1 }) });
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio, null);
    const id2 = (await publicar({})).body.anuncio.id;
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio?.id, id2);
  });

  await prueba('recordar: la vista, y a los 30 min del evento el recordatorio, una sola vez', async () => {
    const eventoAt = new Date(Date.now() + 20 * 60_000).toISOString();
    const id = (await publicar({ veces: 'recordar', recordarMin: 30, eventoAt })).body.anuncio.id;
    const primero = (await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio;
    assert.equal(primero.motivo, 'vista');
    assert.equal(primero.eventoAt, eventoAt);
    await pedir('/anuncios/visto', { method: 'POST', headers: conCuenta, body: JSON.stringify({ id, tipo: 'vista' }) });
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio?.motivo, 'recordatorio');
    await pedir('/anuncios/visto', { method: 'POST', headers: conCuenta, body: JSON.stringify({ id, tipo: 'recordatorio' }) });
    assert.equal((await pedir('/anuncios/vigente', { headers: conCuenta })).body.anuncio, null);
    // El invitado hace lo mismo con las dos marcas de su telefono.
    assert.equal((await pedir(`/anuncios/vigente?visto=${id}`)).body.anuncio?.motivo, 'recordatorio');
    assert.equal((await pedir(`/anuncios/vigente?visto=${id}&recordado=${id}`)).body.anuncio, null);
  });

  await prueba('el socio ve el guardado, la lista con su estado, y lo baja', async () => {
    const g = await pedir('/socio/anuncios', { headers: LLAVE });
    assert.ok(g.body.anuncio && g.body.vigente === true);
    const h = await pedir('/socio/anuncios/historial', { headers: LLAVE });
    assert.equal(h.body.anuncios[0].estado, 'activo');
    assert.equal(h.body.anuncios[1].estado, 'bajado');
    assert.equal((await pedir('/socio/anuncios', { method: 'DELETE', headers: LLAVE })).status, 200);
    assert.equal((await pedir('/anuncios/vigente')).body.anuncio, null);
    const h2 = await pedir('/socio/anuncios/historial', { headers: LLAVE });
    assert.equal(h2.body.anuncios[0].estado, 'bajado');
  });

  await prueba('un anuncio mal escrito se rebota con su motivo', async () => {
    const r = await publicar({ veces: 'recordar' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /hora del evento/);
  });
} finally {
  server.close();
}

console.log(`\n${pasados} pasaron, ${fallados} fallaron`);
if (fallados > 0) process.exitCode = 1;
