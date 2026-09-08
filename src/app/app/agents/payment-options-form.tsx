"use client";

import { useState } from "react";
import type { PaymentOptions } from "@/lib/control-api";
import { normalizePaymentOptions, PAYMENT_METHODS } from "./payment-options";

export function PaymentOptionsForm({ paymentOptions }: { paymentOptions?: PaymentOptions }) {
  const options = normalizePaymentOptions(paymentOptions);
  const [partialEnabled, setPartialEnabled] = useState(options.partial_payment.enabled);
  const [deferralEnabled, setDeferralEnabled] = useState(options.deferral.enabled);
  const [installmentsEnabled, setInstallmentsEnabled] = useState(options.installments.enabled);

  return (
    <section className="edit-section">
      <p className="eyebrow">Opciones de pago autorizadas</p>
      <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
        El agente sólo presentará estas alternativas durante una negociación avanzada, después de intentar un compromiso de pago normal.
      </p>
      <div className="form-grid">
        <fieldset className="wide-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Métodos de pago que puede mencionar</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
            {PAYMENT_METHODS.map(([value, label]) => (
              <label key={value} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                <input type="checkbox" name="payment_methods" value={value} defaultChecked={options.payment_methods.includes(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="wide-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="partial_payment_enabled" checked={partialEnabled} onChange={(event) => setPartialEnabled(event.target.checked)} />
          Permitir pago parcial
        </label>
        <label>
          Monto mínimo de pago parcial
          <input name="partial_payment_minimum" type="number" min="0.01" step="0.01" defaultValue={options.partial_payment.minimum_amount ?? ""} disabled={!partialEnabled} placeholder="Sin mínimo" />
        </label>

        <label className="wide-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="deferral_enabled" checked={deferralEnabled} onChange={(event) => setDeferralEnabled(event.target.checked)} />
          Permitir diferimiento
        </label>
        <label>
          Máximo de días para diferir
          <input name="deferral_max_days" type="number" min="1" step="1" defaultValue={options.deferral.max_days ?? ""} disabled={!deferralEnabled} placeholder="Ej. 7" />
        </label>

        <label className="wide-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="installments_enabled" checked={installmentsEnabled} onChange={(event) => setInstallmentsEnabled(event.target.checked)} />
          Permitir parcialidades
        </label>
        <label>
          Máximo de parcialidades
          <input name="installments_max" type="number" min="1" step="1" defaultValue={options.installments.max_installments ?? ""} disabled={!installmentsEnabled} placeholder="Ej. 3" />
        </label>
        <label>
          Frecuencia de parcialidades
          <select name="installments_frequency" defaultValue={options.installments.frequency ?? ""} disabled={!installmentsEnabled}>
            <option value="">Selecciona una frecuencia</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </select>
        </label>
        <label>
          Máximo de intentos de negociación por llamada
          <input name="max_negotiation_attempts" type="number" min="2" step="1" defaultValue={options.max_negotiation_attempts} required />
        </label>
      </div>
    </section>
  );
}
