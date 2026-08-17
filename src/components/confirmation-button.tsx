"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";

type ConfirmationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description: string;
  confirmLabel: string;
};

export function ConfirmationButton({
  title,
  description,
  confirmLabel,
  children,
  onClick,
  ...buttonProps
}: ConfirmationButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    confirmRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  function confirm() {
    const trigger = triggerRef.current;
    const form = trigger?.form;
    setOpen(false);
    if (trigger && form) form.requestSubmit(trigger);
  }

  return (
    <>
      <button
        {...buttonProps}
        ref={triggerRef}
        type="submit"
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && (
        <div className="confirmation-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            aria-describedby="confirmation-description"
            aria-labelledby="confirmation-title"
            aria-modal="true"
            className="confirmation-modal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span aria-hidden="true" className="confirmation-icon">!</span>
            <div className="confirmation-copy">
              <p className="eyebrow">Confirmación requerida</p>
              <h2 id="confirmation-title">{title}</h2>
              <p id="confirmation-description">{description}</p>
            </div>
            <div className="confirmation-actions">
              <button className="secondary-action" type="button" onClick={() => setOpen(false)}>Volver</button>
              <button ref={confirmRef} className="danger-action" type="button" onClick={confirm}>{confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
