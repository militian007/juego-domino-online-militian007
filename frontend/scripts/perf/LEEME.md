# El telefono barato (piso 0 de la plantilla de la casa)

Miden cuanto trabajo de DIBUJAR hace cada pantalla con la mesa quieta, que es
lo que mata a un telefono de 2 GB. Corren contra el juego levantado en local
(`backend` en 4000, `frontend` en 5173) con el Chrome instalado, a 360x740.

Una vez: `npm i puppeteer-core` en esta carpeta.

| Script | Que mide | Como se lee |
|---|---|---|
| `cuentas.mjs` | recalculos de estilo, layouts, mutaciones del DOM y que anima sobre que propiedad, en 4 s por pantalla | mesa quieta: pocos recalculos y 0 layouts; toda animacion infinita sobre `opacity` o `transform` |
| `traza.mjs [4]` | traza de Chrome con la CPU frenada 4x: script, estilo, layout, pintura y raster | pintura + raster tienen que ser una fraccion (< 30 %); el numero `dibujo %` lo dice |

Las reglas y los umbrales completos estan en la ficha 0.1 de
`truco-venezolano/PLANTILLA-DE-LA-CASA.md`. Medido el 19-sep-2026 (seccion 190 del contexto).
