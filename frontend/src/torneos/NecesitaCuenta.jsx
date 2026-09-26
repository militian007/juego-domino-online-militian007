import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hoja, papel } from './utileria.jsx';
import { comoSeEntra } from '../services/pam.js';

/**
 * LOS TORNEOS SON CON CUENTA (Raul, 26-sep: «invitados no pueden jugar el
 * torneo, tienen que crearse la cuenta»). El invitado ve la vitrina y la
 * pizarra; al tocar ENTRAR sale esta hoja. Con las cuentas del club (la PAM)
 * lo manda a privoytruco.com; sin club, a la entrada de cuentas del domino.
 */
export default function NecesitaCuenta({ abierta, onCerrar }) {
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  useEffect(() => { if (abierta) comoSeEntra().then(setClub); }, [abierta]);
  if (!abierta) return null;
  const delClub = club?.modo === 'pam';
  const entrar = () => {
    if (delClub) window.location.href = `${club.club}/?juego=domino`;
    else navigate('/login');
  };
  return (
    <div onClick={onCerrar} className="fixed inset-0 z-[60] flex items-center justify-center p-[22px]" style={{ background: 'rgba(10,7,4,0.72)' }} data-testid="necesita-cuenta">
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 330 }}>
        <Hoja>
          <div style={{ textAlign: 'center', padding: '4px 2px 2px' }}>
            <p style={papel.titulo}>Los torneos son con tu cuenta</p>
            <p style={{ ...papel.texto, marginTop: 8 }}>
              {delClub
                ? 'Entra con tu cuenta de privoytruco.com para anotarte. Sigue siendo gratis y te llevas la copa.'
                : 'Entra con tu cuenta para anotarte. Sigue siendo gratis y te llevas la copa.'}
            </p>
            <button type="button" onClick={entrar} data-testid="button-entrar-con-cuenta" style={{ ...papel.boton, width: '100%', marginTop: 13 }}>
              {delClub ? 'Entra con tu cuenta del club' : 'Entra con tu cuenta'}
            </button>
            <button type="button" onClick={onCerrar} style={{ ...papel.botonFantasma, width: '100%', marginTop: 7 }}>
              Ahora no
            </button>
          </div>
        </Hoja>
      </div>
    </div>
  );
}
