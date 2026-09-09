# Piroboom

Implementación del diseño aprobado con Next.js App Router, React, TypeScript estricto, **Tailwind CSS 4.3.3 y shadcn/ui**. Incluye las seis secciones, catálogo en tres niveles, consultas de producto/evento/visita, receptor local persistente, horarios por punto, páginas legales, 404 y metadatos.

La versión pública conserva estados vacíos cuando faltan referencias, fotos o campañas acreditadas. No recibe consultas hasta configurar un destino autorizado. Las condiciones concretas están en [CONTENT_STATUS.md](CONTENT_STATUS.md); resultados y límites en [VALIDATION.md](VALIDATION.md).

## Arranque local

Requisitos: Node **24 o posterior**, pnpm **11.22.0** y puertos 3000/4010 libres. Comprobado en Windows 11 con PowerShell.

```powershell
pnpm install --frozen-lockfile
pnpm demo
```

Abrir **http://127.0.0.1:3000**. Esta revisión muestra una advertencia permanente y diez referencias de ejemplo. El envío hace HTTP real al receptor local y registra una prueba en SQLite privada; no manda mensajes al negocio. Genera un token efímero entre los dos procesos sin imprimirlo. `Ctrl+C` detiene ambos.

La base de revisión queda en `%LOCALAPPDATA%/Piroboom/review-receiver/leads.sqlite`, fuera de la web y Git, con permisos restringidos. Usar únicamente datos sintéticos. La retención de referencia es 30 días de contenido y 90 días de metadatos de reintento. No confundir este receptor con una integración productiva.

Para examinar el **build público sin fixtures**, mantener la demo y ejecutar en otra terminal:

```powershell
pnpm build
pnpm start --port 3001
```

Abrir **http://127.0.0.1:3001**. Conserva noindex por defecto, catálogo sin inventario inventado y alternativa telefónica cuando falta receptor. `pnpm dev` inicia la misma configuración pública en desarrollo; no activa automáticamente la demo.

## Configuración y recepción

Copiar `.env.example` a `.env.local` solo si se necesita configuración propia. Nunca versionar secretos. Para `pnpm demo` no hace falta crear el archivo. Variables principales:

| Variable | Uso |
| --- | --- |
| `PIROBOOM_SITE_URL` | Origen canónico; por defecto el dominio actual del negocio. |
| `PIROBOOM_PUBLIC_SITE` | `0` por defecto. `1` exige textos legales publicados al validar/construir. No constituye autorización de despliegue. |
| `PIROBOOM_DEMO` + `PIROBOOM_LOCAL_REVIEW` | Ambas a `1` para fixtures locales. Bloqueadas en Vercel; ningún parámetro de URL activa la demo. |
| `PIROBOOM_PROMO` | Apagado por defecto. El diálogo exige además campaña confirmada y vigente. |
| `LEADS_RECEIVER_MODE` | `disabled`, `local-test` o `remote`, según contrato documentado. |
| `LEADS_RECEIVER_URL`, `LEADS_RECEIVER_TOKEN` | Endpoint privado y autenticación del receptor. Solo servidor. |
| `LEADS_ALLOWED_ORIGINS` | Orígenes autorizados del frontend. |

[docs/LEADS.md](docs/LEADS.md) define el contrato HTTP, validación, límites, idempotencia, retención, errores, adaptador remoto y arranque independiente del receptor. El destino remoto debe aceptar duraderamente antes de responder y reconocer reintentos entre instancias. No basta con sustituir la URL por la de un servicio de correo arbitrario. Nunca usar SQLite efímera de una función serverless como destino productivo.

La confirmación refleja el estado comprobado: «Prueba registrada localmente» en revisión o aceptación del receptor remoto; no promete recepción en buzón, reserva ni plazo de respuesta. Sin destino válido la UI desactiva el envío y el endpoint responde 503.

## Editar contenido sin tocar JSX

La fuente es [content/site.json](content/site.json), validada por [content-schema.ts](src/lib/content-schema.ts). `fixtures/catalog.json` solo sirve para revisión. Tras cada edición:

```powershell
pnpm validate:content
pnpm test
pnpm build
```

Reiniciar `pnpm start` para usar el nuevo build. Las rutas se renderizan en servidor; las fechas de vigencia y el estado horario se recalculan con `Europe/Madrid` en cada petición. Las ediciones de archivo requieren reconstrucción porque Next incorpora el JSON al build.

- **Producto:** crear una entrada en `products` con referencia estable, slug y `familyId` existente. Empezar como `draft`, con `availability: "unknown"` y sin campos técnicos o precio no comprobados. Registrar fuente, `checkedAt`, campos efectivamente verificados y pendientes. Para `published`, la fuente debe ser primaria o confirmada por el propietario, los campos sensibles presentes deben figurar en `verifiedFields` y no puede haber pendientes. `validUntil` permite caducar la referencia. `archived` retira ficha y enlaces; una URL retirada responde 404.
- **Horario permanente:** editar `store.schedule` (0 domingo a 6 sábado) y `exceptions`. `confirmedUntil` y `exceptionsConfirmedUntil` deben cubrir la fecha para afirmar apertura efectiva. Una excepción confirmada puede cubrir su propio día. Sin confirmación se muestra horario habitual y la necesidad de consultar. Inicio, Tiendas, Contacto y pie consumen el mismo dato.
- **Campaña:** añadir un punto con su periodo, dirección, horario y excepciones propios, procedencia y confirmación. Activa no significa abierta ahora. Las fechas antes/durante/después y el cambio de año están probados. No copiar fechas de fixtures como anuncio público.
- **PDF:** editar `pdf.url`, edición y tamaño solo tras descargar y comprobar el documento; mantener su procedencia. Retirarlo o cambiar a borrador muestra la alternativa. El PDF actual enlazado es el archivo original de 2026 del negocio, de 81,9 MB; no se ha fabricado uno con datos de ejemplo.
- **Medios:** incorporar archivos autorizados a `public/media/` y referenciarlos con rutas locales seguras. Imágenes: dimensiones y texto alternativo. Vídeo: poster, descripción, `audio` explícito y pista VTT si contiene sonido. Registrar permisos y correspondencia con el artículo/caso. Sin material se conserva el espacio con un placeholder neutral.
- **Casos, soluciones y textos legales:** editar las colecciones correspondientes. Los casos publicados requieren acreditación; una etiqueta no demuestra autoría. Los tres textos legales permanecen como borradores hasta revisión del titular. La publicación se bloquea al construir con `PIROBOOM_PUBLIC_SITE=1` mientras sigan así.
- **WhatsApp:** `channels.whatsapp` conserva el componente configurable y apagado. Activar solo tras confirmar destino y uso permitido. No hay widget externo, carrito ni envío automático de referencias.

El código original de diseño, sus logos y la auditoría permanecen en `piroboom-handoff/` sin modificación y fuera de `public/`. Los derivados de marca, las fuentes locales y shadcn conservan sus licencias en `docs/licenses/`. [docs/UI.md](docs/UI.md) explica los tokens Tailwind y cómo mantener los componentes shadcn adaptados al diseño.

## Pruebas y capturas

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
```

Playwright inicia o reutiliza la demo en 3000 y el build público en 3001. Un trabajador y cero reintentos. El informe JSON queda en `evidence/playwright-results.json`; el HTML local en `playwright-report/`. Si se reutilizan servidores, comprobar que corresponden a este candidato. Oxlint ejecuta análisis de tipos y 274 reglas explícitas: [docs/LINT.md](docs/LINT.md).

La comparación visual usa el prototipo real en el puerto 4174, demo en 3000 y build público en 3001. Iniciar el prototipo desde otra terminal:

```powershell
py -3 -m http.server 4174 --bind 127.0.0.1 --directory piroboom-handoff/inputs/diseno
```

Para repetir la demo visual con reloj fijo, detener la demo anterior e iniciarla así:

```powershell
$env:REVIEW_NOW = '2026-09-09T12:00:00Z'
pnpm demo
```

En otra terminal:

```powershell
$env:REVIEW_NOW = '2026-09-09T12:00:00Z'
pnpm exec tsx scripts/capture-visual.ts
pnpm exec tsx scripts/verify-media.ts
```

`REVIEW_NOW` solo se aplica al lanzador local; no altera la lógica de producción. El manifiesto de capturas distingue ambos relojes. La demo normal conserva las cuatro casetas publicadas en la página oficial. Para ensayar el popup con campañas ficticias, usar `REVIEW_NOW=2026-12-20T10:00:00Z`, `REVIEW_CAMPAIGNS=1` y `PIROBOOM_PROMO=1` al iniciar demo; ejecutar `pnpm exec tsx scripts/verify-promo.ts`. Restaurar las tres variables al terminar.

Con el build público en 3001 y sin otras pruebas de navegador ejecutándose:

```powershell
pnpm exec tsx scripts/measure-performance.ts
```

Mide Inicio, Catálogo y Contacto en perfiles Lighthouse móvil/escritorio. Es laboratorio local, no INP de campo ni percentil 75.

## Recuperación y futuro despliegue

El candidato local y su identificación están en [VALIDATION.md](VALIDATION.md). El ensayo local reconstruye una copia aislada del árbol versionado con `pnpm install --offline --frozen-lockfile`, `pnpm build` y arranque en otro puerto; comprueba rutas y ausencia de receptor. No restaura ni modifica el WordPress actual.

Para recuperar una versión local, crear una carpeta nueva mediante `git worktree add --detach <carpeta-nueva> <commit-revisado>`, instalar con el lockfile y construir. Conservar el árbol anterior y cualquier configuración privada; no usar `reset --hard` sobre trabajo ajeno. Para retirar un build, detener su proceso y volver a arrancar el último candidato verificado, manteniendo el almacenamiento duradero y la ventana de idempotencia.

GitHub/Vercel son destinos posibles, pendientes de autorización. Antes de publicar: confirmar titularidad y textos legales, URL, datos comerciales, destino de consultas, retención y controles del alojamiento; crear copia y procedimiento de restauración del sitio actual. Separar preview protegida de publicación, conservar las seis rutas y probar el proveedor autorizado con un mensaje identificado como prueba. No se ha hecho push, despliegue, cambio de DNS ni envío al negocio.
