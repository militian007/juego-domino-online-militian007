# Qué tiene Domino Legends que nosotros no

> Análisis del video que pasó Jonathan (`dominoi.mp4`, 14:19, 294x640, 30 fps, 25.755
> fotogramas). El juego es **Domino Legends, de PlayValve**.
>
> Todo lo que hay aquí está **medido sobre el video**, no recordado ni supuesto. Los tamaños
> salen de contar píxeles en fotogramas extraídos; las animaciones, de mirar ráfagas a 8 y 10
> fotogramas por segundo.

---

## 1. El tamaño de las fichas — lo que más te importaba

Los dos juegos se comparan llevando todo a un teléfono de **375 píxeles de ancho**, que es la
medida con la que venimos trabajando.

### La mano: prácticamente iguales

| | Domino Legends | Nosotros |
| --- | --- | --- |
| Ficha de la mano | 46 x 87 px | **47 x 94 px** |
| Cuánto ocupa de alto de pantalla | 10,6% | 11,6% |

**Aquí no hay nada que arreglar.** Nuestras fichas de la mano ya son igual de grandes, incluso
un pelo más.

### La mesa: aquí está toda la diferencia

| Momento de la ronda | Domino Legends | Nosotros |
| --- | --- | --- |
| Primera ficha de la ronda | **78 px de alto** | 20 px |
| Cadena mediana (~8 fichas) | **47 px** | 20 px |
| Cadena grande | 23 px | 20 px |
| Cadena enorme | 13 px | 20 px |

**Ellos no tienen un tamaño de ficha: tienen una cámara.** La mesa se acerca y se aleja sola
para que la cadena llene la pantalla siempre. Con una sola ficha puesta, esa ficha es **cuatro
veces más alta que la nuestra**. Con la cadena enorme, es más chica que la nuestra.

Nosotros decidimos lo contrario, y está escrito en el contexto §82: *"La mesa y las fichas
tienen UN SOLO tamaño durante toda la mano. Se probó acercar la vista a donde está la cadena
[...] pero el zoom cambiando en cada jugada molesta más de lo que suma."*

Esa decisión es la razón de que sus fichas se vean grandes y las nuestras chicas **durante casi
toda la ronda**, que es cuando la gente mira. Habría que revisarla: la queja de los amigos de
Jonathan apunta exactamente ahí.

---

## 2. Las animaciones que tienen, cronometradas

| Animación | Qué hace | Cuánto dura |
| --- | --- | --- |
| **Ficha jugada** | Sale de la mano, **vuela** hasta su sitio en la mesa y **crece** por el camino | ~0,3 s |
| **Ficha del rival** | Igual, pero entra desde el lado del rival | ~0,3 s |
| **Recentrado de la mesa** | Al poner cada ficha, la cadena entera se corre y se reescala suavemente | continuo |
| **"Domino!"** | Texto dorado en grande, rayos de sol detrás, la ficha ganadora flotando con destellos | ~2 s |
| **Puntos que vuelan** | Al cerrar la ronda, las insignias de pips salen de las fichas del perdedor y **viajan** hasta el marcador | ~1 s |
| **Marcador que cuenta** | El total sube de a poco (81 → 82 → 84 → 86 → 87), no salta | ~1 s |
| **Panel de fin de ronda** | Baja desde arriba con confeti | ~0,5 s |
| **Botón "Next Round"** | Entra deslizándose desde la izquierda, después del panel | ~0,4 s |
| **Fichas del perdedor** | Se revelan sobre la mesa al terminar la ronda | — |
| **Marcadores "?"** | Dos rombos amarillos parpadean en las dos puntas jugables, y la ficha correspondiente se enciende en la mano | mientras dura la ayuda |
| **Burbujas de chat** | Frases rápidas ("Good luck!", "Well played!") aparecen arriba y se van solas | ~3 s |
| **Emote de personaje** | Una carita con sombrero aparece sobre la mesa | ~2 s |

De todas estas, **nosotros tenemos**: la ficha que aparece con un rebote al ponerse
(`tile-place`), el brillo de la última jugada (`newest-glow`), la burbuja de chat, y las fichas
que se caen mientras carga. **Nos faltan todas las demás.**

---

## 3. Lo que tienen y nosotros no

### En la mesa

1. **Cámara que se acerca y se aleja sola.** Lo del punto 1. Es lo más visible de todo.
2. **La ficha vuela de la mano a la mesa.** Hoy la nuestra aparece de golpe en su sitio.
3. **La mano del rival se ve**, como fichas boca abajo en una barra arriba. Nosotros solo
   decimos "6 fichas".
4. **Reloj de turno siempre a la vista**, un círculo grande que arranca en 90 y baja de a uno.
   El nuestro son 25 segundos y solo aparece en los últimos 10.
5. **Insignias de pips en las puntas** al cerrar la ronda, para ver de dónde salen los puntos.
6. **Se revelan las fichas del perdedor** en la mesa.

### Cómo el juego te enseña

7. **Tutorial con mascota** la primera vez: *"Match the edges of tiles. Drag or tap a tile to
   play it."*
8. **Consejos que salen solos durante la partida**: *"The player with the highest double domino
   starts"*, *"The winner scores the number of pips left from the opponent"*, *"Board is
   blocked"*, *"No more moves, you have to pass"*, *"Your opponent is stuck and must draw from
   the boneyard"*. Nosotros avisamos poco y en seco.
9. **Explicación de cada modo** antes de jugarlo, con páginas y botón "Play".

### Celebración

10. **"Domino!"** con rayos.
11. **"Congratulations! You won the round!"** con confeti, y su gemelo **"Round Lost — Try
    again!"**.
12. **"You Won The Game!"** al final de la partida.
13. **Barra de progreso con estrella** hacia los 100 puntos de la partida.

### Modos y contenido

14. **Tres modos de reglas elegibles**: **All Fives**, **Draw** y **Block**. Nosotros jugamos
    siempre lo mismo (con pozo en 1v1, sin pozo en 2v2), y no se elige.
15. **Ligas con divisiones** (Novice, etc.), con emblema, puesto y cantidad de jugadores.
16. **Colecciones** — una pestaña entera de coleccionables.
17. **Tienda**.
18. **Monedas**, con **coste de entrada por partida** (el botón dice "PLAY 100").
19. **Ruleta diaria** y **cofre**.
20. **Ayudas de pago**: **Spy** (ver las fichas del rival) y **Hint** (te marca dónde jugar),
    que se desbloquean por nivel y se gastan.
21. **Frases rápidas de chat** en vez de escribir.
22. **Modo offline/online** conmutable desde el menú.

---

## 4. Lo que tenemos nosotros y ellos no

No todo es a favor de ellos. En el video **no aparece nada** de esto:

- **2 vs 2 en equipos** entre cuatro personas.
- **Torneos** con llave y copas.
- **Pase de batalla** con misiones, temporada y premios.
- **Clasificación con Elo** y tabla semanal.
- **Chat global** en el menú y **retos** entre jugadores.
- **Destrancar automático** — su tablero también podría trabarse y no vi que lo resuelvan.
- **Pintas de fichas y paños** para cambiarle la cara a la mesa.
- **El pozo desparramado y barajeándose en la mesa** — el suyo es una bandeja de madera con
  huecos, bastante más pobre.
- **Perfil con historial**, **app instalable** y **lupa de dos dedos**.

En contenido de largo plazo estamos por delante. En **cómo se siente jugar una mano**, ellos
van claramente adelante.

---

## 5. El plan que propongo

Ordenado por lo que más se nota dividido por lo que cuesta.

### Primero: que la mesa se sienta viva

Son tres cosas y las tres van juntas, porque las tres son la misma sensación.

1. **Cámara que se acerca y se aleja sola.** Es LA diferencia de tamaño. Hay que resolver lo
   que nos hizo descartarla en §82: que el zoom cambiando en cada jugada marea. La salida
   probable es que el cambio sea **suave y lento** en vez de instantáneo, y que solo se mueva
   cuando de verdad hace falta — que es justo lo que ya hace nuestra cámara con el
   desplazamiento.
2. **La ficha vuela de la mano a su sitio**, creciendo por el camino.
3. **La cadena se reacomoda con transición** cuando la cámara cambia. *Esto ya está hecho*: lo
   pusimos para el destranque.

### Segundo: que el juego hable

4. **Consejos que salen solos** en los momentos clave. Barato y se nota mucho.
5. **Fin de ronda con celebración**: "¡Dominó!", confeti, el marcador contando hacia arriba y
   los puntos volando desde las fichas del perdedor.
6. **Ver la mano del rival** como fichas boca abajo.

### Tercero: modos de verdad

7. **Elegir modo de reglas: Tranca (Block), Con pozo (Draw) y Cinco (All Fives).** Esto es
   trabajo del motor, no de la pantalla, y es lo que más alarga la vida del juego. El motor ya
   tiene `config` preparada para variar reglas.

### Cuarto: decisiones que NO son técnicas

Estas las tiene que decidir Jonathan, porque cambian qué clase de juego es:

8. **Ayudas tipo Spy y Hint.** Ver las fichas del rival cambia el dominó de raíz. En un juego
   con dinero sería inaceptable; en uno casual es un gancho enorme. **Mi opinión: el Hint sí
   (ayuda al que empieza), el Spy no** (rompe el juego y el que lo sufre se va).
9. **Monedas, tienda, ruleta y coste de entrada.** Es un modelo de negocio entero. Sin pasarela
   de pago en Venezuela, hoy solo serviría como moneda de juego. **Mi opinión: esperar**, y que
   el pase de batalla siga siendo el sistema de recompensas.
10. **Ligas con divisiones.** Se puede montar encima de la clasificación que ya existe.

---

## 6. Lo que no se puede saber del video

Para no dar por cierto lo que no vi:

- **Si tienen 2v2.** No aparece en el video; puede existir.
- **Si su tablero se traba.** No vi ningún caso, pero tampoco vi la cadena llenar el tablero
  hasta cerrarse.
- **Cuánto dura de verdad su reloj de turno.** El número baja de a uno por segundo y lo vi
  entre 78 y 90; parece 90 segundos por turno, pero no lo vi arrancar de cero.
- **Si el rival es un bot.** Los nombres (`cmit`, `Zamas10`) y lo rápido que juegan hacen
  pensar que sí, al menos en las primeras partidas.
