---
type: components
status: current
updated: 2026-11-06
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

## Perfiles de agente: importación desde prompt

- `src/app/api/agents/import-prompt/route.ts` — BFF autenticado (`POST`). Recibe `{prompt: string}`, valida sesión y origen, proxea a `POST /v1/agent-profiles/import-prompt` en FastAPI y devuelve los campos extraídos. Timeout 20 s. No escribe ningún perfil.
- `src/app/app/agents/prompt-import-dialog.tsx` — Componente `PromptImportDialog` reutilizable. Botón que abre un modal; el usuario pega el prompt y presiona "Analizar y rellenar campos". Al recibir respuesta pre-llena los campos del formulario padre vía callback `onImport`. Exporta el tipo `ImportedAgentFields` con los 7 campos de texto más `suggested_labels`.
- `src/app/app/agents/new/agent-form.tsx` — Incluye `PromptImportDialog` y levanta el estado de etiquetas (`pendingLabels`) para poder pre-llenarlas desde la importación.
- `src/app/app/agents/new/labels-picker.tsx` — `LabelsPicker` recibe `pending: PendingLabel[]` y `onChange` como props (estado externo). Permite pre-llenar etiquetas sugeridas por la IA al importar un prompt, sin duplicar las existentes.
- `src/app/app/agents/[id]/edit/edit-form.tsx` — Incluye `PromptImportDialog`; permite re-importar o actualizar el prompt en edición. Las etiquetas en edición se gestionan desde la página del agente, no en el formulario de edición.
- `additional_instructions` — Campo opcional en `AgentProfileRecord`, `createAgentProfile` y `updateAgentProfile` en `control-api.ts`. Almacena el contenido del prompt que no encaja en campos estructurados (variables, contexto, límites, formas de pago).

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

- Los resultados telefónicos enlazan a Calidad con `campaign_id` y
  `telephony_result`; Calidad conserva filtros en la navegación. Monitoring se
  consulta por campaña (hasta 500 filas), pero la mezcla auxiliar de logs sigue
  limitada a 200 y no aplica `campaign_id`: el filtro de campaña no garantiza
  aislamiento de esa mezcla ni cobertura de todos los intentos. La autorización
  por organización permanece en backend. No existe evaluación periódica en la UI.

## Calidad continua en development

- `/app/quality/improvements`: bandeja paginada y ejecuciones de revisión semanal,
  enlazada desde Calidad. Consume `/v1/quality/improvements` del backend seleccionado.
- `improvements/actions.ts`: Server Action autenticada; owner/admin pueden aprobar
  investigación, rechazar o solicitar ajustes con hash exacto. FastAPI vuelve a
  validar rol, tenant, estado y hash y guarda auditoría. Analyst sólo consulta.
- Aprobar una investigación no edita el agente ni despliega código. No hay parches,
  análisis de audio automático ni notificaciones externas en esta entrega.
- La UI no instala el timer: muestra ejecuciones persistidas y ausencia de historial
  si todavía no corre. Errores de API se presentan como bandeja no disponible.

## Diagnóstico de fallidas en development

`campaign-report.tsx` presenta `failure_diagnostics` de `/v1/campaigns/{id}/results`:
conteos por AMI/colgado/SIP, cobertura y causas no registradas, sin equiparar fallida
con sin contestar. Señala resultados pendientes de campañas cerradas por separado.
El campo es opcional para compatibilidad con backends anteriores.
La bandeja semanal distingue `telephony_only` y muestra códigos sin aparentar una
conversación evaluada. La web no reconstruye causas ni modifica estados históricos.
