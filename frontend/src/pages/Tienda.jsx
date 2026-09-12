import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import Navbar from '../components/Navbar.jsx';
import { VERSION_FICHAS } from '../components/game/MesaTheme.jsx';
import { tiendaApi } from '../services/api.js';

/**
 * La tienda del club (§141).
 *
 * ## Que vende, y por que solo eso
 *
 * **Nada de lo que regala el pase de batalla.** El pase es el sistema de
 * recompensas del juego y funciona; una tienda que venda sus premios lo vacia.
 * Por eso la tienda espero hasta que hubo arte propio: tres pintas de fichas y
 * dos paños que no salen del pase.
 *
 * ## La pantalla no decide nada
 *
 * El catalogo, los precios y si te alcanza vienen del servidor. Aqui solo se
 * dibuja y se manda QUE se quiere comprar, nunca cuanto cuesta (regla 8).
 */

/**
 * El escaparate de un articulo.
 *
 * Se enseña la ficha 3|5, que tiene puntos en las dos mitades y se ve bien.
 *
 * Va **grande y sobre el paño**, no chiquita contra el negro: lo unico que se
 * vende aqui es el material, y a 40 px de alto no se distinguia el marmol del
 * jade. Puesta sobre la tela se ve tal cual va a verse en la mesa.
 *
 * `VERSION_FICHAS` viaja pegado a la direccion por lo de siempre: los archivos
 * se llaman igual cuando se rehacen, y sin el numero el navegador enseña el
 * que tenia guardado.
 */
function Muestra({ articulo }) {
  if (articulo.tipo === 'pano') {
    return (
      <div
        className="h-24 w-full rounded-lg border border-black/40"
        style={{
          backgroundImage: `url('${articulo.muestra}')`,
          backgroundSize: '150px 150px',
          backgroundRepeat: 'repeat'
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    <div
      className="flex h-24 items-center justify-center rounded-lg border border-black/40"
      style={{
        backgroundImage: "url('/pano-tela.webp')",
        backgroundSize: '150px 150px',
        backgroundRepeat: 'repeat'
      }}
    >
      <img
        src={`${articulo.muestra}?v=${VERSION_FICHAS}`}
        alt=""
        className="w-[76%] max-w-[220px] drop-shadow-[0_6px_10px_rgba(0,0,0,.55)]"
      />
    </div>
  );
}

function Moneda({ cuanto, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #F7E7C4 0%, #E8C974 38%, #B8862F 100%)',
          boxShadow: 'inset 0 -1px 1px rgba(0,0,0,.35)'
        }}
      />
      <span className="tabular-nums">{cuanto}</span>
    </span>
  );
}

export default function Tienda() {
  const [vitrina, setVitrina] = useState(null);
  const [comprando, setComprando] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = () =>
    tiendaApi.vitrina()
      .then(setVitrina)
      .catch(() => setVitrina({ saldo: 0, articulos: [] }));

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(id);
  }, [aviso]);

  const comprar = async (articulo) => {
    if (comprando) return;
    setComprando(articulo.clave);
    try {
      const r = await tiendaApi.comprar(articulo.clave);
      setAviso({ ok: true, texto: `¡${r.nombre} es tuyo!` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err?.response?.data?.error || 'No se pudo comprar' });
    } finally {
      setComprando(null);
    }
  };

  return (
    <div className="telon-menu flex min-h-[100svh] flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-4 sm:max-w-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-[13px] text-domino-cream/70 transition hover:text-domino-cream"
          >
            <ArrowLeft size={16} /> Volver
          </Link>

          <span className="flex items-center gap-2 rounded-full border border-domino-accent/35 bg-black/40 px-3 py-1">
            <span className="text-[10px] uppercase tracking-wider text-domino-cream/45">Tenés</span>
            <Moneda cuanto={vitrina?.saldo ?? 0} className="text-sm font-bold text-domino-accent" />
          </span>
        </div>

        <h1 className="mb-1 text-center text-2xl font-black text-domino-cream">Tienda</h1>
        <p className="mb-5 text-center text-[12px] text-domino-cream/50">
          Las monedas se ganan jugando contra otra gente.
        </p>

        {aviso && (
          <div
            className={`mb-4 rounded-xl border px-4 py-2.5 text-center text-sm font-semibold ${
              aviso.ok
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                : 'border-red-500/50 bg-red-500/15 text-red-200'
            }`}
          >
            {aviso.texto}
          </div>
        )}

        {vitrina === null ? (
          <p className="py-10 text-center text-sm text-domino-cream/40">Cargando...</p>
        ) : vitrina.articulos.length === 0 ? (
          <p className="py-10 text-center text-sm text-domino-cream/40">
            La tienda está vacía por ahora.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {vitrina.articulos.map((a) => (
              <div
                key={a.clave}
                className="rounded-xl border border-domino-accent/20 bg-black/35 p-3"
              >
                <Muestra articulo={a} />

                <div className="mt-2.5 mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold text-domino-cream">{a.nombre}</span>
                  {!a.tengo && (
                    <Moneda cuanto={a.precio} className="shrink-0 text-[13px] font-bold text-domino-accent" />
                  )}
                </div>

                <p className="mb-2.5 text-[11px] leading-snug text-domino-cream/50">
                  {a.descripcion}
                </p>

                {a.tengo ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-center text-[12px] font-bold text-emerald-300">
                    Ya es tuyo
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => comprar(a)}
                    disabled={!a.alcanza || comprando === a.clave}
                    className={`w-full rounded-lg py-2 text-[13px] font-bold transition ${
                      a.alcanza
                        ? 'bg-domino-accent text-domino-dark hover:brightness-110 active:scale-[0.98]'
                        : 'cursor-not-allowed border border-domino-cream/15 bg-black/30 text-domino-cream/35'
                    }`}
                  >
                    {comprando === a.clave
                      ? 'Comprando...'
                      : a.alcanza
                        ? 'Comprar'
                        : `Te faltan ${a.precio - (vitrina.saldo ?? 0)}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] leading-snug text-domino-cream/35">
          Lo que se vende acá no sale del pase de batalla:
          <br />
          los premios del pase se ganan jugando, no se compran.
        </p>
      </main>
    </div>
  );
}
