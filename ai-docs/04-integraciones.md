---
type: integrations
status: current
updated: 2026-10-23
---
# Integraciones

## FastAPI

`src/lib/control-api.ts` es la frontera principal. Obtiene la sesión, exige access token
y consume `CONTROL_API_URL`. FastAPI conserva autoridad sobre endpoints, permisos y
semántica de dominio. Si cambia el contrato, actualizar cliente, tipos y consumidores
en el mismo cambio de la web.

## Grabaciones

Calidad de cobranza y Calidad de encuesta cargan audio sólo mediante la API del
workspace seleccionado. `getRecordingUrl` y su Server Action conservan autorización
server-side; el navegador recibe únicamente la URL temporal de S3.

`GET /v1/quality/calls/{uuid}/recording` firma reproducción; `?download=true` firma
attachment para descarga real desde S3. El reproductor se remonta por UUID al cambiar
de llamada, ofrece reintento/renovación tras errores y obtiene un enlace nuevo para
cada descarga. No precarga audio ni usa el access token desde el navegador.

La vista de encuesta conserva agregados y presenta separadamente las grabaciones
atribuidas a su organización; no agrega transcripciones a esa vista.

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

## Audio dentro de conversación

El BFF `GET /api/recordings/:callUuid` vuelve a pedir a FastAPI una URL autorizada
por organización y sirve bytes WAV con `private, no-store`. Rechazos 401/403/404 se
conservan; la URL firmada no se expone en el proxy. Limita a 32 MiB y 20 segundos.
El navegador descarga una vez al pulsar play, calcula ondas reales y usa un Blob
local para reproducción/avance; libera su URL al cambiar de llamada o desmontarse.
Descarga conserva la URL firmada con attachment mediante Server Action.

`completed_at` nullable proviene del intento o del evento explícito de cierre del
backend; se presenta en America/Mexico_City. Sin timestamp, muestra grabación
disponible y no inventa una hora a partir del mtime del archivo.

## Importación de cobranza

Las vistas de carteras envían CSV/XLSX a `/v1/csv-portfolios/{id}/upload` mediante
BFF. Muestran contactos nuevos, actualizados, sin cambios y omitidos; aceptan
respuestas previas sin los contadores opcionales. La identidad de reimportación
pertenece a FastAPI: cartera, crédito y teléfono; sin crédito usa teléfono y nombre.
La ayuda reconoce `Total 2` y `Subcredito`; no ofrece XLS binario sin lector.
El detalle de cobranza aclara que un recordatorio puede bloquearse por saldo no positivo.
Estos cambios no alteran las rutas ni muestras de Encuestas. Publicados en producción
el 2026-10-15 (`df76a84`, `dpl_5ZMLPDiAdHN9v8Nf3UHXnERq6ckg`), con alias
`https://convergia-web.vercel.app`. Lint, tipos y build Webpack correctos; formulario
verificado con datos sintéticos en escritorio/móvil. El importador FastAPI conserva
la autoridad sobre coincidencias y validación; la web no inicia llamadas al cargar.

## Asistente de formatos de cobranza

El alta y actualización de carteras de Cobranza usan `CollectionsImportWizard`:
analizar hoja/encabezados, revisar equivalencias y separador decimal, previsualizar
conteos y confirmar. Permite recordar un formato del cliente cuando coinciden columnas.

`/api/collections-import/[...path]` sólo reenvía analyze/preview/confirm a
`/v1/collections-import`; exige sesión, origen válido, rutas acotadas y archivo <=4 MiB.
Bloquea el workspace survey y nunca expone el access token al componente.
Errores 409 de revisión obsoleta o cartera activa se muestran sin cambiar campañas.

Encuestas conserva los formularios de muestra anteriores. Su BFF
`/api/upload-csv-contacts` elige `SURVEY_CONTROL_API_URL` y falla si falta;
no cae al servidor de cobranza. La plantilla de muestra omite saldo/crédito.

`tests/collections-import-bff.test.mjs` verifica sesión, rutas, tamaño, errores y
separación de servidores; el navegador se verifica con una API sintética en memoria.
Publicado el 2026-10-16: frontend `cdcd05b`, despliegue
`dpl_7qSsfiD4vxyKXCCCo3HJU6tTNRM6` Ready en `https://convergia-web.vercel.app`.
Seis pruebas del BFF, cuatro regresiones de grabaciones, lint, tipos, build Webpack
local y build estándar de Vercel correctos. Backend de cobranza `5ab27d8`, migración 23,
salud y disponibilidad verificadas, con originación previa restaurada. La comprobación
del flujo se hizo con datos sintéticos; no se originaron llamadas de prueba.


### Propuestas IA para encabezados nuevos

El asistente de carteras incorpora un botón explícito que explica qué envía a OpenAI:
sólo etiquetas seleccionadas, sin archivo ni filas. El BFF permite `suggest-mapping`
hacia el backend de cobranza, con la misma sesión y bloqueo de Encuestas.
`CollectionsImportAi` presenta propuestas tipadas para revisar; aplicar sólo completa
campos libres, conserva asignaciones y nunca selecciona el saldo. El usuario elige
saldo y confirma la previsualización existente; la IA no importa ni llama.
Error/rechazo/límite de IA conservan el flujo manual. La respuesta se vincula a la
firma de encabezados y se descarta si cambió. Proveedor, credencial, cuotas y validación
pertenecen al backend; el navegador no recibe claves ni contacta al proveedor.
Verificación local: siete pruebas BFF, lint, tipos y navegador móvil/escritorio.
Publicado el 2026-10-16: `f9a9e69`, despliegue
`dpl_FJ3nU8kmpZ8znkQRAaAPoMzFLzFp` Ready en `https://convergia-web.vercel.app`.
Backend IA `453b05f`, salud/disponibilidad correctas y originación previa restaurada.
Ocho evals reales con encabezados ficticios: 11 propuestas aceptadas correctas de 11;
11 de 12 equivalencias esperadas. No garantiza precisión general; se mantiene revisión.

## Importación de configuración desde prompt

Corrección local 2026-10-22, pendiente de despliegue. Alta y edición usan
`PromptImportDialog`: avisa del envío del texto completo a OpenAI, admite hasta
12000 caracteres y presenta vista previa antes de aplicar. Muestra etiquetas y
avisa si no hay sugerencias; conserva las etiquetas existentes en edición.
El usuario revisa la política RAC/cobranza y las opciones de pago explícitamente.

`/api/agents/import-prompt` exige sesión vigente y origen igual al de la petición,
bloquea Encuestas, limita la lectura a 80000 bytes antes de decodificar JSON y valida
la respuesta con Zod. Reenvía sólo prompt y credencial de servidor a FastAPI;
no refleja errores internos ni contenido del proveedor. Timeout 25 s, duración
máxima de ruta 30 s; el backend tiene un único intento de 18 s. Sin caché de éxito.

Alta/edición envían perfil y `labels` en una sola petición al backend, que garantiza
atomicidad. Los fallos se presentan al usuario; no se descartan errores de etiquetas.
La edición puede vaciar textos opcionales y navega al ID de la nueva versión.
Las propuestas se deduplican por nombre conservando criterios anteriores.

Verificación local: 22 regresiones web, incluidas ocho de BFF/acciones/validación
(`node --test tests/agent-prompt-import.test.mjs`), lint, tipos y build Webpack.
React Doctor 0.9.18 sin incidencias (sin puntuación remota disponible). Navegador con
componentes reales y API/acciones simuladas: alta y edición aplican etiquetas,
guardado de edición envía propuestas y navega a la nueva versión, aviso sin etiquetas,
foco en vista previa y móvil de 390 px sin desbordamiento. Consola sin errores ni
advertencias. Estas pruebas no validan la sesión ni el proveedor del despliegue real.
Backend y proveedor son autoridades independientes; un build no demuestra la versión
desplegada.

### Diseño adaptable del importador

Revisión local 2026-10-22: el diálogo usa CSS Modules y colores semánticos para
ambos temas, con encabezado/acciones visibles y contenido con scroll propio.
Los formularios pasan a una columna en móvil; sus campos usan 16 px y controles
con objetivos táctiles de al menos 44 px. Los chips largos admiten saltos de línea,
los criterios usan textarea y las variables ya no tienen fondo claro fijo.
En edición las altas de etiquetas se concentran en el formulario; la sección de
etiquetas guardadas distingue la eliminación inmediata. Sin cambios de contrato.
Verificación de componentes reales con datos sintéticos: 320×568, 390×844,
844×390 y 1440×900, temas claro/oscuro, texto largo, foco y acciones visibles.
No sustituye validación en dispositivos físicos ni del despliegue autenticado.

### Carteras: ancho y requisitos de previsualización

Corrección local 2026-10-23, pendiente de publicar. Tras crear la cartera, el diálogo
usa hasta 1120 px en escritorio con origen y asignación en dos paneles; en móvil
pasa a una columna. Encabezado fijo, contenido con scroll propio y espacios explícitos
entre ayuda, IA, resultados de sugerencias y controles, en ambos temas.
`importPreviewBlockers` explica junto al botón cada requisito pendiente (titular,
teléfono, saldo, actualización de encabezados y límite de teléfonos). El formato
numérico, grupo y artículo no sustituyen el saldo: un archivo sin ese dato requiere
agregar una columna con el saldo real y volver a cargarlo. Se conserva la validación
de dominio del backend. La vista previa recibe foco al aparecer.
Pruebas locales: cinco casos de requisitos y siete del BFF; navegador con componentes
reales y API/acciones simuladas confirma bloqueo sin saldo y habilitación al asignarlo,
previsualización, escritorio 1440 px y móvil 390 px en temas claro/oscuro. Sin datos
reales, importaciones de producción ni llamadas.

El mensaje de IA sin propuestas ahora aclara que no se propusieron campos nuevos,
conserva las asignaciones existentes y dirige a revisar «No importar». Se distingue
el reconocimiento automático de encabezados de las sugerencias adicionales de IA;
el backend reconoce `Tel` sin necesitar al proveedor (corrección local pendiente).
