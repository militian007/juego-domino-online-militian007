# Aquí van las dos imágenes de origen de las fichas blanco hueso

Jonathan las genera con Gemini y las guarda **en esta misma carpeta**, con estos
nombres exactos:

| archivo | qué es |
| --- | --- |
| `hueso-ficha.png` | la ficha vacía: blanco hueso, sin puntos, sin línea, fondo transparente |
| `hueso-punto.png` | un solo punto negro, fondo transparente |

Con esas dos, un script arma las **28 fichas** (`tile_0_0.png` … `tile_6_6.png`)
colocando los puntos en su sitio y la línea del medio.

## Por qué dos imágenes y no veintiocho

Un modelo de imagen **no cuenta bien los puntos**. Si se le piden las 28 fichas,
la mitad sale con el número equivocado y hay que rehacerlas una por una.

Pidiéndole el material (la ficha vacía y el punto) y colocando los puntos por
código, el número **siempre** es el correcto y las 28 quedan idénticas entre sí.
El arte lo pone Gemini; la geometría la pone el código. Regla de oro 1.1.

## Los prompts

Están en `contexto/README.md`, sección 104.
