"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, DownloadIcon, MessageCircleIcon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";

const suggestions = [
  "Dame el panorama operativo actual",
  "Genera un reporte de las campañas activas",
  "¿Qué llamadas requieren atención?",
  "Resume la actividad administrativa reciente",
];

function ToolState({ type, state }: { type: string; state?: string }) {
  const label = type.replace(/^tool-/, "").replaceAll(/([A-Z])/g, " $1").toLowerCase();
  const finished = state === "output-available";
  const failed = state === "output-error" || state === "output-denied";
  return (
    <div className={`assistant-tool-state ${failed ? "failed" : finished ? "done" : "running"}`}>
      <span aria-hidden="true">{failed ? "!" : finished ? "✓" : "…"}</span>
      {failed ? `No se pudo consultar ${label}` : finished ? `Consultado: ${label}` : `Consultando ${label}`}
    </div>
  );
}

export function AdministrativeAssistant({ organizationName, roleLabel }: { organizationName: string; roleLabel: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/assistant",
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages,
        pageContext: typeof window === "undefined" ? "/app" : `${window.location.pathname}${window.location.search}`,
      },
    }),
  }), []);
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    await sendMessage({ text: clean });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "Cerrar copiloto administrativo" : "Abrir copiloto administrativo"}
        className="assistant-launcher"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <XIcon aria-hidden="true" /> : <MessageCircleIcon aria-hidden="true" />}
        <span>Copiloto</span>
      </button>

      {open && (
        <section
          aria-label="Copiloto administrativo"
          aria-modal="false"
          className="assistant-panel"
          ref={panelRef}
          role="dialog"
        >
          <header className="assistant-header">
            <div className="assistant-identity">
              <span className="assistant-avatar"><BotIcon aria-hidden="true" /></span>
              <div><strong>Copiloto administrativo</strong><small>{organizationName} · {roleLabel}</small></div>
            </div>
            <div className="assistant-header-actions">
              {messages.length > 0 && (
                <ConversationDownload
                  aria-label="Descargar conversación como reporte"
                  filename={`reporte-cadencia-${new Date().toISOString().slice(0, 10)}.md`}
                  messages={messages}
                  size="icon-sm"
                  variant="ghost"
                ><DownloadIcon aria-hidden="true" /></ConversationDownload>
              )}
              <button aria-label="Nueva conversación" onClick={() => setMessages([])} type="button">Nueva</button>
              <button aria-label="Cerrar copiloto" onClick={() => setOpen(false)} type="button"><XIcon aria-hidden="true" /></button>
            </div>
          </header>

          <Conversation className="assistant-conversation">
            <ConversationContent className="assistant-messages">
              {!messages.length && (
                <ConversationEmptyState
                  description="Consulta campañas, llamadas, calidad, auditoría y genera reportes verificables sin salir de esta vista."
                  icon={<BotIcon aria-hidden="true" />}
                  title="¿Qué necesitas revisar?"
                >
                  <BotIcon aria-hidden="true" />
                  <div><h3>¿Qué necesitas revisar?</h3><p>Consulta datos actuales o genera un reporte sin salir de esta vista.</p></div>
                  <Suggestions className="assistant-suggestions">
                    {suggestions.map((suggestion) => (
                      <Suggestion key={suggestion} onClick={() => void submit(suggestion)} suggestion={suggestion} />
                    ))}
                  </Suggestions>
                </ConversationEmptyState>
              )}
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") return <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>;
                      if (part.type.startsWith("tool-")) {
                        const toolPart = part as { type: string; state?: string };
                        return <ToolState key={`${message.id}-${index}`} state={toolPart.state} type={toolPart.type} />;
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <div className="assistant-thinking" role="status">Preparando consulta…</div>}
              {error && <div className="assistant-error" role="alert">No pude completar la consulta. Revisa la configuración de OpenAI o inténtalo nuevamente.</div>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <form className="assistant-composer" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="assistant-input">Pregunta administrativa</label>
            <textarea
              disabled={busy}
              id="assistant-input"
              maxLength={4000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit(event as unknown as FormEvent);
                }
              }}
              placeholder="Pregunta sobre campañas, llamadas o resultados…"
              ref={inputRef}
              rows={2}
              value={input}
            />
            {busy ? (
              <button aria-label="Detener respuesta" className="assistant-send" onClick={() => stop()} type="button"><SquareIcon aria-hidden="true" /></button>
            ) : (
              <button aria-label="Enviar pregunta" className="assistant-send" disabled={!input.trim()} type="submit"><SendIcon aria-hidden="true" /></button>
            )}
          </form>
          <p className="assistant-disclaimer">Las cifras provienen de las APIs del workspace. Verifica decisiones críticas en la vista enlazada.</p>
        </section>
      )}
    </>
  );
}
