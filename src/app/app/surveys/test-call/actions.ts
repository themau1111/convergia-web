"use server";
import { startSurveyManualTestCall, startSurveyRegisteredTestCall } from "@/lib/control-api";
export type SurveyTestState = { error?: string; success?: string };
export async function startSurveyTestAction(_: SurveyTestState, form: FormData): Promise<SurveyTestState> {
  const campaign_id = String(form.get("campaign_id") ?? ""), telefono = String(form.get("telefono") ?? "").trim(), confirmed = form.get("confirmed") === "yes";
  if (!campaign_id || !telefono || !confirmed) return { error: "Selecciona una encuesta, indica el teléfono autorizado y confirma la llamada." };
  try { const call = await startSurveyManualTestCall({ campaign_id, telefono }); return { success: `Prueba iniciada (${call.call_uuid}). No se guardarán respuestas de ensayo.` }; }
  catch { return { error: "No fue posible iniciar la prueba. Verifica que la encuesta tenga un cuestionario publicado." }; }
}

export async function startRegisteredSurveyTestAction(_: SurveyTestState, form: FormData): Promise<SurveyTestState> {
  const campaign_id = String(form.get("campaign_id") ?? ""), external_client_id = String(form.get("external_client_id") ?? ""), confirmed = form.get("confirmed") === "yes";
  if (!campaign_id || !external_client_id || !confirmed) return { error: "Selecciona un contacto de la muestra y confirma la llamada." };
  try { const call = await startSurveyRegisteredTestCall({ campaign_id, external_client_id }); return { success: `Prueba registrada iniciada (${call.call_uuid}). Sus respuestas no se agregarán a resultados.` }; }
  catch { return { error: "No fue posible iniciar la prueba. Revisa que el contacto pertenezca a la muestra de esa encuesta y que el cuestionario esté publicado." }; }
}
