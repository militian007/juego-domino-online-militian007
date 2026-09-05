# Aquí van las imágenes de origen de las pintas de fichas

Jonathan las genera con Gemini y las guarda **en esta misma carpeta**, con estos
nombres exactos.

Esta carpeta esta **fuera de `public/`** a proposito: si estuviera dentro, se
publicarian cinco megas de imagenes que ningun jugador descarga.

Cada pinta son **dos archivos**: la ficha vacía y un punto suelto.

| archivo | qué es |
| --- | --- |
| `hueso-ficha.png` | la ficha vacía: blanco hueso, sin puntos, sin línea, fondo transparente |
| `hueso-punto.png` | un solo punto negro, fondo transparente |
| `oro-ficha.png` | la ficha vacía: ónix negro con marco dorado y la barra del medio ya dibujada |
| `oro-punto.png` | un solo punto dorado, fondo transparente |

Con esas, `npm run fichas` arma las **28 fichas de cada pinta**
(`tile_0_0.png` … `tile_6_6.png`) colocando los puntos en su sitio, y la línea
del medio solo en las pintas que no la traen ya dibujada.

Para agregar una pinta nueva no se toca el código de dibujo: se agrega una
entrada al array `PINTAS` en `frontend/scripts/generar-fichas.mjs` con dónde
caben los puntos y de qué tamaño van.

## Por qué dos imágenes y no veintiocho

Un modelo de imagen **no cuenta bien los puntos**. Si se le piden las 28 fichas,
la mitad sale con el número equivocado y hay que rehacerlas una por una.

Pidiéndole el material (la ficha vacía y el punto) y colocando los puntos por
código, el número **siempre** es el correcto y las 28 quedan idénticas entre sí.
El arte lo pone Gemini; la geometría la pone el código. Regla de oro 1.1.

## Los prompts

Están en `contexto/README.md`, sección 104.

## Ojo con lo que devuelve Gemini

Los archivos vienen como **JPEG aunque digan `.png`**, y el cuadriculado de
"transparencia" viene **pintado dentro de la imagen**: no es transparencia de
verdad. El script lo recorta solo, buscando los pixeles grises neutros que estan
pegados al borde.
