// Regenera src/components/iconosColor.js con los iconos a color que usa el juego.
//
//   node tools/extraer-iconos.cjs     (desde frontend/)
//
// Los iconos salen del set Fluent Emoji de Microsoft, via el paquete
// @iconify-json/fluent-emoji-flat. Se extraen SOLO los que se usan porque
// importar el JSON entero mete mas de un mega al bundle para cinco iconos.
//
// Regla de oro del proyecto (CLAUDE.md 1.1): iconos de libreria, nunca a mano.
const fs = require('fs');
const set = require('@iconify-json/fluent-emoji-flat/icons.json');

const QUIERO = {
  sonido: 'speaker-high-volume',
  silencio: 'muted-speaker',
  paleta: 'artist-palette',
  gesto: 'grinning-face',
  salir: 'cross-mark'
};

const salida = {};
for (const [clave, nombre] of Object.entries(QUIERO)) {
  const ic = set.icons[nombre];
  if (!ic) throw new Error('no existe el icono ' + nombre + ' en el set');
  salida[clave] = {
    body: ic.body,
    w: ic.width || set.width || 32,
    h: ic.height || set.height || 32
  };
}

const cabecera = [
  '// GENERADO por tools/extraer-iconos.cjs. No editar a mano.',
  '//',
  '// Cuerpo de los SVG tal cual vienen de @iconify-json/fluent-emoji-flat.',
  ''
].join('\n');

fs.writeFileSync(
  'src/components/iconosColor.js',
  cabecera + 'export const ICONOS = ' + JSON.stringify(salida, null, 2) + ';\n'
);

console.log('escritos ' + Object.keys(salida).length + ' iconos en src/components/iconosColor.js');
