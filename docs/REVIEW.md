# Revisión independiente del candidato Piroboom — P0 únicamente

Fecha: 2026-09-09. Revisor aislado: `final_p0_review`, GPT-6 Astra con razonamiento alto. Revisión de solo lectura; no se utilizó autoreview.

Base: `8a4f9b40cbed6ea0fd7ee85fd5308efbf8fd3e7e` (`main`, contrato documental).
Candidato final: árbol Git inmutable `7bda141c4e67bfcbd7b6dc037c129c3b88f331e3`, leído mediante `git show`. Revisión inicial completa sobre `fdc971f86a239109a234040d98e543e346f5e1cf` y revisión posterior del delta íntegro al árbol final.

Resultado: **no se identificaron P0**. El umbral aplicado es un defecto demostrable que provoca una catástrofe inmediata o inevitable y generalizada. Esta conclusión está filtrada a P0; no equivale a ausencia de defectos de otras prioridades, validación jurídica ni permiso para publicar.

Se leyó el contrato MASTER completo y la guía AGENTS. El análisis cubrió el runtime de `src/`, contenido y esquemas, configuración de Next y dependencias declaradas, arranque demo y receptor local, contratos de recepción y una selección de pruebas relevantes. Se contrastaron la lógica final del prototipo y los datos del candidato con el registro de extracción de la fuente Tiendas. No se aceptaron los resultados descritos en documentación como sustituto de leer la implementación.

Áreas examinadas:

- Seis rutas, legales, familia/ficha, 404, metadatos, sitemap, navegación y composición compartida; estilos Tailwind y componentes shadcn/Radix.
- Filtrado editorial, ausencia de productos y casos públicos, carga de fixtures exclusivamente bajo las dos opciones locales y guardas Vercel, rutas de vídeo demo y configuración de indexación.
- Tienda y cuatro casetas, horarios por ubicación y Europe/Madrid, fechas y excepciones no confirmadas, estados de campaña y diálogo.
- Contexto producto/evento/visita, campos por intención, validación compartida y servidor, almacenamiento del borrador, estados de error y confirmación, identidad de reintento.
- POST de solicitudes, origen, límites de cuerpo, configuración del receptor, recibos y códigos HTTP, timeout, ausencia de éxito fingido y minimización de respuesta/logs.
- Receptor local autenticado y ligado a loopback: SQLite privada, transacciones, unicidad, COMMIT antes de confirmar, límites persistidos, retención y separación del runtime Next.
- Semántica y foco de formularios, menú y diálogo; medios manuales; analítica desactivada por defecto y serialización segura de JSON-LD.

El delta entre ambos árboles contiene únicamente la adición de `next-env.d.ts` a `.gitignore` y la retirada de ese archivo generado del índice. Se examinó íntegramente: `tsconfig.json` conserva su inclusión, y los comandos de Next regeneran el archivo conforme a la guía TypeScript instalada. `src`, `scripts`, `content`, dependencias y configuración del runtime permanecen idénticos. No se identificaron P0 en ese delta. Las evidencias y documentación podían seguir actualizándose por el agente principal; el objeto de esta revisión es el árbol final exacto indicado.

Límites: análisis estático, sin ejecutar pruebas ni navegador durante la medición paralela del agente principal. No se realizó una segunda auditoría visual completa, auditoría de vulnerabilidades de dependencias, comprobación física de tiendas, prueba de receptor remoto/buzón real ni revisión de un despliegue. La fuente externa se contrastó contra su extracción registrada, sin nueva carga remota independiente. Los bloqueos de publicación relativos a contenido comercial, proveedor y textos legales siguen siendo condiciones externas; la revisión P0 no los levanta.
