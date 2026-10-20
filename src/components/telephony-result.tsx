import { telephonyResultLabel } from "@/lib/telephony-results";

export function TelephonyResult({ value }: { value?: string | null }) {
  const tone = value === "answered" ? "answered" : value === "voicemail" ? "voicemail" : value === "failed" || value === "invalid" ? "failed" : "neutral";
  return <span className={`telephony-result telephony-result--${tone}`}>{telephonyResultLabel(value)}</span>;
}
