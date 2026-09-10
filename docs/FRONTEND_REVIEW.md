# Revisión independiente de los ajustes de frontend — P0 únicamente

Fecha: 10 de septiembre de 2026. Revisor aislado (agente Opus con contexto separado), solo lectura: no modificó archivos, no arrancó servidores, no ejecutó `build` ni E2E, no hizo commit. Delta revisado: árbol de trabajo sobre `ba9309bec57054870a9d3630351f334cace150c0` (`main`), leído con `git diff`, `git hash-object` y lectura directa de los archivos sin seguimiento.

**Resultado: no se identificaron P0.** Umbral aplicado: el pactado en [REVIEW.md](REVIEW.md) y [BRAND_REVIEW.md](BRAND_REVIEW.md), acotado a los siete supuestos (a)–(g) del encargo. La conclusión no equivale a ausencia de defectos de otras prioridades, ni a auditoría visual, conformidad jurídica o autorización para publicar.

## Integridad del objeto revisado

El árbol se editó una vez durante la revisión: `src/app/page.tsx` pasó del blob `80428aa` al blob `5b4bafd745586335be1a11dfca2faf89ad63d3d6` (carga anticipada del fondo del héroe con `loading="eager"` y `fetchPriority="high"`), y apareció el directorio `evidence/frontend-refresh/`. El revisor releyó el archivo en su versión final y repitió `lint` y `typecheck`. Al cierre no había más deriva. Después de la revisión solo se completaron documentos y evidencias; el código corresponde al árbol `b9e67b56428e9d43ed4d75203941d563c51fdf4e`, cuyo `src/app/page.tsx` es el blob `5b4bafd…` revisado.

Blobs verificados estables: `next.config.ts` `ad968e5`, `src/app/brand.css` `8d750c8`, `src/app/catalogue.css` `c1bc9c4`, `src/app/globals.css` `76d16cd`, `src/app/layout.tsx` `3c80d6c`, `src/app/contacto/page.tsx` `db5ab79`, `src/app/eventos/page.tsx` `3901274`, `src/app/catalogo-pdf/page.tsx` `0ec193e`, `src/app/catalogo-pdf/[family]/page.tsx` `e02d92c`, `src/app/catalogo-pdf/[family]/[product]/page.tsx` `895159a`, `src/components/breadcrumbs.tsx` `07cae04`, `src/components/header.tsx` `627398c`, `src/components/lead-form.tsx` `24c2325`, `src/components/media.tsx` `f90e61f`, `src/components/site-content.tsx` `d820d30`, `src/components/tracked-link.tsx` `ebbeb19`, `src/components/ui/button.tsx` `45c5886`, `src/components/ui/input.tsx` `9a8af0d`, `src/components/ui/textarea.tsx` `18f5dfe`, `src/lib/navigation.ts` `52cc657`, `src/lib/seo.ts` `19bce6d`, `tests/leads-form.test.ts` `773a900`. Nuevos: `src/lib/lead-draft.ts` `7707236`, `src/hooks/use-lead-draft.ts` `f740774`, `src/components/lead-form-fields.tsx` `7af6bef`, `src/components/lead-form-success.tsx` `72205a0`, `src/components/footer.tsx` `d808b5f`, `scripts/prepare-decorative.mjs` `b3681dd`, `public/media/decorative/home-fireworks-v1.webp` `79b87e6`.

Archivos examinados: 57 (24 modificados, 7 nuevos, 10 de evidencias y 16 de referencia sin cambios, incluidos `content/site.json`, `src/lib/content-schema.ts`, `src/lib/hours.ts`, `src/lib/content.ts` y la documentación de `next/image` de la versión instalada).

## Comprobaciones por criterio

- **(a) Fixtures, PDF y catálogo como inventario.** `content/site.json`, `fixtures/`, `public/catalogos/`, `src/lib/content.ts` y `src/lib/content-schema.ts` intactos. Sin precios, stock ni disponibilidad nuevos. El banner de demo y su condición de fixtures siguen en `layout.tsx`. El JSON-LD de migas sigue condicionado a `!isDemo`.
- **(b) Rutas, contrato de `/api/leads/`, receptor y separación demo.** `lead-contract.ts`, `lead-server.ts` y `api/leads/route.ts` sin cambios. La división del formulario conserva payload por intención, `POST` con `Idempotency-Key`, huella SHA-256, reutilización de clave, comprobación anti-carrera de `sessionStorage`, aceptación 201/200 y `clearDraft` condicionado. `parseSavedLeadDraft` y `parseLeadResponse` se movieron intactos; el test solo cambia la ruta de importación. Honeypot conservado. `eventRequestHref()` produce exactamente las cadenas que sustituye.
- **(c) Secretos, PII y código de servidor en el cliente.** `navigation.ts` y `seo.ts` importan tipos con `import type`; `content.ts` conserva `server-only` y solo lo consumen componentes de servidor, incluido el nuevo `footer.tsx`. `lead-draft.ts` es puro. `evidence/frontend-refresh/` sin correos, variables ni credenciales.
- **(d) Accesibilidad.** Foco al recibo trasladado al montaje de `lead-form-success.tsx` sobre la misma sección `aria-live`. `role="alert"` y foco del resumen conservados. `leadControlProps` reproduce `id`, `aria-invalid` y `aria-describedby`; ningún `htmlFor` huérfano. `LeadFieldRow` saca el error del nombre accesible sin perder la asociación. Anclajes del resumen resuelven. Migas: DOM idéntico a HEAD. Objetivos táctiles crecen.
- **(e) Indexación y cabeceras.** `next.config.ts` solo añade `images`; cabeceras y `X-Robots-Tag` condicional intactos, igual que `robots` en `layout.tsx` y `robots.ts`.
- **(f) Seguridad.** Las serializaciones JSON-LD pasan por `serializeJsonLd`, que escapa `<`. Datos de migas proceden del contenido versionado. `tracked-link.tsx` solo compone `onClick` y respeta `defaultPrevented`; no altera `href`, `target` ni `rel`. Sin redirecciones nuevas.
- **(g) Contenido y textos legales.** Sin cambios. `localBusinessJsonLd` no inventa campos: teléfono, dirección y horario salen de `store`; los días sin intervalos no emiten nada; la indexación de días coincide con `ScheduleSchema`.

Otras verificaciones: los dos `.woff2` de `next/font/local` existen y sus paquetes están declarados; `images.qualities: [60, 75]` cubre los valores usados; `preload` es el prop documentado en Next 16 y también desactiva la carga diferida; la combinación final del héroe (`loading="eager"` + `fetchPriority="high"` en el fondo, `preload` en la foto) es coherente con la advertencia de la documentación sobre múltiples candidatos a LCP. El `.webp` nuevo decodifica a 1672×941, igual que el PNG. Los tokens CSS resuelven a los mismos hexadecimales, con la excepción que detecta la segunda revisión (`#dddbe1` → `#dedbe0`). La retirada de `!important` en `aspect-ratio` es segura por especificidad y orden. Las reglas CSS eliminadas no tienen uso restante.

## Observaciones fuera de alcance (no P0)

1. `src/lib/seo.ts`: `addressLocality: "Elche"` está en código, no derivado de `content/site.json`; `streetAddress` lleva la dirección completa y no se emite `postalCode`. Coherente hoy; una edición futura de la dirección podría desincronizarlo.
2. `src/lib/seo.ts`: `openingHoursSpecification` publica el horario habitual sin la salvedad «Confirma festivos» visible en la página, mientras la procedencia mantiene pendiente reconfirmar su vigencia. Cubierto por `noindex`; decisión del responsable.
3. `textarea.tsx`: no cambia de fondo al deshabilitarse, mientras `Input` sí (`disabled:bg-soft`). Comprobado después: la regla de HEAD era `.field input:disabled`, así que no es una regresión de este cambio sino una inconsistencia previa.
4. `lead-form.tsx`: `autoComplete` de `replyTo` pasa de `off` a `on`; única diferencia de comportamiento hallada en la división del formulario, intencionada para permitir autorrelleno de teléfono o correo.
5. Empaquetado: siete archivos nuevos sin seguimiento; `home-fireworks-v1.png` (1,4 MB) sigue con seguimiento y ya no se usa; `evidence/frontend-refresh/` añade unos 4,6 MB de evidencias tras el recorte posterior.

## Comprobaciones ejecutadas por el revisor

`pnpm lint` exit 0 (dos veces); `pnpm typecheck` exit 0 (dos veces); `pnpm test` 50/50 en PowerShell. Una primera ejecución desde Git Bash falló en `tests/leads.test.ts` porque el `whoami` de MSYS rechaza los argumentos de Windows que usa `scripts/local-receiver.ts`; artefacto del shell, no del candidato.

## Lo que no se ha revisado

Prioridades distintas de P0 salvo las observaciones anteriores. No se ejecutaron `build` ni E2E ni se abrió navegador; los datos de `evidence/` no se atribuyen al revisor. Sin auditoría visual, responsive, lector de pantalla, dispositivo físico ni medición propia de rendimiento. Sin auditoría de dependencias ni de procedencia de fotografías. Quedan sin acreditar recepción remota, condiciones comerciales, validación jurídica y despliegue.

---

# Segunda revisión sobre el árbol congelado — P0 únicamente

Fecha: 10 de septiembre de 2026. Segundo revisor aislado, distinto del anterior y sin asumir sus conclusiones; solo lectura, sin build, E2E, commit ni push. Objeto: árbol de trabajo sobre `ba9309b` tras la matriz E2E definitiva (96/96) y la medición Lighthouse final.

**Resultado: no se identificaron P0.**

Integridad: `git hash-object` de los 44 archivos del delta al inicio y al cierre. Los 30 blobs de código, configuración, CSS, pruebas y activos fueron byte a byte idénticos (entre ellos `src/app/page.tsx` `5b4bafd`, `src/app/globals.css` `76d16cd`, `src/components/lead-form.tsx` `24c2325`, `src/lib/seo.ts` `19bce6d`). Derivaron únicamente `VALIDATION.md` y los ficheros de evidencia, que el agente principal reescribió con los resultados definitivos durante la revisión; las comprobaciones de PII se repitieron sobre ambas versiones. Archivos examinados: 58.

Verificaciones adicionales respecto a la primera pasada: importaciones de todos los ficheros `"use client"` y sus dependencias transitivas (los dos puentes nuevos hacia módulos con `process.env` son `import type` y se borran en compilación); los nueve controles del formulario uno a uno (`htmlFor`, `aria-describedby`, anclajes del resumen); equivalencia elemento a elemento de los `BreadcrumbList` emitidos; indexación de días de `openingHoursSpecification` contra `ScheduleSchema` y `hours.ts` (0 = domingo); las cuatro excepciones de `get-img-props.js` para la combinación `loading="eager"` + `fetchPriority="high"`; especificidad de los diez selectores que anulan `aspect-ratio`; `git grep` sobre HEAD para demostrar que las reglas CSS retiradas estaban muertas.

## Observaciones fuera de alcance (no P0)

1. `src/app/catalogue.css:151`: `#dddbe1` pasó al token `#dedbe0`, la única sustitución que no resuelve al mismo hexadecimal (una unidad en R y B). VALIDATION.md lo documenta ahora.
2. `src/app/layout.tsx`: `next/font/local` apunta con ruta relativa a `node_modules/@fontsource*/files`, paquetes en `devDependencies`. HEAD tenía la misma dependencia de compilación vía `@import`; un instalador con otra disposición rompería `next build` en vez de degradarse.
3. `src/lib/seo.ts`: `addressLocality: "Elche"` en código, sin `postalCode`, y horario legible por máquina sin la salvedad «Confirma festivos» visible en la página. Cubierto por `noindex`; decisión editorial.
4. `lead-form-fields.tsx` y `lead-form.tsx`: el área pulsable de la etiqueta se reduce a su texto a cambio de un nombre accesible limpio; `autoComplete="on"` devuelve el campo a la heurística del navegador, no declara `email` ni `tel`.
5. Evidencias: `evidence/playwright-results.json` documenta ahora la matriz de esta etapa; `home-fireworks-v1.png` sigue con seguimiento sin referencias en `src`.

## Comprobaciones ejecutadas por el revisor

`pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm test` 50/50 desde PowerShell. Lo no revisado coincide con la primera pasada: build, E2E, navegador, rendimiento, dependencias, procedencia de imágenes, contenido del catálogo y PDF, recepción remota, condiciones comerciales, validación jurídica y autorización de despliegue.
