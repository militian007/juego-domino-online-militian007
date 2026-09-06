# Prompts para los stickers del pase de batalla

> Para pegarle a Gemini. **Uno por vez**: el bloque de ESTILO + FORMATO tal cual, y abajo
> una sola línea de SUJETO. Si mandás los siete juntos, salen siete estilos distintos.

## Por qué así

- **Un personaje, no siete dibujos.** "El Panita" es una ficha de dominó con cara. Los siete
  stickers son el mismo personaje haciendo cosas distintas, así se reconocen como del club.
- **Fondo magenta, no transparente.** Gemini pinta el cuadriculado de "transparencia" dentro
  de la imagen: no es transparencia de verdad. El magenta plano se recorta limpio y no se
  parece a ningún color del dibujo.
- **Se tiene que leer a 40 píxeles.** En el menú de la mesa se ven chiquitos. Silueta simple
  y mucho contraste, o se convierten en una mancha.
- **De busto, no de cuerpo entero.** Medido con el dibujo del Panita: bajado a 30 y 40
  pixeles de alto, de cuerpo entero la cara desaparece y queda una mancha oscura con
  dorado. Recortado al busto, los ojos se le siguen viendo a 30. El cuerpo entero queda
  para el banner, que se ve grande.

## Dónde se guardan

En `frontend/arte-fuente/`, con estos nombres exactos:

`sticker-candela.png`, `sticker-corona.png`, `sticker-suerte.png`, `sticker-chivo.png`,
`sticker-cerebro.png`, `sticker-respeto.png`, `sticker-diamante.png`, `pase-banner.png`.

---

## BLOQUE FIJO — va igual en las siete

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (siempre el mismo, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio, igual que una ficha de
dominó de lujo. Los puntos de la ficha son dorados y brillantes. Tiene bracitos y piernas
cortas de caricatura, guantes blancos redondos, ojos grandes y expresivos, y una sonrisa
cálida. Proporción cabezona y achaparrada, entrañable, para caerle bien a cualquiera.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, y verde paño #12503A
solo como acento. Nada de magenta ni rosado en ninguna parte del dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024 (el borde clásico de un sticker). Luz suave desde arriba,
un brillo especular sobre el ónix. Sin sombra proyectada sobre el fondo.

LEGIBILIDAD:
Silueta simple y clara: tiene que entenderse cuando se ve a 40 píxeles de alto. Pocos
elementos, mucho contraste, nada de detalles finos ni tramas.

ENCUADRE (importante):
PLANO DE BUSTO: solo la cabeza y el torso, cortado a la altura de la cintura. La CARA
tiene que ocupar cerca de la mitad del alto de la imagen. Nada de cuerpo entero: en el
juego el sticker se ve muy chiquito y de cuerpo entero la cara no se distingue.
El busto va centrado y ocupa el 85% del cuadro, sin tocar los bordes.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras ni reflejos sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen. Nada de cuadrículas ni hojas con varias versiones.

SUJETO:
```

---

## Las siete líneas de SUJETO

Copiá el bloque de arriba y pegá **una** de estas al final, donde dice `SUJETO:`.

1. **Candela** — `El Panita en racha, con el puño en alto y cara de "estoy encendido", rodeado por detrás de llamas anaranjadas y doradas que le forman un halo.`

2. **Corona** — `El Panita con una corona dorada ligeramente ladeada, los brazos cruzados y una sonrisa de campeón, con un destello dorado en la corona.`

3. **Suerte** — `El Panita guiñando un ojo y sosteniendo junto a la cara un trébol de cuatro hojas verde brillante, con dos o tres chispitas doradas alrededor.`

4. **El Chivo** — `El Panita hecho el chivo del juego: cuernitos dorados curvos y una barbita blanca de chivo, una ceja levantada y cara de "aquí mando yo".`

5. **Cerebro** — `El Panita pensando la jugada, con un dedo en la sien y la mirada de reojo, y sobre su cabeza dos o tres engranajes dorados girando.`

6. **Respeto** — `El Panita haciendo el saludo militar con la mano en la frente, cara seria pero amable, con un pequeño brillo dorado en la punta de los dedos.`

7. **Diamante** — `El Panita sosteniendo en alto un diamante azul claro brillante, con los ojos hechos estrellas y destellos alrededor del diamante.`

---

## El banner de la pantalla del pase

Va aparte, es el único que no es cuadrado.

```
Ilustración horizontal para la cabecera de un pase de batalla de un club de dominó.
Estilo: mismo personaje y misma paleta que los stickers ("El Panita", ficha de dominó de
ónix negro con marco dorado, ojos grandes, entrañable), cel shading suave, acabado
profesional de estudio.

ESCENA:
El Panita con la corona dorada, de pie sobre una mesa de dominó de paño verde oscuro, con
fichas negro y oro desparramadas a su alrededor y confeti dorado cayendo. Un foco cálido lo
ilumina desde arriba; los bordes de la imagen quedan oscuros y sin detalle.

COMPOSICIÓN:
El personaje va en el TERCIO DERECHO. La mitad izquierda tiene que quedar oscura y vacía,
casi lisa, porque encima se le va a poner el título en dorado.

FORMATO:
- Imagen horizontal 1536x640 (relación 2.4:1).
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Sin cuadriculado de transparencia.
```

---

## Si sale mal

- **Devuelve el cuadriculado gris de "transparencia"** → *"El fondo tiene que ser magenta
  plano #FF00FF, un solo color liso. Nada de cuadriculado."*
- **El personaje toca los bordes o queda cortado** → *"Alejá la cámara: el personaje ocupa el
  85% del cuadro y no toca ningún borde."*
- **Se ve recargado** → *"Simplificá: menos elementos, silueta más limpia, tiene que leerse
  a 40 píxeles."*
- **Salió de cuerpo entero** → *"Plano de busto: solo cabeza y torso, cortado en la cintura,
  con la cara ocupando la mitad del alto."*
- **Cada uno salió con un estilo distinto** → los estás mandando juntos. Uno por vez, con el
  bloque fijo completo cada vez.
