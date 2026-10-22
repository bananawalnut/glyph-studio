'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createBridge}=require('./bridge.cjs');
(async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-language-api-'));let bridge;
  try{
    bridge=createBridge({directory});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file)),headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
    const before={scene:bridge.snapshot().scene,flow:bridge.flows.read(),programs:bridge.programs.read(),presets:bridge.presets.read()};
    const source=fs.readFileSync('language/examples/signal-shell.glyph.ts','utf8');
    assert.equal((await fetch(info.url+'/api/language/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source})})).status,401);
    assert.equal((await fetch(info.url+'/api/language/compile',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:JSON.stringify({source})})).status,403);
    const compile=async source=>{const response=await fetch(info.url+'/api/language/compile',{method:'POST',headers,body:JSON.stringify({source})});return {status:response.status,data:await response.json()};};
    const valid=await compile(source);assert.equal(valid.status,200);assert.equal(valid.data.ok,true);assert.match(valid.data.previewSource,/function create/);
    const invalid=await compile(source.replace('result:amplitude','result:"invalid"'));assert.equal(invalid.status,200);assert.equal(invalid.data.ok,false);assert.ok(invalid.data.diagnostics.length);
    const sideEffect=await compile('(globalThis as any).__glyphHostProbe=true;\n'+source);assert.equal(sideEffect.data.ok,true);assert.equal(globalThis.__glyphHostProbe,undefined);
    for(const asset of ['language-workshop.js','language-workshop.css','language-signal-shell.txt','language-word-ring.txt'])assert.equal((await fetch(info.url+'/'+asset)).status,200);
    assert.deepEqual({scene:bridge.snapshot().scene,flow:bridge.flows.read(),programs:bridge.programs.read(),presets:bridge.presets.read()},before);
    console.log('PASS authenticated same-origin compile API, diagnostics, no host execution, static examples and no scene/flow/program/preset writes');
  }finally{if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
