"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, SendIcon, SquareIcon, XIcon } from "lucide-react";
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

const ASSISTANT_NAME = "Asistente operativo";

function getContextualSuggestions(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("campañ")) return ["Ver campañas que requieren atención", "Compara sus resultados", "Genera un reporte ejecutivo"];
  if (normalized.includes("llamada") || normalized.includes("resultado")) return ["¿Cuáles fallaron y por qué?", "Muéstrame las llamadas contestadas", "Resume los resultados recientes"];
  if (normalized.includes("calidad") || normalized.includes("conversaci")) return ["Revisa conversaciones con incidencias", "Resume los hallazgos de calidad", "¿Qué requiere seguimiento?"];
  if (normalized.includes("auditor") || normalized.includes("actividad")) return ["Resume los cambios recientes", "Filtra la actividad por campaña", "Genera un reporte de auditoría"];
  return ["Amplía este resumen", "¿Qué requiere atención primero?", "Genera un reporte con estos datos"];
}

function ExternalLinkModal({ isOpen, onClose, onConfirm, url }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; url: string }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="assistant-link-backdrop" onClick={onClose} role="presentation">
      <section aria-labelledby="assistant-link-title" aria-modal="true" className="assistant-link-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Cerrar" className="assistant-link-close" onClick={onClose} type="button"><XIcon aria-hidden="true" /></button>
        <span className="assistant-link-icon"><ExternalLinkIcon aria-hidden="true" /></span>
        <p className="eyebrow">Enlace externo</p>
        <h2 id="assistant-link-title">Vas a salir de Cadencia</h2>
        <p>Revisa el destino antes de continuar. El sitio se abrirá en una pestaña nueva.</p>
        <code>{url}</code>
        <div className="assistant-link-actions">
          <button className="secondary-action" onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); }} type="button">{copied ? <CheckIcon /> : <CopyIcon />}{copied ? "Copiado" : "Copiar enlace"}</button>
          <button className="primary-action" onClick={() => { onConfirm(); onClose(); }} type="button">Abrir enlace <ExternalLinkIcon /></button>
        </div>
      </section>
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const lastAssistantText = [...messages].reverse().find((message) => message.role === "assistant")?.parts
    .filter((part) => part.type === "text").map((part) => part.text).join(" ") ?? "";
  const contextualSuggestions = getContextualSuggestions(lastAssistantText);

  function showAssistant() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  }

  function hideAssistant() {
    setOpen(false);
    closeTimerRef.current = setTimeout(() => setMounted(false), 220);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideAssistant();
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
        aria-label={open ? `Cerrar ${ASSISTANT_NAME.toLowerCase()}` : `Abrir ${ASSISTANT_NAME.toLowerCase()}`}
        className={`assistant-launcher ${open ? "is-open" : ""}`}
        onClick={() => open ? hideAssistant() : showAssistant()}
        type="button"
      >
        <BotIcon aria-hidden="true" />
      </button>

      {mounted && (
        <section
          aria-label={ASSISTANT_NAME}
          aria-modal="false"
          className={`assistant-panel ${open ? "is-open" : "is-closing"}`}
          ref={panelRef}
          role="dialog"
        >
          <header className="assistant-header">
            <div className="assistant-identity">
              <span className="assistant-avatar"><BotIcon aria-hidden="true" /></span>
              <div><strong>{ASSISTANT_NAME}</strong><small>{organizationName} · {roleLabel}</small></div>
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
              <button aria-label="Cerrar asistente" onClick={hideAssistant} type="button"><XIcon aria-hidden="true" /></button>
            </div>
          </header>

          <Conversation className="assistant-conversation">
            <ConversationContent className="assistant-messages">
              {!messages.length && (
                <ConversationEmptyState
                  className="assistant-empty-state"
                  description="Consulta campañas, llamadas, calidad, auditoría y genera reportes verificables sin salir de esta vista."
                  icon={<BotIcon aria-hidden="true" />}
                  title="¿Qué necesitas revisar?"
                >
                  <span className="assistant-empty-icon"><BotIcon aria-hidden="true" /></span>
                  <div className="assistant-empty-copy"><h3>¿Qué necesitas revisar?</h3><p>Consulta datos actuales o genera un reporte sin salir de esta vista.</p></div>
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
                      if (part.type === "text") return <MessageResponse key={`${message.id}-${index}`} linkSafety={{ enabled: true, onLinkCheck: (url) => url.startsWith("/") || (typeof window !== "undefined" && url.startsWith(window.location.origin)), renderModal: (props) => <ExternalLinkModal {...props} /> }}>{part.text}</MessageResponse>;
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

          {messages.length > 0 && !busy && (
            <Suggestions className="assistant-followups">
              {contextualSuggestions.map((suggestion) => <Suggestion key={suggestion} onClick={() => void submit(suggestion)} suggestion={suggestion} />)}
            </Suggestions>
          )}

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
