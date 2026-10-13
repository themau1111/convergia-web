---
type: operations
status: current
updated: 2026-09-23
---
# Operación

## Desarrollo y verificación

- Instalar con `npm install` y configurar desde `.env.local.example` sin confirmar secretos.
- Usar `npm run dev` para desarrollo.
- Ejecutar `npm run lint`, `npm run typecheck` y `npm run build` antes de entregar cambios.
- Verificar `GET /api/health` en el artefacto desplegado.
- Para la vista de encuestas, conservar resultados agregados y no renderizar valores
  de respuestas que puedan contener texto libre o datos identificables.

## Limitación local conocida

En macOS ARM, React Doctor puede no iniciar si su dependencia opcional
`oxc-parser` no obtiene el binding nativo. Además, Turbopack puede fallar al intentar
enlazar un puerto interno en entornos restringidos. En ambos casos, `npm run lint` y
`npm run typecheck` siguen siendo verificaciones obligatorias; no modificar lockfiles
ni dependencias sólo para eludir esas limitaciones locales.

## Despliegue

En Vercel, Next.js usa el adaptador oficial. Fuera de Vercel, `next.config.ts` genera
salida `standalone` consumida por Docker. `DEPLOYMENT_VERSION` identifica el build y
`CONTROL_API_URL` se resuelve en tiempo de petición del servidor.

## Guardas

- No registrar tokens, secretos ni contenido personal.
- No exponer variables server-side mediante prefijos públicos.
- Verificar conectividad y autenticación contra FastAPI sin originar llamadas.
- Una falla de autorización debe conservarse como tal; no omitir controles desde la UI.

## Escalamiento

Varias réplicas requieren claves de Server Actions coherentes y una estrategia explícita
de caché/revalidación. Un contenedor propio debe estar detrás de HTTPS y un proxy o
balanceador con límites y timeouts.

Relacionado: [[04-integraciones]], [[06-roadmap]].

## Publicación de grabaciones 2026-10-12

- Producción actualizada con autorización explícita:
  `dpl_5af3R48biS595QXqRoFZ92rvB7NB`, alias `https://convergia-web.vercel.app`.
- Lint y TypeScript correctos; build local Webpack y build Vercel Turbopack correctos.
  Turbopack local falla al abrir un puerto bajo las restricciones del entorno.
- React Doctor revisó los cinco archivos de código cambiados sin diagnósticos.
- Playwright verificó el componente real con WAVs sintéticos: cambio de llamada,
  reintento de fallos, renovación de enlace y reproducción. No se abrió información
  privada ni se originaron llamadas.
- Los dos backends externos tienen captura, subida y firma verificadas con WAVs
  sintéticos; la originación fue habilitada después por autorización explícita del usuario.

## Ajuste de controles de grabación 2026-10-12

- Producción vigente: `dpl_9TNVvhY5WRMwZBCxGqy42tntzWUU`, alias `https://convergia-web.vercel.app`.
- Reproductor compartido en calidad de cobranza y encuesta: tarjeta compacta, iconos, separación entre audio y acciones, descarga disponible desde el inicio y controles apilados en pantallas pequeñas.
- Lint, TypeScript, build local Webpack y build Vercel correctos. React Doctor sin diagnósticos en los archivos revisados.
- Componente real revisado en navegador con datos/WAVs sintéticos: reproducción, cambio de llamada, reintento, renovación y acomodo a 390 px. No se abrieron datos privados ni se originaron llamadas.

## Mensaje de audio 2026-10-12

- Producción vigente: `dpl_FAQf5YhVjQbSWFapw2LaBwCage4L`, alias `https://convergia-web.vercel.app`.
- Lint, TypeScript, build local/Vercel y `npm run test:recordings` correctos; pruebas verifican autorización antes de solicitar S3, aislamiento, límites y cálculo de ondas.
- Navegador con componente y estilos reales/WAVs sintéticos: play/pausa, avance, carga bajo demanda, cambio de llamada, reintento, hora local, descarga, móvil y tema oscuro. Sin llamadas reales ni datos privados.
- React Doctor señaló complejidad del componente, una advertencia de lifetime de Blob y captions. La URL se revoca en el cleanup de desmontaje/cambio por key; no es una fuga confirmada. El WAV es audio sin video, con controles accesibles y conversación textual separada en calidad de cobranza; no se inventaron pistas de captions. La advertencia de complejidad es de mantenibilidad, no un fallo de funcionamiento.

## Cierre Git 2026-10-12

Código y pruebas de grabaciones se publican en Git; CI incluye `test:recordings`
además de lint, TypeScript y build. Capturas, WAVs sintéticos y descargas temporales
de navegador permanecen fuera del repositorio. La publicación en Git no modifica
la originación de los backends.
