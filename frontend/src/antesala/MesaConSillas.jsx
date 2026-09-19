import Avatar from '../components/game/Avatar.jsx';
import { RETRATOS, retratoUrl } from '../umbral/identidad.js';

/**
 * La mesa con sus sillas (seccion 188).
 *
 * La ilustracion (`/antesala/mesa.webp`, hecha con nano banana y recortada)
 * tiene las cuatro sillas en las esquinas. Cada silla es un asiento de la
 * sala: la 0 es la de quien abrio la mesa, abajo a la izquierda; la de
 * enfrente (arriba a la derecha) es el companero en 2 vs 2 y el rival en
 * 1 vs 1. Encima de cada silla va el retrato del que esta sentado, o un
 * circulo punteado con "+" si esta vacia, o la placa de la casa.
 *
 * Los porcentajes son donde cae el espaldar de cada silla en el dibujo. Si
 * se rehace la ilustracion hay que medirlos otra vez.
 */
const SITIOS = {
  0: { left: '18%', top: '63%' },
  1: { left: '17%', top: '17%' },
  2: { left: '84%', top: '17%' },
  3: { left: '81%', top: '63%' }
};

export const SILLAS_1V1 = [0, 2];
export const SILLAS_2V2 = [0, 1, 2, 3];

/** El retrato de quien sea: retrato de la identidad ligera, o el de la cuenta (SVG por nombre), o el del bot. */
function Retrato({ avatar, tamano = 56, aro = 'bronce' }) {
  const borde = aro === 'crema' ? '#E9D8A6' : '#D8B45C';
  if (RETRATOS.includes(avatar)) {
    return (
      <img
        src={retratoUrl(avatar)}
        alt=""
        width={tamano}
        height={tamano}
        className="rounded-full"
        style={{ width: tamano, height: tamano, border: `${Math.max(2, Math.round(tamano * 0.045))}px solid ${borde}`, boxShadow: '0 6px 12px rgba(0,0,0,.7)' }}
      />
    );
  }
  return (
    <span className="inline-block rounded-full" style={{ boxShadow: '0 6px 12px rgba(0,0,0,.7)' }}>
      <Avatar semilla={avatar || '?'} tamano={tamano} />
    </span>
  );
}

export default function MesaConSillas({ modo, ocupantes, onTocar, sillaAbierta, onEscoger, onCerrar, tocable = true }) {
  const enJuego = modo === '1v1' ? SILLAS_1V1 : SILLAS_2V2;
  return (
    <div className="relative mx-auto my-1 w-full max-w-[360px]" style={{ aspectRatio: '1 / 1' }}>
      <img
        src="/antesala/mesa.webp"
        alt=""
        className="h-full w-full object-contain"
        style={{ filter: 'drop-shadow(0 14px 22px rgba(0,0,0,.7))' }}
        draggable={false}
      />
      {enJuego.map((asiento) => {
        const silla = ocupantes.find((s) => s.asiento === asiento) || { asiento, tipo: 'libre' };
        const sitio = SITIOS[asiento];
        const estilo = { position: 'absolute', left: sitio.left, top: sitio.top, transform: 'translate(-50%, -50%)' };
        if (silla.tipo === 'pana') {
          return (
            <div key={asiento} style={estilo} className="flex flex-col items-center" data-silla={asiento} data-tipo="pana">
              <Retrato avatar={silla.avatar} tamano={56} aro={silla.mio ? 'crema' : 'bronce'} />
              <span className="-mt-1 whitespace-nowrap rounded-full border border-domino-accent/60 bg-[#09160f]/95 px-2.5 py-0.5 text-[11px] font-bold text-domino-cream">
                {silla.username}
              </span>
            </div>
          );
        }
        if (silla.tipo === 'casa') {
          return (
            <button
              key={asiento}
              type="button"
              style={estilo}
              onClick={() => tocable && onTocar(asiento)}
              className="flex flex-col items-center"
              data-silla={asiento}
              data-tipo="casa"
              aria-label="Silla de la casa"
            >
              <Retrato avatar={silla.avatar || 'pancho'} tamano={56} />
              <span className="-mt-1 whitespace-nowrap rounded-full border border-domino-accent/60 bg-[#09160f]/95 px-2.5 py-0.5 text-[11px] font-bold text-domino-accent">
                {silla.username || 'La casa'}
              </span>
            </button>
          );
        }
        // Vacia. Antes de abrir la sala, "libre" es de la casa salvo que se
        // marque para un pana ('pana-esperado', con su etiqueta). Ya con la
        // sala abierta, "libre" es la silla que espera al pana.
        const esperaPana = silla.tipo === 'pana-esperado';
        return (
          <div key={asiento} style={estilo} className="flex flex-col items-center" data-silla={asiento} data-tipo={esperaPana ? 'pana-esperado' : 'libre'}>
            <button
              type="button"
              onClick={() => tocable && onTocar(asiento)}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-domino-accent/80 bg-black/35 text-[30px] font-medium leading-none text-domino-accent"
              aria-label={esperaPana ? 'Silla para un pana' : 'Silla vacía'}
            >
              +
            </button>
            {esperaPana && (
              <span className="-mt-1 whitespace-nowrap rounded-full border border-domino-accent/60 bg-[#09160f]/95 px-2.5 py-0.5 text-[11px] font-bold text-domino-accent">
                Un pana
              </span>
            )}
          </div>
        );
      })}

      {/* Quien ocupa esta silla: la casa o un pana. Es una hojita pegada a la
          mesa, no un modal: se cierra tocando afuera. */}
      {sillaAbierta != null && (
        <>
          <div className="fixed inset-0 z-30" onClick={onCerrar} />
          <div className="absolute left-1/2 top-1/2 z-40 w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-domino-accent/50 bg-[#09160f]/97 p-3 shadow-2xl">
            <p className="mb-2 text-center text-[10px] font-extrabold tracking-[0.3em] text-domino-accent">ESTA SILLA</p>
            <button type="button" onClick={() => onEscoger(sillaAbierta, true)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5" data-escoger="casa">
              <Retrato avatar="pancho" tamano={36} />
              <span>
                <span className="block text-sm font-bold text-domino-cream">La casa</span>
                <span className="block text-[11px] text-domino-cream/70">Juega la máquina</span>
              </span>
            </button>
            <button type="button" onClick={() => onEscoger(sillaAbierta, false)} className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5" data-escoger="pana">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-domino-accent/80 text-xl text-domino-accent">+</span>
              <span>
                <span className="block text-sm font-bold text-domino-cream">Un pana</span>
                <span className="block text-[11px] text-domino-cream/70">Entra con el código</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

MesaConSillas.Retrato = Retrato;
