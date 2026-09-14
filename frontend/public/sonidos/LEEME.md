# De dónde salen estos sonidos

Los dos salen del mismo pack y tienen la misma licencia:

- **Origen:** pack *"100 CC0 metal and wood SFX"* de **rubberduck**, en OpenGameArt.
  https://opengameart.org/content/100-cc0-metal-and-wood-sfx
- **Licencia:** **CC0 / dominio público.** Uso libre, también comercial, sin
  atribución obligatoria. Se deja igual escrito acá porque corresponde.

| archivo | para qué | original | largo | peso |
| --- | --- | --- | --- | --- |
| `clac.wav` | la ficha al ponerse en la mesa | `metal_hit_01.ogg` | 260 ms | 16 KB |
| `clac-pozo.wav` | cada golpe del pozo revuelto | `wood_misc_05.ogg` | 80 ms | 5 KB |

A los dos: recortados desde el golpe, con un desvanecido al final para que no
chasqueen al cortarse, y pasados a WAV mono de 32 kHz.

**El del pozo es OTRO, y corto a propósito.** Al principio el montón usaba la
misma grabación del clac, veintitantas veces con el tono muy movido. Jonathan lo
escuchó: *"suena raro el final ese corrido"*. Veinte colas de 260 ms encimadas
no suenan a montón de fichas, suenan a un barrido. Esta dura 80 ms, van más
espaciadas (una cada 47 ms en vez de 35) y el abanico de tonos es la mitad de
ancho.

**Cuál se usa lo eligió Jonathan de oído**, entre cuatro candidatos que se le
pasaron sonando. La medición sirvió para hacer la lista corta, no para decidir.

## Por qué es una grabación y no un sonido sintetizado

Hubo un intento de fabricarlo con osciladores, ajustado contra el espectro
medido del video de Domino Legends (ver `contexto/README.md` §124). Daba las
mismas bandas de energía y **sonaba peor**. Dar los mismos números no es sonar
igual.

De los 25 golpes CC0 del pack, este es el que más se parece al del video
medido con la misma vara:

| | apagado | centro | < 500 / 500-2k / 2-8k / > 8k |
| --- | --- | --- | --- |
| el del video | 50 ms | 4359 Hz | 13 / 18 / 57 / 12 % |
| **este** | 70 ms | 3751 Hz | 9 / 26 / 58 / 7 % |

**El audio del video de ellos no se usa nunca.** Es su grabación.

## Los avisos de la mesa (2026-09-14)

Seis grabaciones mas, todas CC0 (dominio publico), recortadas desde el golpe, niveladas con
`loudnorm` y pasadas a WAV mono de 32 kHz. Las eligio Claude por analisis (duracion, tono,
brillo y sentido de la melodia) a pedido de Raul, que descarto los sonidos sintetizados.

| archivo | para que | original | pack | largo |
| --- | --- | --- | --- | --- |
| `te-toca.wav` | te toca jugar | `wood_hit_05.ogg` | rubberduck, "100 CC0 metal and wood SFX" (OpenGameArt) | 250 ms |
| `no-va.wav` | esa ficha no va | `wood_hit_09.ogg` | rubberduck | 230 ms |
| `robar.wav` | robar del pozo | `card-slide-2.ogg` | Kenney, "Casino Audio" (kenney.nl) | 580 ms |
| `tranque.wav` | tranque | `wood_slam_02.ogg` | rubberduck | 480 ms |
| `ronda-ganada.wav` | ronda ganada | `jingles_STEEL02.ogg` (steel drum, sube) | Kenney, "Music Jingles" (kenney.nl) | 1,4 s |
| `ronda-perdida.wav` | ronda perdida | `jingles_STEEL05.ogg` (steel drum, baja) | Kenney, "Music Jingles" | 940 ms |

Packs: https://opengameart.org/content/100-cc0-metal-and-wood-sfx ·
https://kenney.nl/assets/casino-audio · https://kenney.nl/assets/music-jingles
