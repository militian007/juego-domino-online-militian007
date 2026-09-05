// Deja la clasificacion en cero: todos con cero puntos y cero partidas.
//
//   npm run reiniciar-clasificacion            (pregunta y no hace nada)
//   npm run reiniciar-clasificacion -- --hazlo (borra de verdad)
//
// Pedido de Jonathan antes de abrir el juego a la gente: que nadie arranque con
// numeros de las pruebas.
//
// Trabaja sobre la base QUE ESTE CONFIGURADA. En una maquina sin DATABASE_URL
// es la SQLite local; en el servidor, la de produccion. Por eso pregunta antes.
import { initDatabase, query } from './config/database.js';

const TABLAS = [
  ['ranking_semana', 'los puntos de la semana'],
  ['ranking', 'los puntos y las partidas de cada uno'],
  ['partida_jugadores', 'quien jugo cada partida'],
  ['partidas', 'el historial de partidas'],
  ['torneo_inscritos', 'los anotados a torneos'],
  ['torneos', 'los torneos y sus campeones']
];

const contar = async (tabla) => {
  try {
    const { rows } = await query(`SELECT COUNT(*) AS n FROM ${tabla}`);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
};

async function main() {
  await initDatabase();

  const donde = process.env.DATABASE_URL ? 'PRODUCCION (Postgres)' : 'esta maquina (SQLite)';
  const hazlo = process.argv.includes('--hazlo');

  console.log('');
  console.log(`  Base de datos: ${donde}`);
  console.log('');
  console.log('  Se va a borrar:');

  let total = 0;
  for (const [tabla, que] of TABLAS) {
    const n = await contar(tabla);
    total += n;
    console.log(`    ${String(n).padStart(6)}  ${que}`);
  }

  console.log('');
  console.log('  Las CUENTAS no se tocan: nadie pierde su usuario ni su clave.');
  console.log('');

  if (total === 0) {
    console.log('  Ya estaba todo en cero. No hay nada que hacer.');
    process.exit(0);
  }

  if (!hazlo) {
    console.log('  No se borro nada. Para hacerlo de verdad:');
    console.log('    npm run reiniciar-clasificacion -- --hazlo');
    console.log('');
    process.exit(0);
  }

  // El orden importa: primero lo que apunta a otra tabla.
  for (const [tabla] of TABLAS) {
    await query(`DELETE FROM ${tabla}`);
  }

  console.log('  Listo. Todos arrancan de cero.');
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('No se pudo reiniciar:', err.message);
  process.exit(1);
});
