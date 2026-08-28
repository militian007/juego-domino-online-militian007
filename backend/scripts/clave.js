/**
 * Herramienta de contraseñas para la base de produccion (Supabase).
 *
 * Dos usos:
 *
 *   1) Generar el hash para pegarlo en el editor SQL de Supabase:
 *
 *        node scripts/clave.js hash "miClaveNueva"
 *
 *      Imprime el UPDATE listo para copiar. No necesita conexion a la base.
 *
 *   2) Cambiarla directo, si tenes la DATABASE_URL a mano:
 *
 *        DATABASE_URL="postgresql://..." node scripts/clave.js set mili "miClaveNueva"
 *        DATABASE_URL="postgresql://..." node scripts/clave.js listar
 *
 *      La DATABASE_URL sale del panel de Supabase (Settings > Database >
 *      Connection string > Transaction pooler). Nunca se guarda en el repo.
 */

import bcrypt from 'bcryptjs';

const [, , comando, ...args] = process.argv;

function ayuda() {
  console.log(`
Uso:
  node scripts/clave.js hash "claveNueva"                 genera el hash + el SQL
  DATABASE_URL="..." node scripts/clave.js listar         lista los usuarios
  DATABASE_URL="..." node scripts/clave.js set USUARIO "claveNueva"
`);
}

async function conectar() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL. Sacala del panel de Supabase:');
    console.error('  Settings > Database > Connection string > Transaction pooler\n');
    process.exit(1);
  }
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  return pool;
}

if (comando === 'hash') {
  const clave = args[0];
  if (!clave) {
    console.error('Falta la clave. Ej: node scripts/clave.js hash "miClave123"');
    process.exit(1);
  }
  if (clave.length < 6) {
    console.error('La clave tiene que tener al menos 6 caracteres.');
    process.exit(1);
  }
  const hash = bcrypt.hashSync(clave, 10);
  console.log('\nhash bcrypt:\n' + hash);
  console.log('\nSQL para pegar en el editor de Supabase:\n');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'mili';`);
  console.log('\n(cambia el username si hace falta)\n');
} else if (comando === 'listar') {
  const pool = await conectar();
  const { rows } = await pool.query(
    'SELECT id, username, email, games_played, created_at FROM users ORDER BY id'
  );
  console.log(`\n${rows.length} usuario(s) en produccion:\n`);
  for (const u of rows) {
    console.log(`  #${u.id}  ${u.username}  <${u.email}>  partidas:${u.games_played}`);
  }
  console.log('');
  await pool.end();
} else if (comando === 'set') {
  const [usuario, clave] = args;
  if (!usuario || !clave) {
    console.error('Uso: node scripts/clave.js set USUARIO "claveNueva"');
    process.exit(1);
  }
  if (clave.length < 6) {
    console.error('La clave tiene que tener al menos 6 caracteres.');
    process.exit(1);
  }
  const pool = await conectar();
  const hash = bcrypt.hashSync(clave, 10);
  const { rowCount } = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2',
    [hash, usuario]
  );
  if (rowCount === 0) {
    console.error(`\nNo existe el usuario "${usuario}". Corre "listar" para ver cuales hay.\n`);
    await pool.end();
    process.exit(1);
  }
  // verificar que quedo bien antes de cantar victoria
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE username = $1', [usuario]);
  const ok = bcrypt.compareSync(clave, rows[0].password_hash);
  console.log(`\nClave de "${usuario}" actualizada. Verificacion bcrypt: ${ok ? 'OK' : 'FALLO'}\n`);
  await pool.end();
} else {
  ayuda();
}
