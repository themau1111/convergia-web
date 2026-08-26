# Convergia Web

Panel de control portable para Convergia Voice Platform.

## Decisiones iniciales

- Next.js con App Router y TypeScript.
- Vercel como primer despliegue, no como dependencia de ejecución.
- `output: "standalone"` y Docker para ejecutar en cualquier host compatible.
- FastAPI es la API de control; el navegador nunca accede a AMI, AudioSocket ni a la
  base externa de un cliente.
- Auth.js integra cualquier proveedor OIDC estándar; FastAPI valida el mismo access
  token por JWKS y resuelve organización y rol en la base interna.

## Desarrollo

Requiere Node.js 22 y npm.

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

La configuración local parte de `.env.local.example`. Completa las credenciales del
tenant Auth0 Development en `.env.local`; no confirmes ese archivo.

Para habilitar el acceso se requieren issuer, audience de la API, cliente OIDC y
`AUTH_SECRET`; las
credenciales se resuelven en tiempo de ejecución. El callback que debe registrarse
en el proveedor es `/api/auth/callback/oidc` sobre el dominio de la web.
La integración nativa Auth0/Vercel puede aportar `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`,
`AUTH0_CLIENT_SECRET` y `AUTH0_SECRET`; el adaptador los acepta sin perder compatibilidad
con `AUTH_OIDC_*`. El audience continúa siendo explícito porque representa la API de
control, no la aplicación web.

## Estructura prevista

```text
src/app/          rutas y layouts
src/components/   componentes de producto reutilizables
src/features/     login, carteras, agentes, campañas y reportes
src/lib/          cliente server-side de FastAPI
src/auth.ts       sesión Auth.js y adaptador OIDC
src/lib/config/   configuración validada
```

La aplicación incluye dashboard conectado a `/v1/campaigns`, login OIDC, CRUD de
miembros e invitaciones, catálogos de fuentes/carteras/perfiles y un asistente de cinco
pasos que crea campañas como borrador. Las contraseñas, MFA y recuperación pertenecen
al proveedor de identidad. Crear una campaña no inicia llamadas automáticamente.

## Ejecución portable

La imagen usa la salida `standalone`, corre como usuario sin privilegios y expone
`GET /api/health` para sondas del proveedor. `CONTROL_API_URL` se lee sólo en el
servidor durante peticiones dinámicas; no se compila dentro del JavaScript público.
`DEPLOYMENT_VERSION` identifica el build durante despliegues graduales.
En Vercel se omite `standalone` para que su adaptador oficial empaquete las funciones;
esto no cambia el artefacto Docker de otros proveedores.

Una sola instancia no necesita caché externo. Si se escala a varias réplicas deben
compartir la clave de Server Actions durante el build y coordinar caché/revalidación,
según la guía de self-hosting de la versión instalada. Frente a un contenedor propio
se recomienda un proxy inverso o load balancer que aplique límites y timeouts.

La especificación completa vive en
`../convergia-poc/docs/PLAN_PRODUCTO_WEB_Y_AGENTE.md`.
