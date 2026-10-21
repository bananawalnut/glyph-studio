'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createBridge}=require('./bridge.cjs');
(async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-program-agent-'));let bridge;const children=[];
function runner(){const c=new EventEmitter();c.stdin=new PassThrough();c.stdout=new PassThrough();c.stderr=new PassThrough();children.push(c);return c;}
try{bridge=createBridge({directory,agentRunner:runner});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file)),headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
async function api(route,body){const r=await fetch(info.url+'/api/'+route,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
for(const [file,c] of Object.entries({'agent.json':{python:'/dummy/python',home:'/private/test-home',base_url:'http://127.0.0.1:8789/v1',provider:'custom',model:'local'},'codex.json':{enabled:true,binary:process.execPath}}))fs.writeFileSync(path.join(directory,file),JSON.stringify(c));
const scene=bridge.snapshot().scene,flow=bridge.flows.read(),presets=bridge.presets.read(),source=bridge.programs.draft().source;
A.equal((await fetch(info.url+'/api/programs')).status,401);
const event=e=>children.at(-1).stdout.write('GLYPH_EVENT '+JSON.stringify(e)+'\n');const close=()=>children.at(-1).emit('close',0);
for(const provider of ['hermes','codex']){
 A.equal((await api('agent',{target:'program',provider,prompt:'edit logic'})).status,202);event({type:'candidate',source:source+'\n// '+provider,message:'Source proposal'});close();
 A.equal((await api('agent?target=program')).data.job.status,'complete');A.ok(bridge.programs.draft().source.endsWith(provider));A.equal(bridge.programs.read().presets.length,0);
 A.equal((await api('agent/undo',{target:'program'})).status,200);A.equal(bridge.programs.draft().source,source);
}
await api('agent',{target:'program',provider:'codex',prompt:'stale'});bridge.programs.commit(source+'\n// concurrent',bridge.programs.draft().revision);event({type:'candidate',source:source+'\n// stale'});close();A.equal((await api('agent?target=program')).data.job.status,'failed');A.ok(bridge.programs.draft().source.endsWith('concurrent'));
await api('agent',{target:'program',prompt:'broken candidate'});event({type:'candidate',source:'function create( {'});close();A.equal((await api('agent?target=program')).data.job.status,'failed');
await api('agent',{target:'program',prompt:'cancel'});await api('agent/cancel',{});event({type:'candidate',source});close();A.ok(bridge.programs.draft().source.endsWith('concurrent'));
// Incomplete editable drafts remain repairable; generation must return valid syntax.
A.equal((await api('programs/draft',{source:'function create(A,F){',expected_revision:bridge.programs.draft().revision})).status,200);
A.deepEqual(bridge.snapshot().scene,scene);A.deepEqual(bridge.flows.read(),flow);A.deepEqual(bridge.presets.read(),presets);
console.log('PASS both source providers, isolated proposals, no implicit saving/live writes, revision-safe undo, stale rejection, invalid syntax, cancellation and repairable drafts');
}finally{if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
