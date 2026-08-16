import { auth, signOut } from "@/auth";
import { WorkspaceSidebarFrame } from "@/components/workspace-sidebar-frame";

export async function WorkspaceSidebar({ campaignCount, roleLabel }: { campaignCount?: number; roleLabel?: string }) {
  const session = await auth();
  const initials = (session?.user?.name || session?.user?.email || "CA").slice(0, 2).toUpperCase();
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <WorkspaceSidebarFrame campaignCount={campaignCount} footer={
      <div className="sidebar-footer">
        <div className="organization"><span className="avatar">{initials}</span><div><strong>Workspace principal</strong><small>{roleLabel || "Acceso operativo"}</small></div></div>
        <form action={logout}><button className="text-button" type="submit">Cerrar sesión</button></form>
      </div>
    } />
  );
}
