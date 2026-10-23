import type { ImportMapping } from "./collections-import";

export const requiredImportFields = [
  ["nombre", "Nombre del titular"],
  ["telefono", "Teléfono"],
  ["saldo_pendiente", "Saldo a gestionar"],
] as const;

export function importPreviewBlockers({ hasFile, hasSheet, headerRow, analyzedHeaderRow, mapping }: {
  hasFile: boolean; hasSheet: boolean; headerRow: number; analyzedHeaderRow?: number; mapping: ImportMapping;
}): string[] {
  if (!hasFile) return ["Selecciona un archivo CSV o XLSX."];
  if (!hasSheet) return ["Analiza el archivo para revisar sus columnas."];
  const blockers: string[] = [];
  if (!Number.isInteger(headerRow) || headerRow < 1 || headerRow > 50) {
    blockers.push("Indica una fila de encabezados entre 1 y 50.");
  } else if (headerRow !== analyzedHeaderRow) {
    blockers.push("Pulsa Actualizar encabezados para aplicar la fila seleccionada.");
  }
  for (const [key, label] of requiredImportFields) {
    if (!mapping[key]?.length) blockers.push(`Asigna una columna a ${label}.`);
  }
  if ((mapping.telefono?.length ?? 0) > 5) blockers.push("Selecciona como máximo cinco columnas de teléfono.");
  return blockers;
}
