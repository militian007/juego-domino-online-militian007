"""
Genera la textura de cuero de la baranda.

No dibuja "ruido": construye un mapa de altura, lo convierte en mapa de normales
y lo ilumina, que es como se saca el relieve en un motor 3D.

La clave son dos cosas:

  - Las arrugas salen de ruido "ridged" (1-|x| convierte los cruces por cero en
    crestas), no de ruido comun.
  - Ese campo se deforma con otro ruido (domain warping). Sin eso las arrugas
    salen como rayas paralelas y parece madera cepillada; con eso se curvan y
    se ramifican como el cuero de verdad.

El resultado se guarda en escala de grises: el color se lo pone el CSS, asi un
solo archivo sirve para los 5 cueros del selector.

    python frontend/tools/gen_cuero.py
    -> frontend/public/cuero.webp
"""

import numpy as np
from PIL import Image
import os

SIZE = 512
SEED = 20260824


def norm(a):
    a = a - a.min()
    m = a.max()
    return a / m if m > 0 else a


def banda(size, rng, f_min, f_max, pendiente=1.0):
    """Ruido periodico limitado en banda. Periodico = la textura tilea sin costura."""
    fx = np.fft.fftfreq(size)[:, None]
    fy = np.fft.fftfreq(size)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1e-6

    amp = np.where((f >= f_min) & (f <= f_max), f ** (-pendiente), 0.0)
    amp[0, 0] = 0.0

    fase = rng.uniform(0, 2 * np.pi, (size, size))
    return np.real(np.fft.ifft2(amp * np.exp(1j * fase)))


def deformar(campo, dx, dy):
    """Muestrea `campo` desplazado por (dx, dy), con wrap y bilineal."""
    h, w = campo.shape
    ys, xs = np.meshgrid(np.arange(h), np.arange(w), indexing='ij')

    sx = (xs + dx) % w
    sy = (ys + dy) % h

    x0 = np.floor(sx).astype(np.int64) % w
    y0 = np.floor(sy).astype(np.int64) % h
    x1 = (x0 + 1) % w
    y1 = (y0 + 1) % h
    tx = sx - np.floor(sx)
    ty = sy - np.floor(sy)

    return (
        campo[y0, x0] * (1 - tx) * (1 - ty)
        + campo[y0, x1] * tx * (1 - ty)
        + campo[y1, x0] * (1 - tx) * ty
        + campo[y1, x1] * tx * ty
    )


def crestas(campo, dureza):
    """Convierte los cruces por cero en crestas: la forma de una arruga."""
    return (1.0 - np.abs(norm(campo) * 2 - 1)) ** dureza


def main():
    rng = np.random.default_rng(SEED)

    # ── Campos de deformacion ────────────────────────────────────────────
    # Dos escalas: una grande que curva las arrugas en arcos amplios y una
    # mediana que las hace serpentear y ramificarse.
    wx = norm(banda(SIZE, rng, 0.004, 0.020, 1.0)) * 2 - 1
    wy = norm(banda(SIZE, rng, 0.004, 0.020, 1.0)) * 2 - 1
    wx2 = norm(banda(SIZE, rng, 0.02, 0.06, 0.9)) * 2 - 1
    wy2 = norm(banda(SIZE, rng, 0.02, 0.06, 0.9)) * 2 - 1

    dx = wx * 78 + wx2 * 26
    dy = wy * 78 + wy2 * 26

    # ── 1. La piel: variacion de tono grande y suave ─────────────────────
    manchas = norm(deformar(banda(SIZE, rng, 0.002, 0.014, 1.3), dx * 0.5, dy * 0.5))

    # ── 2. Arrugas: crestas deformadas ───────────────────────────────────
    arrugas = np.zeros((SIZE, SIZE))
    for f0, f1, dureza, peso in [
        (0.010, 0.030, 7.0, 1.00),
        (0.024, 0.060, 9.0, 0.55),
    ]:
        campo = deformar(banda(SIZE, rng, f0, f1, 0.8), dx, dy)
        arrugas = np.maximum(arrugas, crestas(campo, dureza) * peso)

    # ── 3. Poro: el grano fino, tambien deformado para que no se vea regular
    poro = norm(deformar(banda(SIZE, rng, 0.13, 0.34, 0.55), dx * 0.25, dy * 0.25))
    poro = poro ** 1.5

    altura = norm(0.58 * manchas + 0.27 * arrugas + 0.15 * poro)

    # ── Relieve: mapa de normales + iluminacion ──────────────────────────
    relieve = 2.4
    gy, gx = np.gradient(altura * relieve)
    nz = np.ones_like(gx)
    largo = np.sqrt(gx ** 2 + gy ** 2 + nz ** 2)
    nx, ny, nz = -gx / largo, -gy / largo, nz / largo

    # Luz desde arriba a la izquierda, como en la foto de referencia
    lx, ly, lz = -0.42, -0.58, 0.70
    ln = np.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln

    difusa = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)

    hx, hy, hz = lx, ly, lz + 1.0
    hn = np.sqrt(hx * hx + hy * hy + hz * hz)
    hx, hy, hz = hx / hn, hy / hn, hz / hn
    especular = np.clip(nx * hx + ny * hy + nz * hz, 0, 1) ** 26

    # Oclusion: los surcos quedan mas oscuros
    oclusion = 0.60 + 0.40 * altura

    lum = 0.18 + 0.72 * difusa * oclusion + 0.16 * especular
    lum = np.clip(lum, 0, 1)
    lum = np.clip((lum - 0.5) * 1.12 + 0.5, 0, 1)

    salida = (lum * 255).astype(np.uint8)
    img = Image.fromarray(salida, mode='L').convert('RGB')

    aqui = os.path.dirname(os.path.abspath(__file__))
    destino = os.path.normpath(os.path.join(aqui, '..', 'public', 'cuero.webp'))
    img.save(destino, 'WEBP', quality=90, method=6)

    print(destino)
    print(f'{SIZE}x{SIZE}  {os.path.getsize(destino) / 1024:.1f} KB')
    print(f'luminancia  min {salida.min()}  max {salida.max()}  media {salida.mean():.0f}')

    # La costura tiene que ser tan suave como cualquier par de columnas vecinas
    col = np.abs(np.diff(salida.astype(int), axis=1)).mean()
    fil = np.abs(np.diff(salida.astype(int), axis=0)).mean()
    bor_v = np.abs(salida[:, 0].astype(int) - salida[:, -1].astype(int)).mean()
    bor_h = np.abs(salida[0, :].astype(int) - salida[-1, :].astype(int)).mean()
    print(f'salto medio entre columnas vecinas {col:.1f} | en la costura {bor_v:.1f}')
    print(f'salto medio entre filas vecinas    {fil:.1f} | en la costura {bor_h:.1f}')


if __name__ == '__main__':
    main()
