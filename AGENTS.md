<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Piroboom

- Contrato: `piroboom-handoff/MASTER_PROMPT.md`; diseño aprobado en `inputs/diseno/` relativo al contrato. No rediseñar ni publicar las fixtures como inventario.
- Node 24+, pnpm. `pnpm demo` inicia revisión local y receptor real; `pnpm build` prepara el contenido público sin fixtures.
- Comprobar con `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e`. Matriz y límites en `VALIDATION.md`.
- Contenido editable en `content/site.json`; requisitos de procedencia y publicación en `CONTENT_STATUS.md`.
- No push, despliegue ni mensajes a personas sin autorización. No usar autoreview por petición expresa; revisión aislada P0 del candidato final.
