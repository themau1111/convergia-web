import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const fields = {agent_name:'Agente sintético',company_name:'Empresa ficticia',objective:'Gestionar',personality:'Clara',script:'Hola {{nombre_titular}}',flow_scenarios:'Escenarios',additional_instructions:'Sólo hoy o mañana',suggested_labels:[{name:'Devolución acordada',criteria:'Confirma devolver artículo'}]};

function load(relative, modules = {}, extra = {}) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports, require:name => {
    if (name in modules) return modules[name];
    if (name === 'zod') return require('zod');
    if (name === '@/lib/agent-prompt-import') return load('src/lib/agent-prompt-import.ts');
    throw new Error('Unexpected dependency ' + name);
  }, Response, Request, FormData, Headers, TextDecoder, Uint8Array, AbortSignal, Date, Set, JSON, ...extra});
  return exports;
}
function route({session=true,workspace='collections',status=200,result=fields,configured=true,fail=false}={}) {
  const calls=[];
  const handler=load('src/app/api/agents/import-prompt/route.ts',{
    '@/auth':{auth:async()=>session ? {accessToken:'synthetic',accessTokenExpiresAt:Math.floor(Date.now()/1000)+600}:null},
    '@/lib/control-api':{getSelectedWorkspace:async()=>({key:workspace})},
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
  }, {process:{env:{CONTROL_API_URL:configured?'https://backend.invalid':undefined}},
    fetch:async(url,init)=>{calls.push({url,init});if(fail) throw new Error('PRIVATE_MARKER');return Response.json(result,{status});}});
  return {...handler,calls};
}
function request(body=JSON.stringify({prompt:'Plantilla sintética'}),origin='https://app.invalid') {
  const req=new Request('https://app.invalid/api/agents/import-prompt',{method:'POST',headers:origin?{origin}:{},body});
  req.nextUrl=new URL(req.url);return req;
}

test('forwards prompt only and returns validated fields without caching',async()=>{
  const r=route();const res=await r.POST(request(JSON.stringify({prompt:'Plantilla sintética',token:'do-not-forward'})));
  assert.equal(res.status,200);assert.deepEqual(await res.json(),fields);
  assert.equal(r.calls[0].url,'https://backend.invalid/v1/agent-profiles/import-prompt');
  assert.deepEqual(JSON.parse(r.calls[0].init.body),{prompt:'Plantilla sintética'});
  assert.equal(res.headers.get('cache-control'),'private, no-store');
});
test('blocks session, origin, survey and missing backend before provider',async()=>{
  for(const [options,origin,status] of [[{session:false},'https://app.invalid',401],[{},'https://evil.invalid',403],[{},null,403],[{workspace:'survey'},'https://app.invalid',403],[{configured:false},'https://app.invalid',503]]) {
    const r=route(options);assert.equal((await r.POST(request(undefined,origin))).status,status);assert.equal(r.calls.length,0);
  }
});
test('rejects oversized and malformed bodies before forwarding, including escaped JSON',async()=>{
  for(const [body,status] of [['{',422],[JSON.stringify({prompt:' '}),422],[JSON.stringify({prompt:'x'.repeat(12001)}),422],['x'.repeat(80001),413],[JSON.stringify({prompt:'\n'.repeat(12000)}),422]]) {
    const r=route();assert.equal((await r.POST(request(body))).status,status);assert.equal(r.calls.length,0);
  }
});
test('rejects missing or invalid labels and does not reflect backend content',async()=>{
  for(const result of [{},{...fields,suggested_labels:undefined},{...fields,suggested_labels:[{name:42,criteria:'PRIVATE_MARKER'}]},{...fields,script:'PRIVATE_MARKER'+'x'.repeat(4000)}]) {
    const res=await route({result}).POST(request());assert.equal(res.status,502);assert.ok(!(await res.text()).includes('PRIVATE_MARKER'));
  }
});
test('preserves permission/rate errors with sanitized messages and retry-after',async()=>{
  for(const status of [401,403,422,429,503]) {
    const res=await route({status,result:{detail:'PRIVATE_MARKER'}}).POST(request());assert.equal(res.status,status);
    assert.ok(!(await res.text()).includes('PRIVATE_MARKER'));
    if(status===429) assert.equal(res.headers.get('retry-after'),'60');
  }
  const res=await route({fail:true}).POST(request());assert.equal(res.status,502);
});
test('label merge normalizes, deduplicates within proposals, and preserves existing criteria',()=>{
  const {mergeImportedLabels,labelsFromFormData}=load('src/lib/agent-prompt-import.ts');
  const result=mergeImportedLabels([{name:'Promesa',criteria:'Original'}],[{name:' promesa ',criteria:'Otra'},{name:'Visita',criteria:'Confirmada'},{name:'VISITA',criteria:'Duplicada'}]);
  assert.equal(result.length,2);assert.equal(result[0].criteria,'Original');
  const form=new FormData();form.set('labels_json',JSON.stringify(result));assert.equal(labelsFromFormData(form).length,2);
  form.set('labels_json',JSON.stringify([{name:'A',criteria:'B'},{name:' a ',criteria:'C'}]));assert.throws(()=>labelsFromFormData(form));
});
function actions(edit=false,fail=false) {
  const calls=[];
  const api={
    createAgentProfile:async p=>{calls.push(p);if(fail)throw new Error('control_api_409');return {id:'saved-version'};},
    updateAgentProfile:async(id,p)=>{calls.push({id,...p});if(fail)throw new Error('control_api_409');return {id:'saved-version'};},
  };
  const exports=load(edit?'src/app/app/agents/[id]/edit/actions.ts':'src/app/app/agents/new/actions.ts',{
    '@/lib/control-api':api,
    'next/navigation':{redirect:url=>{throw new Error('REDIRECT:'+url);}},
    'next/cache':{revalidatePath:()=>{}},
    [edit?'../../payment-options':'../payment-options']:{paymentOptionsFromFormData:()=>({})},
  });
  return {...exports,calls};
}
function form() {
  const data=new FormData();for(const [key,value]of Object.entries(fields))if(typeof value==='string')data.set(key,value);
  data.set('profile_key','synthetic');data.set('agent_definition_key','rac');data.set('labels_json',JSON.stringify(fields.suggested_labels));return data;
}
test('creation validates before persisting and submits profile plus labels atomically',async()=>{
  const a=actions();const invalid=form();invalid.set('labels_json','invalid');assert.ok((await a.createAgentAction({},invalid)).error);assert.equal(a.calls.length,0);
  await assert.rejects(a.createAgentAction({},form()),/REDIRECT:\/app\/agents\/saved-version/);
  assert.equal(a.calls.length,1);assert.equal(a.calls[0].agent_definition_key,'rac');assert.equal(a.calls[0].labels[0].name,'Devolución acordada');
  const failed=actions(false,true);assert.ok((await failed.createAgentAction({},form())).error);
});
test('editing sends explicit empty text, labels and returns the new version for navigation',async()=>{
  const a=actions(true);const data=form();data.set('additional_instructions','');data.set('script','');
  const result=await a.saveAgentEdit('old-version',{},data);assert.equal(result.savedId,'saved-version');
  assert.equal(a.calls[0].additional_instructions,'');assert.equal(a.calls[0].script,'');assert.equal(a.calls[0].labels.length,1);
  const failed=actions(true,true);assert.ok((await failed.saveAgentEdit('old-version',{},data)).error);
});
