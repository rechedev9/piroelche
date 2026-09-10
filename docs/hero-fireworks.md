# Animación de pirotecnia del hero

Creada el 10 de septiembre de 2026 con la skill `imagegen`, mediante la herramienta integrada `image_gen`. La herramienta no permite seleccionar ni verificar una versión concreta del modelo; no se atribuye a un modelo específico.

## Recursos

- `public/media/decorative/hero-fireworks-atlas-v1.webp`: cuatro explosiones fotográficas en una cuadrícula 2 × 2; dorado y magenta sobre negro. Generación nueva.
- `public/media/decorative/hero-fireworks-sky-v1.webp`: fondo nocturno con palmeras, derivado de la ilustración existente mediante edición generativa.
- `public/media/decorative/hero-fireworks-gold-magenta.webp`: ilustración original, conservada como alternativa estática.

Son ilustraciones decorativas generadas con IA. No documentan un espectáculo de Piroboom ni una ubicación real.

Los resultados se han optimizado con Sharp a WebP. El navegador prepara una textura luminosa de cada explosión y toma puntos brillantes del atlas para conservar sus colores y distribución. Esta preparación ocurre una sola vez; los archivos generados permanecen intactos.

## Comportamiento

`src/components/hero-fireworks.tsx` gestiona la carga, la pausa, la visibilidad y la preferencia de movimiento reducido. `src/lib/fireworks-scene.ts` dibuja la escena en un canvas transparente, integrado con el fondo del hero mediante un degradado en los bordes.

Un único reloj controla los seis lanzamientos, la apertura, las chispas, las estelas y la cámara. Los cohetes siguen una trayectoria balística y cada explosión comienza exactamente donde termina su cohete. Las chispas tienen velocidades y distancias propias; comparten resistencia al aire, gravedad y viento. Sus estelas se calculan a partir de posiciones anteriores de la misma trayectoria. El resplandor de las imágenes generadas acompaña esa expansión y se desvanece entre las chispas.

La profundidad se calcula mediante proyección en perspectiva, con cielo al fondo y palmeras delante. La cámara se desplaza suavemente con el cursor, manteniendo el horizonte nivelado. Su respuesta usa un muelle amortiguado que conserva posición y velocidad cuando el cursor cambia de dirección. Los cálculos analíticos de `src/lib/fireworks-motion.ts` dependen del tiempo, no del número de fotogramas.

La pausa congela todo el fotograma, incluida la cámara. Al reanudar se conserva el tiempo de la escena: no se recupera de golpe el intervalo detenido ni se reinicia la posición del cursor. El bucle se detiene fuera de pantalla y con la pestaña oculta. En pantallas táctiles no se siguen los gestos ni se interfiere con el desplazamiento.

Con movimiento reducido, sin JavaScript, sin contexto Canvas 2D o si falla la carga de los recursos, permanece la ilustración original. No se descargan las capas de animación cuando se solicita movimiento reducido desde el inicio. El texto alternativo sigue perteneciendo a la ilustración y el canvas decorativo se oculta de tecnologías de asistencia. No hay audio, dependencias nuevas ni peticiones externas en la web.

## Verificación

- `tests/fireworks-motion.test.ts`: continuidad entre cohete y explosión en todas las profundidades; respuesta equivalente de cámara a 30, 60 y 144 Hz; conservación de velocidad al invertir el cursor; repetición del ciclo una vez apagadas las chispas.
- Chromium y Firefox: comparación de los píxeles antes y después de pausar, ausencia de salto temporal al reanudar y pausa fuera de pantalla. Sin errores de ejecución ni infracciones detectadas por Axe.
- Revisión de siete momentos del ciclo completo, escritorio y anchos de 320, 390 y 768 píxeles; sin desbordamiento horizontal.
- Alternativas estáticas con movimiento reducido, sin JavaScript, con imagen fallida y sin Canvas 2D.
- Muestreo de tres segundos en escritorio: mediana de 16,7 ms entre callbacks de animación en Chromium y 17,06 ms en Firefox; percentil 95 de 16,7 y 17,08 ms respectivamente. Es una medida de este entorno, no una garantía de rendimiento en todos los dispositivos.
- WebKit no está verificado por falta de bibliotecas del sistema en este entorno.

Tamaño total de los dos recursos generados: 234 514 bytes (aproximadamente 229 KiB). Se reutilizan para la nueva animación.

## Prompt final: explosiones

```text
Use case: ads-marketing
Asset type: square photographic VFX sprite atlas for a fireworks website hero animation.
Primary request: Generate one square image containing exactly FOUR isolated, photorealistic aerial fireworks in a precise invisible 2 by 2 grid. Each quadrant contains one complete burst centered exactly in that quadrant, with generous pure black padding (at least 12% of each cell) so its sparks never touch the cell boundaries or neighboring bursts.
Scene/backdrop: solid pure black RGB 0,0,0 everywhere between and behind the bursts, no horizon, no landscape.
Subjects: TOP LEFT a magnificent champagne-gold willow firework with fine long curving falling glitter trails. TOP RIGHT a vivid magenta peony firework with pink-white core, fine radial pink trails and individual sparkling points. BOTTOM LEFT a warm gold chrysanthemum firework with a dense round canopy of fine trails. BOTTOM RIGHT a smaller pink and gold starburst with delicate branching sparks.
Style/medium: premium realistic night photography, fine luminous particles and natural asymmetry, elegant warm gold and hot magenta palette matching Piroboom. Beautiful detailed light trails, no graphic line art.
Composition: all four explosions fully contained, their ignition centers at the exact centers of their square quadrants. Equal square cells, black padding, no visible grid.
Constraints: only the four fireworks against pure black. Very little smoke, never a rectangular halo. No text, labels, borders, people, logos, watermark, collage edges, landscape, or UI. High resolution square image.
```

## Prompt final: fondo

Imagen de entrada (objetivo de edición): `public/media/decorative/hero-fireworks-gold-magenta.webp`.

```text
Use case: precise-object-edit
Asset type: photographic background plate for a layered fireworks website hero animation.
Input image: edit target, existing portrait hero artwork.
Primary request: Remove all fireworks, every bright spark, light trail, ignition core and colorful explosion from the sky. Reconstruct a deep almost-black night sky with just a very faint natural wisp of warm atmospheric smoke and a subtle warm glow low on the horizon. This sky will receive animated fireworks as separate layers.
Keep unchanged: the original portrait composition, the complete dark palm tree silhouettes along the bottom, tiny warm distant town lights, the exact horizon height, and the original photographic night style. The upper 80 percent must be quiet nearly black negative space.
Constraints: no fireworks, no bright stars, no moon, no extra trees or buildings, no text, no logos, no watermark. Preserve the palm skyline from the source image.
```
