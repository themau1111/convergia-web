import { appendFile } from "node:fs/promises";

const API = "https://api.vercel.com";
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 10 * 60_000;
const terminalStates = new Set(["READY", "ERROR", "CANCELED"]);

const token = process.env.VERCEL_TOKEN;
const teamId = process.env.VERCEL_ORG_ID;
const configuredProjectId = process.env.VERCEL_PROJECT_ID;
const deploymentInput = process.env.VERCEL_DEPLOYMENT_INPUT?.trim();
const environmentInput = process.env.VERCEL_ENVIRONMENT_INPUT || "all";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

let dispatch = {};
try {
  dispatch = JSON.parse(process.env.VERCEL_DISPATCH_PAYLOAD || "{}") || {};
} catch {
  throw new Error("The Vercel repository_dispatch payload is not valid JSON.");
}

function escapeMarkdown(value) {
  return String(value ?? "Unavailable")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}

function normalizeEnvironment(value) {
  if (!value) return "Preview";
  return value.toLowerCase() === "production" ? "Production" : "Preview";
}

function formatDate(value) {
  if (!value) return "Unavailable";
  const timestamp = Number(value);
  const date = new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp);
  return Number.isNaN(date.valueOf()) ? "Unavailable" : date.toISOString();
}

function deploymentState(deployment) {
  return String(deployment.readyState || deployment.state || dispatch.state?.type || "UNKNOWN").toUpperCase();
}

async function api(path, query = {}) {
  const url = new URL(path, API);
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function findDeployment() {
  let directId = deploymentInput || dispatch.id;
  if (directId?.startsWith("http")) directId = new URL(directId).hostname;
  if (directId) return api(`/v13/deployments/${encodeURIComponent(directId)}`);

  const projectId = dispatch.project?.id || configuredProjectId;
  if (!projectId) {
    throw new Error("VERCEL_PROJECT_ID is required when the event does not include a deployment ID.");
  }

  const result = await api("/v6/deployments", { projectId, limit: "100" });
  const requestedSha = dispatch.git?.sha;
  const deployments = (result.deployments || []).filter((deployment) => {
    const shaMatches = !requestedSha || deployment.meta?.githubCommitSha === requestedSha;
    const environment = deployment.target === "production" ? "production" : "preview";
    const environmentMatches = environmentInput === "all" || environmentInput === environment;
    return shaMatches && environmentMatches;
  });

  if (!deployments.length) {
    const qualifier = requestedSha ? ` for commit ${requestedSha}` : "";
    throw new Error(`No matching Vercel deployment was found${qualifier}.`);
  }
  return api(`/v13/deployments/${encodeURIComponent(deployments[0].uid || deployments[0].id)}`);
}

async function waitForDeployment(deployment) {
  const id = deployment.uid || deployment.id;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let current = deployment;

  while (!terminalStates.has(deploymentState(current))) {
    if (Date.now() >= deadline) {
      throw new Error(`Deployment ${id} did not reach a terminal state within 10 minutes.`);
    }
    console.log(`Deployment ${id}: ${deploymentState(current)}. Checking again in 15 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    current = await api(`/v13/deployments/${encodeURIComponent(id)}`);
  }
  return current;
}

function eventText(event) {
  const payload = event.payload;
  if (typeof payload === "string") return payload;
  return payload?.text || payload?.message || event.text || event.message || "";
}

function sanitizeBuildLine(line) {
  return line
    .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)[^\s]+/gi, "$1[REDACTED]")
    .replace(/((?:token|password|secret|api[_-]?key)\s*[:=]\s*)[^\s]+/gi, "$1[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replaceAll("```", "''' ");
}

async function getBuildErrors(id) {
  try {
    const result = await api(`/v3/deployments/${encodeURIComponent(id)}/events`, { limit: "100" });
    const events = Array.isArray(result) ? result : result.events || [];
    const useful = events
      .map(eventText)
      .flatMap((text) => String(text).split("\n"))
      .map((line) => sanitizeBuildLine(line.trim()))
      .filter((line) => /error|failed|failure|fatal|exception|ELIFECYCLE/i.test(line));
    return [...new Set(useful)].slice(-30);
  } catch (error) {
    console.warn(`Build logs could not be retrieved: ${error.message}`);
    return [];
  }
}

async function writeSummary(deployment, state, errors = []) {
  if (!summaryPath) return;
  const id = deployment.uid || deployment.id || dispatch.id;
  const url = deployment.url || dispatch.url;
  const fullUrl = url && !url.startsWith("http") ? `https://${url}` : url;
  const commit = deployment.meta?.githubCommitSha || dispatch.git?.sha;
  const environment = normalizeEnvironment(deployment.target || dispatch.environment);
  const createdAt = deployment.createdAt || deployment.created || dispatch.createdAt;
  const lines = [
    `# Vercel deployment: ${escapeMarkdown(state)}`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Status | **${escapeMarkdown(state)}** |`,
    `| Environment | ${escapeMarkdown(environment)} |`,
    `| Commit | ${commit ? `\`${escapeMarkdown(commit)}\`` : "Unavailable"} |`,
    `| Deployment | ${id ? `\`${escapeMarkdown(id)}\`` : "Unavailable"} |`,
    `| URL | ${fullUrl ? `[${escapeMarkdown(fullUrl)}](${fullUrl})` : "Unavailable"} |`,
    `| Created (UTC) | ${escapeMarkdown(formatDate(createdAt))} |`,
  ];

  if (dispatch.error) lines.push("", "## Vercel error", "", `\`${escapeMarkdown(dispatch.error)}\``);
  if (errors.length) {
    lines.push("", "## Relevant build log lines", "", "```text", ...errors, "```");
  } else if (state === "ERROR" || state === "CANCELED") {
    lines.push("", "> No matching error lines were available through the Vercel deployment events API. Open the deployment URL for the complete build log.");
  }
  await appendFile(summaryPath, `${lines.join("\n")}\n`);
}

async function main() {
  if (!token) throw new Error("The VERCEL_TOKEN GitHub Actions secret is not configured.");
  if (!teamId) throw new Error("The VERCEL_ORG_ID GitHub Actions secret is not configured.");

  const initial = await findDeployment();
  const deployment = await waitForDeployment(initial);
  const state = deploymentState(deployment);
  const id = deployment.uid || deployment.id;
  const errors = state === "ERROR" || state === "CANCELED" ? await getBuildErrors(id) : [];
  await writeSummary(deployment, state, errors);

  console.log(`Deployment ${id} finished with state ${state}.`);
  if (state !== "READY") process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error.message);
  if (summaryPath) {
    await appendFile(summaryPath, `# Vercel deployment monitor failed\n\n${escapeMarkdown(error.message)}\n`);
  }
  process.exitCode = 1;
});
