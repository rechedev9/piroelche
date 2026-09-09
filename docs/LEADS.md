# Recepción de solicitudes

`POST /api/leads/` valida y transmite una solicitud a un receptor autenticado. Next no guarda datos personales en su filesystem. La ausencia de un destino válido devuelve `503` y nunca una confirmación. La implementación y las pruebas locales no acreditan recepción en el buzón del negocio.

## Contrato público

Enviar `Content-Type: application/json`, `Origin` autorizado e `Idempotency-Key` nuevo generado con `crypto.randomUUID()`. La clave identifica un envío, no a una persona. Conservarla al reintentar el mismo contenido tras un error o timeout; generar otra solo cuando se cambia el contenido o se inicia una consulta distinta. No introducir nombre, correo, teléfono, mensaje, fecha, lugar ni presupuesto en URLs, analytics o logs.

Campos compartidos: `replyTo` es un único correo o teléfono; `message` es texto plano; `website` es un honeypot que debe quedar vacío. Nombres máximos 100 caracteres, canal 254, mensaje 4000, referencia 48, lugar 200 y presupuesto 100; cuerpo HTTP máximo 16 KiB. Se rechazan campos desconocidos y los residuales de otra intención.

| `intention` | Campos y validación |
| --- | --- |
| `product` | `name` obligatorio; `productRef` opcional, resuelta contra contenido actualmente publicable del servidor. `message` obligatorio cuando no hay referencia. |
| `event` | `name` y `message` opcionales. `occasion`: `boda`, `revelacion`, `cumpleanos`, `fiesta` u `otra`. `dateUndecided` booleano obligatorio; si es `true`, omitir/vaciar `date`; si es `false`, fecha real `YYYY-MM-DD` igual o posterior a hoy en `Europe/Madrid`. `location` y `budget` opcionales; lugar vacío significa que todavía no se ha indicado. |
| `visit` | `name` y `message` obligatorios. |

La validación compartida `validateLead(input, now?)` devuelve `{success:true,data}` con datos normalizados, o `{success:false,fieldErrors}`. Los errores se asocian a los nombres anteriores o a `form`. El formulario debe preservar valores y enfocar/anunciar los errores; deshabilitar el botón por sí solo no sustituye a la idempotencia.

Una recepción nueva devuelve `201`; su repetición devuelve `200` con el mismo identificador y fecha:

```json
{
  "ok": true,
  "status": "recorded",
  "id": "PB-0123456789ABCDEF01234567",
  "receivedAt": "2026-09-09T12:00:00.000Z",
  "replayed": false,
  "mode": "local-test"
}
```

Este ejemplo es un esquema de respuesta, no una solicitud recibida. `recorded` significa aceptación duradera declarada por el receptor; no significa entrega a un buzón, lectura, reserva, disponibilidad, permiso o plazo de respuesta. En `local-test`, la interfaz debe indicar expresamente que se ha guardado una prueba local. En `remote`, el operador del receptor debe cumplir el contrato siguiente antes de activar el formulario.

Los errores públicos tienen `{ok:false,code,message,fieldErrors?}`: `400` petición inválida, `403` origen, `409` misma clave con otro contenido, `413` tamaño, `415` formato, `422` validación, `429` límite con `Retry-After`, `503` falta de configuración o receptor fallido y `504` timeout incierto. Ninguno equivale a un éxito. Una fecha que ya haya pasado o una referencia archivada puede impedir un reintento posterior; no se debe iniciar automáticamente otro envío para ocultarlo.

## Receptor local real

Usa Node 24 LTS, el Node instalado/verificado en este proyecto. El módulo local `node:sqlite` necesita como mínimo Node 22.13 para ejecutarse sin flag; es una API de Node que aún puede mostrar aviso experimental en versiones 24. El script de pruebas no forma parte del runtime de Next ni se despliega como función de Vercel. [Documentación de SQLite en Node](https://nodejs.org/api/sqlite.html).

1. Copiar `.env.example` a `.env.local` si no existe y mantener ese archivo fuera de Git. Si ya existe, conservarlo y añadir las variables necesarias.
2. Generar un token aleatorio propio de al menos 32 caracteres; usar el mismo token en Next y en el receptor. No copiar el token de los tests ni publicarlo. Por ejemplo, `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"` genera uno localmente.
3. Configurar:

```dotenv
LEADS_RECEIVER_MODE=local-test
LEADS_RECEIVER_URL=http://127.0.0.1:4010/leads
LEADS_RECEIVER_TOKEN=
LEADS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
LEADS_RECEIVER_TIMEOUT_MS=8000
```

Introducir el token generado en `LEADS_RECEIVER_TOKEN`; vacío mantiene la recepción deshabilitada.

4. Arrancar en una terminal y conservarla abierta:

```powershell
node --env-file=.env.local --import tsx scripts/local-receiver.ts
```

5. En otra terminal, arrancar Next con los comandos del proyecto y enviar solo datos sintéticos desde el formulario. La respuesta incluye un identificador emitido por el receptor. Detener el receptor con Ctrl+C.

El receptor escucha exclusivamente `127.0.0.1`, exige `LEADS_RECEIVER_MODE=local-test` cuando se ejecuta como programa y rechaza Vercel. La API también exige una petición local cuando usa ese modo. No se envía correo ni se llama a un proveedor externo. Los tests lanzan receptores HTTP reales en puertos libres, verifican el contenido mediante una conexión SQLite privada y eliminan sus directorios temporales.

El archivo `leads.sqlite` se guarda por defecto en `%LOCALAPPDATA%/Piroboom/local-test-receiver` en Windows, o `.local/Piroboom/local-test-receiver` si `LOCALAPPDATA` no existe. Se puede elegir un **directorio dedicado privado** con `LEADS_LOCAL_STORAGE_DIR`; nunca usar `public`, `.next`, `.vercel`, un volumen efímero ni un directorio compartido del usuario. El script elimina permisos heredados y concede acceso al usuario actual y SYSTEM en Windows; en POSIX aplica `0700` al directorio y `0600` a la base. Rechaza carpetas con archivos ajenos o enlaces antes de modificar permisos.

La aceptación se confirma después de `COMMIT` con `synchronous=FULL`. Una clave primaria y una transacción `BEGIN IMMEDIATE` mantienen idempotencia y límites entre conexiones/procesos que compartan la misma base duradera. La misma clave con distinto contenido devuelve `409`; una repetición correcta no consume otro cupo. El límite por defecto es 5 solicitudes nuevas por cliente y 100 globales por ventana de 15 minutos; las ventanas quedan en SQLite y sobreviven a reinicios. En local sin proxy, todos los navegadores comparten el límite de cliente.

Por defecto se elimina el texto/contacto a los 30 días (`LEADS_RETENTION_DAYS`); se conserva hasta 90 días (`LEADS_IDEMPOTENCY_DAYS`) la clave, el hash del contenido, el identificador y la fecha para devolver la misma aceptación. Esa metadata puede seguir siendo vinculable y también tiene retención limitada. Pasado ese plazo no se garantiza deduplicación. Los valores permitidos son 1–365 días y la retención de idempotencia no puede ser menor que la del contenido. Se purga al arrancar, antes de cada escritura y cada hora mientras el receptor está en marcha. Un receptor apagado requiere arrancarse para ejecutar la purga; las copias de seguridad también deben respetar la política. `secure_delete=ON` y journal `DELETE` evitan dejar el texto eliminado en páginas libres ordinarias; esto no acredita borrado forense de SSD ni de backups externos.

No hay endpoint público de listado/administración. Para inspeccionar una prueba, usar una herramienta SQLite local sobre el archivo privado con la cuenta propietaria. No copiar su contenido a `evidence/`, capturas públicas o commits. Para reiniciar las pruebas, cerrar el receptor, conservar una copia privada si hace falta y eliminar exclusivamente ese directorio después de comprobar su ruta; eso borra las claves y los límites anteriores.

## Activación remota / Vercel

No hay un proveedor ni un buzón autorizado configurado en este repositorio. Esta integración y la prueba de recepción por una persona quedan pendientes de autorización externa. No se debe marcar la función como publicable por haber pasado los tests locales.

Para un destino autorizado, configurar `LEADS_RECEIVER_MODE=remote`, URL **HTTPS** sin credenciales incrustadas, query ni fragmento, token servidor de 32–512 caracteres y lista explícita de orígenes HTTPS en `LEADS_ALLOWED_ORIGINS`. El runtime rechaza HTTP remoto, destinos locales en modo remoto y modo local en Vercel. Mantener claves fuera de variables `NEXT_PUBLIC_*`; solo `{enabled,mode}` llega a la UI. Separar las credenciales, el almacenamiento y el receptor de preview/pruebas de los de producción. No habilitar un dominio preview para enviar datos reales sin la decisión del propietario.

El receptor autorizado debe implementar exactamente:

- `POST` JSON normalizado con `Authorization: Bearer <token>`, `X-Lead-Protocol: piroboom-leads-v1`, `Idempotency-Key` y `X-Lead-Abuse-Key` (HMAC pseudónimo de la IP, sin enviar IP en claro).
- Validación estricta, comparación de credenciales segura, almacenamiento/destino duradero restringido y una retención acordada. Si convierte mensajes en correo o HTML, usar una dirección emisora configurada y escapar texto; nunca concatenar estos campos a cabeceras o HTML.
- Registro del payload y de la clave de idempotencia **en la misma aceptación atómica**; clave repetida con el mismo contenido devuelve el identificador original, incluso si la primera respuesta se pierde; clave repetida con otro contenido devuelve `409`. Todos los workers/instancias comparten la idempotencia y la limitación. No usar memoria de proceso ni `/tmp` de una función como almacenamiento fiable.
- `201` para nueva aceptación, `200` para replay y cuerpo `{status:"stored",id:"PB-" + 24 caracteres hexadecimales MAYÚSCULOS,receivedAt:ISO-UTC-con-milisegundos,replayed:boolean}`. El estado HTTP debe corresponder a `replayed`. No devolver ese estado antes de que la escritura/encolado duradero esté confirmado. Si el proveedor solo acepta correos, un adaptador debe resolver este contrato y la deduplicación antes de configurarlo.
- `429` con `Retry-After` entero para rate limiting; error `5xx` si no se puede asegurar la aceptación. La API no sigue redirecciones y no expone cuerpos de error del proveedor, tokens ni datos personales. El timeout predeterminado es 8 segundos (configurable 50–15000 ms), y el cliente reintenta con la misma clave.
- Retención y límites al menos equivalentes a los acordados para la publicación; documentación de restauración, control de acceso y tratamiento de backups. El contrato local utiliza 30/90 días, pero eso no constituye aprobación legal para datos reales.

En Vercel se usa `x-vercel-forwarded-for`, cabecera de la plataforma, para generar el HMAC de abuso. Para otro hosting, `LEADS_TRUST_PROXY=1` solo es correcto cuando un proxy de confianza elimina y reescribe `X-Forwarded-For` y no se permite acceso directo a Next; sin esa garantía se mantiene `0` y todos comparten un límite conservador. Nunca confiar en una IP declarada libremente por el navegador. [Cabeceras de petición de Vercel](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).

Cambiar el token modifica los pseudónimos del límite de clientes; el límite global y las claves de idempotencia permanecen en el receptor. La activación requiere revisar el acceso al destino, el tratamiento de los datos y la retención y ejecutar **con autorización** una solicitud marcada como prueba. Registrar por separado aceptación del receptor y recepción real; no deducir una de la otra.

## Verificación reproducible

```powershell
pnpm exec tsx --test tests/leads.test.ts
pnpm exec oxlint --deny-warnings src/lib/lead-contract.ts src/lib/lead-server.ts src/app/api/leads/route.ts scripts/local-receiver.ts tests/leads.test.ts
pnpm exec tsc --noEmit
```

Las pruebas cubren las tres intenciones, campos residuales, correo/teléfono, Madrid/medianoche/años bisiestos, fecha por definir, referencia no publicada, CSRF, tamaño/JSON/honeypot, ausencia de destino, receptor autenticado, HTTP real, escritura, reenvíos concurrentes (también entre dos procesos CLI independientes), reinicio, conflicto, límite persistente, timeout posterior al commit, reintento sin duplicado, respuesta inválida del proveedor, retención y rechazo de almacenamiento con archivos ajenos. Los recorridos de navegador y la integración con la UI se documentan en `VALIDATION.md` con el candidato completo.
