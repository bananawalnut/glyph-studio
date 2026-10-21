'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {createBridge}=require('./bridge.cjs'),E=require('../dist/scene.js');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-bridge-test-'));let bridge;
 try{
  bridge=createBridge({directory});const info=await bridge.start(0),auth=JSON.parse(fs.readFileSync(info.connection_file,'utf8'));
  A.equal(fs.statSync(info.connection_file).mode&0o777,0o600);
  const before=bridge.call('glyph_studio_read');A.equal(before.revision,0);
  A.equal(bridge.call('glyph_studio_compile',{directives:'x: sphere; nonsense'}).ok,false);A.equal(bridge.snapshot().revision,0);
  const freeBefore=E.sample(before.scene,.3).filter(p=>p.id==='ribbon'||p.id==='rain');
  const updated=bridge.call('glyph_studio_update',{kind:'surface',id:'body',changes:{shape:'cylinder'},expected_revision:0});A.equal(updated.revision,1);
  A.deepEqual(E.sample(updated.scene,.3).filter(p=>p.id==='ribbon'||p.id==='rain'),freeBefore);
  A.throws(()=>bridge.call('glyph_studio_update',{kind:'surface',id:'body',changes:{shape:'plane'},expected_revision:0}),e=>e.code==='revision_conflict');
  A.throws(()=>bridge.call('glyph_studio_update',{kind:'surface',id:'body',changes:{shape:'invalid'},expected_revision:1}),e=>e.code==='invalid_scene');A.equal(bridge.snapshot().revision,1);
  A.throws(()=>bridge.call('glyph_studio_update',{kind:'object',id:'rain',changes:JSON.parse('{"__proto__":{"x":1}}'),expected_revision:1}),e=>e.code==='invalid_patch');
  bridge.call('glyph_studio_add',{kind:'surface',definition:{id:'sheet',shape:'wave'},expected_revision:1});
  bridge.call('glyph_studio_add',{kind:'object',definition:{id:'dots',geometry:{type:'mapped',host:'sheet',pattern:'scatter'}},expected_revision:2});
  A.throws(()=>bridge.call('glyph_studio_remove',{kind:'surface',id:'sheet',expected_revision:3}),e=>e.code==='surface_in_use');
  bridge.call('glyph_studio_remove',{kind:'object',id:'dots',expected_revision:3});bridge.call('glyph_studio_remove',{kind:'surface',id:'sheet',expected_revision:4});
  const preview=bridge.call('glyph_studio_preview',{frame:42,expected_revision:5});A.equal(preview.view.playing,false);A.equal(preview.view.frame,42);A.ok(preview.objects.shell.count>0);
  const headers={'Authorization':'Bearer '+auth.token,'Content-Type':'application/json'};
  A.equal((await fetch(info.url+'/api/state')).status,401);
  A.equal((await fetch(info.url+'/api/state',{headers:{...headers,Origin:'https://example.invalid'}})).status,403);
  A.equal((await fetch(info.url+'/api/state',{headers:{...headers,'Sec-Fetch-Site':'cross-site'}})).status,403);
  const wrongHost=await new Promise((resolve,reject)=>{const req=http.get(info.url+'/api/state',{headers:{...headers,Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});A.equal(wrongHost,403);
  const read=await (await fetch(info.url+'/api/tool',{method:'POST',headers,body:JSON.stringify({name:'glyph_studio_read',arguments:{}})})).json();A.equal(read.revision,5);A.equal(read.view.frame,42);
  const stale=await fetch(info.url+'/api/tool',{method:'POST',headers,body:JSON.stringify({name:'glyph_studio_apply',arguments:{scene:before.scene,expected_revision:0}})});A.equal(stale.status,409);
  const html=await (await fetch(info.url)).text();A.ok(html.includes('window.GLYPH_BRIDGE=')&&html.includes('bridge-client.js'));
  A.equal((await fetch(info.url+'/bridge-client.js')).status,200);
  await bridge.close();bridge=createBridge({directory});A.equal(bridge.snapshot().revision,5);A.equal(bridge.snapshot().scene.surfaces[0].shape,'cylinder');
  console.log('PASS authenticated HTTP, origin/host checks, validation, stale-write rejection, named edits, add/remove, preview, persistence and object independence');
 }finally{if(bridge.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
