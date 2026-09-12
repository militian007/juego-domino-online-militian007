# Tanda de prompts para Gemini

> **Uno por vez.** Copiás el bloque completo de un recuadro y lo pegás. Si mandás varios
> juntos, salen con estilos distintos.
>
> Guardá todo en `frontend/arte-fuente/` con el nombre exacto que dice cada uno.

## Índice

| # | qué es | archivos | para qué sirve |
| --- | --- | --- | --- |
| 1 | **Pintas de fichas** (3 nuevas) | 2 imágenes por pinta | es lo que más se ve; y da qué vender en la tienda |
| 2 | **Paños de mesa** (2 nuevos) | 1 imagen cada uno | cambia la cara de la mesa entera |
| 3 | **Barandas** (1 nueva) | 1 imagen | el marco de madera alrededor |
| 4 | **Stickers del Panita** (4 nuevos) | 1 imagen cada uno | para mandar en la partida |

**Lo más rentable son las fichas.** Cada pinta son solo **dos imágenes** y el juego arma las
28 solo.

---

# 1. PINTAS DE FICHAS

Cada pinta necesita **dos imágenes**: la ficha **vacía** y **un punto**. El script
`npm run fichas` arma las 28 combinaciones. Se hace así porque pidiéndole las 28 a un modelo,
la mitad sale con el número de puntos equivocado.

Guardalas como `<pinta>-ficha.png` y `<pinta>-punto.png`. Las tres pintas: `marmol`, `jade`,
`madera`.

## 1a. La ficha vacía

```
Una única ficha de dominó VACÍA, sin ningún punto, vista completamente de frente
y desde arriba (vista cenital perfecta, sin perspectiva, sin inclinación).

FORMA:
Rectángulo horizontal acostado, proporción exacta 2:1 (el doble de ancho que de
alto), con las esquinas apenas redondeadas. Una línea divisoria fina y nítida
justo en el centro, separando las dos mitades cuadradas. Las dos mitades
completamente lisas y vacías: NINGÚN punto, NINGÚN número, NINGÚN símbolo.

MATERIAL:
{{MATERIAL}}

ILUMINACIÓN:
Luz suave y pareja desde arriba, sin reflejos fuertes que tapen el material y
sin sombra proyectada sobre el fondo. La ficha tiene que verse igual de clara en
las dos mitades.

FORMATO (obligatorio):
- Imagen cuadrada, 1024x1024.
- La ficha centrada, ocupando cerca del 85% del ancho.
- Fondo GRIS NEUTRO PLANO #808080, liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras.
- Sin texto, sin letras, sin números, sin marcas de agua.
- Una sola ficha en la imagen. Nada de cuadrículas ni varias versiones.
```

Reemplazá `{{MATERIAL}}` por una de estas tres:

- **`marmol-ficha.png`** — `Mármol blanco pulido con vetas grises finas y elegantes, tipo mármol de Carrara. Superficie brillante y fría, con un brillo suave de piedra pulida. La línea divisoria del centro grabada en el mármol, con una sombra fina dentro del surco.`

- **`jade-ficha.png`** — `Jade verde profundo pulido, translúcido, con vetas más claras y lechosas por dentro, como una pieza de jade tallado. Superficie muy lisa y brillante. La línea divisoria del centro grabada en la piedra.`

- **`madera-ficha.png`** — `Madera de nogal oscuro encerada, con la veta natural bien visible corriendo a lo largo de la ficha. Acabado satinado y cálido, no brillante. La línea divisoria del centro grabada a fuego, un poco más oscura que la madera.`

## 1b. El punto

```
Un ÚNICO punto de ficha de dominó, aislado, visto de frente y desde arriba.

FORMA:
Un círculo perfecto, relleno, con un poco de relieve: se ve hundido en la
superficie, con una sombra interior arriba y un brillo suave abajo, como los
puntos tallados de una ficha de dominó buena.

MATERIAL:
{{MATERIAL_PUNTO}}

FORMATO (obligatorio):
- Imagen cuadrada, 1024x1024.
- El punto centrado, ocupando cerca del 70% del ancho.
- Fondo GRIS NEUTRO PLANO #808080, liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombra proyectada.
- Sin texto, sin letras, sin números, sin marcas de agua.
- Un solo punto en la imagen.
```

Reemplazá `{{MATERIAL_PUNTO}}` por:

- **`marmol-punto.png`** — `Negro ónix pulido, muy oscuro y brillante, contrastando fuerte contra el mármol blanco.`
- **`jade-punto.png`** — `Oro viejo pulido, cálido y brillante, contrastando contra el jade verde.`
- **`madera-punto.png`** — `Marfil crema pulido, claro y cálido, contrastando contra la madera oscura.`

---

# 2. PAÑOS DE MESA

Son **baldosas que se repiten** por toda la mesa. Lo más importante es que **no se note la
costura** donde se repiten. Guardalos como `pano-<nombre>.png`. Los dos: `granate`, `azul`.

```
Textura de paño de mesa de juego, vista completamente de frente y desde arriba,
en primer plano y muy cerca, como una foto macro de la tela.

MATERIAL:
{{TELA}}

MUY IMPORTANTE — SIN COSTURA:
La textura tiene que poder repetirse en mosaico sin que se note la unión. El
borde de arriba tiene que continuar exactamente en el borde de abajo, y el
izquierdo en el derecho. Nada de motivos grandes, manchas, logos ni elementos
sueltos que delaten dónde se repite: solo el tejido parejo.

ILUMINACIÓN:
Luz completamente pareja y difusa sobre toda la imagen. NADA de foco, viñeta,
degradado ni zonas más oscuras en las esquinas: si hay un foco, al repetirse se
ve una grilla de manchas.

FORMATO (obligatorio):
- Imagen cuadrada, 1024x1024.
- Solo la tela, llenando el cuadro entero.
- Sin fichas, sin manos, sin objetos, sin bordes, sin marco.
- Sin texto, sin letras, sin números, sin marcas de agua.
```

Reemplazá `{{TELA}}`:

- **`pano-granate.png`** — `Fieltro de billar granate profundo, tipo vino tinto oscuro. Tejido fino y apretado, con las fibras cortas bien visibles de cerca.`
- **`pano-azul.png`** — `Fieltro de billar azul medianoche, profundo y elegante. Tejido fino y apretado, con las fibras cortas bien visibles de cerca.`

---

# 3. BARANDA

Es el **marco de madera** que rodea la mesa. El juego lo recorta por los bordes, así que el
marco tiene que estar **pegado a los bordes de la imagen**. Guardala como `mesa-<nombre>.png`.

```
Marco rectangular de una mesa de juego de lujo, visto completamente de frente y
desde arriba (vista cenital perfecta, sin perspectiva).

QUÉ SE VE:
Un borde grueso de madera que rodea el cuadro entero por los cuatro lados, como
la baranda de una mesa de casino. El CENTRO queda hueco: dentro del marco se ve
el paño verde oscuro liso.

MATERIAL:
Madera de caoba rojiza oscura, encerada, con la veta bien visible y un
filo dorado fino por el borde interior, donde la madera se encuentra con el
paño. Acabado satinado, elegante, de mesa cara.

MUY IMPORTANTE — EL MARCO TOCA LOS BORDES:
La madera tiene que llegar hasta el borde mismo de la imagen por los cuatro
lados, sin ningún margen ni fondo alrededor. El grosor de la madera tiene que
ser PAREJO en los cuatro lados.

ILUMINACIÓN:
Luz pareja. Sin foco, sin viñeta, sin brillos fuertes en una esquina.

FORMATO (obligatorio):
- Imagen cuadrada, 1024x1024.
- Sin fichas, sin manos, sin objetos encima.
- Sin texto, sin letras, sin números, sin marcas de agua.
```

---

# 4. STICKERS DEL PANITA

Mismo personaje y mismo estilo que los siete que ya existen. **Copiá el bloque fijo de
[stickers-del-pase.md](stickers-del-pase.md)** —el que describe a El Panita, la paleta, el
contorno crema y el fondo magenta— y pegale al final **una** de estas líneas de SUJETO:

1. **`sticker-pensando.png`** — `El Panita con cara de estar tramando algo, una ceja levantada y una sonrisa de medio lado, tocándose la barbilla con la mano.`

2. **`sticker-llorando.png`** — `El Panita llorando a mares de forma cómica y exagerada, con dos chorros de lágrimas saliendo de los ojos y la boca en una mueca de drama, pero simpático, nada triste de verdad.`

3. **`sticker-aplauso.png`** — `El Panita aplaudiendo con las dos manos, con los ojos cerrados de gusto y una sonrisa grande, con dos chispitas doradas donde chocan las manos.`

4. **`sticker-dormido.png`** — `El Panita dormido de pie, con los ojos cerrados en dos arcos, un globito de sueño saliendo de la nariz y una Z dorada flotando sobre su cabeza.`

---

## Cuando tengas las imágenes

Guardalas en `frontend/arte-fuente/` con esos nombres y corré, desde `frontend/`:

```bash
npm run fichas
npm run stickers
```

Los paños y la baranda los meto yo a mano, que hay que ajustarles el tamaño en el CSS.

**Avisame cuáles saliste a hacer y cuáles no**, así sé qué esperar. Si alguna sale mal, mandámela
igual y te digo si se arregla o si conviene pedirla de nuevo.
