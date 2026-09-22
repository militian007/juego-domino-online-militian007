import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DockDeLaCasa from './DockDeLaCasa.jsx';
import Salon from '../salon/Salon.jsx';
import IdentidadLigera from '../umbral/IdentidadLigera.jsx';
import { identidad } from '../umbral/identidad.js';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';

/**
 * EL DOCK CON SUS PUERTAS YA CABLEADAS (seccion 197), para las pantallas de
 * la casa que no son el umbral (antesala, cuadro de honor, torneos):
 * JUGAR → la antesala; TORNEO → el Relampago; PANAS → el salon en «En linea»;
 * CAJA → la tienda (o crear cuenta); PERFIL → el perfil (o la identidad).
 */
export default function PuertasDeLaCasa({ activa }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const conCuenta = haySesion() && user;
  const [salon, setSalon] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  const irA = (puerta) => {
    if (puerta === 'jugar') return identidad() || conCuenta ? navigate('/mesa') : setPidiendo(true);
    if (puerta === 'torneo') return navigate('/torneos');
    if (puerta === 'panas') return setSalon(true);
    if (puerta === 'perfil') return setPidiendo(true);
    return undefined;
  };

  return (
    <>
      <div className="sticky bottom-0 z-20">
        <DockDeLaCasa activa={activa} onIr={irA} />
      </div>
      <Salon abierto={salon} pestanaInicial="gente" onCerrar={() => setSalon(false)} />
      <IdentidadLigera abierta={pidiendo} onCerrar={() => setPidiendo(false)} onListo={() => setPidiendo(false)} />
    </>
  );
}
