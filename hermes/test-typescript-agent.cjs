'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createBridge}=require('./bridge.cjs'),{TypeScriptStore}=require('./typescript-store.cjs'),worker=require('./codex-worker.cjs');
(async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-typescript-agent-'));let bridge;const children=[];
function runner(){const c=new EventEmitter();c.stdin=new PassThrough();c.stdout=new PassThrough();c.stderr=new PassThrough();children.push(c);return c;}
try{
 bridge=createBridge({directory,agentRunner:runner});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file)),headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
 async function api(route,body){const r=await fetch(info.url+'/api/'+route,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 for(const [file,c] of Object.entries({'agent.json':{python:'/dummy/python',home:'/test-home',base_url:'http://127.0.0.1:8789/v1',provider:'custom',model:'local'},'codex.json':{enabled:true,binary:process.execPath}}))fs.writeFileSync(path.join(directory,file),JSON.stringify(c));
 const source=bridge.typescript.draft().source,before={scene:bridge.snapshot().scene,flow:bridge.flows.read(),programs:bridge.programs.read(),presets:bridge.presets.read()};
 const candidate=s=>{children.at(-1).stdout.write('GLYPH_EVENT '+JSON.stringify({type:'candidate',source:s,message:'Typed edit.'})+'\n');children.at(-1).emit('close',0);};
 async function settled(){for(let i=0;i<100;i++){const d=(await api('agent?target=typescript')).data;if(d.job.status!=='running')return d;await new Promise(r=>setTimeout(r,30));}throw Error('No compiler completion');}
 A.equal((await fetch(info.url+'/api/typescript')).status,401);
 for(const provider of ['hermes','codex']){
  A.equal((await api('agent',{target:'typescript',provider,prompt:'Give the shell another harmonic',preview_feedback:'Compile first'})).status,202);
  candidate(source.replace('Math.cos(3*u','Math.cos(4*u'));const d=await settled();A.equal(d.job.status,'complete',d.job.message);A.ok(bridge.typescript.draft().source.includes('Math.cos(4*u'));
  A.equal(bridge.typescript.read().presets.length,0);await api('agent/undo',{target:'typescript'});A.equal(bridge.typescript.draft().source,source);
 }
 await api('agent',{target:'typescript',provider:'codex',prompt:'bad type'});candidate(source.replace('result:amplitude','result:"wrong"'));const invalid=await settled();A.equal(invalid.job.status,'failed');A.match(invalid.job.message,/TS2322/);A.equal(bridge.typescript.draft().source,source);
 await api('agent',{target:'typescript',provider:'codex',prompt:'stale'});bridge.typescript.commit(source+'\n// concurrent',bridge.typescript.draft().revision);candidate(source+'\n// model');A.equal((await settled()).job.status,'failed');A.ok(bridge.typescript.draft().source.endsWith('concurrent'));
 await api('agent',{target:'typescript',provider:'codex',prompt:'cancel during compile'});candidate(source);await api('agent/cancel',{});await new Promise(r=>setTimeout(r,700));A.equal((await api('agent?target=typescript')).data.job.status,'cancelled');A.ok(bridge.typescript.draft().source.endsWith('concurrent'));
 const current=bridge.typescript.draft(),preset={version:1,kind:'typescript-component',id:'component-test',name:'Typed shell',description:'Preserved editable source',source:current.source};
 let saved=await api('typescript/save',{preset,expected_revision:0,expected_draft_revision:current.revision});A.equal(saved.status,200,JSON.stringify(saved.data));A.equal(saved.data.presets[0].source,current.source);A.match(saved.data.presets[0].compiled.moduleSource,/export \{ create \}/);
 A.equal(new TypeScriptStore(directory).read().presets.length,1);const library=bridge.call('glyph_studio_library',{kind:'design-system'});A.equal(library.typescriptComponents.length,1);A.equal(bridge.call('glyph_studio_library',{kind:'design-system',id:'component-test'}).preset.source,current.source);
 A.equal((await api('typescript/save',{preset,expected_revision:0,expected_draft_revision:current.revision})).status,409);
 const updated=await api('typescript/save',{preset:{...preset,name:'Typed shell updated'},expected_revision:1,expected_draft_revision:current.revision});A.equal(updated.status,200);A.equal(updated.data.presets.length,1);
 const pendingSave=api('typescript/save',{preset,expected_revision:2,expected_draft_revision:current.revision});await new Promise(r=>setTimeout(r,50));bridge.typescript.commit(current.source+'\n// new draft',current.revision);A.equal((await pendingSave).status,409);A.equal(bridge.typescript.read().revision,2);
 A.deepEqual({scene:bridge.snapshot().scene,flow:bridge.flows.read(),programs:bridge.programs.read(),presets:bridge.presets.read()},before);
 const command=worker.command({},'/schema','/output','/cwd',info.connection_file,'typescript');A(!command.some(v=>v.startsWith('mcp_servers.')));A(command.includes('--sandbox'));A(command.includes('read-only'));
 // Exercise the actual structured-output worker boundary using a local CLI stand-in.
 const standin=path.join(directory,'codex-standin.cjs');fs.writeFileSync(standin,'#!'+process.execPath+'\n'+`const fs=require('node:fs'),args=process.argv.slice(2);let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const schema=JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema')+1]));if(!schema.properties.source_ts||schema.properties.source_js||!input.includes('API DECLARATIONS:')||!input.includes('glyph-typescript'))process.exit(2);fs.writeFileSync(args[args.indexOf('--output-last-message')+1],JSON.stringify({message:'Structured TypeScript proposal',source_ts:${JSON.stringify(source)}}));process.stdout.write(JSON.stringify({type:'turn.completed'})+'\\n');});`,{mode:0o700});
 const wire=spawnSync(process.execPath,['hermes/codex-worker.cjs'],{input:JSON.stringify({config:{binary:standin},target:'typescript',prompt:'Edit TypeScript',source,preview_feedback:'Compiler feedback'}),encoding:'utf8'});A.equal(wire.status,0,wire.stdout+wire.stderr);const events=wire.stdout.trim().split('\n').filter(l=>l.startsWith('GLYPH_EVENT ')).map(l=>JSON.parse(l.slice(12)));A.equal(events.find(e=>e.type==='candidate').source,source);
 console.log('PASS both typed designers, compile-before-commit, invalid/stale/cancelled rejection, undo, editable-source/compiled saves, reload/catalog lookup, updates and async save revision guards; old libraries unchanged');
}finally{if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
