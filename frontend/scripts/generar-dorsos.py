"""
Genera el dorso de cada pinta: la ficha 0-0 sin la raya del medio.

    npm run dorsos      (desde frontend/; hace falta Python con Pillow y NumPy)

Entra:  public/tiles-<pinta>/tile_0_0.png
Sale:   public/dorsos/tiles-<pinta>.png  y  .webp

Por que a partir de la 0-0 y no de un dibujo nuevo (seccion 185): el dorso
tiene que verse EXACTAMENTE como la cara —mismo material, mismo canto, mismas
esquinas— o al lado de ella canta. La 0-0 ya es eso, con una raya en el medio.
La raya se tapa con una franja espejo de la misma ficha, con los bordes
fundidos en seis pixeles para que no se note la costura. La clasica lleva un
boton en el medio y la de oro un barrote ancho: parche mas ancho para esas dos.

Hay que correrlo cada vez que se rehace una pinta.
"""
from pathlib import Path

import numpy as np
from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / 'public'
SALIDA = PUBLIC / 'dorsos'
SALIDA.mkdir(exist_ok=True)

# Cuanto se ensancha el parche a cada lado de la raya, en pixeles.
MARGEN = {'tiles': 20, 'tiles-oro': 14}
FUNDIDO = 6

for carpeta in sorted(p for p in PUBLIC.iterdir() if p.is_dir() and p.name.startswith('tiles')):
    origen = carpeta / 'tile_0_0.png'
    if not origen.exists():
        continue
    with Image.open(origen) as imagen:
        a = np.array(imagen.convert('RGBA')).astype(float)
    alto, ancho = a.shape[:2]
    mitad = ancho // 2

    # Donde esta la raya: las columnas del centro que se apartan del brillo
    # medio de la ficha, mirando solo la franja media (fuera del canto).
    brillo = a[int(alto * 0.3):int(alto * 0.7), :, :3].mean(axis=(0, 2))
    referencia = np.median(brillo[mitad - 60:mitad - 20])
    raya = [x for x in range(mitad - 30, mitad + 30) if abs(brillo[x] - referencia) > 8]
    margen = MARGEN.get(carpeta.name, FUNDIDO)
    desde, hasta = min(raya) - margen, max(raya) + margen
    anchura = hasta - desde + 1

    parche = a[:, desde - anchura:desde, :][:, ::-1, :].copy()
    mascara = np.ones(anchura)
    rampa = np.linspace(0, 1, FUNDIDO)
    mascara[:FUNDIDO] = rampa
    mascara[-FUNDIDO:] = rampa[::-1]
    mascara = mascara[None, :, None]
    a[:, desde:hasta + 1, :3] = a[:, desde:hasta + 1, :3] * (1 - mascara) + parche[:, :, :3] * mascara

    dorso = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
    dorso.save(SALIDA / f'{carpeta.name}.png', optimize=True)
    dorso.save(SALIDA / f'{carpeta.name}.webp', 'WEBP', quality=88, method=6)
    print(f'{carpeta.name}: raya en {min(raya)}-{max(raya)}, parche {desde}-{hasta}')
