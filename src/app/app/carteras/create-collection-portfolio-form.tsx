"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCsvPortfolioAction } from "./actions";
import { CollectionsImportWizard } from "./collections-import-wizard";

export function CreateCollectionPortfolioForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [portfolio, setPortfolio] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function close() { setOpen(false); setName(""); setPortfolio(null); setError(""); router.refresh(); }
  function create(event: React.FormEvent) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try { setPortfolio(await createCsvPortfolioAction(name.trim())); router.refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la cartera"); }
    });
  }
  return <Dialog open={open} onOpenChange={(next) => { if (!pending) { if (next) setOpen(true); else close(); } }}>
    <DialogTrigger asChild><button type="button" className="primary-action">Nueva cartera <span>+</span></button></DialogTrigger>
    <DialogContent className="csv-create-dialog" showCloseButton={false}>
      <DialogClose asChild><button type="button" className="csv-dialog-close" aria-label="Cerrar" disabled={pending}>×</button></DialogClose>
      <DialogHeader className="csv-create-dialog-header">
        <p className="eyebrow">Cartera de cobranza</p>
        <DialogTitle>{portfolio ? portfolio.name : "Crea y revisa tu cartera"}</DialogTitle>
        <DialogDescription>{portfolio ? "La cartera está creada. Analiza el archivo, revisa sus columnas y confirma qué contactos importar." : "Ponle un nombre. Después podrás revisar cualquier CSV o Excel antes de cargar contactos."}</DialogDescription>
      </DialogHeader>
      {portfolio ? <div className="csv-create-form"><CollectionsImportWizard portfolioId={portfolio.id} portfolioName={portfolio.name} /><button type="button" className="secondary-action" onClick={close}>Cerrar</button></div> : <form className="csv-create-form" onSubmit={create}>
        <label>Nombre de la cartera<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus placeholder="Cobranza del cliente" disabled={pending} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="csv-form-actions"><button type="button" className="secondary-action" disabled={pending} onClick={close}>Cancelar</button><button type="submit" className="primary-action" disabled={pending || !name.trim()}>{pending ? "Creando…" : "Crear y revisar archivo"}</button></div>
      </form>}
    </DialogContent>
  </Dialog>;
}
