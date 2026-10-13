import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(relativePath, dependencies = {}, fetchImpl = globalThis.fetch) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported = {};
  new Function("require", "exports", "fetch", code)((name) => dependencies[name], exported, fetchImpl);
  return exported;
}
class ControlApiError extends Error { constructor(code) { super(code); this.code = code; } }
const uuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const request = () => new Request(`https://example.invalid/api/recordings/${uuid}`);
const params = () => ({ params: Promise.resolve({ callUuid: uuid }) });
function route(getRecordingUrl, fetchImpl) {
  return load("../src/app/api/recordings/[callUuid]/route.ts", { "@/lib/control-api": { ControlApiError, getRecordingUrl } }, fetchImpl).GET;
}

test("unauthenticated and cross-tenant denials never request S3", async () => {
  for (const [code, status] of [["missing_session", 401], ["expired_session", 401], ["control_api_403", 403], ["control_api_404", 404]]) {
    let fetched = false;
    const get = route(async () => { throw new ControlApiError(code); }, async () => { fetched = true; });
    const result = await get(request(), params());
    assert.equal(result.status, status);
    assert.equal(fetched, false);
  }
});

test("authorized audio streams privately without exposing the signed URL", async () => {
  let authorized = false;
  const get = route(async (callUuid) => { assert.equal(callUuid, uuid); authorized = true; return { url: "https://recordings.invalid/synthetic.wav" }; }, async () => {
    assert.equal(authorized, true);
    return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "Content-Length": "4" } });
  });
  const result = await get(request(), params());
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  assert.equal(result.headers.get("Content-Type"), "audio/wav");
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [1, 2, 3, 4]);
});

test("oversized recordings are refused before buffering", async () => {
  const get = route(async () => ({ url: "https://recordings.invalid/synthetic.wav" }), async () => new Response("synthetic", { headers: { "Content-Length": String(32*1024*1024+1) } }));
  assert.equal((await get(request(), params())).status, 413);
});

test("waveform represents the real amplitude and supports silence", () => {
  const { recordingPeaks, audioTime } = load("../src/app/app/quality/recording-waveform.ts");
  const samples = new Float32Array(1024);
  samples.fill(.8, 512);
  const peaks = recordingPeaks({ numberOfChannels: 1, length: samples.length, getChannelData: () => samples }, 8);
  assert.equal(peaks.length, 8);
  assert.ok(peaks[0] < peaks[7]);
  assert.ok(peaks.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1));
  assert.equal(audioTime(65), "1:05");
  assert.equal(audioTime(NaN), "0:00");
});
