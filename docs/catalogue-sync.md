# Actualizar el catálogo desde Google Drive

Flujo previsto: Canva → exportar PDF → sustituir `catalogo.pdf` en Google Drive → importar y publicar una nueva versión de la web.

El importador está preparado en el repositorio y permanece desactivado. La conexión real necesita la carpeta, una cuenta de servicio y el hosting. La tarea diaria queda aplazada por decisión del propietario: no se incluye ningún workflow de sincronización ni se ha instalado un cron en esta máquina.

## Instrucciones para quien edita el catálogo

1. Editar el diseño original en Canva. Corregir el dominio de la portada a `pirotecniaelche.es` antes de la primera actualización.
2. Descargar todas las páginas como PDF, conservando el texto seleccionable. La portada debe mostrar el año de edición.
3. Sustituir el archivo `catalogo.pdf` en la carpeta compartida. En Drive puede usarse **Gestionar versiones → Subir nueva versión**. También se puede reemplazar por otro archivo con ese nombre: el proceso busca por carpeta y nombre, por lo que admite un cambio de ID.
4. Mientras la automatización esté pendiente, avisar a quien despliega la web para que importe y publique la actualización. Sustituir el archivo en Drive todavía no actualiza la web por sí solo.

La carpeta debe contener un único archivo con ese nombre. Si aparecen duplicados, el proceso se detiene hasta que se deje el correcto. Subir el archivo a esta carpeta significa que está listo para publicarse; los borradores se conservan en Canva o en otra carpeta.

## Conectar Google Drive una vez

1. Crear un proyecto de Google Cloud y habilitar Google Drive API.
2. Crear una cuenta de servicio y una clave JSON. No necesita delegación de dominio ni acceso a toda la cuenta de la editora.
3. Crear la carpeta del catálogo y compartirla como **Lector** con el correo `client_email` de la cuenta de servicio. La editora debe tener permiso para sustituir el PDF.
4. Copiar el ID de la carpeta desde su URL y guardar la clave JSON como secreto. No pegar la clave en Git ni en mensajes.

La aplicación usa el cliente oficial de autenticación de Google y el permiso `drive.readonly`. Solo busca un archivo de nombre exacto dentro de la carpeta configurada. Los IDs de Drive y las credenciales no se incluyen en los archivos públicos.

## Configurar el hosting

El build debe ejecutarse con `pnpm build` sobre un checkout de trabajo y publicar **todo el resultado solo cuando termine correctamente**. El comando `prebuild` descarga y prepara el catálogo antes de compilar Next.js. No se ejecuta la importación sobre el directorio que está sirviendo una web en producción.

Variables del entorno de build:

| Variable                                | Valor                                                                 |
| --------------------------------------- | --------------------------------------------------------------------- |
| `CATALOGUE_SYNC_ENABLED`                | `1`                                                                   |
| `CATALOGUE_DRIVE_FOLDER_ID`             | ID de la carpeta privada                                              |
| `CATALOGUE_DRIVE_FILE_NAME`             | `catalogo.pdf`                                                        |
| `CATALOGUE_GOOGLE_SERVICE_ACCOUNT_JSON` | JSON de la cuenta de servicio, como secreto                           |
| `CATALOGUE_EDITION`                     | Opcional: año si la portada no permite detectarlo de forma inequívoca |

Se necesitan Node 24+, las dependencias de desarrollo durante el build y memoria suficiente para procesar el PDF. PDF.js y el motor de imágenes se usan únicamente durante la preparación; el lector público sigue cargando imágenes por página, sin descargar el PDF completo. No se requiere Poppler en el hosting.

La preparación sustituye `public/media/catalogo-2026/manifest.json` dentro del checkout de build. Esa ruta se mantiene estable para consultar la versión publicada. El PDF y las nuevas imágenes tienen URLs con el SHA-256 del archivo, para evitar reutilizar portadas o páginas de una versión anterior. Los originales incluidos en Git se conservan como referencia; no hay commits automáticos de PDFs.

## Automatización diaria pendiente

No hay ninguna ejecución diaria configurada. Cuando se retome, habrá que elegir y añadir el programador y conectar el despliegue. Los comandos de comprobación y solicitud de despliegue ya están disponibles:

```bash
pnpm catalogue:check
# Solo si la comprobación indica changed=true:
pnpm catalogue:sync --request-deploy
```

El futuro proceso necesitará las mismas variables de Drive que el hosting y `CATALOGUE_PUBLISHED_MANIFEST_URL`: la URL HTTPS del manifiesto de la web desplegada, normalmente `https://pirotecniaelche.es/media/catalogo-2026/manifest.json`.

También necesitará los secretos:

- `CATALOGUE_GOOGLE_SERVICE_ACCOUNT_JSON`: la misma cuenta de servicio.
- `CATALOGUE_DEPLOY_HOOK_URL`: endpoint HTTPS del hosting que acepta un POST para lanzar un build de producción de `main`.

La comprobación compara el checksum de Drive con el publicado. Si coinciden, devuelve `changed=false`; si son distintos o el manifiesto todavía devuelve 404, devuelve `changed=true`. Un error de acceso o una respuesta inválida detiene la ejecución. El programador deberá solicitar el despliegue solo cuando haya cambios. Un POST aceptado confirma **la solicitud**, no que el hosting haya publicado: el resultado final debe comprobarse en el hosting y en el manifiesto público.

Si el build falla, el hosting debe mantener su último despliegue correcto. Como la comparación usa el manifiesto publicado, una comprobación posterior vuelve a detectar la actualización pendiente. El proveedor y el hook concretos aún están por configurar. Un VPS puede usar el mismo comando de comprobación, pero necesita un mecanismo de build y cambio de versión equivalente antes de añadir la tarea.

## Comprobaciones y límites

- Descarga limitada a 150 MiB; tamaño y checksum deben coincidir con los metadatos de Drive.
- PDF analizable, entre 1 y 64 páginas; cada página se renderiza antes de escribir el manifiesto final.
- Portada, imágenes, miniaturas, texto, número de páginas, edición y enlace de descarga proceden del mismo PDF.
- Si el texto extraído contiene `piroboom.es`, se detiene la actualización e indica la página. Esta comprobación no hace OCR ni modifica el diseño; un dominio incrustado en una imagen requiere revisión visual en Canva.
- Las secciones conocidas se reconocen por sus encabezados, sin depender de números de página fijos. Encabezados nuevos pueden necesitar añadir una regla en `src/lib/catalogue-schema.ts`; las páginas siguen disponibles en el índice completo.
- El proceso no convierte descripciones del PDF en inventario, precios estructurados, stock o categorías legales.
- No hay OCR: exportar texto convertido en imagen reduce la búsqueda a los títulos disponibles. La edición debe poder detectarse en la portada o configurarse explícitamente.

## Prueba local

Con las variables configuradas en `.env.local`:

```bash
node --env-file=.env.local --import=tsx scripts/catalogue-sync.ts --output-dir .local/catalogue-preview
node --env-file=.env.local --import=tsx scripts/catalogue-sync.ts --check
```

Para preparar un PDF local corregido sin acceso a Drive:

```bash
pnpm catalogue:sync --file /ruta/catalogo.pdf --output-dir .local/catalogue-preview
```

El directorio de prueba contiene el manifiesto, el PDF y todas sus páginas. No cambia el catálogo de `public/`. El PDF original del repositorio todavía contiene el dominio antiguo y debe fallar la comprobación de dominio.

## Referencias

- [Autenticación de cuentas de servicio de Google](https://developers.google.com/identity/protocols/oauth2/service-account).
- [Buscar archivos por carpeta y nombre](https://developers.google.com/workspace/drive/api/guides/search-files).
- [Descargar archivos de Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads).
- [Metadatos y checksums de archivos](https://developers.google.com/workspace/drive/api/reference/rest/v3/files).
