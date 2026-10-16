---
type: integrations
status: current
updated: 2026-10-16
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
Publicación de esta ampliación pendiente.
