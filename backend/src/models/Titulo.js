/**
 * Los titulos que se pueden ganar y como se llaman en pantalla.
 *
 * Un titulo es la linea que va debajo del nombre en el chat y en la tabla. No
 * cambia nada del juego: es puro alarde, que es justamente para lo que sirve.
 *
 * La clave es la misma que se guarda en `desbloqueos`, asi que quien no lo tiene
 * ganado no puede ponerselo aunque mande la peticion a mano.
 */
export const TITULOS = {
  'titulo:tranquero': 'Tranquero',
  'titulo:chivo': 'Chivo',
  'titulo:matador': 'Matador',
  'titulo:cabezafria': 'Cabeza Fría',
  'titulo:elduro': 'El Duro',
  'titulo:padrino': 'Padrino',
  'titulo:leyenda': 'Leyenda'
};

export const esTitulo = (clave) => Object.prototype.hasOwnProperty.call(TITULOS, clave);

export const nombreDe = (clave) => TITULOS[clave] ?? null;
