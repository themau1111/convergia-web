import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSelectedWorkspace } from "@/lib/control-api";
import { importedAgentFieldsSchema, MAX_PROMPT_BYTES, MAX_PROMPT_CHARS } from "@/lib/agent-prompt-import";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken || (session.accessTokenExpiresAt && session.accessTokenExpiresAt * 1000 <= Date.now())) {
    return NextResponse.json({ error: "Sesión vencida; vuelve a iniciar sesión" }, { status: 401 });
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  if ((await getSelectedWorkspace())?.key === "survey") {
    return NextResponse.json({ error: "Importación disponible sólo en Cobranza" }, { status: 403 });
  }
  const base = process.env.CONTROL_API_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "El prompt no puede estar vacío." }, { status: 422 });
  let prompt: string;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PROMPT_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "El cuerpo excede el límite permitido." }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (typeof body?.prompt !== "string" || !body.prompt.trim() || body.prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json({ error: `El prompt debe tener entre 1 y ${MAX_PROMPT_CHARS} caracteres.` }, { status: 422 });
    }
    prompt = body.prompt.trim();
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON válido." }, { status: 422 });
  } finally {
    reader.releaseLock();
  }
  try {
    const response = await fetch(`${base}/v1/agent-profiles/import-prompt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      const errors: Record<number, string> = {
        401: "Sesión vencida; vuelve a iniciar sesión", 403: "No tienes permisos para importar prompts.",
        413: "El prompt excede el límite permitido.", 422: "El prompt no es válido; revisa su contenido y longitud.",
        429: "Límite de análisis alcanzado. Inténtalo en un minuto.",
      };
      return NextResponse.json({ error: errors[response.status] ?? "El servicio de análisis no está disponible. Inténtalo más tarde." },
        { status: response.status, headers: { "Cache-Control": "private, no-store", ...(response.status === 429 ? { "Retry-After": "60" } : {}) } });
    }
    const result = importedAgentFieldsSchema.safeParse(await response.json());
    if (!result.success) return NextResponse.json({ error: "El análisis devolvió campos incompletos o inválidos. Inténtalo de nuevo." }, { status: 502 });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo completar el análisis. Inténtalo más tarde." }, { status: 502 });
  }
}
