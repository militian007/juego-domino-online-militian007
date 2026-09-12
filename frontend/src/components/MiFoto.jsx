import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

import Avatar from './game/Avatar.jsx';
import { perfilApi } from '../services/api.js';

/**
 * La foto del perfil (§147).
 *
 * ## Por que la foto se rehace aqui y no se sube tal cual
 *
 * Tres motivos, y los tres importan:
 *
 * 1. **El peso.** Una foto de teléfono son tres o cuatro megas. Redibujada a
 *    256x256 en JPEG son unos veinte kilos: sube al instante con mala señal y
 *    no le cuesta nada a quien la ve del otro lado de la mesa.
 * 2. **Los datos escondidos.** Una foto sacada con el telefono lleva dentro la
 *    fecha, el modelo del aparato y **donde se tomo**. Redibujarla en un lienzo
 *    tira todo eso: lo que sale de aqui son pixeles y nada mas. Es la razon
 *    principal, no un efecto secundario.
 * 3. **El cuadro.** Los retratos son redondos. Se recorta el cuadrado del
 *    centro para que nadie salga estirado.
 *
 * Nada de esto es seguridad: el servidor vuelve a revisarlo todo, porque
 * cualquiera puede saltarse esta pantalla (regla 8). Esto es comodidad.
 */

/** El lado al que se baja la foto. */
const LADO = 256;

/** Cuanto se comprime. Medido: a 0,85 una cara de 256 pesa unos 20 KB. */
const CALIDAD = 0.85;

/** Lo mas grande que se acepta ANTES de redibujar, para no tragar un video. */
const MAX_ORIGEN = 12 * 1024 * 1024;

/**
 * Recorta el cuadrado del centro y lo baja a 256x256 en JPEG.
 *
 * `createImageBitmap` respeta la orientacion que trae la foto: sin eso, las
 * sacadas en vertical con algunos telefonos salen acostadas.
 */
async function prepararFoto(archivo) {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });

  const lado = Math.min(bitmap.width, bitmap.height);
  const x = (bitmap.width - lado) / 2;
  const y = (bitmap.height - lado) / 2;

  const lienzo = document.createElement('canvas');
  lienzo.width = LADO;
  lienzo.height = LADO;
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, x, y, lado, lado, 0, 0, LADO, LADO);
  bitmap.close?.();

  return lienzo.toDataURL('image/jpeg', CALIDAD);
}

export default function MiFoto({ nombre, foto, onCambio }) {
  const entrada = useRef(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    // El campo se vacia siempre: si no, elegir dos veces la misma foto no
    // dispara nada y parece que el boton esta roto.
    e.target.value = '';
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      setAviso({ ok: false, texto: 'Eso no es una imagen' });
      return;
    }
    if (archivo.size > MAX_ORIGEN) {
      setAviso({ ok: false, texto: 'Esa imagen es enorme, probá con otra' });
      return;
    }

    setTrabajando(true);
    setAviso(null);
    try {
      const dataUrl = await prepararFoto(archivo);
      const r = await perfilApi.ponerFoto(dataUrl);
      onCambio?.(r.foto);
      setAviso({ ok: true, texto: 'Listo, esa es tu cara' });
    } catch (err) {
      setAviso({ ok: false, texto: err?.response?.data?.error || 'No se pudo subir la foto' });
    } finally {
      setTrabajando(false);
    }
  };

  const quitar = async () => {
    setTrabajando(true);
    try {
      await perfilApi.quitarFoto();
      onCambio?.(null);
      setAviso({ ok: true, texto: 'Se quitó la foto' });
    } catch {
      setAviso({ ok: false, texto: 'No se pudo quitar' });
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar semilla={nombre} foto={foto} tamano={72} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={trabajando}
            className="flex items-center gap-1.5 rounded-lg border border-domino-accent/40 bg-black/30 px-3 py-1.5 text-[12px] font-semibold text-domino-cream transition hover:border-domino-accent/70 disabled:opacity-50"
          >
            <Camera size={14} strokeWidth={2} />
            {trabajando ? 'Subiendo...' : foto ? 'Cambiar foto' : 'Poner mi foto'}
          </button>

          {foto && !trabajando && (
            <button
              type="button"
              onClick={quitar}
              title="Quitar la foto"
              aria-label="Quitar la foto"
              className="rounded-lg border border-white/10 bg-black/30 p-1.5 text-domino-cream/50 transition hover:border-red-500/50 hover:text-red-300"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-domino-cream/45">
          {aviso
            ? <span className={aviso.ok ? 'text-emerald-300' : 'text-red-300'}>{aviso.texto}</span>
            : 'La ven los demás en la mesa. Se recorta redonda.'}
        </p>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        onChange={elegir}
        className="hidden"
      />
    </div>
  );
}
