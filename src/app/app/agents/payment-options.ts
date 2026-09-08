import type { PaymentOptions } from "@/lib/control-api";

const PAYMENT_METHODS = [
  ["bank_transfer", "Transferencia bancaria"],
  ["spei", "SPEI"],
  ["cash", "Efectivo"],
  ["oxxo", "OXXO"],
  ["card", "Tarjeta"],
] as const;

export { PAYMENT_METHODS };

export const DEFAULT_PAYMENT_OPTIONS: PaymentOptions = {
  payment_methods: [],
  partial_payment: { enabled: false },
  deferral: { enabled: false },
  installments: { enabled: false },
  max_negotiation_attempts: 3,
};

export function normalizePaymentOptions(
  value?: Partial<PaymentOptions> | null,
): PaymentOptions {
  const partialPayment = value?.partial_payment;
  const deferral = value?.deferral;
  const installments = value?.installments;

  return {
    payment_methods: Array.isArray(value?.payment_methods)
      ? value.payment_methods.filter((method): method is string => typeof method === "string")
      : [],
    partial_payment: {
      enabled: partialPayment?.enabled === true,
      ...(typeof partialPayment?.minimum_amount === "number" && partialPayment.minimum_amount > 0
        ? { minimum_amount: partialPayment.minimum_amount }
        : {}),
    },
    deferral: {
      enabled: deferral?.enabled === true,
      ...(Number.isInteger(deferral?.max_days) && (deferral?.max_days ?? 0) > 0
        ? { max_days: deferral!.max_days }
        : {}),
    },
    installments: {
      enabled: installments?.enabled === true,
      ...(Number.isInteger(installments?.max_installments) && (installments?.max_installments ?? 0) > 0
        ? { max_installments: installments!.max_installments }
        : {}),
      ...(["weekly", "biweekly", "monthly"].includes(installments?.frequency ?? "")
        ? { frequency: installments!.frequency }
        : {}),
    },
    max_negotiation_attempts:
      Number.isInteger(value?.max_negotiation_attempts) && (value?.max_negotiation_attempts ?? 0) >= 2
        ? value!.max_negotiation_attempts!
        : DEFAULT_PAYMENT_OPTIONS.max_negotiation_attempts,
  };
}

function positiveInteger(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveAmount(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function paymentOptionsFromFormData(data: FormData): PaymentOptions {
  const partialPaymentEnabled = data.get("partial_payment_enabled") === "on";
  const deferralEnabled = data.get("deferral_enabled") === "on";
  const installmentsEnabled = data.get("installments_enabled") === "on";
  const frequency = String(data.get("installments_frequency") ?? "");

  return {
    payment_methods: data.getAll("payment_methods").map(String),
    partial_payment: {
      enabled: partialPaymentEnabled,
      ...(partialPaymentEnabled && positiveAmount(data.get("partial_payment_minimum"))
        ? { minimum_amount: positiveAmount(data.get("partial_payment_minimum")) }
        : {}),
    },
    deferral: {
      enabled: deferralEnabled,
      ...(deferralEnabled && positiveInteger(data.get("deferral_max_days"))
        ? { max_days: positiveInteger(data.get("deferral_max_days")) }
        : {}),
    },
    installments: {
      enabled: installmentsEnabled,
      ...(installmentsEnabled && positiveInteger(data.get("installments_max"))
        ? { max_installments: positiveInteger(data.get("installments_max")) }
        : {}),
      ...(installmentsEnabled && ["weekly", "biweekly", "monthly"].includes(frequency)
        ? { frequency: frequency as PaymentOptions["installments"]["frequency"] }
        : {}),
    },
    max_negotiation_attempts: Math.max(2, positiveInteger(data.get("max_negotiation_attempts")) ?? 3),
  };
}
