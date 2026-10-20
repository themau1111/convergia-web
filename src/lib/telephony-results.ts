/** Shared presentation for automatic telephone outcomes, separate from agent labels. */
export const telephonyResultLabels: Record<string, string> = {
  answered: "Contestada", voicemail: "Buzón de voz", no_answer: "No contestada",
  busy: "Línea ocupada", invalid: "Número inválido", failed: "Fallida",
  pending: "Pendiente", unavailable: "Sin resultado registrado", cancelled: "Cancelada",
};
export function telephonyResultLabel(value?: string | null) {
  return value ? telephonyResultLabels[value] ?? "Sin resultado registrado" : "Sin resultado registrado";
}
