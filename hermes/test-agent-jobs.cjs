'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createBridge}=require('./bridge.cjs');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-agent-test-'));let bridge;const children=[];
 function runner(){const c=new EventEmitter();c.stdin=new PassThrough();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{};children.push(c);return c;}
 try{
  bridge=createBridge({directory,agentRunner:runner});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file));
  const headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
  async function api(route,body){const r=await fetch(info.url+'/api/'+route,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
  A.equal((await fetch(info.url+'/api/agent')).status,401);
  A.equal((await api('agent',{prompt:'hi'})).status,503);
  fs.writeFileSync(path.join(directory,'agent.json'),JSON.stringify({python:'/dummy/python',home:'/private/test-home',base_url:'http://127.0.0.1:8789/v1',provider:'custom',model:'local'}));
  A.equal((await api('agent',{prompt:''})).status,400);
  const original=bridge.snapshot().scene;
  A.equal((await api('agent',{prompt:'make shell brighter'})).status,202);
  A.equal((await api('agent',{prompt:'concurrent'})).status,409);
  A.equal((await api('agent/undo',{})).status,409);
  const event=(i,e)=>children[i].stdout.write('GLYPH_EVENT '+JSON.stringify(e)+'\n');
  event(0,{type:'ready'});event(0,{type:'tool',name:'glyph_studio_read'});
  bridge.call('glyph_studio_update',{kind:'object',id:'shell',changes:{material:{opacity:.5}},expected_revision:0});
  event(0,{type:'complete',message:'Updated shell.'});children[0].emit('close',0);
  const done=await api('agent');A.equal(done.data.job.status,'complete');A.deepEqual(done.data.job.tools,['glyph_studio_read']);A.ok(!JSON.stringify(done.data).includes('/private/test-home'));
  A.equal((await api('agent/undo',{})).status,200);A.deepEqual(bridge.snapshot().scene,original);A.equal((await api('agent')).data.job.status,'undone');
  A.equal((await api('agent/undo',{})).status,409);
  await api('agent',{prompt:'first'});await api('agent/cancel',{});await api('agent',{prompt:'second'});
  children[1].emit('close',1);event(1,{type:'complete',message:'stale event'});A.equal((await api('agent')).data.job.status,'running');
  event(2,{type:'error',message:'Model unavailable'});children[2].emit('close',1);A.equal((await api('agent')).data.job.status,'failed');
  const html=await (await fetch(info.url+'/zenith')).text();A.ok(html.includes('window.GLYPH_BRIDGE=')&&html.includes('agent-prompt'));
  console.log('PASS agent authentication, unavailable model configuration, async jobs, concurrency, undo, cancellation race and Zenith bootstrap (mock inference only)');
 }finally{if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
