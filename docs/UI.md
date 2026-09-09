# Estilos y componentes

Tailwind CSS **4.3.3** y `@tailwindcss/postcss` **4.3.3** son las últimas versiones estables comprobadas con `pnpm view` el 9 de septiembre de 2026. El lockfile fija la instalación reproducible. PostCSS se configura en `postcss.config.mjs` siguiendo las [instrucciones oficiales](https://tailwindcss.com/docs/installation/using-postcss).

`src/app/globals.css` registra colores y tipografías del diseño con `@theme inline` y usa `@apply` en los selectores semánticos compartidos. La escala de separación conserva los píxeles del prototipo. Los gradientes de marca y estados cuya cascada necesita declaraciones concretas permanecen en CSS. La aplicación compila Tailwind; no depende de un CDN.

Se importan tema y utilidades sin Preflight, una [configuración admitida por Tailwind](https://tailwindcss.com/docs/preflight#disabling-preflight), para conservar el reset y los valores de navegador ya comparados con el diseño. Se limita el escaneo a `src`; los originales, fixtures y copias de recuperación no generan utilidades. Las clases semánticas `container` y `outline` se excluyen de la generación automática para evitar colisiones; sus reglas explícitas conservan el contenedor y los botones originales.

Los componentes en `src/components/ui/` se obtuvieron del registro oficial mediante **shadcn 4.21.0**, conforme a su [instalación para un proyecto Next existente](https://ui.shadcn.com/docs/installation/next#existing-project). Se conservan como código del proyecto y se han adaptado al contrato visual:

- `Button`: composición Radix Slot y variantes CVA; amarillo, magenta, contorno claro/oscuro y tamaños del diseño. `asChild` conserva enlaces reales en las acciones de navegación, sin botones anidados. También se usa en menú, diálogo, errores y envío.
- `Input` y `Textarea`: utilidades Tailwind con tamaños, bordes, tipografía y estados inválidos del formulario. Conservan props nativas, autocompletado, límites y asociaciones accesibles.
- `Label`: primitiva Radix con las clases del formulario y asociación al control. Los radios, la casilla de fecha por definir y el selector de ocasión mantienen controles nativos.

`cn` combina clases; `class-variance-authority` declara las variantes. El preset del registro aporta componentes, no reemplaza la paleta Piroboom. No se incorporan animaciones ni iconos adicionales. Licencia: [shadcn-ui.txt](licenses/shadcn-ui.txt).

Para añadir un componente necesario:

```powershell
pnpm exec shadcn add nombre-del-componente
```

Revisar el código generado y adaptarlo a los tokens existentes. No sobrescribir componentes personalizados con `--overwrite` sin inspeccionar la diferencia. Después ejecutar lint, tipos, build y los recorridos afectados; para cambios visuales comparar con el prototipo y revisar móvil/escritorio como se describe en [VALIDATION.md](../VALIDATION.md).
