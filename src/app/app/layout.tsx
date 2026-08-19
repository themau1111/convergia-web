import { getCurrentMembership } from "@/lib/control-api";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

const roleLabels = {
  owner: "Propietario",
  admin: "Administrador",
  operator: "Operador",
  analyst: "Analista",
  viewer: "Consulta",
} as const;

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const membership = await getCurrentMembership().catch(() => null);
  const roleLabel = membership ? roleLabels[membership.role] : undefined;
  return <div className="app-shell"><WorkspaceSidebar roleLabel={roleLabel} />{children}</div>;
}
