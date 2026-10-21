'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {ProgramStore,validate}=require('./hermes/program-store.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-program-test-'));
try{
 const store=new ProgramStore(dir),source=store.draft().source;
 validate('globalThis.__mustNotExecute=true; function create(A,F){throw Error("never run on host")}');assert.equal(globalThis.__mustNotExecute,undefined);
 assert.throws(()=>validate('function create(A,F){'),/syntax/);assert.throws(()=>validate('export default 1'),/syntax/);assert.throws(()=>validate('x'.repeat(64001)),/64 KB/);
 assert.throws(()=>store.commit(source,99),/changed/);const draft=store.commit(source+'\n// edited',0);
 const preset={version:1,kind:'program',id:'program-test',name:'Shell controller',description:'Math and logic',source:draft.source};
 assert.throws(()=>store.save({preset,expected_revision:0,expected_draft_revision:0}),/changed/);
 assert.throws(()=>store.save({preset:{...preset,source},expected_revision:0,expected_draft_revision:1}),/changed/);
 store.save({preset,expected_revision:0,expected_draft_revision:1});assert.equal(store.summary()[0].kind,'program');
 const reopened=new ProgramStore(dir);assert.deepEqual(reopened.read(),store.read());assert.equal(fs.statSync(store.file).mode&0o777,0o600);
 reopened.save({preset:{...preset,name:'Edited'},expected_revision:1,expected_draft_revision:1});assert.equal(reopened.read().presets.length,1);
 console.log('PASS source parsed without host execution, invalid syntax/budget, exact draft save, stale conflicts, private persistence and preset update');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
