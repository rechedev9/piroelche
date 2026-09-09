# Validación de Piroboom 0.1.0

Fecha: 9 de septiembre de 2026. Entorno local Windows 11 25H2, Node 24.18.0, pnpm 11.22.0, Next 16.3.4, TypeScript 5.9.3, Tailwind 4.3.3 y shadcn CLI 4.21.0. Build productivo local actual con medios: `AGbaegIMr0qjZTdSkj86W`; el baseline anterior era `Qx1Wt5yKrHV1UuYwIXjXZ`. No se ha hecho push, despliegue, cambio de producción ni envío a personas.

## Candidato anterior a la incorporación de medios

El código final corresponde al árbol Git `7bda141c4e67bfcbd7b6dc037c129c3b88f331e3`. Un agente con contexto separado, GPT-6 Astra y razonamiento alto, completó la revisión estática **P0 únicamente**: **no se identificaron P0**. [Informe íntegro](docs/REVIEW.md). No equivale a ausencia de problemas de otras prioridades. No se ejecutó autoreview, por petición expresa del usuario. Tras la revisión solo se completaron documentos y evidencias; se comprobó que código, contenido, dependencias y configuración seguían idénticos al árbol revisado.

## Ampliación de integración continua

Tras el commit local `9362387061a88c16f9b2a7173cbf0ec1149115c2`, se añadió [CI](docs/CI.md). El candidato de esta ampliación es el árbol `f3da9f1f3fdc988d4537e489208a206c35b8a0a7`: únicamente workflow y documentación; código, contenido, dependencias y configuración de la aplicación permanecen idénticos. La revisión aislada del delta completo no identificó P0; [informe](docs/CI_REVIEW.md). El resultado sigue limitado a esa prioridad.

`actionlint v1.7.12` y Prettier terminaron con código 0. `pnpm audit --prod --json` registró cero vulnerabilidades conocidas entre 179 dependencias; no constituye una auditoría de seguridad integral. No se repitieron las suites de aplicación para este cambio de CI ni se ejecutó GitHub Actions: no hay remoto configurado. Tras la revisión solo se completaron documentos, conservando idéntico el workflow revisado.

La comprobación actual de publicación sigue produciendo el fallo esperado de textos legales pendientes. El build público local responde 503 `not_configured` en `POST /api/leads`; Contacto responde 200, conserva el teléfono real y la cabecera `noindex, nofollow`. No se dispone todavía de proveedor/destino autorizado, textos legales aprobados ni acceso/autorización para publicar. Este cierre de CI no levanta esas condiciones.

## Incorporación de fondo, fotografías y PDF

El usuario pidió un fondo discreto de fuegos artificiales, fotografías recientes de Google y suministró `Catalogo-2026.pdf`. Se conserva la composición aprobada con el nuevo fondo decorativo, dos fotografías reales asignadas a bloques pertinentes y una tercera guardada. El PDF local mantiene exactamente los 81.903.612 bytes y el SHA-256 del original; `.gitattributes` evita tratarlo como texto. Procedencia y límites en [CONTENT_STATUS.md](CONTENT_STATUS.md) y [sources.json](evidence/media/sources.json).

Resultado del candidato actual: `pnpm lint`, `pnpm typecheck` y `pnpm build` con código 0; **47/47** pruebas unitarias/integración y **84/84 E2E** en Chromium, Firefox y WebKit, sin reintentos automáticos. [Ejecución final](evidence/media/e2e-results.json). Las regresiones comprueban procedencia, identidad del PDF, decodificación de las imágenes y ausencia de descarga automática del documento.

La primera ejecución reutilizó un servidor público anterior y se descartó tras reiniciarlo. En la siguiente, 83/84 pruebas pasaron: la espera de red detectó que `next/link` precargaba el PDF local con `?_rsc` al entrar en pantalla. Se confirmó en el trace, se añadió `prefetch={false}` al enlace del PDF y se repitió la suite completa, con 84/84. No se relajaron aserciones ni tiempos. El documento se obtiene al pulsar el enlace.

Se capturaron Inicio, Catálogo y Eventos a **390, 1366 y 1920 px**, sin desbordamiento horizontal ni imágenes rotas. Se inspeccionaron las portadas en los tres tamaños y los recortes de imágenes en Eventos móvil; menú, texto y botones siguen legibles. [Capturas y dimensiones](evidence/media/visual.json). La suite verifica además contenido largo sin espacios y accesibilidad. Las capturas corresponden al build `nmudp99ewB8b4tZVXHUTy`, con el mismo aspecto que el final; el único cambio posterior de runtime desactiva la precarga del PDF. En Brave se abrió la portada actual y el PDF local de 16 páginas: portada 2026 y metadato original de título «Catálogo 2025». No se modificó el archivo para ocultar esa diferencia.

Lighthouse de Inicio con los medios: móvil **97**, LCP **2,51 s**, CLS **0,0001**; escritorio **100**, LCP **0,57 s**, CLS **0,0303**. Accesibilidad y buenas prácticas: **100** en ambos perfiles. [Medición](evidence/media/performance/summary.json). Una ejecución de laboratorio por perfil, previa al cambio exclusivo del enlace PDF; no son datos de campo. Las cifras de rendimiento y las comparaciones visuales de las secciones siguientes corresponden al baseline anterior sin estas imágenes.

Revisión aislada estática **P0 únicamente** del árbol final `aa691533343c6663e4b916483fb742e12e88078a`, contra `54d6036f04c34b1a1d6b06f53c502b8122507159`: **no se identificaron P0**. [Informe](docs/MEDIA_REVIEW.md). Después solo se completaron informes y evidencias. Permanecen los límites de contenido específico, proveedor del formulario, textos legales y publicación.

## Comandos del baseline anterior a los medios

| Comando | Resultado final con tiendas oficiales, Tailwind y shadcn |
| --- | --- |
| `pnpm install --frozen-lockfile` | Dependencias y lockfile disponibles; Node 24 mínimo declarado. |
| `pnpm lint` | Código 0. Oxlint con análisis de tipos y 274 reglas, sin avisos. |
| `pnpm typecheck` | Código 0. Generación de rutas y TypeScript estricto. |
| `pnpm test` | **44/44** lógica/integración; cero omitidas. |
| `pnpm build` | Código 0. Contenido validado; seis secciones, catálogo, legales, metadata y endpoint compilados. |
| `pnpm test:e2e` | **81/81**, 27 por motor, **2,0 min**, un trabajador y cero reintentos. |
| `PIROBOOM_PUBLIC_SITE=1 pnpm validate:content` | Fallo esperado, código 1: «La publicación necesita textos legales confirmados por el titular». Protege la publicación; no es un fallo omitido del build normal. |

Informe detallado: [playwright-results.json](evidence/playwright-results.json). Motores instalados y usados: Chromium 153.0.8010.12, Firefox 155.0 y WebKit 26.6. La configuración de los tests está en [playwright.config.ts](playwright.config.ts). La demo corre en 3000 con receptor local real en 4010; el contenido público se verifica con `next start` en 3001. Los tests no llaman al formulario del negocio.

[docs/LINT.md](docs/LINT.md) registra las reglas y el canario negativo: 16 errores deliberados detectados, control positivo sin errores y comprobación completa del código. No se sustituyó ESLint por una ejecución vacía o permisiva de Oxlint.

## Matriz T01–T24

El cruce completo con J01–J06, Q01–Q18 y M01–M68 está en [docs/BACKLOG.md](docs/BACKLOG.md).

| ID | Resultado y evidencia |
| --- | --- |
| T01 | Las seis secciones y tres legales responden con contenido propio, un H1 y recarga correcta. También se leen sin JavaScript. Rutas desconocidas y fichas no publicadas responden 404. `journeys.spec.ts` y `publication.spec.ts`. |
| T02 | Navegación completa, sección activa, menú móvil, Escape y retorno de foco. Chromium/Firefox verifican Tab; la limitación nativa de WebKit Windows se detalla debajo. |
| T03 | Inicio/cabecera/pie distinguen producto y evento; las acciones de evento no llevan al PDF. |
| T04 | Cuatro familias distintas, listado/ficha, breadcrumbs, acceso directo e historial de regreso comprobados. |
| T05 | La referencia pública se conserva al llegar a Contacto y recargar. Quitar la elimina de UI y URL; también ejercitado manualmente. |
| T06 | Cambiar entre producto/evento/visita elimina campos residuales y referencia. El servidor rechaza un payload discriminado incorrecto. |
| T07 | Solicitud real de evento con ocasión, fecha por definir, lugar sin cerrar y un canal de respuesta. No exige nombre ni mensaje en ese recorrido. |
| T08 | Errores cliente/servidor, campos asociados, resumen y foco. Rechaza fecha imposible/pasada, referencia manipulada, origen ajeno, campos extra, JSON/tamaño inválidos y honeypot. |
| T09 | POST real por Next hasta el receptor local autenticado. COMMIT duradero precede a 201 y al ID de servidor. La UI dice «Prueba registrada localmente». Sin buzón real probado. |
| T10 | Ausencia de proveedor da 503 y botón desactivado con teléfono. Fallos de proveedor/respuestas inválidas/timeout no producen éxito. Los campos se conservan. |
| T11 | Doble clic y respuesta perdida después de aceptación: recarga/reintento devuelve el mismo ID. Prueba adicional de 12 solicitudes concurrentes entre dos procesos independientes produce un registro; reinicio conserva idempotencia y límites. |
| T12 | Tienda permanente compartida por Inicio, Tiendas, Contacto y pie. Cuatro casetas con direcciones y horario diario 10–18 de la página oficial, sin fechas inventadas; pruebas de datos, navegador y Computer Use. [Fuente comprobada](evidence/sources/stores-source.json). |
| T13 | Antes/durante/después, medianoche de Madrid, cambio de año, horario de verano, excepciones por punto y caducidad comprobados con reloj de prueba. `hours.test.ts`. |
| T14 | Campaña activa fuera de horario no se trata como abierta. Las cuatro casetas oficiales se muestran con periodo sin confirmar; no se deduce apertura actual del horario publicado. |
| T15 | Teléfono, ruta oficial, PDF y legales tienen destinos reales. PDF recuperado: 16 páginas, 81.903.612 bytes, SHA-256 y texto verificados; portada/página 2 inspeccionadas. Abierto además por URL oficial en el visor PDF de Brave de escritorio: 16 páginas y portada 2026 visibles; el título interno heredado sigue siendo «Catálogo 2025». No se afirma prueba en visor móvil físico. |
| T16 | Catálogo/familia sin referencias, producto desconocido/retirado, medios ausentes y fallo real de carga de vídeo con alternativa. El esquema/modelo contempla PDF ausente. |
| T17 | Parámetros `demo`/`preview` no activan fixtures. Las tres condiciones de QA de campañas están cubiertas. Vercel bloquea demo. Fichas/medios de ejemplo no se publican ni aparecen en sitemap. |
| T18 | URLs solo admiten contexto de referencia/ocasión; datos libres no se trasladan. Contratos estrictos, token servidor, errores públicos saneados, analytics sin PII ni IDs de solicitud. Sin almacén público de mensajes. |
| T19 | Primera visita pública sin cookies, localStorage, sessionStorage, iframes ni peticiones externas. El borrador nace al editar y caduca a 30 minutos. No hay tratamiento opcional activado ni flujo de consentimiento ficticio. |
| T20 | Axe en seis secciones, familia, ficha y errores: cero violaciones de etiquetas WCAG 2/2.1/2.2 A/AA. Teclado/foco, reduced-motion y reflow/texto largo de 320 a 1920 px probados; lector de pantalla y conformidad integral no se acreditan. |
| T21 | Comparación contra el prototipo ejecutado, no contra una baseline de la propia app. Capturas y revisión por pantalla se describen debajo. |
| T22 | Build productivo, HTML/metadata/canonical, robots, sitemap y 404 verificados. Tres páginas × dos perfiles Lighthouse; laboratorio separado de INP/p75 de campo. |
| T23 | Una edición del dato de horario cambia presentación/cálculo compartidos; procedencia, estados y caducidad se prueban. La incorporación real de las cinco ubicaciones comprueba el flujo JSON→validación→build→UI. |
| T24 | Arranque/recuperación en copia aislada y guía de reversión local se registran en el apartado correspondiente. Restauración del WordPress actual y rollback productivo requieren accesos/autorización. |

## Comparación visual e interacción manual

Referencia: HTML final ejecutado con su `support.js` en servidor local, sin alterar los originales. App: componentes Next reales con Lilita One/Manrope locales. Se desactiva movimiento y se espera a fuentes cargadas. Para comparar se usa el reloj de revisión `2026-09-09T12:00:00Z`; el build público conserva su reloj real.

Las capturas están en [evidence/visual](evidence/visual/), con manifiesto [captures.json](evidence/visual/captures.json): 1440×1000 y 390×844; seis secciones en referencia/demo/publicación, familia/ficha/contexto/validación y estados de envío/aceptación/ausencia de receptor. Los estados de envío de la app corresponden a HTTP real; solo se retarda brevemente la respuesta aceptada para capturar «Enviando…».

| Pantalla | Observación y diferencia justificada |
| --- | --- |
| Inicio | Se conserva hero de dos columnas, composición oscura, acentos amarillos, orden de seis bloques, cuatro familias y cierre amarillo. Cambian las afirmaciones de experiencia/seguridad no acreditadas y la tienda usa su dato oficial. |
| Sobre nosotros | Introducción, tres módulos y dos acciones finales conservados. La redacción evita antigüedad, equipo/habilitaciones inventados; cambia el salto de línea del título y la altura del texto. |
| Eventos | Hero, tres soluciones, proceso de cuatro pasos, casos y formulario conservan composición. Demo distingue casos ilustrativos; público muestra ausencia. La propuesta queda pendiente de valoración humana. |
| Tiendas | Tarjeta de permanente y cuadrícula de cuatro casetas conservadas. Los datos del usuario mandan sobre los ejemplos: direcciones/horarios oficiales y periodos no publicados indicados como sin confirmar. |
| Catálogo | Cuatro familias, CTA magenta y acceso al PDF real. PDF blanco con edición/tamaño comprobados; cantidades de ejemplo rotuladas como demo. Publicación mantiene alternativa ante inventario vacío. |
| Familia/ficha | Cuadrícula, proporciones, badges, atributos, condiciones y CTA de consulta conservados. Vídeo real manual donde hay fixture técnica; falta de material en el resto. Precio/stock desconocidos se muestran como consulta. |
| Contacto/estados | Tarjeta de tienda y formulario por intención conservados. Inputs de peso 400, referencia eliminable, resumen de errores, foco y estado de aceptación real. Se informa del borrador de 30 minutos y no se promete respuesta en un día. |
| Móvil | Menú accesible sustituye al menú envuelto del prototipo, según permiso del contrato. Grids y padding se adaptan sin ocultación horizontal global. La inspección detectó proceso y footer en dos columnas a 390 px; se corrigieron a una columna para igualar la referencia. Controles y textos largos caben. |

Computer Use en Brave recorrió la referencia y la app: navegación por secciones, familia/ficha, consulta con referencia, recarga, eliminación, cambio de motivo, validación, evento con fecha/lugar por definir y aceptación local. El vídeo se accionó desde controles nativos y llegó a 2 s con 640 px intrínsecos, sin autoplay. Se volvió a abrir la fuente oficial de Tiendas y se compararon sus cinco ubicaciones con la UI actual. La revisión visual usa capturas inspeccionadas, no solo generadas.

La migración final a Tailwind/shadcn conserva 32/32 geometrías de captura; 30 no tienen diferencias de canal mayores de 8 y las dos restantes cambian únicamente 28/16 píxeles del indicador nativo de carga del vídeo (menos de 0,002 %). [Comparación de la migración](evidence/style-migration.json). Esto complementa la comparación con el prototipo original; no la sustituye. Se repitieron las 58 capturas y se inspeccionaron fichas/familias móviles, proceso/pie apilados, tiendas y los estados de referencia, error, envío y aceptación. Los controles shadcn se probaron manualmente con error, enlace al campo y un registro sintético real, cuyo foco terminó en la confirmación local.

La captura de página completa espera fuentes y tráfico pendiente, y normaliza el scroll al inicio sin cambiar el foco; el manifiesto conserva el elemento enfocado. No hubo errores de página o consola en la ejecución final. Se evita capturar restos de prefetch cancelado o componer una cabecera sticky en una posición de scroll anterior.

El diálogo de campaña se repitió con `REVIEW_CAMPAIGNS=1`, `PIROBOOM_PROMO=1` y reloj local `2026-12-20T10:00:00Z`: 390 y 1440 px, foco inicial, ciclo de Tab, Escape con retorno, cierre y enlace a casetas correctos. [Resultado](evidence/promo.json). Se restauró la demo normal con campañas reales y popup apagado.

## Limitaciones concretas de navegador

- **WebKit en Windows:** Tab y Alt+Tab omiten enlaces incluso en HTML mínimo sin CSS/JS de la app. La prueba reconfirma ese comportamiento y lo anota; inicializa únicamente el foco de enlaces en ese motor y mantiene Enter, Shift+Tab, menú, Escape y retorno de foco. Chromium/Firefox recorren el orden completo mediante Tab. No se afirma verificación de teclado en Safari nativo.
- **Vídeo WebKit Windows:** el cargador Media Foundation no aparece en la intercepción de red de Playwright y expone el tamaño de salida escalado. Se comprueban duración y píxeles decodificados además de avance de tiempo, y un recurso realmente ausente para la alternativa de error. Chromium/Firefox verifican también petición y ancho intrínseco de 640 px. [Evidencia](evidence/media-decoding.json), capturas `video-*.png`. [Implementación primaria de WebKit](https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/win/MediaPlayerPrivateMediaFoundation.cpp).
- Los errores de prefetch al destruir documentos rápidamente se reprodujeron en la prueba de red; se espera a completar ese tráfico antes de navegar. No se filtran errores de página para conseguir un resultado correcto.
- Emulación móvil y motores Playwright no equivalen a iPhone/Android físicos ni Safari instalado. [Alcance de los motores Playwright](https://playwright.dev/docs/browsers#webkit).

## Rendimiento de laboratorio

[summary.json](evidence/performance/summary.json) registra entorno, versión, perfiles, LCP, CLS y TBT; cada ejecución tiene JSON y HTML completos en `evidence/performance/`. Son tres páginas en móvil y escritorio sobre localhost, una muestra por página/perfil, sin otras pruebas de navegador concurrentes. El modelo móvil aplica throttling de Lighthouse; localhost omite latencia WAN/infraestructura real.

| Página | Perfil | Rendimiento | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- |
| inicio | mobile | 99 | 1.95 s | 0.0001 | 12.5 ms |
| catalogo | mobile | 100 | 1.88 s | 0.0000 | 11 ms |
| contacto | mobile | 98 | 2.33 s | 0.0009 | 11 ms |
| inicio | desktop | 100 | 0.54 s | 0.0303 | 0 ms |
| catalogo | desktop | 100 | 0.52 s | 0.0032 | 0 ms |
| contacto | desktop | 100 | 0.57 s | 0.0246 | 0 ms |

Accesibilidad y buenas prácticas de Lighthouse: 100 en las seis mediciones. SEO: 69 porque esta revisión impide intencionadamente la indexación (`meta robots`, `X-Robots-Tag` y `robots.txt`); no se retiró esa protección para mejorar la puntuación. No hay datos INP de campo, muestra de p75 ni evidencia de ventas. Los objetivos de referencia no constituyen una garantía tras incorporar medios/proveedores nuevos.

## Ensayo de recuperación y publicación

Se recuperó el árbol Git final `7bda141c4e67bfcbd7b6dc037c129c3b88f331e3` en `.local/recovery-20260909-tailwind`, sin copiar node_modules, builds ni configuración privada. `pnpm install --offline --frozen-lockfile` reutilizó 523 paquetes, descargó cero y terminó con código 0; `pnpm build` compiló correctamente, incluyendo la regeneración de `next-env.d.ts`. `pnpm start --port 3002` creó una sesión nueva (build `mu3EHaytX97I3vH3fQbSI`) y 13 comprobaciones HTTP verificaron páginas, 404, ausencia de fixtures y respuesta 503 sin receptor. Computer Use abrió además una pestaña nueva y recorrió Inicio → Catálogo → familia, verificando el estado vacío público y su alternativa de consulta. El archivo y su SHA-256 constan en [recovery.json](evidence/recovery.json). El código del archivo coincide con el revisado; documentos e informes se completaron después.

No se migró WordPress, cambió DNS ni operó Vercel/GitHub. El dominio anterior continúa fuera del alcance de cambios. La guía de [README.md](README.md) permite recuperar otra versión local sin destruir trabajo ni almacenamiento y separa los preparativos para un despliegue autorizado.

## Pendientes externos

La relación precisa de responsables, datos e impacto está en [CONTENT_STATUS.md](CONTENT_STATUS.md), E01–E13. Bloquean funciones públicas concretas: referencias/atributos/precios/medios acreditados; alcance real de servicios y casos; fechas de campaña y festivos; proveedor/destino autorizado del formulario con retención acordada; textos e identidad legales aprobados; decisión de publicación y accesos del alojamiento anterior.

No realizados: prueba con participantes, visita física/entrada o parking, lector de pantalla, dispositivos físicos, recepción en buzón del negocio, restauración productiva, métricas de campo y atribución operativa de propuestas/ventas. No se presentan como superados por las pruebas locales. WhatsApp y popup permanecen desactivados por defecto; las campañas ficticias solo se usan en el ensayo explícito de QA.
