---
type: roadmap
status: current
updated: 2026-08-26
---
# Roadmap

## Dirección vigente

- Mantener el frontend portable entre Vercel y contenedor standalone.
- Sustituir tipos manuales del cliente por un contrato OpenAPI versionado cuando el
  backend estabilice su superficie pública.
- Agregar pruebas de contrato y flujos críticos de navegador.
- Mejorar observabilidad de errores server-side, latencia y disponibilidad de FastAPI.
- Separar configuración por ambiente sin introducir secretos en el build o navegador.

## Disparadores

- Cambios frecuentes incompatibles en `/v1`: generar cliente y validar contrato en CI.
- Varias réplicas: coordinar claves, caché y revalidación.
- Incidentes difíciles de correlacionar: propagar identificadores de petición y trazas.
- Acciones del copiloto con efectos: diseñar aprobación explícita, auditoría y permisos
  antes de agregar tools mutables.

Esto describe dirección, no funcionalidad implementada.
Relacionado: [[01-estado-actual]], [[05-operacion]], [[07-decisiones]].
