import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import IdentidadLigera from './IdentidadLigera.jsx';
import { identidad, retratoUrl } from './identidad.js';
import PuertaDelSalon from '../salon/PuertaDelSalon.jsx';
import Salon from '../salon/Salon.jsx';
import RetoEntrante from '../components/notificaciones/RetoEntrante.jsx';
import DockDeLaCasa from '../casa/DockDeLaCasa.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { haySesion } from '../services/api.js';
import { connectSocket } from '../services/socket.js';

/**
 * EL UMBRAL (seccion 197): la puerta del domino con la receta de la casa, la
 * que Raul aprobo en el truco y en el ludo. Escogio la A («la pancarta y las
 * fichas colgadas, como el ludo») con dos pedidos: las fichas de abajo con
 * sus puntos, distintas, brincando por turnos como los peones; y la losa de
 * MESA ONLINE con la mesita de la antesala.
 *
 * La escena es la portada D (la noche tropical del club, seccion 177). Encima,
 * botones que son OBJETOS: la pancarta de pano JUEGA YA (la misma del truco y
 * del ludo, con su manito), y dos losas colgadas a la derecha: la mesita
 * (MESA ONLINE, late si hay gente) y el «?» (COMO SE JUEGA). Abajo, la capsula
 * del salon y el dock de la casa.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";

/** Cuatro fichas distintas, en fila, brincando por turnos. */
// Las fichas recortadas se llaman tile_a_b con a <= b.
const FICHAS = ['tile_6_6', 'tile_3_5', 'tile_1_4', 'tile_0_2'];

const REGLAS = [
  'Dominó venezolano, doble seis, 28 fichas.',
  'Sale el doble más alto. Después, el que ganó la mano.',
  'Se juega por las dos puntas de la culebra.',
  'Uno contra uno con pozo; dos contra dos sin pozo.',
  'El que se pega suma los puntos que quedaron en las otras manos.',
  'Tranque: gana el que menos puntos tenga, y suma los del rival.'
];

export default function Umbral() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const conCuenta = haySesion() && user;
  const [pidiendo, setPidiendo] = useState(false);
  const [reglas, setReglas] = useState(false);
  const [salon, setSalon] = useState(null); // null | 'chat' | 'gente'
  const [enLinea, setEnLinea] = useState(0);
  const yo = identidad();

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;
    const alContar = (c) => setEnLinea(Number(c?.total) || 0);
    socket.on('presence:count', alContar);
    return () => { socket.off('presence:count', alContar); };
  }, []);

  const jugar = () => {
    if (identidad() || conCuenta) navigate('/mesa');
    else setPidiendo(true);
  };

  const irA = (puerta) => {
    if (puerta === 'jugar') return jugar();
    if (puerta === 'torneo') return navigate('/torneos');
    if (puerta === 'panas') return setSalon('gente');
    if (puerta === 'caja') return navigate(conCuenta ? '/tienda' : '/register');
    if (puerta === 'perfil') return conCuenta ? navigate('/perfil') : setPidiendo(true);
    return undefined;
  };

  const hayGente = enLinea > 1;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#143024] text-domino-cream">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img src="/umbral/portada-d.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,14,10,0.45) 0%, rgba(6,14,10,0) 22%, rgba(6,14,10,0) 56%, rgba(6,14,10,0.85) 100%)' }} />

        {/* EL NOMBRE, en hueso (como en el ludo: «un color que no sea dorado»). */}
        <div className="umbral-baja absolute inset-x-0 z-[3] text-center" style={{ top: 'calc(10px + env(safe-area-inset-top))' }}>
          <div className="text-[9px] font-black tracking-[0.3em] text-[#EDE3C8]/85" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.7)' }}>
            LA CASA DE PRIVO PRESENTA
          </div>
          <div className="font-black leading-none text-[#EDE3C8]" style={{ fontFamily: SERIF, textShadow: '0 2px 3px rgba(0,0,0,0.85), 0 8px 22px rgba(0,0,0,0.7)' }}>
            <span className="mb-1 block text-[13px] tracking-[0.34em]">LA MESA DE</span>
            <span className="block tracking-[0.06em]" style={{ fontSize: 'clamp(46px, 15vw, 64px)' }}>DOMINÓ</span>
          </div>
        </div>

        {(conCuenta || yo) && (
          <button
            type="button"
            onClick={() => (conCuenta ? navigate('/perfil') : setPidiendo(true))}
            className="absolute right-3 z-[4] flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/45 py-1 pl-1 pr-3 text-[13px] font-bold"
            style={{ top: 'calc(10px + env(safe-area-inset-top))' }}
          >
            {yo && !conCuenta ? <img src={retratoUrl(yo.retrato)} alt="" className="h-6 w-6 rounded-full" /> : null}
            {conCuenta ? user.username : yo.nombre}
          </button>
        )}

        {/* LA PANCARTA: JUEGA YA, la misma del truco y del ludo, con su manito. */}
        <button
          type="button"
          onClick={jugar}
          aria-label="Juega ya"
          data-juega-ya
          className="umbral-baja absolute left-5 right-5 z-[4] p-0"
          style={{ top: '19%', animationDelay: '150ms' }}
        >
          <img src="/umbral/pancarta-juega-ya.webp" alt="" draggable={false} className="umbral-mecer block h-auto w-full" style={{ filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.65))' }} />
          {/* LA MANITO (Raul, 21-sep): la amarilla «emoji», pintada; mas abajo, tocando el YA. */}
          <img src="/umbral/manito.webp" alt="" aria-hidden draggable={false} className="umbral-dedo absolute -bottom-5 right-8 h-[46px] w-auto" style={{ filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.7))' }} />
        </button>

        {/* LAS LOSAS colgadas a la derecha: la mesita (late si hay gente) y como se juega. */}
        <div className="umbral-sube umbral-losas absolute right-3 z-[4] flex flex-col items-center gap-0.5" style={{ animationDelay: '400ms' }}>
          <Losa src="/umbral/losa-mesa.webp" texto="MESA ONLINE" onClick={jugar} late={hayGente} giro={-2.5} testid="losa-mesa" />
          <Losa src="/umbral/losa-aprende.webp" texto="CÓMO SE JUEGA" onClick={() => setReglas(true)} giro={2} testid="losa-reglas" />
        </div>

        {/* LAS CUATRO FICHAS, distintas, brincando por turnos. */}
        <div aria-hidden className="umbral-fichas pointer-events-none absolute left-5 z-[3] flex w-[190px] items-end justify-between">
          {FICHAS.map((f, i) => (
            <span key={f} className="umbral-brinco relative block h-[50px] w-[27px]" style={{ animationDelay: `${i * 0.4}s`, filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.6))' }}>
              {/* La ficha esta pintada acostada: se para girandola dentro de su cajita. */}
              <img src={`/tiles-hueso/${f}.webp`} alt="" className="absolute left-1/2 top-1/2 h-[27px] w-[50px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90" />
            </span>
          ))}
        </div>

        <p className="umbral-sube umbral-lema absolute inset-x-0 z-[3] m-0 px-4 text-center text-[12px] font-bold" style={{ animationDelay: '500ms', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
          El dominó venezolano de verdad: <b className="text-[#F0DCA6]">se tranca, se pega y se cuentan los puntos.</b>
        </p>
      </div>

      <div className="flex flex-none justify-center bg-[#143024] pb-1 pt-1.5">
        <PuertaDelSalon onAbrir={() => setSalon('chat')} />
      </div>
      <DockDeLaCasa activa="jugar" onIr={irA} />

      {reglas && (
        <div role="dialog" aria-label="Cómo se juega" className="fixed inset-0 z-[60] flex items-end justify-center">
          <button type="button" aria-label="Cerrar" onClick={() => setReglas(false)} className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md rounded-t-2xl border border-b-0 border-domino-accent/35 bg-[#0c1a12] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold text-domino-accent" style={{ fontFamily: SERIF }}>Cómo se juega</h2>
              <button type="button" onClick={() => setReglas(false)} aria-label="Cerrar" className="flex h-7 w-7 items-center justify-center rounded-full border border-domino-cream/20 text-domino-cream/60"><X size={15} /></button>
            </div>
            <ul className="mt-3 space-y-2 text-[14px] font-medium leading-snug text-domino-cream/90">
              {REGLAS.map((r) => <li key={r} className="flex gap-2"><span className="text-domino-accent">·</span>{r}</li>)}
            </ul>
            <button type="button" onClick={() => { setReglas(false); jugar(); }} className="btn-primary mt-5 w-full py-3.5 text-base tracking-[0.2em]">JUEGA YA</button>
          </div>
        </div>
      )}

      <IdentidadLigera
        abierta={pidiendo}
        onCerrar={() => setPidiendo(false)}
        onListo={(id) => { setPidiendo(false); if (id) navigate('/mesa'); }}
      />
      <Salon abierto={salon !== null} pestanaInicial={salon || 'chat'} onCerrar={() => setSalon(null)} />
      <RetoEntrante />
    </div>
  );
}

/** Una losa colgada, con su letrero de papel debajo. */
function Losa({ src, texto, onClick, late = false, giro, testid }) {
  return (
    <button type="button" onClick={onClick} aria-label={texto} data-testid={testid} className="relative flex w-[84px] flex-col items-center p-0">
      {late && (
        <span aria-hidden className="umbral-latir pointer-events-none absolute inset-x-1 top-1 h-[76px] rounded-[14px]" style={{ boxShadow: '0 0 18px 6px rgba(255,150,110,0.7)' }} />
      )}
      <img src={src} alt="" draggable={false} className="block w-[84px]" style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))', transform: `rotate(${giro}deg)`, transformOrigin: '50% 0' }} />
      <span
        className="-mt-1.5 rounded-[2px] bg-[#EDE3C8] px-2 py-[3px] text-[8px] font-black tracking-[0.12em] text-[#2B2419] shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
        style={{ fontFamily: SERIF, transform: `rotate(${giro * 0.8}deg)` }}
      >
        {texto}
      </span>
    </button>
  );
}
