import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(){
 const calls=[]; const exports={};
 const modules={
  '@/lib/control-api':{startManualTestCall:async payload=>{calls.push(payload);return {call_uuid:'synthetic'};}},
  './manual-call-defaults':{MANUAL_CALL_DEFAULTS:{nombre_cliente:'Titular ficticio',saldo_pendiente:1800}},
 };
 const source=fs.readFileSync(new URL('../src/app/app/settings/catalogs/actions.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>modules[n]});
 return {action:exports.callManualAction,calls};
}
function form(){const data=new FormData();data.set('telefono','synthetic-recipient');data.set('confirmed','yes');return data;}
test('saved profile and verified overdue days reach the manual call API',async()=>{
 const {action,calls}=load();const data=form();data.set('agent_profile_version_id','synthetic-profile');data.set('dias_atraso','12');
 assert.equal((await action({},data)).status,'ok');assert.equal(calls[0].agent_profile_version_id,'synthetic-profile');assert.equal(calls[0].dias_atraso,12);
});
test('legacy call omits an unselected profile and empty overdue days',async()=>{
 const {action,calls}=load();await action({},form());assert.equal('agent_profile_version_id' in calls[0],false);assert.equal('dias_atraso' in calls[0],false);
});
test('confirmation remains required before either call mode',async()=>{
 const {action,calls}=load();const data=form();data.delete('confirmed');assert.equal((await action({},data)).status,'error');assert.equal(calls.length,0);
});
