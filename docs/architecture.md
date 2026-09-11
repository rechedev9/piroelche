# Arquitectura

La aplicación mantiene Next App Router para las rutas y composición en servidor, y componentes de cliente pequeños para las interacciones. Los módulos compartidos no leen el entorno, el disco ni el navegador al importarse.

## Contenido y catálogo

`content.ts` valida el contenido editorial en servidor. `getContent()` comparte una instantánea mediante `React.cache` durante cada renderizado: layout, cabecera, pie y página reutilizan el mismo resultado. Una petición nueva vuelve a evaluar la fecha de publicación en Madrid. Las consultas desde la API siguen comprobando la publicación en ese momento. Se mantiene el renderizado dinámico porque horarios, campañas y disponibilidad dependen del momento o del entorno; no se congelan mediante una caché de proceso. [Contrato de React.cache](https://react.dev/reference/react/cache).

`catalogue.ts` es exclusivamente de servidor. Valida el manifiesto una vez al cargar el módulo y prepara el índice de búsqueda. El manifiesto, sus hashes y los esquemas de validación no se importan desde componentes de cliente.

| Consumidor         | Datos que recibe                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Índice interactivo | Número, título, miniatura y texto normalizado de cada página                               |
| Visor              | Imagen, dimensiones, número y título de la página seleccionada; edición y total de páginas |
| Paginación         | Página seleccionada y total de páginas                                                     |
| Texto accesible    | Renderizado directamente por `CatalogueReader` en el servidor                              |

`catalogue-model.ts` contiene las proyecciones y operaciones puras de búsqueda y enlaces. El texto completo se normaliza una vez en servidor; al escribir solo se normaliza la consulta. Los enlaces, el formulario de salto y el texto de las páginas funcionan también sin JavaScript. El índice permanece en las props para conservar la búsqueda local completa, sin añadir otra petición ni un servicio de búsqueda.

## Consultas

| Módulo                       | Responsabilidad                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `lead-contract.ts`           | Validar entradas y respuestas; tipos derivados del esquema de respuesta      |
| `lead-form-model.ts`         | Restaurar un borrador según producto, motivo y ocasión; construir el payload |
| `lead-draft.ts`              | Validar borradores y su caducidad                                            |
| `lead-draft-store.ts`        | Adaptar `sessionStorage` y notificar cambios en la pestaña                   |
| `lead-client.ts`             | Transporte HTTP, huella del contenido y comprobación de estado/recibo        |
| `use-lead-draft.ts`          | Suscripción y caducidad del borrador                                         |
| `use-lead-form.ts`           | Coordinar edición, validación, envío, reintentos y navegación                |
| `lead-form.tsx` y sus campos | Presentación, etiquetas, foco y accesibilidad                                |
| `lead-server.ts`             | Origen, límites, referencias publicadas y comunicación con el receptor       |

Una respuesta solo anuncia éxito cuando el recibo válido coincide con HTTP 201 para una consulta nueva o HTTP 200 para una repetición. Un fallo conserva el borrador y la identidad de reintento. El guardado se hace antes de enviar; cerrar el componente aborta su petición. Cambiar el contexto conserva los datos de contacto, pero descarta los datos del motivo anterior.

La eliminación de borradores compara la instantánea esperada. Una confirmación antigua o un temporizador de caducidad no pueden borrar ediciones más recientes. Si el almacenamiento está bloqueado, el formulario sigue funcionando en memoria. Firefox no restaura el estado transitorio de los botones por encima del estado del componente al recargar; los campos de contacto conservan sus indicaciones de autocompletado.

`business-time.ts` centraliza la zona horaria y reutiliza un formateador para horarios y validación de fechas. Las reglas de fecha no dependen de la zona horaria del dispositivo.

## Animación

`HeroFireworks` gestiona visibilidad, preferencia de movimiento y pausa; `fireworks-scene.ts` gestiona recursos Canvas y el bucle de dibujo; `fireworks-motion.ts` contiene los cálculos puros. El motor se importa dinámicamente cuando el hero es visible y la preferencia permite animarlo. Los recursos ya decodificados se reutilizan. El bucle se detiene fuera de pantalla, al ocultar la pestaña o al pausar. Un fallo de carga conserva la ilustración estática.

## Verificación

`pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` comprueban los límites de importación, tipos, reglas de negocio, publicación y compilación. Las pruebas Node usan la condición `react-server` para probar también los módulos protegidos con `server-only`; las interacciones React se verifican en Playwright.

Playwright arranca sus propios servidores por defecto, con puertos configurables y una compilación de demo separada. Sus pruebas cubren catálogo con y sin JavaScript, búsqueda y zoom, navegación, accesibilidad, reflujo, formularios y reintentos con receptor HTTP real. Las pruebas de ciclo de vida comprueban recarga sin errores de hidratación, caducidad visible, movimiento reducido, pausa y degradación de animaciones.

`E2E_REPORT_DIR` separa tanto los informes como las trazas y capturas de cada ejecución, para que una comprobación no elimine los artefactos de otra.

`scripts/measure-delivery.ts` compara documentos de producción con contextos nuevos y movimiento reducido. Cuenta HTML y scripts iniciales y calcula gzip localmente. No mide latencia, INP ni experiencia de usuarios reales. La comparación de esta refactorización está en `evidence/architecture/delivery.json`.

Comparación con el commit `589adcf`, en bytes de JavaScript inicial comprimidos:

| Ruta     |   Antes | Después |
| -------- | ------: | ------: |
| Inicio   | 200 843 | 198 242 |
| Catálogo | 305 706 | 211 456 |
| Contacto | 289 178 | 289 552 |
| Eventos  | 292 568 | 290 413 |

El catálogo reduce su JavaScript un 30,83 %. Su HTML aumenta al recibir el índice como datos, pero el total HTML + JavaScript sigue reduciéndose en 90 992 bytes comprimidos. Contacto añade 374 bytes de JavaScript al separar el controlador y reforzar la recarga. Las capturas de Inicio, catálogo y contacto en 390 y 1440 píxeles coinciden píxel a píxel con la referencia en sus vistas iniciales; las animaciones se desactivaron para esa comparación.

En estaciones donde el WebKit descargado necesita otras bibliotecas, `E2E_WEBKIT_EXECUTABLE` permite usar un ejecutable o wrapper local. La CI de Ubuntu utiliza los navegadores y dependencias instalados por Playwright. Las bibliotecas de prueba y las bases de datos de demo no forman parte de la aplicación ni se publican.

La validación local de WebKit utiliza las bibliotecas de Ubuntu extraídas en `.local/webkit-runtime`, con `WEBKIT_GST_DISABLE_GL_SINK=1` y `WEBKIT_GST_DMABUF_SINK_DISABLED=1` para leer fotogramas mediante la salida de vídeo por software. El ejecutable configurado es `.local/webkit-runtime/run.sh`.

La prueba de vídeo conserva la comprobación de reproducción manual, dimensiones y píxeles decodificados. Si WebKit solicita datos antes de reproducir, la prueba exige reproducir ese comportamiento también con JavaScript desactivado y verificar que el vídeo sigue detenido. `preload="none"` es una indicación que el navegador puede ignorar, según [la documentación de HTML video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video#preload).
