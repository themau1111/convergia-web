---
type: components
status: current
updated: 2026-10-20
---
# Componentes

- `src/app/` - rutas, layouts, páginas, Server Actions y handlers HTTP.
- `src/app/app/` - espacio autenticado del producto.
- `src/app/app/surveys/` - listado y resultados agregados separados de campañas de
  tipo encuesta; no contiene reglas metodológicas, microdatos ni marcación.
- `src/app/api/auth/` - handlers de Auth.js.
- `src/app/api/assistant/` - streaming del copiloto administrativo.
- `src/app/api/upload-*` - proxy server-side de cargas hacia FastAPI.
- `src/app/app/quality/actions.ts` - Server Action `getRecordingUrlAction` que obtiene la URL firmada de S3 desde FastAPI.
- `src/app/app/quality/recording-player.tsx` - Mensaje de llamada finalizada compartido por calidad de cobranza/encuesta: play/pausa, avance sobre ondas reales, duración, hora e icono; en cobranza es el último elemento del scroll conversacional. Audio bajo demanda, reintento y descarga WAV como attachment.
- `src/app/app/quality/recording-waveform.ts` - RMS de 48 barras a partir del WAV decodificado; conserva silencio, no fabrica una forma de onda.
- `src/app/api/recordings/[callUuid]/route.ts` - BFF privado que obtiene autorización de FastAPI antes de servir audio, sin CORS público ni caché compartida.
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

## Cobranza: filtros y reporte

- `src/components/collection-filters.tsx`: formularios GET compartibles; campañas
  por nombre, estado y fecha de creación inclusiva en America/Mexico_City; agentes
  por texto parcial de nombre, empresa o clave, ignorando mayúsculas y acentos.
- `src/components/campaign-report.tsx`: reporte único dentro del detalle de campaña,
  consumiendo `/v1/campaigns/{id}/results`; agrega todos los intentos y corridas,
  separa telefonía de etiquetas y muestra criterios, conteos y porcentajes por intento.
  Las etiquetas son las actuales del perfil; no hay reclasificación histórica.
- `/app/results` permite abrir el reporte de cualquier campaña desde su primer
  intento, sin duplicar tablas. El detalle conserva los intentos como desglose técnico.
- Historial de cambios: estados traducidos y colores semánticos en ambos temas.

- `src/components/telephony-result.tsx` y `src/lib/telephony-results.ts` comparten
  traducciones y estilos para contestada, buzón, no contestada, ocupado, inválido,
  fallida, pendiente, cancelada y sin resultado registrado. Aparecen en el reporte,
  tabla semántica de intentos y Calidad; las etiquetas quedan en un bloque aparte.
  Contestada no significa promesa de pago. Calidad conserva metadatos si no hay
  conversación disponible; la tabla tiene scroll horizontal interno en móvil.
