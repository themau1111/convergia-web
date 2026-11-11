const OFFSETS: Record<string, string> = { "America/Mexico_City": "-06:00", "America/Monterrey": "-06:00" };

export function toIso(localValue: string, timezone: string) {
  if (!(timezone in OFFSETS)) throw new Error("Selecciona una zona horaria compatible.");
  return `${localValue}:00${OFFSETS[timezone]}`;
}

export function getMexicoDefaults(now = new Date()) {
  const local = new Date(now.getTime() - 6 * 60 * 60_000);
  if (local.getUTCHours() >= 21) local.setUTCDate(local.getUTCDate() + 1);
  const day = local.toISOString().slice(0, 10);
  return { start: `${day}T08:00`, end: `${day}T21:00` };
}

export function formatSchedule(startAt: string, endAt: string, timezone: string) {
  if (!startAt || !endAt) return "No configurado";
  const start = new Date(toIso(startAt, timezone));
  const end = new Date(toIso(endAt, timezone));
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: timezone, weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const time = new Intl.DateTimeFormat("es-MX", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true });
  const endDay = startAt.slice(0, 10) === endAt.slice(0, 10) ? "" : `${day.format(end)}, `;
  return `${day.format(start)}, ${time.format(start)} a ${endDay}${time.format(end)} (hora del centro)`;
}
