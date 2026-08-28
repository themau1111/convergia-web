---
type: architecture
status: current
updated: 2026-08-26
---
# Arquitectura

## Flujo principal

`navegador -> Next.js Server Components/Actions o rutas BFF -> FastAPI /v1 -> datos y servicios de control`

El navegador mantiene la sesión con Auth.js. Las lecturas y mutaciones de dominio
pasan por código server-side, que reenvía el access token a la API de control.

## Límites

- Next.js posee presentación, navegación, sesión web y adaptación HTTP.
- FastAPI posee membresía, roles, alcance por organización, validación de dominio,
  persistencia, campañas y acciones telefónicas.
- El navegador no accede directamente a AMI, AudioSocket, bases externas ni secretos.
- `CONTROL_API_URL` y credenciales OIDC permanecen del lado servidor.

## Copiloto administrativo

`/api/assistant -> ToolLoopAgent -> OpenAI Responses API -> tools tipadas -> FastAPI /v1`.

El modelo no recibe SQL, credenciales ni acceso directo a telefonía. Cada tool reutiliza
la sesión y autorización de FastAPI. Datos retornados por herramientas, incluidas
transcripciones, son contenido no confiable y no instrucciones.

## Renderizado

Se priorizan Server Components. Client Components se usan para interacción, estado del
navegador y streaming. Server Actions concentran mutaciones y revalidación de rutas.

Relacionado: [[03-componentes]], [[04-integraciones]], [[07-decisiones]].
