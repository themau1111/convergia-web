import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const directory=path.dirname(fileURLToPath(import.meta.url));

const id='11111111-1111-4111-8111-111111111111';
function load(relative, {workspace='collections',session=true,configured=true,status=200}={}) {
  const calls=[];
  const source=fs.readFileSync(path.join(directory,'..',relative),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const modules={
    'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},
    'next/headers':{cookies:async()=>({get:()=>({value:workspace})})},
    '@/auth':{auth:async()=>session?{accessToken:'synthetic-session',accessTokenExpiresAt:Math.floor(Date.now()/1000)+3600}:null},
    '@/lib/control-api':{WORKSPACE_COOKIE:'synthetic-workspace'},
  };
  const context={exports,require:name=>{if(!(name in modules))throw new Error('Unexpected dependency '+name);return modules[name];},
    process:{env:{CONTROL_API_URL:'https://collections.invalid',SURVEY_CONTROL_API_URL:configured?'https://survey.invalid':undefined}},
    File,FormData,Response,Request,URL,Date,AbortSignal,
    fetch:async(url,init)=>{calls.push({url,init});return Response.json(status===200?{inserted:1,updated:0,unchanged:0,skipped:0,errors:[]}:{detail:'Pausa la campaña antes de importar'},{status});},
  };
  vm.runInNewContext(js,context);
  return {POST:exports.POST,calls};
}
function request(form,origin='https://app.invalid') {
  const url=new URL('https://app.invalid/api/collections-import/'+id+'/confirm');
  return {formData:async()=>form,headers:new Headers({origin}),nextUrl:url};
}
function form() {
  const value=new FormData();value.set('file',new File(['synthetic'],'test.csv',{type:'text/csv'}));value.set('preview_id','synthetic-preview');value.set('portfolio_id',id);return value;
}
const guided='src/app/api/collections-import/[...path]/route.ts';
const legacy='src/app/api/upload-csv-contacts/route.ts';

test('guided confirmation forwards only allowed fields to collections backend',async()=>{
  const route=load(guided);const body=form();body.set('accessToken','do-not-forward');
  const response=await route.POST(request(body),{params:Promise.resolve({path:[id,'confirm']})});
  assert.equal(response.status,200);assert.equal(route.calls[0].url,'https://collections.invalid/v1/collections-import/'+id+'/confirm');
  assert.equal(route.calls[0].init.body.get('preview_id'),'synthetic-preview');
  assert.equal(route.calls[0].init.body.get('accessToken'),null);
  assert.equal(route.calls[0].init.body.get('portfolio_id'),null);
});
test('survey workspace cannot reach guided collections importer',async()=>{
  const route=load(guided,{workspace:'survey'});
  assert.equal((await route.POST(request(form()),{params:Promise.resolve({path:['analyze']})})).status,403);
  assert.equal(route.calls.length,0);
});
test('guided upload requires a session and same origin',async()=>{
  let route=load(guided,{session:false});
  assert.equal((await route.POST(request(form()),{params:Promise.resolve({path:['analyze']})})).status,401);
  route=load(guided);
  assert.equal((await route.POST(request(form(),'https://foreign.invalid'),{params:Promise.resolve({path:['analyze']})})).status,403);
  assert.equal(route.calls.length,0);
});
test('invalid routes and oversized files never reach backend',async()=>{
  const route=load(guided);
  assert.equal((await route.POST(request(form()),{params:Promise.resolve({path:[id,'unexpected']})})).status,404);
  const body=form();body.set('file',new File([new Uint8Array(4*1024*1024+1)],'big.xlsx'));
  assert.equal((await route.POST(request(body),{params:Promise.resolve({path:['analyze']})})).status,422);
  assert.equal(route.calls.length,0);
});
test('backend conflicts remain actionable in UI',async()=>{
  const route=load(guided,{status:409});
  const response=await route.POST(request(form()),{params:Promise.resolve({path:[id,'confirm']})});
  assert.equal(response.status,409);assert.equal((await response.json()).error,'Pausa la campaña antes de importar');
});
test('legacy sample upload targets survey backend and never falls back to collections',async()=>{
  let route=load(legacy,{workspace:'survey'});
  assert.equal((await route.POST(request(form()))).status,200);
  assert.equal(route.calls[0].url,'https://survey.invalid/v1/csv-portfolios/'+id+'/upload');
  route=load(legacy,{workspace:'survey',configured:false});
  assert.equal((await route.POST(request(form()))).status,500);
  assert.equal(route.calls.length,0);
});

test('AI mapping route forwards only file and bounded import metadata to collections',async()=>{
  const route=load(guided);const body=form();body.set('sheet','Synthetic');body.set('header_row','4');body.set('provider','do-not-forward');
  const response=await route.POST(request(body),{params:Promise.resolve({path:['suggest-mapping']})});
  assert.equal(response.status,200);assert.equal(route.calls[0].url,'https://collections.invalid/v1/collections-import/suggest-mapping');
  assert.equal(route.calls[0].init.body.get('sheet'),'Synthetic');assert.equal(route.calls[0].init.body.get('header_row'),'4');assert.equal(route.calls[0].init.body.get('provider'),null);
  const survey=load(guided,{workspace:'survey'});
  assert.equal((await survey.POST(request(body),{params:Promise.resolve({path:['suggest-mapping']})})).status,403);assert.equal(survey.calls.length,0);
});
