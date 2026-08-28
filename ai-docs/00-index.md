---
type: index
status: current
updated: 2026-08-26
---
# Convergia Web - mapa para IA

Entrada mínima y autosuficiente al frontend. Leer esta nota y sólo los nodos pertinentes.

## Mapa

- [[01-estado-actual]] - alcance real, implementado y deuda.
- [[02-arquitectura]] - límites, flujo de datos y seguridad.
- [[03-componentes]] - ruta o archivo a responsabilidad.
- [[04-integraciones]] - FastAPI, OIDC y OpenAI.
- [[05-operacion]] - configuración, build, salud y despliegue.
- [[06-roadmap]] - dirección sin convertir propuestas en estado actual.
- [[07-decisiones]] - decisiones y propiedad entre repositorios.
- [[99-convenciones]] - mantenimiento del mapa.

## Rutas rápidas

- UI o App Router: [[02-arquitectura]] -> [[03-componentes]].
- Autenticación o API: [[04-integraciones]] -> [[02-arquitectura]].
- Copiloto: [[02-arquitectura]] -> [[04-integraciones]].
- Despliegue o incidente: [[05-operacion]].

## Fuentes

Orden de autoridad: código y configuración ejecutada -> contrato ejecutado de FastAPI
para endpoints -> este mapa -> README -> propuestas históricas.
