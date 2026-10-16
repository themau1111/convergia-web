import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { WORKSPACE_COOKIE } from "@/lib/control-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.accessToken || (session.accessTokenExpiresAt && session.accessTokenExpiresAt * 1000 <= Date.now())) {
    return NextResponse.json({ error: "Sesión vencida; vuelve a iniciar sesión" }, { status: 401 });
  }
  if ((await cookies()).get(WORKSPACE_COOKIE)?.value === "survey") {
    return NextResponse.json({ error: "Este importador es exclusivo de cobranza" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  const { path } = await params;
  const valid = (path.length === 1 && ["analyze", "suggest-mapping"].includes(path[0])) ||
    (path.length === 2 && /^[0-9a-f-]{36}$/i.test(path[0]) && ["preview", "confirm"].includes(path[1]));
  if (!valid) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
  const base = process.env.CONTROL_API_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Servicio de cobranza no configurado" }, { status: 503 });
  try {
    const input = await request.formData();
    const file = input.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Selecciona un CSV o XLSX de hasta 4 MiB" }, { status: 422 });
    }
    const form = new FormData();
    form.set("file", file);
    for (const key of ["sheet", "header_row", "options", "preview_id", "format_name"]) {
      const value = input.get(key);
      if (typeof value === "string") form.set(key, value);
    }
    const response = await fetch(`${base}/v1/collections-import/${path.map(encodeURIComponent).join("/")}`, {
      method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` }, body: form,
      cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return NextResponse.json({ error: typeof data?.detail === "string" ? data.detail : `No se pudo procesar el archivo (${response.status})` }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo completar la solicitud; vuelve a intentarlo" }, { status: 502 });
  }
}
