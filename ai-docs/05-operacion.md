---
type: operations
status: current
updated: 2026-08-26
---
# Operación

## Desarrollo y verificación

- Instalar con `npm install` y configurar desde `.env.local.example` sin confirmar secretos.
- Usar `npm run dev` para desarrollo.
- Ejecutar `npm run lint`, `npm run typecheck` y `npm run build` antes de entregar cambios.
- Verificar `GET /api/health` en el artefacto desplegado.

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
