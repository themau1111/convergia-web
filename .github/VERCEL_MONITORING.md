# Monitoreo de deployments de Vercel

El workflow `vercel-deployment-monitor.yml` observa los deployments creados por la
integracion GitHub de Vercel. No compila ni despliega la aplicacion.

## Secrets requeridos

Configuralos en GitHub, en **Settings > Secrets and variables > Actions**:

- `VERCEL_TOKEN`: access token creado en Vercel, en **Account Settings > Tokens**.
  Debe pertenecer al usuario o team propietario del proyecto y solo se usa para
  consultas de lectura.
- `VERCEL_ORG_ID`: `orgId` del archivo local `.vercel/project.json`. Tambien aparece
  como Team ID en la configuracion general del team de Vercel.
- `VERCEL_PROJECT_ID`: `projectId` de `.vercel/project.json`. Tambien aparece como
  Project ID en **Project > Settings > General**.

Los IDs no autentican por si solos, pero se guardan como secrets para mantener toda
la configuracion de cuenta fuera del repositorio. `VERCEL_PROJECT_ID` permite que una
ejecucion manual encuentre el deployment mas reciente; los eventos automaticos
normalmente ya incluyen ese ID.

Para generar `.vercel/project.json` sin desplegar, ejecuta `vercel link` localmente
desde la raiz del proyecto y selecciona el proyecto existente. El directorio
`.vercel` esta excluido por `.gitignore`.

## Ejecucion

Vercel envia eventos `repository_dispatch` cuando termina un deployment conectado a
GitHub. El workflow consulta ese deployment, espera si todavia no alcanzo un estado
terminal y publica estado, environment, commit, URL y fecha en el Job Summary. En un
fallo intenta incluir las lineas relevantes del build log y hace fallar el job.

La ejecucion manual esta en **Actions > Monitor Vercel deployment > Run workflow**.
Se puede consultar el deployment mas reciente por environment o indicar un deployment
ID/URL concreto.

El workflow debe existir en la rama por defecto para recibir `repository_dispatch`.
En **Vercel > Project > Settings > Git**, conserva activa la integracion GitHub y los
eventos de deployment. No agregues un comando `vercel deploy` a este workflow.
