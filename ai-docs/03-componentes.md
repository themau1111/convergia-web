---
type: components
status: current
updated: 2026-11-26
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
- `src/app/app/agents/prompt-import-dialog.tsx` — Componente `PromptImportDialog` reutilizable. Acepta `initialPrompt?: string`; cuando tiene valor el botón dice "Ver prompt" y el textarea se pre-llena con el prompt guardado. Sin valor el botón dice "Importar desde prompt". Al recibir respuesta de la IA pre-llena los campos del formulario padre vía callback `onImport` y persiste el texto editado como `source_prompt`.
- `src/app/app/agents/new/agent-form.tsx` — Incluye `PromptImportDialog`; persiste `source_prompt` en campo oculto para enviarlo a la Server Action.
- `src/app/app/agents/new/labels-picker.tsx` — `LabelsPicker` recibe `pending: PendingLabel[]` y `onChange` como props (estado externo). Permite pre-llenar etiquetas sugeridas por la IA al importar un prompt, sin duplicar las existentes.
- `src/app/app/agents/[id]/edit/edit-form.tsx` — Incluye `PromptImportDialog` con `initialPrompt={agent.source_prompt ?? ""}`. Persiste el prompt editado en campo oculto. Muestra "Ver prompt" si `source_prompt` tiene valor, "Importar desde prompt" si es null.
- `src/app/app/agents/page.tsx` — Lista de agentes; cada fila incluye botón ↗ (detalle) y botón 🗑 (`DeleteAgentButton`) agrupados en flex. La eliminación usa soft delete en el backend; solo bloquea cuando hay campañas en estado activo (draft/scheduled/running/paused); campañas completadas o canceladas no impiden el borrado.
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

## Wizard de campaña — corrección local 2026-11-03

- `campaign-wizard.tsx`: agente, base, variables, dialer, ventana y resumen.
  Precarga variables versionadas y etiquetas; cambiar agente limpia selecciones/base.
- `/api/campaign-setup/[action]`: BFF de `analyze`, `suggest-mapping`, `create`;
  reenvía archivo/opciones/payload a `/v1/campaign-setup` con credencial server-side.
  Exige sesión, origen válido, archivo <=4 MiB y bloquea el workspace de Encuestas.
- El mapeo usa índices reales (columna 0 siempre teléfono). Confirmar envía el archivo
  real y el mapeo; la API revalida, guarda todo o revierte todo y hace preflight.
  Errores se presentan al usuario; no se usa un `contact_file_id` inexistente.
- Preview local autenticado muestra ejemplos, conteos de teléfonos/tipos/duplicados,
  reutilización y saludo del agente. Crear se bloquea con cero válidos; se puede
  conservar borrador. Crear programa la campaña: la ventana puede habilitar llamadas.
- `campaign-schedule.ts`: defaults 08–21 de México, cambia al día siguiente desde
  las 21:00; formato con Intl y zona explícita, independiente de la zona del navegador.
- `agents/variables-editor.tsx`: alta/edición de nombre, tipo, requerida y descripción,
  detección de placeholders y avisos usadas/no declaradas y declaradas/no usadas.
  Se envían con el perfil en una transacción; extracción del prompt propone variables.
- Navegación de Cobranza elimina Carteras; su ruta redirige a nueva campaña.
  Encuestas conserva su muestra e importador. Borradores sin base se muestran sin fallar.
- Publicación autorizada en producción el 2026-11-03. Regresiones de BFF, variables y horarios en
  `tests/campaign-setup.test.mjs`; evidencia en `docs/REVISION_CADENCIA_2026-11-03.md`.

## Diagnóstico de fallidas en development

`campaign-report.tsx` presenta `failure_diagnostics` de `/v1/campaigns/{id}/results`:
conteos por AMI/colgado/SIP, cobertura y causas no registradas, sin equiparar fallida
con sin contestar. Señala resultados pendientes de campañas cerradas por separado.
El campo es opcional para compatibilidad con backends anteriores.
La bandeja semanal distingue `telephony_only` y muestra códigos sin aparentar una
conversación evaluada. La web no reconstruye causas ni modifica estados históricos.

## Gestión de agentes — Nov 2026

- `src/app/app/agents/layout.tsx` — Layout de la sección de agentes. Envuelve en
  `<div class="agents-layout">` (no Fragment) para ser un solo hijo del grid `.app-shell`
  de 2 columnas; evita que `main.members-shell` caiga en una fila invisible.
  Muestra `<aside class="voice-policy-banner">` cuando hay política de voz centralizada
  activa (`policy.enforced`).
- `src/app/app/agents/actions.ts` — Server Action `deleteAgentAction`: llama a
  `DELETE /v1/agent-profiles/{id}`, revalida `/app/agents` y redirige. Devuelve error
  descriptivo si el perfil está en uso (409) o sin permisos (401/403).
- `src/app/app/agents/delete-agent-button.tsx` — Componente cliente `DeleteAgentButton`.
  Muestra icono `✕` rojo junto al `↗` de cada fila; pide `confirm()` nativo antes de
  enviar. Usa `useActionState` y `toast.error` para errores sin navegación.
- `src/app/app/agents/page.tsx` — Lista de perfiles; incluye `DeleteAgentButton` en
  cada fila. Los agentes en uso por campañas no se pueden eliminar (error del backend).
- CSS `.agents-layout` (flex column, min-width 0) y `.voice-policy-banner` (banner
  superior con padding responsive); `.danger-icon-button` para el color rojo del botón.
