import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { connectSocket, idDeInvitado } from '../services/socket.js';
import { haySesion } from '../services/api.js';
import { identidad } from '../umbral/identidad.js';
import PuertaDelSalon from '../salon/PuertaDelSalon.jsx';
import Salon from '../salon/Salon.jsx';
import RetoEntrante from '../components/notificaciones/RetoEntrante.jsx';
import IdentidadLigera from '../umbral/IdentidadLigera.jsx';
import MesaConSillas, { SILLAS_1V1, SILLAS_2V2 } from './MesaConSillas.jsx';
import Tablon from './Tablon.jsx';

/**
 * LA ANTESALA (seccion 188): arma tu mesa.
 *
 * Como la antesala 2v2 del truco que Raul aprobo: la mesa ilustrada con sus
 * cuatro sillas de cuero, tu retrato sentado en la tuya, y las demas vacias
 * con un "+". Tocas una silla vacia y escoges quien la ocupa: la casa (un bot)
 * o un pana. Con un pana de por medio la mesa recibe un codigo de cuatro
 * letras que se dicta por telefono o se manda por WhatsApp, y aqui mismo ves
 * llegar a la gente. Abajo, el tablon: las mesas de otros que tienen silla.
 *
 * Dos estados, una sola pantalla:
 *
 * 1. **Armando.** Todavia no hay sala en el servidor. Sin tocar nada, todas
 *    las sillas son de la casa: "Sentarse" arranca de una contra los bots
 *    (Raul, 19-sep: "le doy juega ya pero no me deja jugar contra bots"; la
 *    primera version mandaba a la sala de espera). Las sillas que uno marca
 *    para un pana viven en `panaEn`; con una sola de esas, "Sentarse" abre la
 *    sala con codigo.
 * 2. **Esperando.** La sala existe (`sala`, lo que manda `lobby:update`). El
 *    codigo esta en la chapa, los panas van apareciendo en sus sillas, y el
 *    que abrio la mesa puede arrancar ya (las sillas vacias las ocupa la casa)
 *    o seguir marcando sillas. Quien entra por codigo o por el tablon ve lo
 *    mismo, sin los mandos del dueño. Cuando la partida arranca, todos pasan a
 *    la mesa.
 */
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const MS_TABLON = 4000;

const codigoLimpio = (t) => String(t || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

export default function Antesala() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [yo, setYo] = useState(() => identidad());
  const [pidiendoIdentidad, setPidiendoIdentidad] = useState(false);
  const [salonAbierto, setSalonAbierto] = useState(false);
  const [modo, setModo] = useState('2v2');
  const [panaEn, setPanaEn] = useState(() => new Set());
  const [sillaAbierta, setSillaAbierta] = useState(null);
  const [sala, setSala] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [mesas, setMesas] = useState([]);
  const socketRef = useRef(null);
  const yaEntreRef = useRef(false);

  const conCuenta = haySesion() && user;
  const nombre = conCuenta ? user.username : yo?.nombre;
  const retrato = conCuenta ? user.username : yo?.retrato;
  // Quien soy para el servidor: el id de la cuenta o el id de invitado que vive en el navegador.
  const miId = conCuenta ? user.id : idDeInvitado();

  // Sin nombre no hay silla: se pide aqui mismo, sin mandar a nadie a otra pantalla.
  useEffect(() => {
    if (!conCuenta && !yo) setPidiendoIdentidad(true);
  }, [conCuenta, yo]);

  // La conexion. `lobby:update` es la verdad de la sala mientras se espera.
  useEffect(() => {
    if (!nombre) return undefined;
    const socket = connectSocket();
    socketRef.current = socket;
    const alLobby = (estado) => {
      if (!estado?.armada) return;
      setSala(estado);
      if (estado.started) navigate(`/game?join=${estado.code}`, { replace: true });
    };
    const alCerrar = () => { setSala(null); setError('El dueño cerró la mesa.'); };
    // "Estas?" (seccion 191): la app contesta sola, sin boton. Si no contesta a
    // tiempo (el telefono dormido, sin señal), la mesa sigue sin ella.
    const alLlamar = ({ code }) => { socket.emit('mesa:estoy', { code }); };
    const alSoltar = () => { setSala(null); setError('Se te soltó la silla: tu teléfono no contestó a tiempo. Puedes volver a entrar.'); };
    socket.on('lobby:update', alLobby);
    socket.on('lobby:cerrada', alCerrar);
    socket.on('mesa:estas', alLlamar);
    socket.on('mesa:soltado', alSoltar);
    return () => { socket.off('lobby:update', alLobby); socket.off('lobby:cerrada', alCerrar); socket.off('mesa:estas', alLlamar); socket.off('mesa:soltado', alSoltar); };
  }, [nombre, navigate]);

  // El tablon se refresca solo mientras uno esta armando.
  useEffect(() => {
    if (!nombre || sala) return undefined;
    let vivo = true;
    const pedir = () => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit('mesas:listar', (r) => { if (vivo && r?.ok) setMesas(r.mesas || []); });
    };
    pedir();
    const reloj = setInterval(pedir, MS_TABLON);
    return () => { vivo = false; clearInterval(reloj); };
  }, [nombre, sala]);

  const entrar = useCallback((code) => {
    const socket = socketRef.current;
    const limpio = codigoLimpio(code);
    if (!socket || limpio.length < 4) return;
    setOcupado(true);
    setError('');
    socket.emit('room:join', { code: limpio }, (r) => {
      setOcupado(false);
      // El candado: ya estas jugando en otra mesa; la app te lleva a esa.
      if (!r?.ok && r?.error === 'YA_TIENES_MESA' && r.code) { navigate(`/game?join=${r.code}`, { replace: true }); return; }
      if (!r?.ok) { setError(r?.error || 'No se pudo entrar a esa mesa'); return; }
      setPidiendoCodigo(false);
      if (r.room?.started) navigate(`/game?join=${limpio}`, { replace: true });
    });
  }, [navigate]);

  // Llegaste por un link de WhatsApp: /mesa?codigo=KMZA
  useEffect(() => {
    const pedido = codigoLimpio(params.get('codigo'));
    if (!nombre || pedido.length < 4 || yaEntreRef.current) return;
    yaEntreRef.current = true;
    const socket = socketRef.current;
    if (!socket) return;
    const intentar = () => entrar(pedido);
    if (socket.connected) intentar(); else socket.once('connect', intentar);
  }, [nombre, params, entrar]);

  const sillas = modo === '1v1' ? SILLAS_1V1 : SILLAS_2V2;

  // Lo que se dibuja en cada silla, este o no la sala creada.
  const ocupantes = useMemo(() => {
    if (sala?.sillas) {
      return sala.sillas.map((s) => ({
        ...s,
        mio: s.id != null && miId != null && String(s.id) === String(miId)
      }));
    }
    return sillas.map((asiento) => {
      if (asiento === 0) return { asiento, tipo: 'pana', username: nombre, avatar: retrato, mio: true };
      return { asiento, tipo: panaEn.has(asiento) ? 'pana-esperado' : 'libre' };
    });
  }, [sala, sillas, panaEn, nombre, retrato, miId]);

  const soyElDueno = !sala || (miId != null && String(sala.hostId) === String(miId));

  const tocarSilla = (asiento) => {
    if (asiento === 0 || !soyElDueno) return;
    const silla = ocupantes.find((s) => s.asiento === asiento);
    if (!silla || silla.tipo === 'pana') return;
    setSillaAbierta(asiento);
  };

  const escoger = (asiento, casa) => {
    setSillaAbierta(null);
    if (sala) {
      socketRef.current?.emit('mesa:silla', { code: sala.code, asiento, casa }, (r) => {
        if (!r?.ok) setError(r?.error || 'No se pudo cambiar la silla');
      });
      return;
    }
    setPanaEn((antes) => {
      const ahora = new Set(antes);
      if (casa) ahora.delete(asiento); else ahora.add(asiento);
      return ahora;
    });
  };

  const sentarse = () => {
    const socket = socketRef.current;
    if (!socket) return;
    setOcupado(true);
    setError('');
    const paraPanas = panaEn.size;
    const casaEn = sillas.filter((a) => a !== 0 && !panaEn.has(a));
    socket.emit('room:create', { mode: modo, armada: { casaEn, publica: paraPanas > 0 } }, (r) => {
      if (!r?.ok && r?.error === 'YA_TIENES_MESA' && r.code) { navigate(`/game?join=${r.code}`, { replace: true }); return; }
      if (!r?.ok) { setOcupado(false); setError(r?.error || 'No se pudo abrir la mesa'); return; }
      if (paraPanas === 0) {
        socket.emit('room:start', { code: r.code }, (s) => {
          if (!s?.ok) { setOcupado(false); setError(s?.error || 'No se pudo arrancar'); return; }
          navigate(`/game?join=${r.code}`, { replace: true });
        });
        return;
      }
      setOcupado(false);
    });
  };

  const arrancarYa = () => {
    const socket = socketRef.current;
    if (!socket || !sala) return;
    setOcupado(true);
    socket.emit('room:start', { code: sala.code }, (s) => {
      setOcupado(false);
      if (!s?.ok) setError(s?.error || 'No se pudo arrancar');
    });
  };

  const cancelar = () => {
    const socket = socketRef.current;
    if (socket && sala) socket.emit('room:leave', { code: sala.code });
    setSala(null);
    setError('');
  };

  const faltan = sala ? (sala.sillas || []).filter((s) => s.tipo === 'libre').length : 0;
  const enlace = sala ? `${window.location.origin}/mesa?codigo=${sala.code}` : '';
  const whatsapp = sala
    ? `https://wa.me/?text=${encodeURIComponent(`Vente a jugar dominó. La mesa es ${sala.code}: ${enlace}`)}`
    : '#';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#08120c] text-domino-cream">
      <div className="felt-tela absolute inset-0 opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#08120c]/60 to-[#08120c]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-6 pt-5">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/')} aria-label="Volver" className="text-3xl leading-none text-domino-accent">‹</button>
          <span className="text-[11px] font-bold tracking-[0.35em] text-domino-accent/90">CLUB DE DOMINÓ</span>
          <button
            type="button"
            onClick={() => { if (!conCuenta) setPidiendoIdentidad(true); }}
            className="flex items-center gap-2 rounded-full border border-domino-accent/40 bg-black/40 py-1 pl-1 pr-3 text-sm font-bold"
          >
            <MesaConSillas.Retrato avatar={retrato} tamano={26} />
            {nombre || '...'}
          </button>
        </header>

        <h1 className="mt-3 text-[32px] font-bold leading-none text-domino-accent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ fontFamily: SERIF }}>
          {sala ? 'Tu mesa' : 'Arma tu mesa'}
        </h1>

        {!sala && (
          <div className="mt-3 flex w-max overflow-hidden rounded-full border border-domino-accent/60">
            {['1v1', '2v2'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setPanaEn(new Set()); }}
                className={`px-5 py-2 text-[12px] font-extrabold tracking-[0.2em] ${modo === m ? 'bg-domino-accent text-domino-dark' : 'text-domino-accent'}`}
              >
                {m === '1v1' ? '1 VS 1' : '2 VS 2'}
              </button>
            ))}
          </div>
        )}

        <MesaConSillas
          modo={sala?.mode || modo}
          ocupantes={ocupantes}
          onTocar={tocarSilla}
          sillaAbierta={sillaAbierta}
          onEscoger={escoger}
          onCerrar={() => setSillaAbierta(null)}
          tocable={soyElDueno}
        />

        {sala ? (
          <>
            <div className="mx-auto mt-1 rounded-xl px-6 py-3 text-center text-domino-dark shadow-[0_8px_20px_rgba(0,0,0,.6)]" style={{ background: 'linear-gradient(180deg, #e8c86a, #c99a3c)', boxShadow: 'inset 0 0 0 2px rgba(255,240,200,.5), 0 8px 20px rgba(0,0,0,.6)' }}>
              <span className="block text-[10px] font-extrabold tracking-[0.3em] opacity-80">DICTA ESTE CÓDIGO</span>
              <span className="block text-[52px] font-bold leading-none tracking-[0.12em]" style={{ fontFamily: SERIF }}>{sala.code}</span>
            </div>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-primary mt-3 w-full gap-2 py-3.5 text-sm tracking-[0.2em]">
              <Send size={18} strokeWidth={2.2} />
              MANDAR POR WHATSAPP
            </a>
            <p className="mt-3 text-center text-[13px] font-semibold text-domino-cream/85">
              {sala.llamando
                ? `Llamando a la mesa${sala.llamando.faltan?.length ? `: ${sala.llamando.faltan.join(', ')}` : ''}...`
                : faltan > 0
                  ? `${faltan === 1 ? 'Falta 1 silla' : `Faltan ${faltan} sillas`}. Las que queden vacías las ocupa la casa.`
                  : 'Mesa completa. Arrancando...'}
            </p>
            {soyElDueno ? (
              <button type="button" onClick={arrancarYa} disabled={ocupado || Boolean(sala.llamando)} className="mt-3 w-full rounded-xl border border-domino-accent/60 bg-black/35 py-3.5 text-[13px] font-extrabold tracking-[0.22em] text-domino-accent disabled:opacity-60">
                ARRANCAR YA
              </button>
            ) : (
              <p className="mt-3 text-center text-[12px] font-bold tracking-[0.2em] text-domino-accent/80">ESPERANDO A QUE ARRANQUE</p>
            )}
            <button type="button" onClick={cancelar} className="mt-4 text-center text-[12px] font-bold tracking-[0.2em] text-domino-cream/60">
              {soyElDueno ? 'CERRAR LA MESA' : 'LEVANTARSE'}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-[13px] font-semibold text-domino-cream/85">
              {panaEn.size > 0
                ? 'Al sentarte sale el código para tus panas.'
                : modo === '1v1'
                  ? 'Así juegas contra la casa. Toca la silla de enfrente para invitar a un pana.'
                  : 'Así juegas contra la casa. Toca una silla para invitar a un pana.'}
            </p>
            <button type="button" onClick={sentarse} disabled={ocupado || !nombre} className="btn-primary mt-3 w-full py-4 text-base tracking-[0.22em] disabled:opacity-60">
              SENTARSE
            </button>
            {pidiendoCodigo ? (
              <form
                onSubmit={(e) => { e.preventDefault(); entrar(codigo); }}
                className="mt-3 flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(codigoLimpio(e.target.value))}
                  placeholder="KMZA"
                  maxLength={4}
                  className="min-w-0 flex-1 rounded-xl border border-domino-accent/60 bg-black/40 px-4 py-3 text-center text-[28px] font-bold uppercase tracking-[0.3em] text-domino-cream placeholder:text-domino-cream/30 focus:outline-none"
                  style={{ fontFamily: SERIF }}
                />
                <button type="submit" disabled={codigo.length < 4 || ocupado} className="btn-primary px-5 py-3 text-sm tracking-[0.2em] disabled:opacity-60">ENTRAR</button>
              </form>
            ) : (
              <button type="button" onClick={() => setPidiendoCodigo(true)} className="mt-3 w-full rounded-xl border border-domino-accent/55 bg-black/35 py-3.5 text-[13px] font-extrabold tracking-[0.22em] text-domino-accent">
                TENGO UN CÓDIGO
              </button>
            )}
            <Tablon mesas={mesas} onEntrar={entrar} ocupado={ocupado} />
            {/* La puerta del salon (seccion 196): el chat y quien esta, como en el truco. */}
            <div className="mt-4 flex justify-center">
              <PuertaDelSalon onAbrir={() => setSalonAbierto(true)} />
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-domino-crimson/50 bg-domino-crimson/15 px-3 py-2 text-center text-[13px] font-semibold text-domino-cream">
            {error}
          </p>
        )}
      </div>

      <IdentidadLigera
        abierta={pidiendoIdentidad}
        onCerrar={() => { setPidiendoIdentidad(false); if (!identidad() && !conCuenta) navigate('/'); }}
        onListo={(id) => { setPidiendoIdentidad(false); if (id) setYo(id); }}
      />
      <Salon abierto={salonAbierto} onCerrar={() => setSalonAbierto(false)} />
      <RetoEntrante />
    </div>
  );
}
