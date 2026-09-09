# Catálogo 2026: derivados verificados

Origen: `public/catalogos/catalogo-2026.pdf`, 81.903.612 bytes, 16 páginas.
SHA-256: `e4ac9f0c0cf181b154677aa2dfd9ef1c4e06abe039079640e4f07488fe667000`.
El PDF se ha conservado íntegro. Su título de metadatos dice «Catalogo 2025»,
pero la edición visible de las 16 páginas es 2026.

El manifiesto público está en `public/media/catalogo-2026/manifest.json`.
Incluye las 16 páginas de lectura a 1600 × 2795, miniaturas a 320 × 559,
portada a 800 × 1397, texto por página y seis fotografías de producto extraídas
de objetos nativos del PDF. Todos los derivados incluyen SHA-256. Las rutas
públicas no contienen ubicaciones privadas del equipo.

## Render y revisión visual

Las páginas se renderizaron con Poppler `pdftoppm`, usando el CropBox completo,
ancho de 1600 y altura proporcional. Los PNG de trabajo se codificaron con Sharp
como WebP de calidad 92; miniaturas, calidad 85. No se cambió el contenido ni se
recortaron las páginas. Comando de render:

```text
pdftoppm -f 1 -l 16 -cropbox -scale-to-x 1600 -scale-to-y -1 -png public/catalogos/catalogo-2026.pdf .local/catalogo-2026-render/page
```

Se revisaron visualmente las 16 imágenes finales a tamaño legible, verificando
encabezados, fotografías, etiquetas, importes y bordes. Se han preservado las
particularidades del original: importes vacíos, símbolos € sueltos, el texto
«Descripción», etiquetas repetidas y fotografías que ya llegan al borde del PDF.
En la página 7, por ejemplo, el segundo rótulo «TRIÁNGULO CRACKER» acompaña a una
fotografía de surtido; no se ha reinterpretado ni corregido.

`verification.json` registra decodificación, dimensiones, hashes y comparación
de píxeles con los PNG renderizados. Las páginas WebP son una compresión con
pérdida; las seis fotografías extraídas son WebP sin pérdida, con alfa idéntica y
sin diferencias en los píxeles visibles respecto del recorte nativo.

## Texto y navegación

`text-extraction.json` conserva los fragmentos y sus coordenadas. La extracción
elimina únicamente capas de texto idénticas y superpuestas; su lectura sigue las
columnas y secciones revisadas. No se normalizan ni completan precios, unidades,
acentos o descripciones. Los `.txt` públicos coinciden con el campo `text` del
manifiesto. El texto incrustado en fotografías no se transcribe: la imagen y el
PDF son la referencia visual completa. No es una base de datos de productos.

Los títulos del índice reproducen los encabezados visibles, incluidas grafías
como «GIRASUELO Y EFECTO TIERRA», «SUPER PETARDOS» y «BATERIAS AUTOMÁTICAS».
`sectionTitles` recoge los encabezados secundarios. Las páginas 2, 4, 12 y 13
son mixtas y llevan `familyId: null`. Las páginas 3, 6 y 7 tampoco se fuerzan a
una familia: los efectos de tierra y las fuentes no prueban por sí solos la
categoría comercial de fuego frío. Las portadas 1 y 16 quedan sin familia.
El lector puede ofrecer páginas relacionadas con más de una familia sin
transformar esos enlaces en atributos de productos.

La página 13 muestra expresamente «SURTIDOR FUEGO FRIO» y «SURTIDOR FUEGO FRIO 5M».
Los nombres extraídos identifican el material del catálogo; no acreditan usos,
recintos, homologaciones ni condiciones de seguridad. La afirmación general de
edad impresa en la contraportada se conserva dentro de la reproducción del PDF;
no se ha convertido en una regla general del sitio.

## Fotografías de producto

`extraction-manifest.json` registra página, xref, máscara original, hashes de
objetos, posición en puntos del PDF, matriz de colocación y recorte en píxeles.
Solo se recortó el margen exterior completamente transparente. No se generaron
fondos, efectos, textos ni partes nuevas de los productos.

| Archivo | Página | Rótulo visible | Tamaño |
| --- | --- | --- | --- |
| `traca-500.webp` | 8 | TRACA 500 PETARDOS | 855 × 346 |
| `tracas-nacionales.webp` | 8 | TRACAS NACIONALES | 1133 × 535 |
| `surtidor-fuego-frio.webp` | 13 | SURTIDOR FUEGO FRIO | 837 × 327 |
| `surtidor-fuego-frio-5m.webp` | 13 | SURTIDOR FUEGO FRIO 5M | 861 × 316 |
| `bateria-spring.webp` | 14 | SPRING | 485 × 403 |
| `bateria-color-cracker.webp` | 15 | COLOR & CRACKER | 721 × 689 |

Las seis imágenes fueron revisadas visualmente. Son fotografías de envases y
artículos, no demostraciones de su efecto. Conviene mostrarlas completas con
`object-fit: contain`; Spring tiene 485 píxeles de ancho nativo una vez eliminado
su margen transparente.
