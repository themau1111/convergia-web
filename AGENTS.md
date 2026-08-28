# Convergia Web

## Inicio

- Leer `ai-docs/00-index.md` y sólo los nodos relacionados con la tarea.
- Tratar el código y la configuración ejecutada como fuente principal.
- Consultar la documentación incluida con la versión instalada de Next.js antes de
  cambiar APIs, convenciones o estructura del App Router.

## Límites del repositorio

- Este repositorio posee el frontend Next.js, autenticación web, rutas BFF y copiloto
  administrativo.
- FastAPI posee autorización de dominio, persistencia, campañas y originación. La web
  lo consume mediante `CONTROL_API_URL`; no debe replicar esas reglas.
- La documentación necesaria para trabajar aquí debe resolver dentro de este clon. No
  agregar dependencias documentales mediante rutas `../otro-repo`.

## Guardas

- No leer ni imprimir `.env.local`, tokens, secretos, teléfonos ni transcripciones.
- No exponer credenciales ni access tokens a Client Components.
- No hacer llamadas directas desde el navegador a AMI, AudioSocket, bases de clientes
  o proveedores internos.
- No originar llamadas como prueba automática. Las acciones de prueba manual requieren
  una intención explícita del usuario y autorización del backend.
- Mantener `CONTROL_API_URL` y credenciales OIDC exclusivamente del lado servidor.

## Verificación

- Ejecutar `npm run lint`, `npm run typecheck` y `npm run build` según el alcance.
- Para cambios de interfaz, verificar la ruta afectada y errores de consola en navegador.
- Actualizar el nodo mínimo de `ai-docs/` cuando cambien arquitectura, integración,
  operación o roadmap.

## Skills portables

- `.agents/skills/convergia-web-project-context`
- `.agents/skills/convergia-web-docs-maintainer`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
