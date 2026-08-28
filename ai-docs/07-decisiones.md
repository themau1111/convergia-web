---
type: decisions
status: current
updated: 2026-08-26
---
# Decisiones

- Cada repositorio debe poder comprenderse y operarse sin un clon vecino.
- No enlazar documentación mediante rutas `../otro-repo`; resumir aquí la frontera.
- FastAPI es la fuente de verdad del contrato de control y la autorización de dominio.
- Next.js actúa como frontend y BFF; los tokens no pasan a Client Components.
- Vercel es el primer host soportado, con Docker standalone como salida portable.
- Auth.js integra OIDC estándar sin trasladar gestión de contraseñas a la aplicación.
- El copiloto sólo usa tools server-side y actualmente no origina llamadas.
- Mantener documentación compacta en `ai-docs/` y manuales extensos sólo cuando sean
  necesarios para operar este repositorio.

## Pendientes

- Publicación y versionado definitivo del contrato OpenAPI entre backend y web.
- Destino y requisitos finales de observabilidad productiva.
- Política de pruebas end-to-end contra ambientes sin efectos telefónicos.

Relacionado: [[02-arquitectura]], [[04-integraciones]], [[06-roadmap]].
