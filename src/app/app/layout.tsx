import { controlApiFailureCode, getCurrentMembership } from "@/lib/control-api";
import { AdministrativeAssistant } from "@/components/administrative-assistant";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { redirect } from "next/navigation";

const roleLabels = {
  owner: "Propietario",
  admin: "Administrador",
  operator: "Operador",
  analyst: "Analista",
  viewer: "Consulta",
} as const;

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let membership: Awaited<ReturnType<typeof getCurrentMembership>>;
  try {
    membership = await getCurrentMembership();
  } catch (error) {
    const code = controlApiFailureCode(error);
    if (code === "missing_session" || code === "expired_session" || code === "control_api_401") {
      redirect("/login?reason=session");
    }
    if (code === "control_api_403") redirect("/access");
    throw error;
  }
  const roleLabel = roleLabels[membership.role];
  return (
    <div className="app-shell">
      <WorkspaceSidebar roleLabel={roleLabel} />
      {children}
      <AdministrativeAssistant organizationName={membership.organization_name} roleLabel={roleLabel} />
    </div>
  );
}
