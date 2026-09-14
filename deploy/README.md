# Despliegue en el VPS de Keko

El destino de producción es el VPS de Keko. Keko añadirá el acceso, el dominio
y la configuración del servidor. Este repositorio no contiene esos datos ni
un despliegue automático al VPS. Subir cambios a GitHub no actualiza ese servidor.

El despliegue temporal del VPS personal anterior se retiró el 14 de septiembre
de 2026, con una copia recuperable fuera de Git. No debe reutilizarse como destino.

## Preparación del servidor

- Docker Engine con Compose y recursos suficientes para compilar Next.js.
  Comprobar memoria y CPU disponibles antes del build si el VPS comparte otras
  aplicaciones; compilar en otra máquina si no hay margen suficiente.
- Un checkout limpio del commit que se va a publicar. Guardar la versión
  anterior y su configuración para poder volver atrás.
- Un proxy HTTPS. El contenedor escucha únicamente en `127.0.0.1:8093`;
  comprobar que ese puerto está libre. No comparte bases de datos ni volúmenes.
- Dominio y TLS configurados por Keko. El ejemplo de Caddy presupone que el
  proxy puede acceder al loopback del host; un proxy en otro contenedor necesita
  adaptar la red y el destino. Conservar las otras webs y la configuración de correo.

## Configuración

Desde `deploy/`, en Bash del VPS:

```bash
cp .env.example .env
```

Sustituir `PIROBOOM_SITE_URL` por el origen HTTPS real. `catalogo.example.com`
es solo un ejemplo. Guardar `.env` fuera de Git y limitar su lectura al operador.

Mantener inicialmente `PIROBOOM_PUBLIC_SITE=0`, `PIROBOOM_PROMO=0` y
`LEADS_RECEIVER_MODE=disabled`. El formulario muestra la alternativa telefónica.
La indexación solo se activa cuando el dominio y los textos legales están listos;
el formulario requiere además un receptor real y comprobar la recepción.

`PIROBOOM_SITE_URL` y `PIROBOOM_PUBLIC_SITE` se incorporan al build y también
se leen al arrancar: cambiarlas requiere reconstruir y recrear el contenedor.
La imagen actual deja desactivada la sincronización del catálogo. Su futura
conexión a Drive exige adaptar el build según [la guía del catálogo](../docs/catalogue-sync.md).

## Publicar una versión

1. Revisar el commit y sus resultados de CI. En una actualización, conservar
   el checkout y `.env` anteriores y etiquetar la imagen actual para rollback
   antes de sustituir `piroelche-web:latest`.
2. Desde `deploy/`, validar y construir:

   ```bash
   docker compose config --quiet
   docker compose build web
   ```

3. Probar la imagen candidata en un puerto de loopback libre, con el mismo
   entorno, antes de sustituir el servicio activo. Comprobar Inicio, Catálogo,
   Contacto, recursos de imagen, metadatos, PDF y el estado real del formulario.
4. Una vez validada la candidata:

   ```bash
   docker compose up -d --no-build web
   docker compose ps
   docker compose logs --tail=50 web
   curl --fail --silent --show-error --output /dev/null http://127.0.0.1:8093/
   ```

5. Adaptar `Caddyfile.snippet` al dominio y proxy de Keko, validar la configuración
   antes de recargarla y comprobar las mismas rutas a través del HTTPS público.
   Verificar también canonical, robots y la versión del catálogo servida.

Para rollback, restaurar la etiqueta de la imagen anterior y su `.env`, y ejecutar
`docker compose up -d --no-build web` desde el checkout anterior. No borrar la
versión previa hasta verificar la nueva. No usar limpiezas globales de Docker
en un VPS compartido.

## Límites de la entrega

El contenedor funciona sin privilegios, con filesystem de solo lectura y tmpfs
para los temporales y la caché de imágenes. El build correcto y CI no prueban
que el VPS de Keko esté configurado o sirviendo la web: esa verificación se hace
cuando Keko instale esta versión. Los resultados históricos en `evidence/` no
sustituyen las comprobaciones del commit desplegado.
