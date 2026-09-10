# Favicon de Piroboom

El favicon parte de la «O» fucsia y el destello amarillo del logo oficial
(`public/brand/logo.webp`). Sustituye la «P» recortada por un símbolo reconocible
en pestañas pequeñas. El fondo negro es opaco.

- Fuente seleccionada: `assets/brand/favicon-source-v2.png`.
- Generación: herramienta integrada `image_gen`, modo edición con imagen de
  referencia; dos pasadas para el diseño y la corrección del fondo.
- Salidas: `public/brand/favicon-v2-{16,32,48}.png`,
  `public/brand/favicon-v2.ico`, `public/brand/apple-icon-v2.png` (180 px)
  y `public/favicon.ico`.
- Regeneración de tamaños: `pnpm brand:icons`. El script solo redimensiona y
  empaqueta el original seleccionado; no necesita acceso a un modelo.
- `src/app/layout.tsx` referencia las URLs `v2` para renovar el icono en
  navegadores que conservaban la «P» en caché.

## Prompts exactos

Primera pasada, referencia `public/brand/logo.webp`:

```text
Create a single production favicon asset derived faithfully from the attached Piroboom logo. Use-case: logo-brand. Reference image 1 is the existing official logo and is the source of the brand identity, colors, and shapes. Create a square 1024x1024 PNG with a genuinely transparent outer background. Center a near-black (#0d0d10) rounded-square tile occupying 94% of the canvas with subtly rounded corners. The icon inside is ONE of the distinctive fuchsia O rings from the BOOM lettering of the reference logo, with the yellow firework/starburst from inside that O enlarged and simplified so it remains readable at a tiny browser favicon size of 16 pixels. Retain the reference's cheerful bold comic silhouette, intense fuchsia #ff009d and bright yellow #ffeb00. The ring should be broad and slightly organically tilted like the original O. The center is near-black, containing a very bold yellow asymmetric six-to-eight-point firework burst, with a few thick tapered yellow rays reaching toward the upper right within the ring. Above the ring include only two short substantial firework strokes, one fuchsia and one yellow, echoing the original logo's upward fireworks, fully contained in the tile. Fill most of the available square; visual mass should be centered, with 8% safe interior margins. FLAT clean vector-like solid shapes with sharp smooth contours, no fine lines, no texture, no 3D, no gradients, no glossy highlight, no shadows. No letters other than the abstract O-shaped ring, no wordmark, no labels, no border frame, no mockup, no browser UI, no multiple options. This is a recognizable icon derived from the O/firework in the existing Piroboom mark, not a new unrelated logo. Deliver only the finished square icon as the image.
```

El primer resultado dibujó una cuadrícula en el fondo. La segunda pasada usó
ese resultado como referencia y produjo el original opaco que se conserva:

```text
Edit the attached favicon. Preserve exactly the fuchsia ring, yellow starburst inside it, and the two fuchsia and yellow strokes above it, in the same positions and same proportions. Fix only the background: remove every checkerboard square and replace ALL background, including all four corners and the margins around the rounded tile, with a single perfectly solid near-black color #0d0d10. The background should extend flat and uniformly to all four edges of this square image. No rounded-square edge should remain visible; the black background fills the entire square. Deliver an OPAQUE square PNG: no transparency, no checkerboard, no texture, no shadows, no gradients, no added objects or text. The colored icon itself remains unchanged.
```
