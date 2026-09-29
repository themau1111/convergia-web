"use server";

import { revalidatePath } from "next/cache";
import { createSurveyQuestionnaire, setSurveyQuestionnaireStatus } from "@/lib/control-api";

export type QuestionnaireState = { error?: string; success?: string };

function key(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100);
}

export async function createQuestionnaireAction(_: QuestionnaireState, form: FormData): Promise<QuestionnaireState> {
  const name = String(form.get("name") ?? "").trim();
  const introduction = String(form.get("introduction_text") ?? "").trim();
  const closing = String(form.get("closing_text") ?? "").trim();
  let questions: Array<{ question_key: string; position: number; prompt: string; response_kind: "yes_no" | "single_choice" | "multi_text" | "free_text" | "age_or_range"; options: string[]; rotate_options: boolean; required: boolean }>;
  try { questions = JSON.parse(String(form.get("questions_json") ?? "[]")); } catch { return { error: "Las preguntas no tienen un formato válido." }; }
  if (!name || !introduction || !closing || !questions.length || questions.some((question) => !question.prompt.trim() || !question.question_key)) return { error: "Completa nombre, presentación, cierre y todas las preguntas." };
  try {
    await createSurveyQuestionnaire({
      questionnaire_key: key(String(form.get("questionnaire_key") || name)), name,
      introduction_text: introduction, closing_text: closing,
      questions,
    });
    revalidatePath("/app/surveys"); revalidatePath("/app/surveys/questionnaires");
    return { success: "Cuestionario guardado como borrador." };
  } catch { return { error: "No fue posible guardar el cuestionario." }; }
}

export async function publishQuestionnaireAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await setSurveyQuestionnaireStatus(id, "published");
  revalidatePath("/app/surveys/questionnaires");
}
