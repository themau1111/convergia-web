"use server";

import { getRecordingUrl } from "@/lib/control-api";

export async function getRecordingUrlAction(callUuid: string, download = false) {
  return getRecordingUrl(callUuid, download);
}
