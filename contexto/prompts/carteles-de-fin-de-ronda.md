# Prompts para los carteles de fin de ronda

> Para pegarle a Gemini. **Uno por vez**: el bloque de ESTILO + FORMATO tal cual, y abajo una
> sola línea de SUJETO. Si mandás los tres juntos, salen tres estilos distintos.

## Qué son

Cuando se cierra una ronda, el juego grita sobre la mesa: **"¡Dominó!"** en grande, con rayos
de sol girando detrás y confeti. Hoy esa palabra es tipografía y efectos de CSS. Se ve bien,
pero no compite con el arte pintado de Domino Legends, y es lo que más se mira de toda la
partida.

Son **tres**, y todos son de GANAR:

| archivo | cuándo sale | qué dice |
| --- | --- | --- |
| `cartel-domino.png` | ganaste la ronda quedándote sin fichas (85% de las veces) | **¡DOMINÓ!** |
| `cartel-tranca.png` | ganaste una ronda trancada | **¡TRANCA!** |
| `cartel-ganaste.png` | ganaste la partida entera | **¡GANASTE!** |

**Los de perder NO llevan arte, a propósito.** Un banner pintado para "Tranca perdida" sería
celebrar que perdiste. Esos se quedan en tipografía sobria.

## Lo más importante: REVISÁ CÓMO ESCRIBE LAS LETRAS

Los generadores de imágenes se equivocan con el texto, y en español se equivocan más: se comen
la tilde de **DOMINÓ**, se olvidan del signo **¡** de apertura, o inventan letras de más.

**Mirá la imagen letra por letra antes de guardarla.** Si dice "DOMINO" sin tilde, "DOMINÓ!"
sin el `¡`, o cualquier cosa rara, **pedila de nuevo**. Suele salir bien al segundo o tercer
intento. Si después de varios intentos no hay forma con la tilde, mandámela igual y te digo si
conviene dejar el cartel de texto para ese.

## Dónde se guardan

En `frontend/arte-fuente/`, con estos nombres exactos:

`cartel-domino.png`, `cartel-tranca.png`, `cartel-ganaste.png`

Después corré, desde `frontend/`:

```bash
npm run carteles
```

Eso les quita el fondo magenta, los recorta y los deja en `public/carteles/`. **Mientras no
estén, el juego usa el cartel de texto y no se rompe nada** — está probado.

---

## BLOQUE FIJO — va igual en los tres

```
Rótulo de texto ilustrado para un videojuego de dominó, estilo caricatura de estudio,
2D, cel shading suave, acabado profesional, alta calidad. Es una sola palabra tratada
como un logotipo pintado, no un cartel con marco ni una placa.

TIPOGRAFÍA:
Letras gruesas y redondeadas de caricatura, muy legibles, con mucha personalidad,
ligeramente arqueadas en arco hacia arriba y con un leve giro juguetón. Las letras
tienen volumen, como si estuvieran esculpidas: bisel dorado, brillo especular arriba
y una base más oscura abajo. Sensación de fiesta y celebración.

PALETA (la misma del club, obligatoria):
Relleno de las letras en degradado de oro #D4A94A a #F2D488, con un brillo casi blanco
#FFF6DC en el filo de arriba. Contorno exterior grueso en negro ónix #12100E, y por
fuera de ese, un segundo contorno crema #F7E7C4 parejo alrededor de toda la palabra.
Nada de magenta ni rosado en ninguna parte de las letras.

ACABADO:
Luz cálida desde arriba. Un par de destellos dorados de cuatro puntas apoyados sobre
las letras, pequeños y discretos. Sin sombra proyectada sobre el fondo.

MUY IMPORTANTE — LO QUE NO VA:
- NO dibujes rayos de sol, ni un sol, ni líneas saliendo desde atrás. El juego ya pone
  los rayos por detrás y los hace girar; si vienen pintados se quedan quietos.
- NO dibujes confeti, ni papelitos, ni fondo de escena.
- NO dibujes fichas de dominó, ni personajes, ni manos, ni marcos, ni cintas, ni
  banderines. SOLO la palabra.

FORMATO (obligatorio):
- Imagen horizontal, proporción aproximada 3:1 (por ejemplo 1536 x 512).
- Fondo MAGENTA PLANO #FF00FF: un solo color liso, sin degradado, sin textura, sin
  cuadriculado de transparencia, sin sombras ni reflejos sobre el fondo.
- La palabra centrada, ocupando cerca del 90% del ancho, sin tocar los bordes.
- Una sola imagen. Nada de cuadrículas ni varias versiones en la misma hoja.

ORTOGRAFÍA (crítico):
El texto tiene que estar escrito EXACTAMENTE como se indica abajo, en mayúsculas,
incluyendo el signo de apertura ¡ al principio, el signo de cierre ! al final, y la
tilde donde corresponda. Ni una letra de más ni de menos.

SUJETO:
```

---

## Las tres líneas de SUJETO

Copiá el bloque de arriba y pegá **una** de estas al final, donde dice `SUJETO:`.

1. **Dominó** — `La palabra ¡DOMINÓ! en mayúsculas, con el signo de apertura ¡ al principio, el signo ! al final, y TILDE sobre la letra O final (Ó). Se escribe: ¡DOMINÓ!`

2. **Tranca** — `La palabra ¡TRANCA! en mayúsculas, con el signo de apertura ¡ al principio y el signo ! al final. Sin tildes. Se escribe: ¡TRANCA!`

3. **Ganaste** — `La palabra ¡GANASTE! en mayúsculas, con el signo de apertura ¡ al principio y el signo ! al final. Sin tildes. Se escribe: ¡GANASTE!`

---

## Si querés un cuarto, más adelante

`¡EMPATE!` para las rondas empatadas. No lo pedí porque son el **0,7% de las rondas** —
medido— y no vale una imagen que casi nadie va a ver.
