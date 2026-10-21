'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createBridge}=require('./bridge.cjs'),worker=require('./codex-worker.cjs');
(async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-codex-test-'));let bridge;const children=[];function runner(binary,args,options){const c=new EventEmitter();c.stdin=new PassThrough();c.stdout=new PassThrough();c.stderr=new PassThrough();c.binary=binary;c.args=args;c.options=options;children.push(c);return c;}
try{
 bridge=createBridge({directory,agentRunner:runner});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file));const headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
 const api=async(route,body)=>{const r=await fetch(info.url+'/api/'+route,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 A.equal((await api('agent',{prompt:'hello',provider:'codex'})).status,503);
 fs.writeFileSync(path.join(directory,'codex.json'),JSON.stringify({binary:process.execPath,enabled:true}));
 const state=await api('agent?provider=codex');A(state.data.connected);A.equal(state.data.selectedProvider,'codex');A.equal(state.data.providers.length,2);A(!JSON.stringify(state.data).includes(process.execPath));A.equal((await api('agent',{prompt:'hi',provider:'unknown'})).status,400);
 const event=(i,e)=>children[i].stdout.write('GLYPH_EVENT '+JSON.stringify(e)+'\n');
 const original=bridge.snapshot().scene;
 A.equal((await api('agent',{prompt:'brighten shell',provider:'codex'})).status,202);A.equal((await api('agent',{prompt:'overlap'})).status,409);
 A.equal(children[0].binary,process.execPath);A(children[0].args[0].endsWith('codex-worker.cjs'));A.equal(children[0].options.env.GLYPH_STUDIO_CONNECTION,'');
 const edit=structuredClone(original);edit.objects.find(x=>x.id==='shell').material.opacity=.55;
 event(0,{type:'complete',message:'must not bypass validation'});A.equal((await api('agent')).data.job.status,'running');
 event(0,{type:'candidate',scene:edit,message:'Brightened shell.'});children[0].emit('close',0);A.deepEqual(bridge.snapshot().scene,edit);A.equal((await api('agent')).data.job.status,'complete');
 await api('agent/undo',{});A.deepEqual(bridge.snapshot().scene,original);
 // Another editor changes the scene while inference is running.
 await api('agent',{prompt:'stale',provider:'codex'});bridge.call('glyph_studio_update',{kind:'object',id:'shell',changes:{material:{opacity:.6}},expected_revision:bridge.snapshot().revision});const latest=bridge.snapshot();event(1,{type:'candidate',scene:edit,message:'stale'});children[1].emit('close',0);A.deepEqual(bridge.snapshot().scene,latest.scene);A.equal(bridge.snapshot().revision,latest.revision);A.equal((await api('agent')).data.job.status,'failed');
 await api('agent',{prompt:'invalid',provider:'codex'});event(2,{type:'candidate',scene:{version:2},message:'bad'});children[2].emit('close',0);A.deepEqual(bridge.snapshot().scene,latest.scene);
 await api('agent',{prompt:'cancelled',provider:'codex'});await api('agent/cancel',{});await api('agent',{prompt:'new',provider:'codex'});event(3,{type:'candidate',scene:edit,message:'late'});children[3].emit('close',0);A.equal((await api('agent')).data.job.status,'running');A.deepEqual(bridge.snapshot().scene,latest.scene);
 event(4,{type:'candidate',scene:edit,message:'new edit'});children[4].emit('close',0);bridge.call('glyph_studio_update',{kind:'object',id:'shell',changes:{material:{opacity:.7}},expected_revision:bridge.snapshot().revision});A.equal((await api('agent/undo',{})).status,409);
 const args=worker.command({binary:'/fake'},'/schema','/output','/cwd');for(const flag of ['--ignore-user-config','--ephemeral','--sandbox','read-only','--output-schema'])A(args.includes(flag));for(const tool of ['shell_tool','apps','plugins','hooks','multi_agent'])A(args.includes(tool));A(!args.some(x=>x.includes('bypass')));
 const studio=await (await fetch(info.url)).text(),zenith=await (await fetch(info.url+'/zenith')).text();for(const html of [studio,zenith])A(html.includes('agent-provider')&&html.includes('agent-panel.js'));A.equal((await fetch(info.url+'/agent-panel.js')).status,200);
 console.log('PASS Codex selection, compatibility, atomic validation, concurrent edits, cancellation, safe undo, restricted worker and both UI entry points');
}finally{if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
