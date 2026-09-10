# Oxlint en Piroboom

La configuración de [`.oxlintrc.json`](../.oxlintrc.json) usa **Oxlint 1.82.0** y **oxlint-tsgolint 7.0.2001**, fijados en el proyecto. Comprueba errores de JavaScript/TypeScript, React, Next.js, accesibilidad JSX, promesas e imports con información de tipos. La configuración antigua `eslint.config.mjs` se retiró junto con su integración anterior.

```json
"lint": "next typegen && oxlint --type-aware --deny-warnings ."
```

El script anterior es el contrato de `pnpm lint`. Desde el 10 de septiembre de 2026 ejecuta antes `next typegen`: las páginas usan el tipo global `PageProps` generado en `.next/types`, y sin él el análisis de tipos de oxlint los marca como `error` (fallo observado en el primer run de CI del repositorio remoto, corregido en el commit siguiente). La ejecución equivalente directa, la inspección de reglas y las otras comprobaciones son:

```powershell
pnpm exec oxlint --type-aware --deny-warnings .
pnpm exec oxlint --print-config
pnpm exec oxlint --rules --format json
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

`options.typeAware` también está activado en el archivo, por lo que una ejecución que lea esta configuración conserva el análisis con tipos. No se usa el modo experimental `--type-check`: `next typegen` y `tsc --noEmit` siguen siendo el control de tipos del proyecto. Oxlint necesita `oxlint-tsgolint` instalado para las reglas que consultan tipos. [Configuración oficial](https://oxc.rs/docs/guide/usage/linter/config.html).

## Reglas y alcance

Las categorías **`correctness` y `suspicious` producen errores** en los plugins nativos `typescript`, `react`, `nextjs`, `jsx-a11y`, `import`, `promise`, `unicorn` y `oxc`, además de las reglas base. No se activa globalmente estilo, rendimiento, restricciones, reglas pedantes o experimentales. Las reglas adicionales se eligen por comportamiento, sin imponer formato, orden de imports, comillas o estilo de funciones.

| Área | Reglas/decisiones relevantes | Qué protegen |
| --- | --- | --- |
| Promesas con tipos | `typescript/no-floating-promises`, `no-misused-promises`, comprobación de thenables | Operaciones asíncronas descartadas accidentalmente, promesas usadas como condiciones o devueltas a callbacks que esperan `void`. |
| Fronteras de datos | `typescript/no-explicit-any` y reglas `no-unsafe-*` | Evitar que `JSON.parse`, respuestas HTTP o casts salten la validación del contenido/servidor. Usar `unknown` y validación/guards. |
| Contratos discriminados | `typescript/switch-exhaustiveness-check` | Ramas nuevas de uniones que quedan sin tratar. |
| React | `react/rules-of-hooks`, `exhaustive-deps` y categorías de corrección/sospecha | Hooks condicionales, dependencias omitidas, mutaciones/render problemáticos y estructura JSX incorrecta. |
| Next.js | Plugin nativo `nextjs`, incluido `no-img-element` y `no-async-client-component`; `settings.next.rootDir` apunta al proyecto | Errores propios de Next, uso directo de `<img>` y componentes cliente asíncronos. |
| Accesibilidad | Plugin `jsx-a11y`, alt, destinos de enlace, nombres/labels, semántica ARIA, teclado y captions | Defectos que se pueden detectar estáticamente en JSX, incluidos los componentes mapeados. |
| Imports | Categorías del plugin y `import/no-cycle` | Exportaciones/importaciones problemáticas, dependencias circulares y efectos laterales no declarados. |
| Promesas sin información de tipos | Plugin `promise`, `catch-or-return`, `no-multiple-resolved` | Cadenas sin tratamiento y resoluciones repetidas. |
| Callbacks | `eslint/array-callback-return` | Callbacks que omiten el resultado esperado, por ejemplo al generar listados. |

Todas las reglas activas se configuran como error. `--deny-warnings` hace fallar también cualquier warning que una futura configuración introduzca; no se utiliza `--quiet` ni `--silent`. Las directivas de desactivación que ya no se necesitan se notifican como error. No se excluyen `src`, `scripts` o `tests` del análisis para obtener un resultado verde.

La lista efectiva comprobada contiene **274 reglas activas**; su hash y las opciones exactas están en [evidence/lint-rules.json](../evidence/lint-rules.json). El inventario de reglas se obtuvo del binario instalado con `--rules --format json`; la variante sin formato no emitió listado en este entorno. El [schema instalado](../node_modules/oxlint/configuration_schema.json) valida nombres y opciones disponibles en esa versión.

## Ajustes específicos del proyecto

- `Link` y `TrackedLink` se tratan como enlaces `<a>` con `href`, tanto en `settings.react.linkComponents` como en `settings.jsx-a11y.components`.
- `Image` y `Media` se tratan como imágenes para exigir `alt` también en sus usos. Un placeholder de `Media` no convierte su contenido en una fotografía real.
- No se configura `polymorphicPropName: "as"`: `as` en Next Link tiene significado de navegación y no debe interpretarse indiscriminadamente como una etiqueta HTML.
- `react/react-in-jsx-scope` está desactivada porque React 19 utiliza el runtime JSX automático. No hace falta importar `React` solo para escribir JSX.
- Imports de CSS, fuentes locales y los marcadores `server-only`/`client-only` son efectos laterales intencionales permitidos. Un nuevo efecto lateral debe justificarse, no ocultarse mediante una excepción general.
- `label-has-associated-control` admite asociación por `htmlFor` o control anidado, con profundidad de búsqueda 3; no obliga a una sola estructura visual.
- `no-floating-promises` acepta `void` explícito. **`void` no captura un rechazo**: solo declara que se descarta el retorno. Una tarea de fondo debe tener tratamiento de errores; los tests de `node:test` deben registrar explícitamente su intención o esperarse cuando corresponda. [Regla oficial](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-floating-promises.html).

Se excluyen dependencias, builds de Next, archivos generados, cachés, reportes, material de referencia y evidencias. `.local` alberga herramientas temporales y fuentes sintéticas; no forma parte del producto ni del lint habitual. Las exclusiones están enumeradas en el JSON, no dependen de carpetas de usuario ajenas al repositorio.

## Prueba de que las reglas se ejecutan

Se crearon tres archivos temporales sintéticos con defectos deliberados. La ejecución real con tipos produjo **16 errores, cero warnings y código de salida 1**. Se verificaron individualmente nueve casos:

1. Promesa abandonada: `typescript/no-floating-promises`.
2. Callback `void` asíncrono: `typescript/no-misused-promises`.
3. Hook condicional: `react/rules-of-hooks`.
4. Dependencia omitida en efecto: `react/exhaustive-deps`.
5. `alt` ausente en `<img>`, `Image` y `Media`.
6. `<img>` nativo: `nextjs/no-img-element`.
7. Destino inválido en `Link` y `TrackedLink`.
8. Importación circular entre dos archivos.
9. Dos resoluciones de la misma promesa.

Las mismas fuentes corregidas, con las mismas reglas, dieron **cero errores, cero warnings y salida 0**, y se eliminaron después. El informe incluye posiciones, códigos de regla y hashes; no contiene código de aplicación, mensajes de formulario o información personal. Los nombres que emite Oxlint pueden usar `react-hooks(...)` y `next(...)` aunque la configuración utilice los plugins nativos `react` y `nextjs`.

La selección del canario se comprobó expresamente: en esta versión, `--no-ignore` no anuló los `ignorePatterns` del JSON, y pasar solo la carpeta oculta no seleccionó archivos. Esos intentos con cero archivos **no cuentan como prueba**. La ejecución válida pasó los tres archivos explícitos, `--no-ignore` y una copia temporal de la configuración con la lista de exclusiones vacía. Se verificó igualdad de todas las otras propiedades y de las reglas, plugins, settings y opciones efectivos. No se desactivó ninguna regla.

El informe también conserva la primera pasada sobre la implementación en progreso: **65 diagnósticos**, entregados al responsable del código. Esa instantánea no es la validación final del candidato ni acredita que cada diagnóstico sea un fallo de producción. Tras corregir el código debe ejecutarse `pnpm lint` de nuevo y registrar el resultado final en [VALIDATION.md](../VALIDATION.md).

## Límites

Oxlint no sustituye `tsc`, `next build`, los tests de lógica/HTTP ni los recorridos en navegador. El plugin nativo no implica equivalencia exacta con cada regla que pudiera aportar cualquier versión de ESLint o del paquete de Next.

El análisis de `oxlint-tsgolint` usa el motor TypeScript Go, mientras el proyecto conserva su compilador TypeScript independiente. Sus capacidades y opciones de `tsconfig` pueden diferir; el canario comprobó que en esta configuración se resolvían los tipos necesarios. Tras actualizar cualquiera de esos paquetes debe repetirse el control de tipos y comprobar la cobertura del lint. [Análisis con tipos de Oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

`jsx-a11y` comprueba el código JSX. **No verifica el DOM final, contraste, reflow, foco real, semántica de controles compuestos, calidad de subtítulos ni experiencia con lector de pantalla.** Se mantienen axe, la revisión de teclado/foco y las comprobaciones visuales/manuales exigidas por el master. El lint tampoco prueba recepción de formularios, idempotencia en despliegue, veracidad del catálogo o ausencia de PII en una ejecución real.
