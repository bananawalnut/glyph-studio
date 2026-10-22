'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {compile}=require('./language/compiler.cjs'),{compileRequest}=require('./language/service.cjs'),A=require('./player/program.js'),F=require('./player/flow-core.js');
const shell=fs.readFileSync('language/examples/signal-shell.glyph.ts','utf8'),ring=fs.readFileSync('language/examples/word-ring.glyph.ts','utf8');
function factory(result){assert.equal(result.ok,true,JSON.stringify(result.diagnostics));return new Function(result.previewSource+'\nreturn create;')();}
(async()=>{
  const compiled=compile(shell,'signal-shell.glyph.ts'),create=factory(compiled),product=create(A,F,{amplitude:.4,label:'TEST / '});
  assert.equal(product.program.audit({frames:3}).valid,true);assert.equal(product.metadata.atomic,'atom');assert.equal(product.component.initial.amplitude,.4);
  const d=F.definition(product.component),next=F.prepare(d,d.initial,.58,'sculpt');
  assert.equal(next.result,.58);product.program.setParams(product.params(next.state));assert.equal(product.program.params.amplitude,.58);
  assert.throws(()=>create(A,F,{amplitude:2}),/outside its numeric range/);assert.throws(()=>create(A,F,{extra:1}),/not accepted/);
  assert.throws(()=>F.prepare(d,d.initial,'wrong','sculpt'),/must be number/);assert.equal(product.component.initial.amplitude,.4);
  assert.deepEqual(compile(shell).previewSource,compiled.previewSource);assert.equal(compiled.moduleSource.includes('export { create }'),true);
  const receive=factory(compile(ring))(A,F),rd=F.definition(receive.component);
  let state=F.prepare(rd,rd.initial,'SIGNAL','add').state;const added=F.prepare(rd,state,'AMBER','add');assert.equal(added.result,0);assert.deepEqual(added.state.words,['AMBER','SIGNAL']);
  assert.throws(()=>F.prepare(rd,added.state,'AMBER','add'),/already exists/);
  const bad=shell.replace('result:amplitude','result:"wrong"');const errors=compile(bad);assert.equal(errors.ok,false);assert.ok(errors.diagnostics.some(d=>d.code.startsWith('TS')&&d.line>1));assert.equal(errors.moduleSource,undefined);
  assert.equal(compile(shell.replace('amplitude:0.22','amplitude:"bad"')).ok,false);
  assert.equal(compile(shell.replace('Math.cos(3*u','Math.cos("bad"')).ok,false);
  assert.equal(compile("import x from 'node:fs';\n"+shell).ok,false);
  assert.equal(compile('/// <reference path="/private/secret" />\n'+shell).ok,false);
  assert.equal(compile(shell+'\nimport("https://example.com");').ok,false);
  assert.equal(compile('x'.repeat(64001)).ok,false);
  assert.equal(compile('export default 42;').ok,false);
  // Compilation must not execute module code, including top-level side effects.
  const probe='(globalThis as any).__glyphCompileProbe = true;\n'+shell;
  assert.equal(compile(probe).ok,true);assert.equal(globalThis.__glyphCompileProbe,undefined);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-language-'));
  try{
    const cli=spawnSync(process.execPath,['scripts/glyphc.cjs','language/examples/signal-shell.glyph.ts','--out-dir',temp],{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);
    const module=await import(pathToFileURL(path.join(temp,'signal-shell.mjs')).href);assert.equal(module.create(A,F).program.sample(.2).buffers.size,2);
    const manifest=JSON.parse(fs.readFileSync(path.join(temp,'signal-shell.manifest.json')));assert.equal(manifest.sourceHash,compiled.manifest.sourceHash);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  const isolated=await compileRequest({source:ring,filename:'ring.glyph.ts'});assert.equal(isolated.ok,true);
  const active=compileRequest({source:shell});await assert.rejects(compileRequest({source:ring}),e=>e.code==='compiler_busy');await active;
  await assert.rejects(compileRequest({source:shell,filename:'../escape.ts'}),e=>e.code==='invalid_source');
  console.log('PASS TypeScript producer, portable ESM/preview consumers, deterministic emit, typed math/props/method errors, runtime contracts, receiver-owned sort, no compile-time execution and bounded compiler worker');
})().catch(error=>{console.error(error);process.exitCode=1;});
