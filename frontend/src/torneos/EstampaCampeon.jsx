import { useCallback, useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { avisar } from './Avisos.jsx';

/**
 * LA ESTAMPA DEL CAMPEON, copia del truco (`EstampaCampeon.tsx`, opcion C de
 * Raul, 5-ago). No es una pantalla: es la imagen que termina en un estado de
 * WhatsApp. Una sola idea (ganaste), el nombre grande, la marca abajo y los
 * papelitos que caen. Se dibuja en canvas para que lo que se comparte sea
 * EXACTAMENTE lo que se ve. La escena es la noche del club del domino.
 */

const ANCHO = 1080;
const ALTO = 1920;
const ORO = '#E5C26A';
const ORO_VIVO = '#F0D689';
const ORO_MARCA = '#D8B241';
const CREMA = '#F5F0E8';
const SERIF = "'Cinzel', 'Cormorant Garamond', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";
const COLORES_PAPEL = ['#E5C26A', '#F5F0E8', '#8C2A18', '#4C6B3F', '#D8B65C', '#C86E3C'];

function textoEspaciado(ctx, texto, centroX, y, espacio) {
  const letras = [...texto];
  const ancho = letras.reduce((s, l) => s + ctx.measureText(l).width, 0) + espacio * (letras.length - 1);
  let x = centroX - ancho / 2;
  for (const l of letras) {
    ctx.fillText(l, x, y);
    x += ctx.measureText(l).width + espacio;
  }
}

function cuerpoQueEntra(ctx, texto, familia, peso, maximo, anchoMax, minimo = 44) {
  let cuerpo = maximo;
  for (;;) {
    ctx.font = `${peso} ${cuerpo}px ${familia}`;
    if (ctx.measureText(texto).width <= anchoMax || cuerpo <= minimo) return cuerpo;
    cuerpo -= 4;
  }
}

function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function EstampaCampeon({ nombre, torneo, fecha, onCerrar, textoCerrar = 'Ver el torneo' }) {
  const lienzoRef = useRef(null);
  const baseRef = useRef(null);
  const papelitosRef = useRef([]);
  const animRef = useRef(null);
  const [listo, setListo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const fechaLarga = (() => {
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const dibujarBase = useCallback((ctx, escena, sello) => {
    ctx.fillStyle = '#0C1611';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    if (escena) {
      const escala = Math.max(ANCHO / escena.width, ALTO / escena.height);
      const an = escena.width * escala;
      const al = escena.height * escala;
      ctx.drawImage(escena, (ANCHO - an) / 2, (ALTO - al) / 2, an, al);
    }
    const velo = ctx.createLinearGradient(0, 0, 0, ALTO);
    velo.addColorStop(0, 'rgba(6,11,8,0.6)');
    velo.addColorStop(0.3, 'rgba(6,11,8,0.3)');
    velo.addColorStop(0.56, 'rgba(6,11,8,0.5)');
    velo.addColorStop(1, 'rgba(6,11,8,0.92)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    const centro = ANCHO / 2;
    const anchoUtil = ANCHO - 180;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 6;

    if (sello) {
      const alSello = 330;
      const anSello = (sello.width / sello.height) * alSello;
      ctx.drawImage(sello, centro - anSello / 2, 120, anSello, alSello);
    }

    ctx.fillStyle = ORO_VIVO;
    ctx.font = `700 56px ${SERIF}`;
    textoEspaciado(ctx, 'CAMPEÓN', centro, 720, 26);

    const cuerpo = cuerpoQueEntra(ctx, nombre, SERIF, '700', 156, anchoUtil);
    ctx.fillStyle = CREMA;
    ctx.font = `700 ${cuerpo}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(nombre, centro, 880);
    ctx.textAlign = 'left';

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(229,194,106,0.55)';
    ctx.fillRect(centro - 90, 930, 180, 3);

    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 5;
    const renglon = fechaLarga ? `${torneo} · ${fechaLarga}` : torneo;
    const cuerpoRenglon = cuerpoQueEntra(ctx, renglon, SANS, '700', 46, anchoUtil, 26);
    ctx.fillStyle = ORO_MARCA;
    ctx.font = `700 ${cuerpoRenglon}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(renglon, centro, 1010);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = 'left';
  }, [nombre, torneo, fechaLarga]);

  const dibujarMarca = useCallback((ctx) => {
    const centro = ANCHO / 2;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = ORO_MARCA;
    ctx.font = `700 34px ${SERIF}`;
    ctx.textAlign = 'left';
    textoEspaciado(ctx, 'LA MESA DE', centro, ALTO - 300, 12);
    ctx.fillStyle = CREMA;
    ctx.font = `700 104px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('DOMINÓ', centro, ALTO - 190);
    ctx.font = `500 40px ${SANS}`;
    ctx.fillText(window.location.host, centro, ALTO - 110);
    ctx.restore();
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [escena, sello] = await Promise.all([cargarImagen('/umbral/portada-d.webp'), cargarImagen('/torneos/campeon-sello.webp')]);
      // Las letras del club, pero sin quedarse esperando: con mala senal la estampa sale igual.
      try { await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* se dibuja con lo que haya */ }
      if (!vivo) return;
      const base = document.createElement('canvas');
      base.width = ANCHO;
      base.height = ALTO;
      const bctx = base.getContext('2d');
      if (!bctx) return;
      dibujarBase(bctx, escena, sello);
      baseRef.current = base;
      papelitosRef.current = Array.from({ length: 150 }, (_, i) => ({
        x: Math.random() * ANCHO,
        y: -Math.random() * ALTO * 1.1,
        an: 14 + Math.random() * 16,
        al: 22 + Math.random() * 18,
        vy: 300 + Math.random() * 420,
        vx: (Math.random() - 0.5) * 160,
        giro: Math.random() * Math.PI * 2,
        vgiro: (Math.random() - 0.5) * 3,
        color: COLORES_PAPEL[i % COLORES_PAPEL.length]
      }));
      setListo(true);
    })();
    return () => { vivo = false; };
  }, [dibujarBase]);

  useEffect(() => {
    if (!listo) return undefined;
    const lienzo = lienzoRef.current;
    const base = baseRef.current;
    if (!lienzo || !base) return undefined;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return undefined;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let previo = performance.now();
    let corriendo = 0;
    const pintar = (dt) => {
      for (const p of papelitosRef.current) {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.giro += p.vgiro * dt;
        if (p.y > ALTO - 20) { p.y = ALTO - 20; p.vy = 0; p.vx *= 0.8; p.vgiro *= 0.7; }
      }
      ctx.drawImage(base, 0, 0);
      for (const p of papelitosRef.current) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(-p.an / 2, -p.al / 2, p.an, p.al * Math.abs(Math.cos(p.giro)) + 3);
        ctx.restore();
      }
      dibujarMarca(ctx);
    };
    if (quieto) {
      for (const p of papelitosRef.current) p.y = ALTO - 20 - Math.random() * 90;
      pintar(0);
      return undefined;
    }
    const paso = (t) => {
      const dt = Math.min(0.05, (t - previo) / 1000);
      previo = t;
      corriendo += dt;
      pintar(dt);
      if (corriendo < 9) animRef.current = requestAnimationFrame(paso);
    };
    animRef.current = requestAnimationFrame(paso);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [listo, dibujarMarca]);

  const compartir = useCallback(async () => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    setOcupado(true);
    try {
      const blob = await new Promise((r) => lienzo.toBlob((b) => r(b), 'image/png'));
      if (!blob) throw new Error('sin imagen');
      const archivo = new File([blob], 'campeon-domino.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [archivo] }) && navigator.share) {
        await navigator.share({ files: [archivo], text: `Campeón del ${torneo} en La Mesa de Dominó.` });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campeon-domino.png';
      a.click();
      URL.revokeObjectURL(url);
      avisar({ tipo: 'exito', titulo: 'Guardada. Ya la puedes subir a tu estado.' });
    } catch (err) {
      if (err?.name !== 'AbortError') avisar({ tipo: 'error', titulo: 'No se pudo preparar la imagen.' });
    } finally {
      setOcupado(false);
    }
  }, [torneo]);

  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center px-4 py-5" style={{ background: 'rgba(4,8,6,0.94)' }} data-testid="estampa-campeon">
      <canvas
        ref={lienzoRef}
        width={ANCHO}
        height={ALTO}
        aria-label={`Campeón del ${torneo}`}
        style={{ maxHeight: '72vh', maxWidth: 'min(100%, 420px)', width: 'auto', height: 'auto', borderRadius: 18, border: '1px solid rgba(229,194,106,0.35)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', opacity: listo ? 1 : 0, transition: 'opacity 0.4s ease' }}
      />
      <div className="mt-4 flex w-full gap-2" style={{ maxWidth: 420 }}>
        <button
          type="button"
          onClick={compartir}
          disabled={!listo || ocupado}
          data-testid="button-compartir-estampa"
          className="flex flex-1 items-center justify-center gap-2 rounded-full disabled:opacity-50"
          style={{ fontFamily: SANS, fontWeight: 800, fontSize: 15, color: '#0d1410', background: `linear-gradient(180deg, ${ORO_VIVO} 0%, #D8B65C 100%)`, border: '1px solid rgba(229,194,106,0.6)', padding: '13px 16px', minHeight: 46 }}
        >
          <Share2 size={17} strokeWidth={2.4} aria-hidden /> {ocupado ? 'Preparando…' : 'Compartir'}
        </button>
        <button type="button" onClick={onCerrar} data-testid="button-cerrar-estampa" className="rounded-full" style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: CREMA, background: 'rgba(8,13,10,0.7)', border: `1px solid ${ORO}55`, padding: '13px 20px', minHeight: 46 }}>
          {textoCerrar}
        </button>
      </div>
    </div>
  );
}
