import { ControlApiError, getRecordingUrl } from "@/lib/control-api";

export const maxDuration = 30;
const MAX_BYTES = 32 * 1024 * 1024;

// The backend grants tenant access before any S3 bytes are requested.
export async function GET(request: Request, { params }: { params: Promise<{ callUuid: string }> }) {
  const { callUuid } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(callUuid)) return Response.json({ error: "invalid_call" }, { status: 400 });
  try {
    const { url } = await getRecordingUrl(callUuid);
    const upstream = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]) });
    if (!upstream.ok || !upstream.body) return Response.json({ error: "audio_unavailable" }, { status: 502 });
    const length = Number(upstream.headers.get("content-length"));
    if (!Number.isFinite(length) || length <= 0 || length > MAX_BYTES) {
      await upstream.body.cancel();
      return Response.json({ error: "audio_too_large" }, { status: 413 });
    }
    let received = 0;
    const body = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_BYTES) throw new Error("audio_too_large");
        controller.enqueue(chunk);
      },
    }));
    return new Response(body, { headers: { "Content-Type": "audio/wav", "Content-Length": String(length), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const code = error instanceof ControlApiError ? error.code : "";
    const status = code === "missing_session" || code === "expired_session" ? 401 : code === "control_api_403" ? 403 : code === "control_api_404" ? 404 : 503;
    return Response.json({ error: "audio_unavailable" }, { status });
  }
}
