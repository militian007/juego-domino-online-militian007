import { useEffect, useState } from 'react';

/**
 * El "+15" que salta cuando alguien deja las puntas en multiplo de cinco (§128).
 *
 * En la modalidad Cinco el marcador se mueve A MITAD DE MANO, y eso no se ve:
 * el numero de arriba cambia y nadie mira arriba mientras juega. Sin este
 * cartelito, la mitad de los puntos de la partida pasan sin que te enteres.
 *
 * El dato viene del servidor —`ultimoCinco`, con su `seq`— y no se calcula
 * aqui. La pantalla no decide puntajes (regla 8 del proyecto); y el `seq` es lo
 * que permite avisar dos veces seguidas del mismo numero: sin el, React veria
 * el mismo dato y no volveria a animar.
 */

const MS_VISIBLE = 1600;

export default function AvisoDeCinco({ cinco, soyYo }) {
  const [visible, setVisible] = useState(null);
  const seq = cinco?.seq ?? null;

  useEffect(() => {
    if (seq == null) return;
    setVisible(cinco);
    const id = setTimeout(() => setVisible(null), MS_VISIBLE);
    return () => clearTimeout(id);
  }, [seq]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 z-40 flex justify-center">
      <span
        className={`cinco-sube text-[40px] font-black leading-none tabular-nums ${
          soyYo ? 'text-emerald-300' : 'text-domino-cream/80'
        }`}
        style={{ textShadow: '0 0 18px rgba(0,0,0,.9), 0 3px 0 rgba(0,0,0,.8)' }}
      >
        +{visible.points}
      </span>
    </div>
  );
}
