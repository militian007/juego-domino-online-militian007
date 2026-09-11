# De dónde salen estos sonidos

`clac.wav` — el golpe de la ficha al ponerse en la mesa.

- **Origen:** pack *"100 CC0 metal and wood SFX"* de **rubberduck**, en OpenGameArt.
  https://opengameart.org/content/100-cc0-metal-and-wood-sfx
- **Licencia:** **CC0 / dominio público.** Uso libre, también comercial, sin
  atribución obligatoria. Se deja igual escrito acá porque corresponde.
- **Archivo original:** `wood_hit_01.ogg`.
- **Qué se le hizo:** se recortó desde el golpe, se dejó en 260 ms, se le puso
  un desvanecido de 25 ms al final para que no chasquee al cortarse, y se pasó
  a WAV mono de 32 kHz (16 KB).

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
