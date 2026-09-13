/**
 * EL MARCO DE TELEFONO.
 *
 * La misma receta del truco y del Ludo de la casa (Raul, 12-sep: "que en la
 * PC se vea como en el telefono, para poder probar y jugar bien"). En un
 * monitor la app vive en una COLUMNA del ancho de un telefono, centrada, y lo
 * que sobra a los lados es la mesa desenfocada y apagada: la sala alrededor,
 * no una interfaz estirada de borde a borde.
 *
 * El ancho de la columna sale del ALTO de la ventana por la proporcion de un
 * telefono (9:16, 0,58), con tope en 620 px. En el telefono manda el
 * `min(100%)` y no cambia nada.
 *
 * La columna NO lleva transform (se centra con flex): asi lo que va en
 * `position: fixed` (la ceremonia, el cartel de cuentas, los velos) sigue
 * midiendose contra la ventana entera, que es lo que espera. Como todo eso
 * va centrado, cae igual sobre la columna.
 */
export const ANCHO_COLUMNA = 'min(100%, min(620px, calc(100dvh * 0.58)))';

export default function MarcoDeTelefono({ children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        background: '#0a1414',
        overflow: 'hidden'
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/mesa-de-juego.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(26px) brightness(0.3) saturate(0.8)',
          transform: 'scale(1.12)',
          pointerEvents: 'none'
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(80% 70% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'relative',
          width: ANCHO_COLUMNA,
          height: '100dvh',
          overflowX: 'hidden',
          overflowY: 'auto',
          boxShadow: '0 0 60px 10px rgba(0,0,0,0.55)',
          background: '#0a1414'
        }}
      >
        {children}
      </div>
    </div>
  );
}
