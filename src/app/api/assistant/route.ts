import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { createHash } from "node:crypto";

import { createAdministrativeAgent } from "@/lib/assistant/agent";
import { getCurrentMembership } from "@/lib/control-api";

export const maxDuration = 60;

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).min(1).max(30),
  pageContext: z.string().max(240).optional(),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 256_000) return Response.json({ error: "payload_too_large" }, { status: 413 });

  try {
    const membership = await getCurrentMembership();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

    const requestId = crypto.randomUUID();
    const actorHash = createHash("sha256").update(membership.subject).digest("hex");
    const agent = createAdministrativeAgent(membership, parsed.data.pageContext);
    const startedAt = Date.now();

    return createAgentUIStreamResponse({
      agent,
      uiMessages: parsed.data.messages,
      abortSignal: request.signal,
      timeout: { totalMs: 55_000 },
      headers: { "X-Assistant-Request-Id": requestId, "Cache-Control": "no-store" },
      onStepEnd: ({ toolCalls, usage }) => {
        console.info(JSON.stringify({
          event: "administrative_assistant_step",
          request_id: requestId,
          organization_id: membership.organization_id,
          actor_hash: actorHash,
          role: membership.role,
          tools: toolCalls.map((call) => call.toolName),
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          elapsed_ms: Date.now() - startedAt,
        }));
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "missing_session" || message === "expired_session" ? 401 : 503;
    console.error(JSON.stringify({ event: "administrative_assistant_error", error: message }));
    return Response.json({ error: status === 401 ? "unauthorized" : "assistant_unavailable" }, { status });
  }
}
