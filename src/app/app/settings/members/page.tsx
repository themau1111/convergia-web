import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  changeMemberRole,
  getCurrentMembership,
  getMembers,
  inviteMember,
  type MemberRole,
  revokeInvitation,
  revokeMember,
} from "@/lib/control-api";

const roles: { value: MemberRole; label: string }[] = [
  { value: "owner", label: "Propietario" },
  { value: "admin", label: "Administrador" },
  { value: "operator", label: "Operador" },
  { value: "analyst", label: "Analista" },
  { value: "viewer", label: "Sólo lectura" },
];

function readRole(value: FormDataEntryValue | null): MemberRole {
  const role = String(value);
  if (!roles.some((candidate) => candidate.value === role)) throw new Error("invalid_role");
  return role as MemberRole;
}

export default async function MembersPage() {
  const [membership, members] = await Promise.all([
    getCurrentMembership(),
    getMembers().catch(() => null),
  ]);
  if (!members) redirect("/");
  const canAssignOwner = membership.role === "owner";

  async function invite(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("invalid_email");
    await inviteMember(email, readRole(formData.get("role")));
    revalidatePath("/app/settings/members");
  }

  async function updateRole(formData: FormData) {
    "use server";
    await changeMemberRole(String(formData.get("id")), readRole(formData.get("role")));
    revalidatePath("/app/settings/members");
  }

  async function revoke(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    if (formData.get("status") === "pending") await revokeInvitation(id);
    else await revokeMember(id);
    revalidatePath("/app/settings/members");
  }

  return (
    <main className="members-shell">
      <header className="members-header">
        <div><p className="eyebrow">Configuración</p><h1>Usuarios y acceso</h1><p className="muted">Invita personas, asigna responsabilidades y revoca accesos.</p></div>
        <Link href="/">← Volver al resumen</Link>
      </header>

      <section className="member-grid">
        <form action={invite} className="member-invite-card">
          <p className="eyebrow">Nueva invitación</p><h2>Dar acceso</h2>
          <label>Correo corporativo<input name="email" type="email" autoComplete="email" required placeholder="persona@empresa.com" /></label>
          <label>Rol<select name="role" defaultValue="operator">{roles.filter((role) => canAssignOwner || role.value !== "owner").map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
          <button className="primary-action" type="submit">Crear invitación</button>
          <p className="security-note">El acceso se activa cuando la persona inicia sesión con este correo verificado en el proveedor de identidad.</p>
        </form>

        <section className="member-list-card">
          <div className="section-heading"><div><p className="eyebrow">Equipo</p><h2>{members.length} accesos</h2></div></div>
          <div className="member-list">
            {members.map((member) => (
              <article className="member-row" key={`${member.status}-${member.id}`}>
                <div className="member-person"><span className="avatar">{(member.display_name || member.email || "U").slice(0, 2).toUpperCase()}</span><div><strong>{member.display_name || member.email}</strong><small>{member.status === "pending" ? "Invitación pendiente" : member.email}</small></div></div>
                {member.status === "active" ? (
                  <form action={updateRole} className="member-actions">
                    <input type="hidden" name="id" value={member.id} />
                    <select name="role" defaultValue={member.role} aria-label={`Rol de ${member.email}`}>{roles.filter((role) => canAssignOwner || role.value !== "owner").map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select>
                    <button type="submit" className="secondary-action">Guardar</button>
                  </form>
                ) : <span className="status-pill">Pendiente · {roles.find((role) => role.value === member.role)?.label}</span>}
                <form action={revoke}>
                  <input type="hidden" name="id" value={member.id} /><input type="hidden" name="status" value={member.status} />
                  <button type="submit" className="danger-action">{member.status === "pending" ? "Cancelar" : "Revocar"}</button>
                </form>
              </article>
            ))}
            {!members.length && <p className="empty-state">Aún no hay miembros ni invitaciones.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
