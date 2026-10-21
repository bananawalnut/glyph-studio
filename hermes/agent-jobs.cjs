'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
function createAgentJobs({directory,connectionFile,snapshot,call,runner}){
 const designer=require('./designer.cjs');
 const settings=path.join(directory,'agent.json'),codexSettings=path.join(directory,'codex.json');
 let job=null,child=null,timer=null,lastUndo=null;
 function fail(status,code,message){throw Object.assign(Error(message),{status,code});}
 function providerId(value){if(value===undefined)return 'hermes';if(!['hermes','codex'].includes(value))fail(400,'invalid_provider','Choose hermes or codex.');return value;}
 function config(provider){const file=provider==='codex'?codexSettings:settings;if(!fs.existsSync(file))return null;const c=JSON.parse(fs.readFileSync(file,'utf8'));if(provider==='codex'){if(c.enabled!==true||typeof c.binary!=='string'||!path.isAbsolute(c.binary)||!fs.existsSync(c.binary)||(c.model!==undefined&&(typeof c.model!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(c.model))))throw Error('Invalid Codex configuration');}else for(const k of ['python','home','base_url','model','provider'])if(typeof c[k]!=='string'||!c[k])throw Error('Invalid Hermes configuration');return c;}
 function connection(provider){let c;try{c=config(provider);}catch{}return {id:provider,label:provider==='codex'?'Codex':'Local Hermes',connected:!!c,model:c?.model||null,modelLabel:c?.model_label||c?.model||(provider==='codex'?'Signed-in account':null),provider:provider==='codex'?'codex':c?.provider||null,location:provider==='codex'?'hosted':'on-device'};}
 function status(selected){const id=providerId(selected),providers=['hermes','codex'].map(connection),p=providers.find(p=>p.id===id);return {ok:true,connected:p.connected,model:p.model,modelLabel:p.modelLabel,provider:p.provider,selectedProvider:id,providers,profile:'Glyph Studio',designer:designer.profile(),job:job?{...job}:null,canUndo:!!lastUndo};}
 function start(prompt,selected){
  const provider=providerId(selected);
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>6000)fail(400,'invalid_prompt','Write a change in 1–6000 characters.');
  if(job?.status==='running')fail(409,'agent_busy','An agent is already working on a change.');
  let c;try{c=config(provider);}catch{fail(503,'agent_unconfigured','The selected agent configuration is unavailable.');}if(!c)fail(503,'agent_unconfigured',provider==='codex'?'Connect Codex with npm run connect:codex first.':'Attach Hermes with hermes/start.py first.');
  const before=snapshot();if(provider==='hermes')lastUndo={scene:structuredClone(before.scene),provider};
  const turn=job={id:crypto.randomUUID(),provider,status:'running',stage:provider==='codex'?'Connecting to Codex…':'Connecting to model…',prompt:prompt.trim(),message:'',startedAt:Date.now(),tools:[]};
  const binary=provider==='codex'?process.execPath:c.python,file=path.join(__dirname,provider==='codex'?'codex-worker.cjs':'agent-worker.py');
  child=(runner||spawn)(binary,[file],{cwd:path.dirname(__dirname),env:{...process.env,HERMES_HOME:c.home||'',GLYPH_STUDIO_CONNECTION:provider==='hermes'?connectionFile:'',PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
  const processForTurn=child;let buffer='';
  function event(e){if(job!==turn||turn.status!=='running')return;
   if(e.type==='ready')turn.stage='Designing your change…';
   if(e.type==='tool'&&(provider==='hermes'||designer.profile().tools.codex.includes(e.name))){turn.stage=String(e.name);turn.tools.push(String(e.name));}
   if(e.type==='candidate'&&provider==='codex'){
    turn.stage='Validating scene…';try{
     // Even an unchanged result must be valid and from the revision we sent.
     const E=require('../dist/scene.js');E.validate(e.scene);if(snapshot().revision!==before.revision)throw Object.assign(Error(),{code:'revision_conflict'});
     const same=JSON.stringify(e.scene)===JSON.stringify(before.scene);
     if(!same){const applied=call('glyph_studio_apply',{scene:e.scene,expected_revision:before.revision});lastUndo={scene:structuredClone(before.scene),provider,revision:applied.revision};}
     turn.status='complete';turn.stage='Complete';turn.message=String(e.message||'Codex returned a validated scene.').slice(0,6000);
    }catch(err){turn.status='failed';turn.stage='Needs attention';turn.message=err.code==='revision_conflict'?'Scene changed while Codex was working. Retry against the latest scene.':'Codex returned an invalid scene. Nothing was applied.';}
   }
   if(e.type==='complete'&&provider==='hermes'){turn.status='complete';turn.message=String(e.message).slice(0,6000);turn.stage='Complete';}
   if(e.type==='error'){turn.status='failed';turn.message=String(e.message).slice(0,6000);turn.stage='Needs attention';}
  }
  child.stdout.on('data',data=>{buffer+=data.toString();if(buffer.length>600000){buffer='';event({type:'error',message:'Agent response exceeded the scene limit.'});return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.startsWith('GLYPH_EVENT '))continue;try{event(JSON.parse(line.slice(12)));}catch{}}});
  child.stderr.on('data',()=>{}); // Never expose credential-bearing provider diagnostics.
  const finish=()=>{if(child!==processForTurn)return;clearTimeout(timer);timer=null;child=null;if(turn.status==='running'){turn.status='failed';turn.stage='Needs attention';turn.message='The agent stopped before completing. Your scene is preserved; retry the change.';}};
  child.on('error',finish);child.on('close',finish);child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({config:c,prompt:prompt.trim(),...(provider==='codex'?{scene:before.scene,connectionFile}: {})}));
  timer=setTimeout(()=>{if(job===turn&&turn.status==='running')cancel('Timed out after three minutes. Any applied edits remain visible.');},180000);
  return status(provider);
 }
 function cancel(message='Stopped. Any applied edits remain visible.'){
  if(child){try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}clearTimeout(timer);timer=null;if(job?.status==='running'){job.status='cancelled';job.message=message;job.stage='Stopped';}}
  return status(job?.provider);
 }
 function undo(toolCall){if(job?.status==='running')fail(409,'agent_busy','Stop the agent before undoing.');if(!lastUndo)fail(409,'no_undo','No prompt change to undo.');if(lastUndo.provider==='codex'&&snapshot().revision!==lastUndo.revision)fail(409,'revision_conflict','The scene changed after Codex applied its edit. Undo would overwrite those newer changes.');const result=toolCall('glyph_studio_apply',{scene:lastUndo.scene,expected_revision:snapshot().revision});lastUndo=null;if(job){job.status='undone';job.stage='Undone';job.message='Restored the scene from before your last prompt.';}return result;}
 return {status,start,cancel,undo,close:cancel};
}
module.exports={createAgentJobs};
