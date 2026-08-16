export default function AppLoading() {
  return (
    <main className="route-state" aria-live="polite" aria-busy="true">
      <span className="state-code">Cadencia</span>
      <h1>Preparando tu workspace…</h1>
      <p>Estamos sincronizando la operación y sus permisos.</p>
      <div className="loading-line"><span /></div>
    </main>
  );
}
