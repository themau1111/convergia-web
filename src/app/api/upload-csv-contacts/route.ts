export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const baseUrl = process.env.CONTROL_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 400 });
  }

  const portfolioId = formData.get("portfolio_id");
  if (!portfolioId || typeof portfolioId !== "string") {
    return NextResponse.json({ error: "portfolio_id es obligatorio" }, { status: 400 });
  }

  // Reenviar solo el archivo (sin portfolio_id) al backend
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
  }
  const upstream_form = new FormData();
  upstream_form.set("file", file);

  const upstream = await fetch(
    `${baseUrl}/v1/csv-portfolios/${encodeURIComponent(portfolioId)}/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: upstream_form,
    },
  );

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Error del servidor: ${upstream.status}`, detail: text },
      { status: upstream.status },
    );
  }

  return NextResponse.json(await upstream.json());
}
