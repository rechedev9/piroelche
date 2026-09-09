# Integración continua

El [workflow CI](../.github/workflows/ci.yml) prepara la verificación del proyecto en GitHub Actions, en `ubuntu-24.04`, con Node **24.18.0**, pnpm **11.22.0** y `pnpm-lock.yaml` congelado. Se activa ante un push a `main`, una pull request o una ejecución manual. Este cambio incorpora el archivo local; no crea un repositorio remoto, no configura reglas de rama ni ejecuta un despliegue.

## Comprobaciones y servicios

Los pasos ejecutan, en este orden:

1. `pnpm install --frozen-lockfile`.
2. `pnpm audit --prod --audit-level high`.
3. `pnpm lint` y `pnpm typecheck`.
4. `pnpm test`: el candidato de partida tiene 44 pruebas unitarias e integración.
5. `pnpm build`, incluido el `prebuild` que valida contenido.
6. `pnpm exec playwright install --with-deps chromium firefox webkit`.
7. `pnpm test:e2e --forbid-only --retries=0`: el candidato tiene 81 casos al combinar los tres motores, con un worker y sin reintentos.

Los comandos permanecen en [package.json](../package.json); la configuración y los servicios E2E proceden de [playwright.config.ts](../playwright.config.ts). `CI=true` obliga a iniciar servidores nuevos, sin reutilizar un proceso previo. Playwright inicia `pnpm demo` en `127.0.0.1:3000`, con el receptor HTTP local real en el puerto 4010, y `pnpm start --port 3001` sobre el build público. La demo genera un token efímero dentro del proceso y usa solicitudes sintéticas; no necesita credenciales del negocio ni envía mensajes a personas. La instalación de navegadores y dependencias sigue el [procedimiento oficial de Playwright para CI](https://playwright.dev/docs/ci#github-actions).

El build mantiene `PIROBOOM_PUBLIC_SITE=0`; las banderas de demo están desactivadas en el entorno general y solo el lanzador local las activa para su propio servidor. La instancia del puerto 3001 conserva contenido público, `noindex` y el formulario sin proveedor. El flujo no habilita indexación, receptor remoto ni textos legales como aprobados. La URL canónica procede de la configuración actual del proyecto; las pruebas navegan por localhost.

La auditoría de dependencias falla ante avisos de severidad alta o crítica en dependencias de producción. No aplica correcciones, no ignora errores del registro y no sustituye una revisión de código o un análisis de seguridad. Su resultado depende de los avisos publicados y de la disponibilidad del registro en cada ejecución. [Opciones oficiales de pnpm audit](https://pnpm.io/cli/audit).

## Permisos y artefactos

El token de GitHub tiene únicamente `contents: read`; checkout usa `persist-credentials: false`. No hay referencias a secretos de repositorio, entornos de despliegue, permisos de escritura, `pull_request_target` ni caché de dependencias. Cada ejecución dispone de un runner nuevo; las ejecuciones anteriores de la misma referencia se cancelan cuando llega otra.

`LOCALAPPDATA` se establece únicamente para el paso E2E en `${{ runner.temp }}/piroboom-ci`. El [lanzador](../scripts/serve-review.ts) sitúa allí `Piroboom/review-receiver/leads.sqlite`, fuera del checkout. El [receptor](../scripts/local-receiver.ts) aplica permisos privados y las pruebas usan datos sintéticos.

Si el paso E2E se ejecutó y el job no fue cancelado, se conservan durante siete días únicamente `evidence/playwright-results.json`, `playwright-report/` y `test-results/`. Esto incluye trazas y capturas que Playwright genera cuando falla un caso. La lista de carga excluye bases SQLite/DB, `.env`, archivos ocultos y `evidence/private/`; no incluye `runner.temp`, builds ni el directorio completo de evidencias. Antes de iniciar E2E se elimina solo la copia del JSON local presente en el checkout efímero, para evitar presentarla como resultado de CI si el nuevo proceso falla antes de producir su informe. Los resultados de lint, tipos, unitarias y build quedan en el log del job.

## Versiones verificadas

El 9 de septiembre de 2026 se contrastaron las releases, los refs de tags y los archivos `action.yml` de los repositorios oficiales. Cada `uses` fija el SHA completo del commit; el comentario conserva la versión legible.

| Action                    | Release oficial                                                          | SHA fijado                                 |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `actions/checkout`        | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)        | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node`      | [v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0)      | `820762786026740c76f36085b0efc47a31fe5020` |
| `pnpm/action-setup`       | [v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)       | `ea17c68df8912ef543352723c149a84f56e3d413` |
| `actions/upload-artifact` | [v7.0.1](https://github.com/actions/upload-artifact/releases/tag/v7.0.1) | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |

Node 24.18.0 coincide con el entorno validado del candidato y figura en el [archivo oficial de Node](https://nodejs.org/dist/v24.18.0/). pnpm coincide con `packageManager` en `package.json`. Las actualizaciones deben cambiar la versión y el SHA juntos, contrastar la release oficial y repetir las comprobaciones. El runner `ubuntu-24.04` y los avisos del registro pueden actualizarse aunque las Actions y las dependencias del proyecto estén fijadas.

## Validación y límites

La validación local del workflow se registra con [actionlint v1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12), sin añadir una dependencia al proyecto:

```powershell
go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 .github/workflows/ci.yml
pnpm exec prettier --check .github/workflows/ci.yml docs/CI.md
```

El 9 de septiembre de 2026, `actionlint v1.7.12` terminó con código 0 y sin diagnósticos; se ejecutó desde Go 1.26.3 en Windows. Prettier terminó con código 0 para ambos archivos. Se comprobaron las opciones de las Actions contra sus `action.yml` fijados, los comandos contra `package.json` y los servicios/puertos contra la configuración de Playwright y el lanzador. ShellCheck no está instalado en este host; no se atribuye a esta comprobación un análisis adicional de shell.

`pnpm audit --prod --audit-level high` también terminó con código 0 e informó «No known vulnerabilities found» en esa fecha. Este resultado corresponde a los avisos conocidos del registro consultado, no a un análisis integral de seguridad.

Los controles anteriores validan la sintaxis, estructura, expresiones de GitHub Actions y formato; no ejecutan GitHub Actions ni acreditan que los tests hayan pasado en Ubuntu. No se repitió la suite de aplicación para este cambio de configuración. Sus resultados previos se conservan en [VALIDATION.md](../VALIDATION.md) y no se atribuyen a este workflow.

La primera ejecución de CI requiere un repositorio remoto autorizado, subir el workflow y disponer de GitHub Actions. En esa ejecución se deben comprobar la instalación de navegadores/dependencias Linux, el arranque de ambos servidores y del receptor, los tres motores, los reportes y el estado final del job. La prueba de teclado en WebKit Windows documentada en la validación previa no acredita el comportamiento de WebKit Linux. La comprobación del dominio, el tratamiento de solicitudes del negocio y las decisiones legales/editoriales conservan sus requisitos propios.
