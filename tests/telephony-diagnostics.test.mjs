import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";

const code = ts.transpileModule(readFileSync(new URL("../src/components/campaign-report.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exported = {};
new Function("require", "exports", code)((name) => {
  if (name === "react/jsx-runtime") return jsx;
  if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
  if (name === "@/lib/telephony-results") return { telephonyResultLabel: (value) => value };
  throw new Error(`Unexpected dependency ${name}`);
}, exported);
const report = { total_attempts: 3, finished_attempts: 3, without_labels: 3,
  telephony: [{ result: "failed", count: 2 }, { result: "no_answer", count: 1 }], labels: [] };
const render = (value) => renderToStaticMarkup(React.createElement(exported.CampaignReport, { report: value, campaignId: "synthetic" }));

test("older backend without diagnostic extension still renders campaign results", () => {
  const html = render(report);
  assert.match(html, /telephony_result=failed/);
  assert.match(html, /telephony_result=no_answer/);
  assert.doesNotMatch(html, /Causas de las llamadas fallidas/);
});

test("diagnostic report distinguishes known SIP evidence from missing historical causes", () => {
  const html = render({ ...report, failure_diagnostics: { total_failed: 2, with_ami_reason: 1,
    with_hangup_cause: 1, with_sip_status: 1, without_codes: 1, unresolved_attempts: 0,
    buckets: [{ ami_reason: 8, hangup_cause: 34, sip_status: 503, error_code: "ami_originate_failed", count: 1,
      description: "SIP 503: servicio no disponible · Causa de colgado 34 · Motivo AMI 8" },
    { ami_reason: null, hangup_cause: null, sip_status: null, error_code: "ami_originate_failed", count: 1, description: "Causa no registrada" }] } });
  assert.match(html, /SIP 503: servicio no disponible/);
  assert.match(html, /Causa no registrada/);
  assert.match(html, /no se reconstruyen ni se reclasifican automáticamente/);
  assert.match(html, /Fallida y sin contestar son resultados distintos/);
});

test("unresolved outcomes on closed campaigns are flagged separately from failures", () => {
  const html = render({ ...report, failure_diagnostics: { total_failed: 0, with_ami_reason: 0,
    with_hangup_cause: 0, with_sip_status: 0, without_codes: 0, unresolved_attempts: 4, buckets: [] } });
  assert.match(html, /4.*intentos sin resultado definitivo/);
  assert.match(html, /no se cuentan como nuevas fallidas/);
});
