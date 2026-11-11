import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, modules={}, extra={}) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>{if(name in modules)return modules[name];if(name==='zod')return require('zod');throw Error(name);},File,FormData,Response,Date,Set,JSON,URL,AbortSignal,Intl,...extra});
  return exports;
}

test('schedule uses Mexico local date regardless of browser timezone',()=>{
  const {getMexicoDefaults,formatSchedule}=load('src/lib/campaign-schedule.ts');
  const atSix=new Date('2026-11-04T00:00:00Z');
  atSix.getTimezoneOffset=()=>360;
  assert.equal(getMexicoDefaults(atSix).start,'2026-11-03T08:00');
  assert.equal(getMexicoDefaults(new Date('2026-11-04T03:00:00Z')).start,'2026-11-04T08:00');
  const summary=formatSchedule('2026-11-03T08:00','2026-11-03T21:00','America/Mexico_City');
  assert.match(summary,/8:00/);assert.match(summary,/9:00/);assert.doesNotMatch(summary,/2:00/);
  const overnight=formatSchedule('2026-11-03T21:00','2026-11-04T08:00','America/Mexico_City');
  assert.match(overnight,/4/);
});

test('declarations detect placeholders, preserve metadata and reject duplicates or reserved names',()=>{
  const {detectedVariables,agentVariablesSchema}=load('src/lib/agent-variables.ts');
  const detected=detectedVariables('Hola {{nombre}} de {{company_name}}, saldo {{saldo}} y {{nombre}}');
  assert.equal(detected.length,2);assert.equal(detected[1].type,'currency');
  assert.equal(detectedVariables('{{nombre}}',detected).length,2);
  assert.equal(agentVariablesSchema.safeParse([...detected,detected[0]]).success,false);
  assert.equal(agentVariablesSchema.safeParse([{...detected[0],name:'agent_name'}]).success,false);
});

function route({workspace='collections',session=true,status=201}={}) {
  const calls=[];
  const {POST}=load('src/app/api/campaign-setup/[action]/route.ts',{
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
    'next/headers':{cookies:async()=>({get:()=>({value:workspace})})},
    '@/auth':{auth:async()=>session?{accessToken:'synthetic',accessTokenExpiresAt:Math.floor(Date.now()/1000)+600}:null},
    '@/lib/control-api':{WORKSPACE_COOKIE:'synthetic'},
  },{process:{env:{CONTROL_API_URL:'https://backend.invalid'}},fetch:async(url,init)=>{calls.push({url,init});return Response.json(status===201?{id:'synthetic-id'}:{detail:'Revisa la base'},{status});}});
  return {POST,calls};
}
function request({origin='https://app.invalid',size=20}={}) {
  const form=new FormData();form.set('file',new File([new Uint8Array(size)],'synthetic.csv'));
  form.set('options','{"column_mapping":{}}');form.set('payload','{"name":"Synthetic"}');form.set('accessToken','never-forward');
  return {headers:new Headers({origin}),nextUrl:new URL('https://app.invalid/api/campaign-setup/create'),formData:async()=>form};
}

test('BFF forwards the file, payload and review options to one confirmation endpoint',async()=>{
  const {POST,calls}=route();
  const response=await POST(request(),{params:Promise.resolve({action:'create'})});
  assert.equal(response.status,200);
  assert.equal(calls[0].url,'https://backend.invalid/v1/campaign-setup/create');
  assert.ok(calls[0].init.body.get('file') instanceof File);
  assert.equal(calls[0].init.body.get('accessToken'),null);
  assert.ok(calls[0].init.body.get('payload'));assert.ok(calls[0].init.body.get('options'));
});

test('BFF rejects survey, missing session, foreign origins, routes and oversized files',async()=>{
  for(const [config,options,action,status] of [[{workspace:'survey'},{},'create',403],[{session:false},{},'create',401],[{},{origin:'https://other.invalid'},'create',403],[{},{},'unknown',404],[{},{size:4*1024*1024+1},'create',422]]) {
    const {POST,calls}=route(config);
    assert.equal((await POST(request(options),{params:Promise.resolve({action})})).status,status);
    assert.equal(calls.length,0);
  }
});

test('BFF preserves actionable validation errors',async()=>{
  const {POST}=route({status:422});
  const response=await POST(request(),{params:Promise.resolve({action:'create'})});
  assert.equal(response.status,422);assert.equal((await response.json()).error,'Revisa la base');
});
