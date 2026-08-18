"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveCampaignEdit, type EditState } from "./actions";
import type { CampaignDetail } from "@/lib/control-api";

const timezoneOffsets: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

function toLocalValue(iso: string, timezone: string): string {
  // Convierte "2026-08-20T10:00:00-06:00" → "2026-08-20T10:00"
  // El backend ya almacena con offset, datetime-local necesita sin zona
  const offset = timezoneOffsets[timezone] ?? "-06:00";
  const withoutOffset = iso.replace(offset, "").replace(/Z$/, "").slice(0, 16);
  return withoutOffset;
}

export function EditCampaignForm({ campaign }: { campaign: CampaignDetail }) {
  const action = saveCampaignEdit.bind(null, campaign.id);
  const [state, formAction, pending] = useActionState<EditState, FormData>(action, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success("Cambios guardados", { description: state.ok });
      router.push(`/app/campaigns/${campaign.id}`);
    } else if (state.error) {
      toast.error("Error al guardar", { description: state.error });
    }
  }, [state, campaign.id, router]);

  const tz = campaign.schedule.timezone;
  const startDefault = toLocalValue(campaign.schedule.start_at as unknown as string, tz);
  const endDefault = toLocalValue(campaign.schedule.end_at as unknown as string, tz);

  return (
    <form action={formAction} className="campaign-edit-form">
      <section className="edit-section">
        <p className="eyebrow">Identidad</p>
        <div className="form-grid">
          <label className="wide-field">
            Nombre de la campaña
            <input name="name" required defaultValue={campaign.name} maxLength={120} />
          </label>
          <label className="wide-field">
            Notas operativas
            <textarea name="notes" defaultValue={campaign.notes ?? ""} maxLength={500} rows={3} placeholder="Contexto operativo opcional" />
          </label>
        </div>
      </section>

      <section className="edit-section">
        <p className="eyebrow">Programación</p>
        <div className="form-grid">
          <label>
            Inicio
            <input type="datetime-local" name="start_at" required defaultValue={startDefault} />
          </label>
          <label>
            Fin
            <input type="datetime-local" name="end_at" required defaultValue={endDefault} />
          </label>
          <label>
            Zona horaria
            <select name="timezone" defaultValue={tz}>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/Monterrey">America/Monterrey</option>
            </select>
          </label>
          <label>
            Minutos entre reintentos
            <input type="number" name="retry_minutes" min="1" max="1440"
              defaultValue={campaign.schedule.retry_minutes} />
          </label>
          <label>
            Máximo de intentos
            <input type="number" name="max_attempts_per_recipient" min="1" max="20"
              defaultValue={campaign.schedule.max_attempts_per_recipient} />
          </label>
        </div>
      </section>

      <div className="edit-actions">
        <button type="button" className="secondary-action"
          onClick={() => router.push(`/app/campaigns/${campaign.id}`)}>
          Cancelar
        </button>
        <button type="submit" className="primary-action" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
