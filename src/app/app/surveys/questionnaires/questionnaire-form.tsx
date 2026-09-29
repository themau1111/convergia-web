"use client";

import { useActionState, useState } from "react";
import { createQuestionnaireAction, type QuestionnaireState } from "./actions";

type DraftQuestion = { prompt: string; response_kind: "yes_no" | "single_choice" | "free_text" | "age_or_range"; options: string; required: boolean };

export function QuestionnaireForm() {
  const [state, action, pending] = useActionState<QuestionnaireState, FormData>(createQuestionnaireAction, {});
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ prompt: "¿Acepta participar en esta encuesta?", response_kind: "yes_no", options: "", required: true }]);
  const serialized = questions.map((question, index) => ({ question_key: index === 0 ? "consentimiento" : `pregunta_${index + 1}`, position: index + 1, prompt: question.prompt.trim(), response_kind: question.response_kind, options: question.response_kind === "single_choice" ? question.options.split("\n").map((option) => option.trim()).filter(Boolean) : [], rotate_options: false, required: question.required }));
  return <form action={action} className="edit-section survey-form">
    <p className="eyebrow">Nuevo cuestionario versionado</p>
    <p className="muted">Guarda un borrador. La publicación congela la versión y cualquier cambio posterior requiere una versión nueva.</p>
    <div className="form-grid">
      <label>Nombre<input name="name" required placeholder="Encuesta de percepción" /></label>
      <label>Clave estable<input name="questionnaire_key" pattern="[a-zA-Z0-9 _-]+" placeholder="percepcion_nl_2027" /></label>
      <label className="wide-field">Presentación y consentimiento<textarea name="introduction_text" required rows={3} placeholder="Hola, realizamos una encuesta... ¿acepta participar?" /></label>
      <input type="hidden" name="questions_json" value={JSON.stringify(serialized)} />
      <div className="wide-field survey-question-editor"><strong>Preguntas</strong>{questions.map((question, index) => <div className="survey-question-input" key={index}>
        <label>Pregunta {index + 1}<textarea required rows={2} value={question.prompt} onChange={(event) => setQuestions((current) => current.map((item, position) => position === index ? { ...item, prompt: event.target.value } : item))} /></label>
        <label>Tipo<select value={question.response_kind} onChange={(event) => setQuestions((current) => current.map((item, position) => position === index ? { ...item, response_kind: event.target.value as DraftQuestion["response_kind"] } : item))}><option value="yes_no">Sí / no</option><option value="single_choice">Opción única</option><option value="free_text">Texto libre</option><option value="age_or_range">Edad o rango</option></select></label>
        {question.response_kind === "single_choice" && <label className="wide-field">Opciones, una por línea<textarea required rows={3} value={question.options} onChange={(event) => setQuestions((current) => current.map((item, position) => position === index ? { ...item, options: event.target.value } : item))} /></label>}
        <label className="checkbox"><input type="checkbox" checked={question.required} onChange={(event) => setQuestions((current) => current.map((item, position) => position === index ? { ...item, required: event.target.checked } : item))} /> Obligatoria</label>
        {questions.length > 1 && <button type="button" className="text-button" onClick={() => setQuestions((current) => current.filter((_, position) => position !== index))}>Quitar pregunta</button>}
      </div>)}</div>
      <button type="button" className="secondary-action" onClick={() => setQuestions((current) => [...current, { prompt: "", response_kind: "single_choice", options: "", required: true }])}>Agregar pregunta</button>
      <label className="wide-field">Cierre<textarea name="closing_text" required rows={2} placeholder="Gracias por su tiempo." /></label>
    </div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
    <div className="edit-actions"><button className="primary-action" disabled={pending}>{pending ? "Guardando…" : "Guardar borrador"}</button></div>
  </form>;
}
