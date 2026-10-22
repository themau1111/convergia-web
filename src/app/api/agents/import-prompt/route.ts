import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken || (session.accessTokenExpiresAt && session.accessTokenExpiresAt * 1000 <= Date.now())) {
    return NextResponse.json({ error: "Sesión vencida; vuelve a iniciar sesión" }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  const base = process.env.CONTROL_API_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body?.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ error: "El prompt no puede estar vacío." }, { status: 422 });
    }
    const response = await fetch(`${base}/v1/agent-profiles/import-prompt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: body.prompt }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const msg = typeof data?.detail === "string" ? data.detail : `Error del servidor (${response.status})`;
      return NextResponse.json({ error: msg }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo completar la solicitud; vuelve a intentarlo." }, { status: 502 });
  }
}
