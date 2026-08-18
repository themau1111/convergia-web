export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> },
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { portfolioId } = await params;
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

  const upstream = await fetch(
    `${baseUrl}/v1/portfolios/${encodeURIComponent(portfolioId)}/contacts/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: formData,
    },
  );

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Error del servidor: ${upstream.status}`, detail: text },
      { status: upstream.status },
    );
  }

  const result = await upstream.json();
  return NextResponse.json(result);
}
