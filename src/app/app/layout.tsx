import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="app-shell"><WorkspaceSidebar />{children}</div>;
}
