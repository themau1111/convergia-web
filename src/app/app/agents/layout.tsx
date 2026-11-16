import { getCollectionsVoicePolicy, getSelectedWorkspace } from "@/lib/control-api";

export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  if ((await getSelectedWorkspace())?.key === "survey") return children;
  const policy = await getCollectionsVoicePolicy().catch(() => null);
  return <>
    {policy?.enforced && <aside className="panel" aria-label="Voz de cobranza">
      <strong>Voz de cobranza: {policy.voice_name}</strong>
      <p className="muted">Todas las campañas de cobranza usan esta voz a velocidad {policy.speed}, con las mismas mejoras de fluidez. La identidad y las reglas de cada agente se conservan.</p>
    </aside>}
    {children}
  </>;
}
