import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, Copy, Share2, Users } from 'lucide-react';
import { paseApi } from '../services/api.js';
import { FICHAS, PANOS } from '../components/game/MesaTheme.jsx';
import { connectSocket } from '../services/socket.js';

/**
 * La pantalla del pase de batalla.
 *
 * Tres bloques, en el orden en que le importan a quien entra:
 *
 * 1. **En que nivel voy** y cuanto falta para el proximo.
 * 2. **Que tengo que hacer hoy** (las misiones).
 * 3. **Que me espera** (la escalera de premios).
 *
 * La escalera y las misiones NO estan escritas aqui: vienen del servidor. Si
 * estuvieran copiadas, el dia que cambie un premio habria que acordarse de
 * cambiarlo en dos sitios, y tarde o temprano uno de los dos queda viejo.
 */

const dias = (hasta) => {
  const faltan = Math.ceil((new Date(hasta).getTime() - Date.now()) / 86400000);
  return Math.max(0, faltan);
};

/** El texto corto de un premio, para que entre en la casilla del nivel. */
const corto = (premio) => {
  if (premio.tipo === 'puntos') return `${premio.cantidad} pts`;
  if (premio.corto) return premio.corto;
  return premio.nombre.replace(/^(Título|Paño|Fichas) /, '');
};

/**
 * La muestra del premio.
 *
 * Cada clase de premio se ve como lo que es: el paño con su tela de verdad, las
 * fichas con su ficha de verdad, el titulo con su medalla y los puntos con su
 * numero. La primera version ponia el mismo icono de podio en todos los niveles
 * de puntos y un candado en los cosmeticos, y la escalera entera parecia igual
 * de arriba a abajo.
 */
function MuestraDelPremio({ premio, ganado }) {
  const apagado = ganado ? '' : 'opacity-45 grayscale';

  if (premio.tipo === 'puntos') {
    return (
      <span className={`text-xl font-black ${ganado ? 'text-domino-accent' : 'text-domino-cream/35'}`}>
        +{premio.cantidad}
      </span>
    );
  }

  if (premio.emoji) {
    return <span className={`text-3xl ${apagado}`}>{premio.emoji}</span>;
  }

  const pano = PANOS.find((p) => p.clave === premio.clave);
  if (pano) return <span className={`${pano.clase} block h-8 w-12 rounded ${apagado}`} />;

  const fichas = FICHAS.find((f) => f.clave === premio.clave);
  if (fichas) {
    return <img src={`${fichas.carpeta}/tile_6_6.png`} alt="" className={`h-6 w-12 rounded-sm ${apagado}`} />;
  }

  return (
    <Award
      size={22}
      className={ganado ? 'text-domino-accent' : 'text-domino-cream/25'}
      aria-hidden="true"
    />
  );
}

function Barra({ hecho, total, dorada = false }) {
  const parte = total > 0 ? Math.min(100, (hecho / total) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
      <div
        className={`h-full rounded-full transition-all ${dorada ? 'bg-domino-accent' : 'bg-emerald-400'}`}
        style={{ width: `${parte}%` }}
      />
    </div>
  );
}

function Mision({ mision }) {
  const etiqueta = { diaria: 'HOY', semanal: 'ESTA SEMANA', temporada: 'TEMPORADA' }[mision.clase];

  return (
    <li
      className={`rounded-xl border p-3 ${
        mision.hecha
          ? 'border-emerald-400/40 bg-emerald-400/10'
          : 'border-domino-accent/15 bg-black/25'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.2em] text-domino-cream/40">{etiqueta}</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">{mision.texto}</p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-black ${
            mision.hecha ? 'bg-emerald-400/20 text-emerald-300' : 'bg-domino-accent/15 text-domino-accent'
          }`}
        >
          {mision.hecha ? <Check size={13} aria-hidden="true" /> : `+${mision.xp}`}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Barra hecho={mision.progreso} total={mision.meta} />
        <span className="shrink-0 text-[11px] tabular-nums text-domino-cream/55">
          {mision.progreso}/{mision.meta}
        </span>
      </div>

      {mision.premio && (
        <p className="mt-1.5 text-[11px] text-domino-accent/80">
          Además: {mision.premio.nombre}
        </p>
      )}
    </li>
  );
}

export default function Pase() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(() => {
    paseApi.mio()
      .then(setDatos)
      .catch(() => setError('No se pudo cargar el pase'));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Si sube de nivel mientras mira la pantalla, se pone al dia sola.
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;
    socket.on('pase:subiste', cargar);
    return () => socket.off('pase:subiste', cargar);
  }, [cargar]);

  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(id);
  }, [copiado]);

  if (error) {
    return (
      <div className="min-h-[100svh] bg-domino-dark p-8 text-center text-domino-cream">
        <p className="text-sm text-red-400">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-domino-accent">Volver</Link>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="min-h-[100svh] bg-domino-dark p-8 text-center text-sm text-domino-cream/50">
        Cargando...
      </div>
    );
  }

  const enEsteNivel = datos.xp % datos.xpPorNivel;
  const alFinal = datos.nivel >= datos.niveles;
  const link = `${window.location.origin}/register?ref=${encodeURIComponent(datos.codigo)}`;
  const panasListos = datos.panas.filter((p) => p.jugo).length;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      // Si el navegador no deja copiar, al menos el link esta a la vista.
      setCopiado(false);
    }
  };

  const compartir = async () => {
    const texto = `Jugá dominó conmigo en el Club Premier. Entrá por acá: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dominó Online', text: texto, url: link });
        return;
      } catch {
        /* si lo cancela, no pasa nada */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  return (
    <div className="min-h-[100svh] bg-domino-dark text-domino-cream">
      <header className="flex items-center justify-between border-b border-domino-accent/20 px-5 py-4 sm:px-8">
        <Link to="/" className="text-sm text-domino-cream/70 hover:text-domino-cream">←</Link>
        <span className="text-[11px] font-semibold tracking-[0.3em] text-domino-cream/50">
          TEMPORADA {datos.temporada.numero}
        </span>
        <span className="w-4" />
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-14 sm:px-8">
        {/* ---- la cabecera ----
             El banner ya viene con la mitad izquierda oscura y vacia, hecho a
             proposito para que el titulo se lea encima sin taparle el dibujo. */}
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-domino-accent/25">
          <img
            src="/pase-banner.jpg"
            alt=""
            className="block h-32 w-full object-cover object-right sm:h-40"
          />
          <div className="absolute inset-y-0 left-0 flex w-3/5 flex-col justify-center bg-gradient-to-r from-domino-dark/85 to-transparent px-4">
            <h1 className="text-2xl font-black leading-none tracking-tight text-domino-accent sm:text-4xl">
              PASE DE<br />BATALLA
            </h1>
            <p className="mt-1.5 text-xs text-domino-cream/65 sm:text-sm">
              Quedan {dias(datos.temporada.terminaEn)} días
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-domino-accent/25 bg-black/30 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-domino-cream/40">NIVEL</p>
              <p className="text-4xl font-black leading-none text-domino-accent">{datos.nivel}</p>
            </div>
            <p className="text-xs tabular-nums text-domino-cream/60">
              {alFinal ? '¡Pase completo!' : `${enEsteNivel} / ${datos.xpPorNivel} para el ${datos.nivel + 1}`}
            </p>
          </div>
          <div className="mt-3">
            <Barra hecho={alFinal ? 1 : enEsteNivel} total={alFinal ? 1 : datos.xpPorNivel} dorada />
          </div>
        </div>

        {/* ---- traé a tus panas ---- */}
        <section className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-black tracking-wide">
            <Users size={16} aria-hidden="true" className="text-emerald-300" />
            TRAÉ A TUS PANAS
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-domino-cream/65">
            Cada pana que entre con tu link y juegue su primera partida te da{' '}
            <strong className="text-emerald-300">+{datos.xpPorPana} de experiencia</strong>. Con tres,
            además, el título "Padrino".
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 text-[11px] text-domino-cream/70">
              {link}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 rounded-lg bg-domino-accent/20 p-2 text-domino-accent transition hover:bg-domino-accent/30"
              aria-label="Copiar link"
            >
              {copiado ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              onClick={compartir}
              className="shrink-0 rounded-lg bg-emerald-400/20 p-2 text-emerald-300 transition hover:bg-emerald-400/30"
              aria-label="Compartir"
            >
              <Share2 size={16} />
            </button>
          </div>

          <p className="mt-2 text-[11px] text-domino-cream/50">
            {panasListos} de tus panas ya jugaron
            {datos.panas.length > panasListos && ` · ${datos.panas.length - panasListos} anotados sin jugar`}
          </p>

          {datos.panas.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {datos.panas.map((p) => (
                <li
                  key={p.userId}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    p.jugo ? 'bg-emerald-400/20 text-emerald-200' : 'bg-black/30 text-domino-cream/45'
                  }`}
                >
                  {p.username}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- las misiones ---- */}
        <section className="mt-6">
          <h2 className="text-sm font-black tracking-wide text-domino-cream/80">MISIONES</h2>
          <ul className="mt-2 space-y-2">
            {datos.misiones.map((m) => (
              <Mision key={`${m.clase}-${m.clave}`} mision={m} />
            ))}
          </ul>
        </section>

        {/* ---- la escalera ---- */}
        <section className="mt-6">
          <h2 className="text-sm font-black tracking-wide text-domino-cream/80">PREMIOS</h2>
          <p className="mt-1 text-xs text-domino-cream/50">
            Se entregan solos al subir de nivel. No hay nada que reclamar.
          </p>

          <div className="mt-3 -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
            <ol className="flex gap-2">
              {datos.premios.map((escalon) => {
                const ganado = datos.nivel >= escalon.nivel;
                return (
                  <li key={escalon.nivel} className="w-[88px] shrink-0">
                    <div
                      className={`rounded-xl border p-2 text-center ${
                        ganado
                          ? 'border-domino-accent/60 bg-domino-accent/10'
                          : 'border-domino-cream/10 bg-black/25'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-black ${
                          ganado ? 'text-domino-accent' : 'text-domino-cream/40'
                        }`}
                      >
                        NIVEL {escalon.nivel}
                      </p>

                      <div className="mt-1 flex h-10 items-center justify-center">
                        <MuestraDelPremio premio={escalon.gratis[0]} ganado={ganado} />
                      </div>

                      {/* Alto fijo de dos renglones para que todas las casillas
                          midan igual: si no, las de nombre largo empujan hacia
                          abajo su fila punteada y la escalera queda dentada. */}
                      <p className="flex h-7 items-center justify-center text-center text-[10px] leading-tight text-domino-cream/70">
                        {escalon.gratis[0].tipo === 'puntos' && escalon.gratis.length === 1
                          ? 'puntos de club'
                          : escalon.gratis.map(corto).join(' + ')}
                      </p>
                    </div>

                    {/* La fila del pase pago. Se ve para que se sepa que existe,
                        pero no se puede comprar: todavia no hay cobro. */}
                    {!datos.paseOroActivo && (
                      <div className="mt-1 rounded-lg border border-dashed border-domino-cream/15 px-1 py-1 text-center">
                        <p className="text-[9px] leading-tight text-domino-cream/30">
                          {escalon.oro.map(corto).join(' + ')}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {!datos.paseOroActivo && (
            <p className="mt-2 text-[11px] text-domino-cream/40">
              La fila punteada es el <strong className="text-domino-cream/60">Pase Dorado</strong>,
              próximamente.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
