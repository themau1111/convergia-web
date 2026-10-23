import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/lib/collections-import-validation.ts','utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {importPreviewBlockers}=exports;
const ready={hasFile:true,hasSheet:true,headerRow:1,analyzedHeaderRow:1,mapping:{nombre:[1],telefono:[0],saldo_pendiente:[4]}};
test('the screenshot mapping explains missing balance despite other assigned fields',()=>{
 const blockers=importPreviewBlockers({...ready,mapping:{nombre:[1],telefono:[0],variable_1:[2],variable_2:[3]}});
 assert.equal(blockers.length,1);assert.match(blockers[0],/Saldo a gestionar/);
});
test('preview becomes available only after all three mandatory fields are assigned',()=>{
 assert.equal(importPreviewBlockers(ready).length,0);
 for(const key of ['nombre','telefono','saldo_pendiente']) {
  const mapping={...ready.mapping};delete mapping[key];assert.equal(importPreviewBlockers({...ready,mapping}).length,1);
 }
});
test('credit and additional variables are optional; amount format does not replace balance',()=>{
 assert.equal(importPreviewBlockers(ready).length,0);
 const blockers=importPreviewBlockers({...ready,mapping:{nombre:[1],telefono:[0]},amountFormat:'dot_decimal'});
 assert.match(blockers[0],/Saldo/);
});
test('changed header row reports the action to reanalyze; invalid rows remain blocked',()=>{
 assert.match(importPreviewBlockers({...ready,headerRow:2})[0],/Actualizar encabezados/);
 for(const headerRow of [0,51,1.5,NaN])assert.match(importPreviewBlockers({...ready,headerRow})[0],/entre 1 y 50/);
});
test('file analysis and phone limit blockers remain explicit',()=>{
 assert.match(importPreviewBlockers({...ready,hasFile:false})[0],/Selecciona un archivo/);
 assert.match(importPreviewBlockers({...ready,hasSheet:false})[0],/Analiza el archivo/);
 assert.match(importPreviewBlockers({...ready,mapping:{...ready.mapping,telefono:[0,1,2,3,4,5]}})[0],/cinco/);
});
