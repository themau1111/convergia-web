# Correcciones de Cadencia — 3 de noviembre de 2026

Entrega sobre `origin/main` `5d1fd99`. El usuario autorizó publicación y despliegue
el 3 de noviembre de 2026. Las ramas remotas `main` y `development` coincidían
al iniciar la revisión. Vercel y GitHub Actions registran la promoción de esta entrega.

## Cambios

- El wizard envía archivo, perfil, hoja/encabezado y mapeo a un BFF nuevo
  `/api/campaign-setup/[action]`, para analizar, sugerir o confirmar.
- Se elimina el ID de archivo ficticio; confirmar entrega el archivo real a FastAPI,
  que valida y guarda atómicamente. Fallos se muestran con su mensaje accionable.
- Variables tipadas se editan y guardan junto con la versión del agente.
  Detección de placeholders, avisos de declaración/uso y exclusión de variables
  reservadas; importar prompt permite proponer sus variables para revisión.
- Mapeo corresponde a índices originales, soporta más de cinco columnas y muestra
  ejemplos del archivo. La IA sólo recibe encabezados y metadatos a través del backend.
- Resumen usa conteos de validación, aviso de archivo reutilizado y saludo interpolado.
  Cero válidos bloquea Crear; Guardar borrador conserva configuración sin programarla.
- Horarios de México 08–21, mañana desde las 21:00, y formato con zona explícita.
- Exclusiones no permiten seleccionar todas las opciones y se limpian al cambiar agente.
- Carteras se retira de la navegación de Cobranza; esa ruta redirige a crear campaña.
  Encuestas conserva su muestra de contactos. Detalle y asistente toleran borrador sin base.

Crear campaña puede dejarla programada dentro de su ventana, según preflight del
backend. Guardar borrador es la alternativa para revisar antes de habilitarla.

## Evidencia local

- Lint y TypeScript.
- `npm test` (también en CI): 32 pruebas, incluyendo seis nuevas de horarios,
  variables, contrato de confirmación, permisos/origen/workspace, tamaño y errores.
- Build de producción con Webpack.
- Navegador con componentes reales contra API local en memoria: seis pasos,
  archivo de diez columnas, mapeo nombre/saldo/tienda/atraso, saludo correcto,
  confirmación y navegación a detalle; escritorio 1440 y móvil 390, sin errores JS.
- React Doctor: sin incidencias detectadas en el diff.
- Editor en móvil: detecta dos placeholders de datos y omite `company_name`.

La identidad del navegador y su proxy son de prueba; la verificación no acredita
OIDC del despliegue ni telefonía real. La aceptación de 20 llamadas, ruido y meta
de latencia queda pendiente de una sesión explícitamente autorizada.
