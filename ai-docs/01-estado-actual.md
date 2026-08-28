---
type: context
status: current
updated: 2026-08-26
---
# Estado actual

Frontend de Cadencia construido con Next.js 16, App Router, React 19 y TypeScript.
Funciona como panel autenticado y BFF de la API de control, con salida portable para
Vercel o contenedor standalone.

## Implementado

- Login OIDC mediante Auth.js, sesión server-side y protección de `/app`.
- Campañas, carteras, perfiles de agente, resultados, calidad, miembros y auditoría.
- Server Actions y rutas BFF que reenvían el access token a FastAPI.
- Copiloto administrativo con streaming y tools server-side de sólo lectura.
- Carga de contactos a través de rutas server-side.
- `GET /api/health`, Docker y build standalone fuera de Vercel.

## Deuda conocida

- Los tipos del contrato de control se mantienen manualmente en `src/lib/control-api.ts`.
- No hay suite automatizada de navegador ni contrato generado desde OpenAPI.
- La operación productiva y sus umbrales todavía dependen del destino de despliegue.

## No asumir

- Este repositorio no posee telefonía, persistencia ni autorización de dominio.
- Crear o editar una campaña no implica originar llamadas.
- Una sesión web válida no reemplaza la autorización que aplica FastAPI.
- Vercel es un destino soportado, no una dependencia obligatoria de ejecución.

Relacionado: [[02-arquitectura]], [[04-integraciones]], [[06-roadmap]].
