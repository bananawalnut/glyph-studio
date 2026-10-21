// Same-origin browser peer for the local local scene bridge.
(()=>{
 'use strict';
 if(!window.GLYPH_BRIDGE)return;
 const status=document.getElementById('bridge-status'),pull=document.getElementById('bridge-pull'),push=document.getElementById('bridge-push');
 let revision=null,viewRevision=-1,syncing=false,publishing=false,queued=null,pending=null,lastScene='',busy=false;
 const api=window.glyphStudio;
 const label=text=>{status.textContent=text;};
 async function request(name,args){
  const response=await fetch('/api/tool',{method:'POST',headers:{'Authorization':'Bearer '+window.GLYPH_BRIDGE.token,'Content-Type':'application/json'},body:JSON.stringify({name,arguments:args})});
  const data=await response.json();if(!data.ok){const error=Error(data.error?.message||data.errors?.join('; ')||'Bridge request failed');error.code=data.error?.code;throw error;}return data;
 }
 function conflict(data){pending=data;pull.hidden=false;push.hidden=false;label('Agent scene changed · your local edits are preserved');}
 function apply(data,force=false){
  if(!force&&api.hasUnbuiltChanges()){conflict(data);return;}
  syncing=true;
  try{api.setScene(data.scene);api.setView(data.view);revision=data.revision;viewRevision=data.view.revision;lastScene=JSON.stringify(data.scene);pending=null;pull.hidden=true;push.hidden=true;label('Scene bridge connected · revision '+revision);}
  finally{syncing=false;}
 }
 async function view(){
  if(revision===null||pending||publishing)return;
  try{const data=await request('glyph_studio_preview',{...api.getView(),expected_revision:revision});viewRevision=data.view.revision;}
  catch(e){if(e.code==='revision_conflict')label('Scene changed · refreshing bridge');else label('Bridge offline · local scene preserved');}
 }
 async function publish(scene){
  if(syncing||revision===null)return;
  queued=structuredClone(scene);if(publishing||pending)return;
  publishing=true;
  try{
   while(queued){const candidate=queued;queued=null;
    if(JSON.stringify(candidate)===lastScene)continue;
    const data=await request('glyph_studio_apply',{scene:candidate,expected_revision:revision});revision=data.revision;viewRevision=data.view.revision;lastScene=JSON.stringify(candidate);label('Scene bridge connected · revision '+revision);
   }
  }catch(e){queued=null;if(e.code==='revision_conflict'){try{const latest=await request('glyph_studio_read',{});conflict(latest);}catch{label('Bridge offline · local scene preserved');}}else label(e.message+' · local scene preserved');}
  finally{publishing=false;}
  if(!pending)await view();
 }
 window.glyphBridge={publish};
 pull.onclick=()=>{if(pending)apply(pending,true);};
 push.onclick=async()=>{try{const latest=await request('glyph_studio_read',{});revision=latest.revision;pending=null;pull.hidden=true;push.hidden=true;lastScene='';await publish(api.getScene());}catch(e){label(e.message);}};
 let timer;for(const event of ['input','click'])document.addEventListener(event,e=>{if(e.target.id==='timeline'||e.target.id==='play'){clearTimeout(timer);timer=setTimeout(view,100);}});
 async function poll(){
  if(busy||publishing)return;busy=true;
  try{const data=await request('glyph_studio_read',{});if(publishing)return;
   if(revision===null||data.revision!==revision){if(pending)pending=data;else apply(data);}
   else if(data.view.revision!==viewRevision&&!api.hasUnbuiltChanges()){syncing=true;try{api.setView(data.view);viewRevision=data.view.revision;}finally{syncing=false;}}
  }catch(e){label('Bridge offline · local scene preserved');}
  finally{busy=false;}
 }
 label('Connecting to local scene bridge…');poll();setInterval(()=>{if(!document.hidden)poll();},500);
})();
