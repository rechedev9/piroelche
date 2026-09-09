# Estado editorial y condiciones de publicación

Comprobación de fuentes: **9 de septiembre de 2026**, zona `Europe/Madrid`. Este documento registra qué se conoce y por qué. El usuario ha declarado expresamente [Tiendas de Piroboom](https://pirotecniaelche.es/tiendas/) fuente de verdad de los datos de tiendas, que se incorporan al contenido publicable. Esa decisión no sustituye las demás confirmaciones comerciales pendientes, la revisión jurídica ni la autorización de despliegue. La verificación técnica de la aplicación y del candidato se registra en [VALIDATION.md](VALIDATION.md); el cruce completo de requisitos está en [docs/BACKLOG.md](docs/BACKLOG.md).

## Procedencia y significado de los estados

- **Suministrado:** contenido del handoff entregado por el usuario. El diseño y los assets son la referencia; sus ejemplos comerciales no pasan a ser hechos.
- **Contrastado en fuente pública:** se comprobó que una fuente primaria publica el dato en la fecha indicada. No acredita vigencia operativa, existencias, idoneidad ni aprobación del propietario.
- **Pendiente de confirmación:** falta documentación o aprobación concreta; se omite la afirmación pública o se usa un estado de ausencia honesto.
- **Demostración:** fixtures necesarias para recorridos y comparación visual; limitadas al entorno local de revisión, sin indexación ni envíos a personas. Las pruebas del formulario sí usan HTTP y un receptor local reales.
- **Publicable:** decisión editorial explícita sobre datos respaldados, vigencia y responsabilidad. No se deduce de que el código compile o de que un campo se llame `verified`.

## Inventario de material suministrado

| Material | Evidencia | Tratamiento |
| --- | --- | --- |
| Diseño final | `piroboom-handoff/inputs/diseno/Piroboom Prototipo.dc.html`, miniatura y `support.js` | Referencia visual; no servir el prototipo ni su runtime como aplicación pública. |
| Logo de cabecera/pie | `inputs/diseno/assets/logo.png`, 2172 × 724, fondo negro | Conservar la aplicación de la maqueta; derivados técnicos fieles permitidos. |
| Variante suministrada | `inputs/marca/logo-oficial-adjunto.png`, 1448 × 1086, alfa | No es el mismo lienzo; no sustituir sin ajustar espacio ni redibujar marca. |
| Diez productos del prototipo | Referencias `FA-025`, `FA-100`, `FA-007`, `HU-R60`, `HU-A60`, `HU-B90`, `FF-060`, `FF-B40`, `TR-100`, `TR-TH` | Demostración. Nombre, precio, duración, categoría, edad, altura y usos no son inventario confirmado. |
| Tres casos de evento y cuatro casetas del prototipo | Datos de ejemplo del HTML | Demostración. Las casetas de ejemplo se reservan al modo específico de prueba de campañas; la revisión normal y publicación muestran las cuatro de la fuente real, descritas abajo. No atribuir trabajos, permisos, clientes o apertura actual a partir de fixtures. |
| Fotografías/vídeos de producto, eventos y acceso | Ningún fichero específico aportado en el handoff | Placeholder neutral con proporciones del diseño; sin etiquetas de autenticidad o reproductor falso. |
| Backlog y auditoría | 68 mejoras, seis recorridos y 18 pruebas en MD/JSON | Mantener significado y límites. El master corrige la referencia normativa y fija Next.js. |

Se verificaron **los nueve hashes de assets** declarados en el inventario original, sin discrepancias. Los hashes del master, backlog y fuentes están en [source-checks.json](evidence/sources/source-checks.json). Los originales permanecen sin modificar.

## Fuentes primarias recuperadas

| Fuente | Comprobación de esta sesión | Límite |
| --- | --- | --- |
| [Tiendas](https://pirotecniaelche.es/tiendas/) | Página abierta y recargada en Brave Browser; árbol accesible e imagen inspeccionados el 09/09/2026 a las 15:10:11 UTC. Fuente de verdad indicada expresamente por el usuario; valores registrados en [stores-source.json](evidence/sources/stores-source.json). | Se publican la permanente y las cuatro casetas con direcciones y horarios exactos. La página no aporta fechas de campaña, mapas individuales de casetas ni prueba de apertura actual. |
| [Catálogo PDF](https://pirotecniaelche.es/catalogo-pdf/) | HTTP nativo 200; enlaza al PDF recuperado descrito abajo. | Recuperar el enlace/archivo no valida sus precios ni surtido actual. |
| [Eventos](https://pirotecniaelche.es/eventos/) | Contenido recuperado; menciona bodas, revelaciones, cumpleaños, fiestas, corporativo y comuniones. | No acredita montaje propio, responsables técnicos, permisos ni idoneidad universal en interiores. |
| [Contacto](https://pirotecniaelche.es/contacto/) | Página recuperada. | No se envió el formulario, no se conoce su destinatario efectivo ni se verificó respuesta. |
| [Aviso legal](https://pirotecniaelche.es/aviso-legal/) | Texto recuperado con identidad y contacto del titular publicados. | No se reproducen identificadores personales ni domicilio legal en esta evidencia; requiere revisión para la nueva web. |
| [Privacidad](https://pirotecniaelche.es/politica-de-privacidad/) | Texto íntegro recuperable en esta sesión. | Sus finalidades, proveedores, base jurídica y conservación no se trasladan automáticamente al nuevo procesamiento. |
| [Cookies](https://pirotecniaelche.es/politica-de-cookies/) | Texto recuperado. | Describe tipos/tratamientos de forma general; no sustituye la inspección de red y almacenamiento del navegador. |
| [BOE, Real Decreto 989/2015](https://www.boe.es/buscar/act.php?id=BOE-A-2015-12054&tn=0#a124) | Artículo 124.2 consultado en el texto consolidado, que muestra actualización de 10/04/2025. | La validación jurídica final sigue pendiente; no se presume habilitación del negocio. |

Los primeros intentos de extracción web de Tiendas, Catálogo y PDF fallaron o agotaron tiempo. La lectura HTTP nativa posterior devolvió 200 y recuperó los materiales. En la comprobación final de Tiendas, otra extracción agotó tiempo y la página sí cargó al abrirla y recargarla en el navegador. Esos fallos corresponden al canal de recuperación; no se registran como caída pública del sitio. No se almacenó HTML legal bruto ni reseñas con datos personales.

## Tienda permanente: base contrastada

La fuente de datos compartida incorpora esta información como **publicada por el negocio**, según la fuente de verdad elegida por el usuario y con fecha de comprobación. No falta una aprobación adicional de esos datos para incluirlos en esta versión. Se mantiene la distinción entre horario habitual y apertura efectiva, especialmente sin festivos confirmados. Fuente: [Tiendas de Piroboom](https://pirotecniaelche.es/tiendas/).

| Dato | Valor observado |
| --- | --- |
| Marca | Piroboom |
| Dirección comercial | Calle Gloria Fuertes, s/n, 03203 Elche, Alicante |
| Teléfono comercial | 600 261 620 |
| Enlace de ruta publicado | [Google Maps](https://maps.app.goo.gl/C1XJNPujKvKTfNPH9) |
| Martes a viernes | 10:00–14:00 y 17:00–20:00 |
| Sábados | 10:00–14:00 |
| Lunes y domingos | Cerrado según horario habitual publicado |
| Zona del cálculo horario | Europe/Madrid |

Tampoco se confirmó parking, la entrada física exacta, festivos, excepciones, campañas futuras o SLA de respuesta. El enlace publicado no acredita haber llegado a la entrada con una aplicación de mapas.

## Casetas: datos de la fuente de verdad

Las cuatro casetas siguientes están publicadas en [content/site.json](content/site.json), tanto en el modo público local como en la demostración normal. Se conservan las direcciones tal como las publica la fuente, incluida la repetición de «Avenida Novelda» en Santa Pola y La Zenia; no se corrigen por inferencia.

| Caseta | Dirección publicada | Horario habitual publicado | Periodo de campaña |
| --- | --- | --- | --- |
| Elche | Avenida Novelda | Todos los días de 10:00 a 18:00 | Fechas por confirmar |
| Alicante | Avenida Alfonso El Sabio X | Todos los días de 10:00 a 18:00 | Fechas por confirmar |
| Santa Pola | Avenida Novelda | Todos los días de 10:00 a 18:00 | Fechas por confirmar |
| La Zenia | Avenida Novelda | Todos los días de 10:00 a 18:00 | Fechas por confirmar |

La fuente no indica inicio, fin ni vigencia de las campañas. Las tarjetas muestran **«Fechas por confirmar»**, el horario habitual y el teléfono comercial para consultar; no afirman «Abierta ahora» o «Próxima apertura», ni inventan fechas, coordenadas o mapas individuales. La tienda permanente sigue disponible como alternativa. Los valores y los límites se conservan en [stores-source.json](evidence/sources/stores-source.json), y el comportamiento se comprueba en [contenido](tests/content.test.ts), [horarios](tests/hours.test.ts) y [publicación](tests/e2e/publication.spec.ts), con resultados de ejecución en [VALIDATION.md](VALIDATION.md).

Para ensayar estados fechados se conservan cuatro fixtures de campañas. Solo sustituyen a las casetas reales cuando `REVIEW_CAMPAIGNS=1` se combina con el modo de demostración local completo (`PIROBOOM_DEMO=1`, `PIROBOOM_LOCAL_REVIEW=1`, fuera de Vercel). Un parámetro público o `REVIEW_CAMPAIGNS` por sí solo no activa fixtures. Este mecanismo se limita a QA y no cambia la decisión editorial sobre las ubicaciones reales.

## Medios incorporados después del handoff

Por petición del usuario se generó un fondo decorativo de fuegos artificiales para Inicio y se recuperaron siete fotografías del [perfil público del negocio en Google Maps](https://www.google.com/maps/contrib/114396712537097425294/photos). El fondo no representa un trabajo realizado por Piroboom. Su intensidad se reduce en móvil para mantener la lectura.

La actualización completa asigna fuegos nocturnos a Inicio y a su familia; columnas de humo a Humo de color; fuentes de chispas a Fuego frío; humo rosa a Revelaciones; y fotografías del mostrador y los artículos a Tiendas, Sobre nosotros y Contacto. La boda con humo sirve como imagen editorial de Eventos. Las tracas nacionales y el envase Color & Cracker proceden del PDF suministrado y se muestran completos, con sus proporciones y transparencia originales. Todos los espacios fotográficos de las seis secciones públicas tienen material pertinente alojado en el propio sitio. La galería describe efectos y ambientes; no convierte las fotos en casos de trabajo acreditados.

Se cargaron 64 elementos del perfil tras seleccionar Fecha; las fotos seleccionadas tienen etiquetas de septiembre/octubre de 2024 y julio/noviembre de 2025, sin afirmar una auditoría individual de la cronología de los 64. Se distinguen las etiquetas de Google y las fechas de imagen cuando difieren. [Fuentes iniciales y prompt del fondo](evidence/media/sources.json), [cuatro fotografías añadidas](evidence/brand-refresh/google-sources.json) y [recortes del catálogo](evidence/catalogo-2026/extraction-manifest.json). E04 queda resuelto para estos bloques editoriales; los casos acreditados, vídeos y fichas de inventario siguen requiriendo su material específico. Las fixtures aisladas conservan sus placeholders para no asociar fotos reales a productos o trabajos ficticios.

## PDF comercial local indicado por el usuario

El usuario indicó expresamente `C:/Users/reche/Downloads/Catalogo-2026.pdf` como archivo final del catálogo. Se ha copiado sin editar a [public/catalogos/catalogo-2026.pdf](public/catalogos/catalogo-2026.pdf) y el bloque `pdf` de [content/site.json](content/site.json) enlaza ahora `/catalogos/catalogo-2026.pdf`. El original de Descargas permanece intacto. Su SHA-256 coincide con el [PDF recuperado previamente del negocio](https://pirotecniaelche.es/wp-content/uploads/2026/06/Catalogo-2026.pdf), por lo que se conserva la inspección del mismo documento.

| Comprobación | Resultado |
| --- | --- |
| Archivo indicado por el usuario | `C:/Users/reche/Downloads/Catalogo-2026.pdf` |
| Descarga local de la web | `/catalogos/catalogo-2026.pdf` |
| Recuperación previa del mismo documento | HTTP 200, `application/pdf`, en la URL oficial |
| Cabecera binaria | `%PDF-1.4` |
| Tamaño exacto | 81.903.612 bytes, aproximadamente 81,9 MB / 78,1 MiB |
| Páginas | 16, sin cifrado según `pdfinfo` |
| Edición visible | 2026 en portada y segunda página inspeccionadas |
| Metadato discrepante | `Title` conserva «Catálogo 2025»; no se alteró el original |
| Texto | Texto extraíble en las 16 páginas con `pdftotext` |
| Revisión visual efectuada | Portada y página 2 inspeccionadas previamente; portada 2026 revisada de nuevo al comprobar el mismo SHA |
| SHA-256 | `e4ac9f0c0cf181b154677aa2dfd9ef1c4e06abe039079640e4f07488fe667000` |
| Copia incluida en la web | `public/catalogos/catalogo-2026.pdf`, idéntica al original: mismo tamaño y SHA-256 |

La página 2 incluye descripciones de relleno y un precio sin cifra. El archivo aporta una fuente comercial real, pero no un catálogo maestro listo para importar: no se acreditó la vigencia de precios/stock, las clasificaciones completas ni los derechos de cada imagen. Se abrió también por su URL oficial en el visor nativo de Brave de escritorio, con 16 páginas y portada 2026 visibles. Tener texto y etiquetas PDF no acredita accesibilidad. Apertura en visor móvil, orden de lectura y examen integral del documento quedan pendientes. No se ha generado un catálogo nuevo con las fixtures.

La evidencia de la inspección previa del mismo SHA, incluidos los conteos de texto y el visor de escritorio, permanece en [source-checks.json](evidence/sources/source-checks.json); su registro de recuperación anterior no describe la nueva ubicación pública local. `pdfinfo` sobre el archivo de Descargas vuelve a confirmar 16 páginas, PDF 1.4 y ausencia de cifrado. Las [pruebas de contenido](tests/content.test.ts) comprueban el SHA completo de la copia pública, su tamaño y su cabecera; el esquema permite archivos `.pdf` con nombre seguro dentro de `/catalogos/`, conservando las URLs web existentes. La prueba [E2E de publicación](tests/e2e/publication.spec.ts) comprueba el enlace local y añade HTTP HEAD para verificar tipo/tamaño sin descargar 81,9 MB en cada motor; su ejecución final se registra en VALIDATION.

Para repetir la comprobación de la copia incluida en la web sin modificarla:

```powershell
Get-FileHash -LiteralPath 'public/catalogos/catalogo-2026.pdf' -Algorithm SHA256
pdfinfo 'public/catalogos/catalogo-2026.pdf'
pdftotext -f 1 -l 2 -layout 'public/catalogos/catalogo-2026.pdf' -
```

## Legal, recepción y canales

El art. **124.2**, no el 127.2 citado por error en la auditoría original, trata el envío de productos vendidos al público a distancia y la presencia del comprador al entregarlos en el local. El alcance de esta versión continúa siendo catálogo, consulta y visita presencial. No se amplía esa referencia a una prohibición general de consultas o contratación de servicios. La fuente consolidada es informativa y no sustituye la validación jurídica final. [BOE, art. 124](https://www.boe.es/buscar/act.php?id=BOE-A-2015-12054&tn=0#a124).

Los textos legales actuales permiten localizar un correo publicado, pero **publicación de un correo no acredita destinatario autorizado del nuevo formulario ni recepción en ese buzón**. No se configura por inferencia, no se inventa un `info@…` y no se envían mensajes de prueba a personas por iniciativa propia. La nueva página legal debe corresponder a los proveedores y tratamiento realmente elegidos; no debe copiar garantías genéricas de cumplimiento, analítica activa o conservación sin revisar.

El receptor local sirve para comprobar HTTP, aceptación duradera según su contrato y errores; no equivale a recepción del negocio. En publicación, sin proveedor y destino válidos, el formulario debe permanecer deshabilitado o devolver un error controlado, con el teléfono como alternativa. El plazo de «1 día laborable» del prototipo no está confirmado.

WhatsApp, Google Ads y Merchant Center permanecen como revisión externa de elegibilidad/uso antes de activarlos. No se afirma permiso ni incumplimiento concreto; no se integran feeds, checkout o mensajes comerciales automáticos. La web debe resolver sus recorridos sin esos canales. Sin terceros opcionales no se necesita inventar un banner: la inspección técnica debe demostrar el comportamiento real de red y almacenamiento.

## Pendientes externos y su impacto

| ID | Falta concreta / responsable requerido | Impacto para publicar | Alternativa técnica local |
| --- | --- | --- | --- |
| E01 | Propiedad: matriz de artículos, servicios, ejecución, colaboradores y responsabilidades (M01/M29). | No afirmar montaje propio, habilitaciones ni permisos universales. | Tarjetas/proceso con valoración humana y redacción neutral. |
| E02 | Propiedad/fabricantes: referencias actuales, descripción, clasificación y condiciones por artículo (M19/M22). | No publicar las diez fixtures ni deducir atributos del nombre de familia. | Tres niveles de catálogo y estados vacíos/parciales; demostración aislada. |
| E03 | Propiedad: precios, impuestos, vigencia y política de disponibilidad (M23/M35). | No publicar ceros, rangos inventados o stock afirmado. | Estado «Consultar» y fuente independiente de publicación. |
| E04 | Propiedad: medios autorizados de productos, local y trabajos; acreditación de cada caso (M15/M26/M31). | No mostrar pruebas de experiencia, fotos reales o vídeos sin material correspondiente. | Componentes terminados y placeholders neutrales; vídeo opcional real. |
| E05 | Responsable de tienda: fechas de campaña por punto, festivos, excepciones y entrada/parking (M03/M36/M40/M41). Direcciones y horarios habituales ya incorporados desde la fuente de verdad elegida por el usuario. | No afirmar casetas activas, próximas ni apertura efectiva sin fechas y excepciones suficientes. | Cuatro casetas reales publicadas con horario habitual y «Fechas por confirmar», teléfono y alternativa permanente; cálculo por ubicación probado con reloj de test. |
| E06 | Propiedad: trayectoria, personas/roles y acreditaciones con permiso de publicación (M42–M44). | No inventar antigüedad, equipo o sellos. | Conservar composición y tres bloques con datos acreditados o lenguaje neutral. |
| E07 | Responsable del tratamiento/operación: proveedor, destino autorizado, acceso, retención y prueba de recepción (M47/M50). | Bloquea activar la recepción pública de formularios y afirmar recepción en buzón. | Receptor local identificable, validación y aceptación HTTP real; ausencia de configuración produce estado controlado. |
| E08 | Responsable/asesoría: identidad legal publicable y revisión de finalidad, base, proveedores, conservación y condiciones (M02/M34/M50). | Bloquea presentar textos jurídicos como finales/revisados. | Rutas legales reales, información técnica honesta y enlaces a las fuentes actuales. |
| E09 | Propiedad/canales: WhatsApp aprobado, elegibilidad Ads/Shopping, testimonios y ficha local (M05/M06/M17/M55). | No activar integración ni ofrecer resultados garantizados. | Componente WhatsApp configurable apagado; sin ratings/feeds; navegación orgánica y teléfono. |
| E10 | Propiedad: responsable editorial y SLA de atención (M49/M64). | No prometer un día laborable, 24/7 o respuesta automática. | Mantenimiento documentado, caducidad y texto de siguiente paso sin plazo ficticio. |
| E11 | Titular de infraestructura: accesos/inventario autenticado, copia y restauración del sitio anterior (M58/M65). | No migrar CMS, cambiar DNS, sustituir producción o afirmar rollback productivo probado. | Proyecto local, procedimiento y ensayo aislado; publicación/reversión remota tras autorización. |
| E12 | Participantes, dispositivos y responsables operativos (Q03/Q06/Q09/Q12/Q18). | No equiparar E2E con usuarios, buzón, Android/iOS físico, lector de pantalla o recuperación productiva. | Registrar por separado lo ejecutado localmente y lo pendiente. |
| E13 | Muestra de usuarios y resultados operativos posteriores al lanzamiento (M59/M66). | No inventar INP de campo, p75, mejora de ventas, propuestas o contratos. | Laboratorio productivo y medición tipada sin salida externa por defecto. |

Las dependencias no impiden completar y probar localmente rutas, contexto de consulta, servidor, idempotencia, horarios, SEO, ausencia de contenido y accesibilidad. Los estados anteriores no declaran terminados esos trabajos: la evidencia final debe enlazarse desde `VALIDATION.md`.

## Regla de actualización editorial

El mantenimiento detallado debe seguir el procedimiento del [README](README.md). Cada alta o edición de producto, tienda, excepción, campaña, PDF, medio o texto legal debe aportar origen, fecha de revisión, estado y vigencia cuando corresponda. Validar el contenido antes de activar su publicación y comprobar su propagación en las páginas que lo comparten.

No transportar correo, teléfono, mensaje, fecha personal, presupuesto o recinto por URL ni registrarlos en analítica o logs. IDs públicos de producto/ocasión pueden conservar contexto; el nombre final se resuelve contra contenido válido. Ninguna fixture, nota del handoff o caso ficticio puede aparecer en sitemap, metadatos, API o páginas productivas. Activar demo depende del entorno local, no de un parámetro público.

La autorización para implementar no es autorización de publicación. No se ha solicitado ni realizado desde esta revisión documental push, despliegue, cambio de producción, contratación o envío de formularios a destinatarios reales.
