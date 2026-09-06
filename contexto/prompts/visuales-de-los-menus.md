# Prompts para las visuales de los menús

> Seis imágenes, **cada prompt completo y listo para copiar**. No hay que armar nada:
> se copia uno entero, se pega en Gemini, y se guarda el resultado con el nombre que dice.

## Qué problema resuelven

En las capturas del menú de modos, **el 70% de la pantalla es negro vacío**. Las tarjetas
están bien, pero flotan en la nada. Y los iconitos de las tarjetas son un diagrama dibujado
por código (`MesaIcono.jsx`): sirve para contar sillas, pero no es arte.

- El **fondo** (1) tapa el vacío.
- Los **iconos de sección** (2 y 3) le ponen cara a "contra la casa" y "contra jugadores".
- Los **iconos de búsqueda** (4 y 5) van en las dos tarjetas de "cómo buscar".
- El **de esperar** (6) va en "Buscando oponente" y "Preparando la partida".

El diagrama de sillas NO se tira: se queda chiquito en cada tarjeta, porque es lo único que
dice **exactamente** cuántos juegan y cuáles son bots, y eso lo calcula el código y nunca se
equivoca. El arte va al lado, no en su lugar.

## Dónde se guardan

Todas en `frontend/arte-fuente/`, con estos nombres:

`fondo-menu.png`, `modo-casa.png`, `modo-gente.png`, `busqueda-rapida.png`,
`sala-privada.png`, `esperando.png`.

---

# 1. El fondo de los menús

Guardar como: **`fondo-menu.png`**

```
Ilustración de fondo para la pantalla de un club de dominó, vista vertical de teléfono.

ESCENA:
Una mesa de dominó de paño verde oscuro vista desde arriba en ángulo. Sobre el paño hay
fichas de dominó de ónix negro con marco dorado ornamentado, desparramadas sin orden, algunas
boca arriba y otras boca abajo. Un foco cálido y suave entra desde arriba; las esquinas y todo
el borde caen a negro casi puro.

MUY IMPORTANTE, LA ZONA CENTRAL VA VACÍA:
La franja del medio de la imagen, de arriba a abajo, tiene que quedar OSCURA, LISA y SIN
FICHAS: casi negro plano. Encima de esa franja se va a poner texto y botones, y si hay
detalle abajo no se lee nada. Las fichas van solo pegadas a los bordes de arriba y de abajo,
y se van perdiendo en la oscuridad.

PALETA:
Verde paño #12503A, negro ónix #12100E, oro #D4A94A. Ambiente de club nocturno, cálido,
elegante, nada de colores chillones.

FORMATO:
- Imagen vertical 1080x1920.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Sin personajes, sin manos, sin gente. Solo la mesa y las fichas.
- Sin cuadriculado de transparencia.
```

---

# 2. Icono "Contra la casa"

Guardar como: **`modo-casa.png`**

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (el mismo de siempre, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio. Los puntos son dorados y
brillantes. Bracitos y piernas cortas de caricatura, guantes blancos redondos, ojos grandes
y expresivos, sonrisa cálida. Proporción cabezona y achaparrada, entrañable.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, verde paño #12503A solo
como acento. Nada de magenta ni rosado en el dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024. Luz suave desde arriba, un brillo especular sobre el ónix.
Sin sombra proyectada sobre el fondo.

ENCUADRE:
PLANO DE BUSTO: cabeza y torso, cortado a la altura de la cintura. Las caras tienen que
ocupar cerca de la mitad del alto de la imagen. Nada de cuerpo entero: esto se ve muy chiquito
en el teléfono.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen.

SUJETO:
DOS personajes enfrentados de perfil tres cuartos, mirándose: a la izquierda El Panita normal
con cara decidida; a la derecha una versión ROBOT de El Panita, del mismo tamaño, con los ojos
como dos luces cian brillantes, una antenita dorada arriba y placas metálicas atornilladas en
el marco. Entre los dos, arriba, un pequeño rayo dorado de desafío. Sin corona y sin cuernos.
```

---

# 3. Icono "Contra jugadores"

Guardar como: **`modo-gente.png`**

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (el mismo de siempre, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio. Los puntos son dorados y
brillantes. Bracitos y piernas cortas de caricatura, guantes blancos redondos, ojos grandes
y expresivos, sonrisa cálida. Proporción cabezona y achaparrada, entrañable.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, verde paño #12503A solo
como acento. Nada de magenta ni rosado en el dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024. Luz suave desde arriba, un brillo especular sobre el ónix.
Sin sombra proyectada sobre el fondo.

ENCUADRE:
PLANO DE BUSTO: cabeza y torso, cortado a la altura de la cintura. Las caras tienen que
ocupar cerca de la mitad del alto de la imagen. Nada de cuerpo entero: esto se ve muy chiquito
en el teléfono.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen.

SUJETO:
DOS Panitas iguales, hombro con hombro, chocando los puños en el medio, los dos sonriendo de
frente como dos panas que se van a echar una partida. Uno lleva una gorra verde ladeada para
que se distingan entre sí. Un par de chispitas doradas donde chocan los puños. Sin corona y
sin cuernos.
```

---

# 4. Icono "Emparejamiento rápido"

Guardar como: **`busqueda-rapida.png`**

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (el mismo de siempre, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio. Los puntos son dorados y
brillantes. Bracitos y piernas cortas de caricatura, guantes blancos redondos, ojos grandes
y expresivos, sonrisa cálida. Proporción cabezona y achaparrada, entrañable.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, verde paño #12503A solo
como acento. Nada de magenta ni rosado en el dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024. Luz suave desde arriba, un brillo especular sobre el ónix.
Sin sombra proyectada sobre el fondo.

ENCUADRE:
PLANO DE BUSTO: cabeza y torso, cortado a la altura de la cintura. La cara tiene que ocupar
cerca de la mitad del alto de la imagen. Nada de cuerpo entero.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen.

SUJETO:
El Panita con cara de apuro entusiasmado, inclinado hacia adelante como si arrancara a correr,
y detrás de él dos rayas doradas de velocidad. A un costado de la cabeza, un rayo dorado
grande y brillante. Sin corona y sin cuernos.
```

---

# 5. Icono "Sala privada"

Guardar como: **`sala-privada.png`**

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (el mismo de siempre, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio. Los puntos son dorados y
brillantes. Bracitos y piernas cortas de caricatura, guantes blancos redondos, ojos grandes
y expresivos, sonrisa cálida. Proporción cabezona y achaparrada, entrañable.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, verde paño #12503A solo
como acento. Nada de magenta ni rosado en el dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024. Luz suave desde arriba, un brillo especular sobre el ónix.
Sin sombra proyectada sobre el fondo.

ENCUADRE:
PLANO DE BUSTO: cabeza y torso, cortado a la altura de la cintura. La cara tiene que ocupar
cerca de la mitad del alto de la imagen. Nada de cuerpo entero.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen.

SUJETO:
El Panita con cara de complicidad, guiñando un ojo, sosteniendo junto a la cara una llave
dorada grande y antigua de cabeza ornamentada. Sin corona y sin cuernos.
```

---

# 6. Icono "Esperando"

Guardar como: **`esperando.png`**

```
Ilustración de sticker de vinilo troquelado, estilo mascota, 2D, cel shading suave,
acabado profesional de estudio, alta calidad.

PERSONAJE (el mismo de siempre, "El Panita"):
Una ficha de dominó regordeta y simpática convertida en personaje. Cuerpo de ónix negro
pulido con marco dorado ornamentado y la barra dorada al medio. Los puntos son dorados y
brillantes. Bracitos y piernas cortas de caricatura, guantes blancos redondos, ojos grandes
y expresivos, sonrisa cálida. Proporción cabezona y achaparrada, entrañable.

PALETA:
Negro ónix #12100E, oro #D4A94A con brillos #F2D488, crema #F7E7C4, verde paño #12503A solo
como acento. Nada de magenta ni rosado en el dibujo.

ACABADO:
Contorno exterior grueso color crema #F7E7C4, parejo alrededor de toda la silueta, de unos
40 píxeles en una imagen de 1024. Luz suave desde arriba, un brillo especular sobre el ónix.
Sin sombra proyectada sobre el fondo.

ENCUADRE:
PLANO DE BUSTO: cabeza y torso, cortado a la altura de la cintura. La cara tiene que ocupar
cerca de la mitad del alto de la imagen. Nada de cuerpo entero.

FORMATO (obligatorio):
- Imagen cuadrada 1024x1024.
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras sobre el fondo.
- Sin texto, sin letras, sin números, sin logotipos, sin marca de agua.
- Una sola ilustración por imagen.

SUJETO:
El Panita esperando con paciencia y buen humor: apoyado de codo, la mejilla sobre el guante,
mirando de reojo hacia arriba, con una cejita levantada. A un costado de la cabeza, un
relojito de arena dorado. Sin corona y sin cuernos.
```

---

## Si sale mal

- **Devuelve el cuadriculado gris** → *"El fondo tiene que ser magenta plano #FF00FF, un solo
  color liso. Nada de cuadriculado."* (Esto NO aplica al fondo de menú, el número 1, que sí
  lleva su escena completa.)
- **Salió de cuerpo entero** → *"Plano de busto: solo cabeza y torso, cortado en la cintura,
  con la cara ocupando la mitad del alto."*
- **Le puso corona o cuernos** → *"Sin corona y sin cuernos: solo lo que dice el SUJETO."*
- **El fondo de menú tiene fichas en el medio** → *"La franja central tiene que quedar oscura
  y vacía, casi negro plano. Las fichas van solo pegadas a los bordes de arriba y abajo."*
