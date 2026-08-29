---
type: integrations
status: current
updated: 2026-08-29
---
# Integraciones

## FastAPI

`src/lib/control-api.ts` es la frontera principal. Obtiene la sesión, exige access token
y consume `CONTROL_API_URL`. FastAPI conserva autoridad sobre endpoints, permisos y
semántica de dominio. Si cambia el contrato, actualizar cliente, tipos y consumidores
en el mismo cambio de la web.

## Identidad OIDC

`src/auth.ts` acepta configuración `AUTH_OIDC_*` y compatibilidad con variables Auth0.
El audience representa la API de control. Contraseñas, MFA y recuperación pertenecen
al proveedor de identidad; la web sólo inicia esos flujos.

En las rutas `/app`, un 401 de la API o una sesión sin access token redirige a
`/login?reason=session`. Un 403 se presenta como acceso restringido, sin convertirlo
en un error genérico de React. Los demás fallos conservan una referencia de soporte y
el BFF registra únicamente su código HTTP.

## OpenAI

El copiloto usa Responses API mediante AI SDK. `OPENAI_MODEL` selecciona el modelo y
cae inicialmente en `gpt-5.6-luna`. Las tools viven del lado servidor y usan la misma
frontera autorizada de FastAPI.

## Regla entre repositorios

Este clon documenta cómo consume interfaces externas, pero no duplica su implementación.
No usar rutas relativas hacia otro repositorio. Preferir contratos versionados y enlaces
web estables cuando existan.

Relacionado: [[02-arquitectura]], [[05-operacion]], [[07-decisiones]].
