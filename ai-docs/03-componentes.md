---
type: components
status: current
updated: 2026-08-26
---
# Componentes

- `src/app/` - rutas, layouts, páginas, Server Actions y handlers HTTP.
- `src/app/app/` - espacio autenticado del producto.
- `src/app/api/auth/` - handlers de Auth.js.
- `src/app/api/assistant/` - streaming del copiloto administrativo.
- `src/app/api/upload-*` - proxy server-side de cargas hacia FastAPI.
- `src/auth.ts` - configuración OIDC y callbacks de sesión/token.
- `src/proxy.ts` - protección de rutas antes del renderizado.
- `src/lib/control-api.ts` - tipos y cliente server-side de `/v1`.
- `src/lib/assistant/` - agente y tools administrativas.
- `src/components/` - navegación y componentes del producto.
- `src/components/ai-elements/` - primitivas de presentación del copiloto.
- `next.config.ts` - salida standalone y versión de despliegue.
- `Dockerfile` - artefacto portable sin privilegios.

Las reglas funcionales no deben desplazarse desde FastAPI hacia componentes de UI.
Relacionado: [[02-arquitectura]], [[04-integraciones]], [[05-operacion]].
