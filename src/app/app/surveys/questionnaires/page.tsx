import Link from "next/link";
import { getSelectedWorkspace, getSurveyQuestionnaires } from "@/lib/control-api";
import { redirect } from "next/navigation";
import { publishQuestionnaireAction } from "./actions";
import { QuestionnaireForm } from "./questionnaire-form";

export default async function SurveyQuestionnairesPage() {
  if ((await getSelectedWorkspace())?.key !== "survey") redirect("/");
  const questionnaires = await getSurveyQuestionnaires();
  return <main className="campaign-detail-shell"><Link className="back-link" href="/app/surveys">← Volver a encuestas</Link>
    <header className="campaign-detail-header"><div><p className="eyebrow">Diseño metodológico</p><h1>Cuestionarios</h1><p className="muted">Cada versión conserva sus preguntas y sólo una versión publicada puede configurarse en una encuesta.</p></div></header>
    <div className="survey-stack"><QuestionnaireForm />
      <section className="edit-section"><p className="eyebrow">Versiones existentes</p>{questionnaires.length ? <div className="survey-list">{questionnaires.map((item) => <article key={item.id} className="survey-row"><div><strong>{item.name}</strong><small>v{item.version} · {item.questions.length} pregunta{item.questions.length === 1 ? "" : "s"} · {item.status}</small></div>{item.status === "draft" ? <form action={publishQuestionnaireAction}><input type="hidden" name="id" value={item.id}/><button className="secondary-action">Publicar versión</button></form> : <span className="status-pill">{item.status === "published" ? "Publicada" : "Retirada"}</span>}</article>)}</div> : <p className="empty-state">Todavía no hay cuestionarios.</p>}</section>
    </div></main>;
}
