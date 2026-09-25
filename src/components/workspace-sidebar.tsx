import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getAvailableWorkspaces, getSelectedWorkspace, WORKSPACE_COOKIE } from "@/lib/control-api";
import { WorkspaceSidebarFrame } from "@/components/workspace-sidebar-frame";

export async function WorkspaceSidebar({ campaignCount, roleLabel }: { campaignCount?: number; roleLabel?: string }) {
  const session = await auth();
  const [workspaces, selected] = await Promise.all([getAvailableWorkspaces(), getSelectedWorkspace()]);
  const initials = (session?.user?.name || session?.user?.email || "CA").slice(0, 2).toUpperCase();
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  async function switchWorkspace(formData: FormData) {
    "use server";
    const value = String(formData.get("workspace") || "");
    if (!workspaces.some((workspace) => workspace.key === value)) return;
    (await cookies()).set(WORKSPACE_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    redirect("/");
  }
  return (
    <WorkspaceSidebarFrame campaignCount={campaignCount} workspace={selected?.key} footer={
      <div className="sidebar-footer">
        <div className="organization"><span className="avatar">{initials}</span><div><strong>{selected?.organization_name || "Sin espacio"}</strong><small>{roleLabel || "Acceso operativo"}</small></div></div>
        {workspaces.length > 1 && <form className="workspace-switcher" action={switchWorkspace}>
          <label htmlFor="workspace">Espacio de trabajo</label>
          <div className="workspace-switcher-controls">
            <select id="workspace" name="workspace" defaultValue={selected?.key}>{workspaces.map((workspace) => <option key={workspace.key} value={workspace.key}>{workspace.label}</option>)}</select>
            <button className="workspace-switch-button" type="submit">Cambiar</button>
          </div>
        </form>}
        <form className="sidebar-session" action={logout}><button className="text-button" type="submit">Cerrar sesión</button></form>
      </div>
    } />
  );
}
