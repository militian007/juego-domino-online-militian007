"""
Genera el .webp de cada ficha y de cada cartel, al lado de su .png.

Los PNG no se tocan: son el original y el respaldo (Tile cae a ellos si el
navegador no carga el WebP). Hay que correrlo cada vez que se rehace una pinta
o un cartel, porque el juego pide PRIMERO el WebP: si queda uno viejo al lado
de un PNG nuevo, se ve el dibujo viejo.

    npm run webp        (desde frontend/; hace falta Python con Pillow)
"""
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / 'public'
CARPETAS = sorted(p for p in PUBLIC.iterdir() if p.is_dir() and p.name.startswith('tiles'))
CARPETAS.append(PUBLIC / 'carteles')

total_png = total_webp = 0
for carpeta in CARPETAS:
    png = webp = 0
    archivos = sorted(carpeta.glob('*.png'))
    for origen in archivos:
        destino = origen.with_suffix('.webp')
        with Image.open(origen) as imagen:
            if imagen.mode != 'RGBA':
                imagen = imagen.convert('RGBA')
            imagen.save(destino, 'WEBP', quality=85, method=6)
        png += origen.stat().st_size
        webp += destino.stat().st_size
    total_png += png
    total_webp += webp
    print(f'{carpeta.name:14} {len(archivos):2} archivos  PNG {png:>10,}  WebP {webp:>9,}  ({100 * webp / png:.0f}%)')

print(f'{"total":14}             PNG {total_png:>10,}  WebP {total_webp:>9,}  ({100 * total_webp / total_png:.0f}%)')
