'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
function createAgentJobs({directory,connectionFile,snapshot,call,runner,flows,presets}){
 const designer=require('./designer.cjs');
 const settings=path.join(directory,'agent.json'),codexSettings=path.join(directory,'codex.json');
 let job=null,child=null,timer=null,lastUndo=null,flowDraft=null,presetDraft=null;
 const {SceneDraft}=require('./preset-store.cjs');
 const {FlowDraft}=require('./flow-store.cjs');
 function targetId(value){if(value===undefined)return 'scene';if(!['scene','flow','preset'].includes(value))fail(400,'invalid_target','Choose scene, flow or preset.');return value;}
 function fail(status,code,message){throw Object.assign(Error(message),{status,code});}
 function providerId(value){if(value===undefined)return 'hermes';if(!['hermes','codex'].includes(value))fail(400,'invalid_provider','Choose hermes or codex.');return value;}
 function config(provider){const file=provider==='codex'?codexSettings:settings;if(!fs.existsSync(file))return null;const c=JSON.parse(fs.readFileSync(file,'utf8'));if(provider==='codex'){if(c.enabled!==true||typeof c.binary!=='string'||!path.isAbsolute(c.binary)||!fs.existsSync(c.binary)||(c.model!==undefined&&(typeof c.model!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(c.model))))throw Error('Invalid Codex configuration');}else for(const k of ['python','home','base_url','model','provider'])if(typeof c[k]!=='string'||!c[k])throw Error('Invalid Hermes configuration');return c;}
 function connection(provider){let c;try{c=config(provider);}catch{}return {id:provider,label:provider==='codex'?'Codex':'Local Hermes',connected:!!c,model:c?.model||null,modelLabel:c?.model_label||c?.model||(provider==='codex'?'Signed-in account':null),provider:provider==='codex'?'codex':c?.provider||null,location:provider==='codex'?'hosted':'on-device'};}
 function status(selected,target){const scope=targetId(target),id=providerId(selected),providers=['hermes','codex'].map(connection),p=providers.find(p=>p.id===id);return {ok:true,connected:p.connected,model:p.model,modelLabel:p.modelLabel,provider:p.provider,selectedProvider:id,selectedTarget:scope,providers,profile:'Glyph Studio',designer:designer.profile(),job:job?{...job}:null,canUndo:!!lastUndo&&(lastUndo.target||'scene')===scope};}
 function start(prompt,selected,target){
  const provider=providerId(selected),scope=targetId(target);
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>6000)fail(400,'invalid_prompt','Write a change in 1–6000 characters.');
  if(job?.status==='running')fail(409,'agent_busy','An agent is already working on a change.');
  let c;try{c=config(provider);}catch{fail(503,'agent_unconfigured','The selected agent configuration is unavailable.');}if(!c)fail(503,'agent_unconfigured',provider==='codex'?'Connect Codex with npm run connect:codex first.':'Attach Hermes with hermes/start.py first.');
  const before=scope==='flow'?flows.read():scope==='preset'?presets.draft():snapshot();if(provider==='hermes'&&scope==='scene')lastUndo={scene:structuredClone(before.scene),provider,target:'scene'};
  const turn=job={id:crypto.randomUUID(),provider,target:scope,status:'running',stage:provider==='codex'?'Connecting to Codex…':'Connecting to model…',prompt:prompt.trim(),message:'',startedAt:Date.now(),tools:[]};
  flowDraft=scope==='flow'?{id:turn.id,draft:new FlowDraft(before)}:null;
  presetDraft=scope==='preset'?{id:turn.id,draft:new SceneDraft(before,presets.read().presets)}:null;
  function completePreset(scene,message){try{const result=presets.commit(scene,before.revision);lastUndo={target:'preset',scene:before.scene,revision:result.revision,provider};turn.status='complete';turn.stage='Ready to save';turn.message=String(message||'Created a preset draft.').slice(0,5000)+'\nPreview ready. Name it and save it to the design system when you like it.';}catch(e){turn.status='failed';turn.stage='Needs attention';turn.message='Preset proposal was discarded: '+e.message;}}
  function completeFlow(flow,calls,message){turn.stage='Validating flow…';try{const result=flows.commit(flow,before.revision,calls||[]);turn.calls=result.queued;if(result.changed||result.queued.length)lastUndo={flow:structuredClone(before.flow),target:'flow',provider,revision:result.revision,calls:result.queued};turn.status='complete';turn.stage='Complete';turn.message=(result.queued.length?'Applied flow proposal; '+result.queued.length+' method call(s) queued for browser receipt.\n':'')+String(message||'Applied validated flow.').slice(0,5000);}catch(err){turn.status='failed';turn.stage='Needs attention';turn.message=err.code==='revision_conflict'?'Flow changed while the designer was working. Nothing from this proposal was applied.':('Invalid flow proposal: '+err.message).slice(0,6000);}}
  const binary=provider==='codex'?process.execPath:c.python,file=path.join(__dirname,provider==='codex'?'codex-worker.cjs':'agent-worker.py');
  child=(runner||spawn)(binary,[file],{cwd:path.dirname(__dirname),env:{...process.env,HERMES_HOME:c.home||'',GLYPH_STUDIO_CONNECTION:provider==='hermes'?connectionFile:'',GLYPH_STUDIO_SCOPE:scope,GLYPH_STUDIO_JOB:['flow','preset'].includes(scope)?turn.id:'',PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
  const processForTurn=child;let buffer='';
  function event(e){if(job!==turn||turn.status!=='running')return;
   if(e.type==='ready')turn.stage='Designing your change…';
   if(e.type==='tool'&&(provider==='hermes'||designer.profile().tools.codex.includes(e.name))){turn.stage=String(e.name);turn.tools.push(String(e.name));}
   if(e.type==='candidate'&&provider==='codex'&&scope==='preset'){completePreset(e.scene,e.message);return;}
   if(e.type==='complete'&&provider==='hermes'&&scope==='preset'){completePreset(presetDraft.draft.scene,e.message);return;}
   if(e.type==='candidate'&&provider==='codex'&&scope==='flow'){completeFlow(e.flow,e.calls,e.message);return;}
   if(e.type==='candidate'&&provider==='codex'&&scope==='scene'){
    turn.stage='Validating scene…';try{
     // Even an unchanged result must be valid and from the revision we sent.
     const E=require('../dist/scene.js');E.validate(e.scene);if(snapshot().revision!==before.revision)throw Object.assign(Error(),{code:'revision_conflict'});
     const same=JSON.stringify(e.scene)===JSON.stringify(before.scene);
     if(!same){const applied=call('glyph_studio_apply',{scene:e.scene,expected_revision:before.revision});lastUndo={scene:structuredClone(before.scene),provider,target:'scene',revision:applied.revision};}
     turn.status='complete';turn.stage='Complete';turn.message=String(e.message||'Codex returned a validated scene.').slice(0,6000);
    }catch(err){turn.status='failed';turn.stage='Needs attention';turn.message=err.code==='revision_conflict'?'Scene changed while Codex was working. Retry against the latest scene.':'Codex returned an invalid scene. Nothing was applied.';}
   }
   if(e.type==='complete'&&provider==='hermes'&&scope==='flow'){completeFlow(flowDraft.draft.flow,flowDraft.draft.calls,e.message);return;}
   if(e.type==='complete'&&provider==='hermes'&&scope==='scene'){turn.status='complete';turn.message=String(e.message).slice(0,6000);turn.stage='Complete';}
   if(e.type==='error'){turn.status='failed';turn.message=String(e.message).slice(0,6000);turn.stage='Needs attention';}
  }
  child.stdout.on('data',data=>{buffer+=data.toString();if(buffer.length>600000){buffer='';event({type:'error',message:'Agent response exceeded the scene limit.'});return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.startsWith('GLYPH_EVENT '))continue;try{event(JSON.parse(line.slice(12)));}catch{}}});
  child.stderr.on('data',()=>{}); // Never expose credential-bearing provider diagnostics.
  const finish=()=>{if(child!==processForTurn)return;clearTimeout(timer);timer=null;child=null;if(turn.status==='running'){turn.status='failed';turn.stage='Needs attention';turn.message='The agent stopped before completing. Your scene is preserved; retry the change.';}};
  child.on('error',finish);child.on('close',finish);child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({config:c,prompt:prompt.trim(),target:scope,job_id:turn.id,...(provider==='codex'?{...(scope==='flow'?{flow:before.flow}:{scene:before.scene}),connectionFile}: {})}));
  timer=setTimeout(()=>{if(job===turn&&turn.status==='running')cancel('Timed out after three minutes. Any applied edits remain visible.');},180000);
  return status(provider,scope);
 }
 function cancel(message='Stopped. Any applied edits remain visible.'){
  if(child){try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}clearTimeout(timer);timer=null;if(job?.status==='running'){job.status='cancelled';job.message=['flow','preset'].includes(job.target)?'Stopped. The staged proposal was discarded.':message;job.stage='Stopped';}}
  return status(job?.provider,job?.target);
 }
 function undo(toolCall,target){const scope=targetId(target);if(job?.status==='running')fail(409,'agent_busy','Stop the agent before undoing.');if(!lastUndo)fail(409,'no_undo','No prompt change to undo.');if((lastUndo.target||'scene')!==scope)fail(409,'no_undo','No prompt change to undo for this target.');if(lastUndo.target==='preset'){const result=presets.commit(lastUndo.scene,lastUndo.revision);lastUndo=null;if(job){job.status='undone';job.message='Restored the previous preset draft. Saved presets are unchanged.';}return result;}if(lastUndo.target==='flow'){if(flows.read().revision!==lastUndo.revision)fail(409,'revision_conflict','The flow changed after this prompt. Undo would replace newer work.');flows.cancelCalls(lastUndo.calls||[]);const result=flows.commit(lastUndo.flow,lastUndo.revision);lastUndo=null;if(job){job.status='undone';job.stage='Undone';job.message='Restored the flow from before the prompt.';}return result;}if(lastUndo.provider==='codex'&&snapshot().revision!==lastUndo.revision)fail(409,'revision_conflict','The scene changed after Codex applied its edit. Undo would overwrite those newer changes.');const result=toolCall('glyph_studio_apply',{scene:lastUndo.scene,expected_revision:snapshot().revision});lastUndo=null;if(job){job.status='undone';job.stage='Undone';job.message='Restored the scene from before your last prompt.';}return result;}
 function flowTool(id,name,args){if(!flowDraft||flowDraft.id!==id||job?.id!==id||job.status!=='running'||job.target!=='flow')fail(409,'inactive_draft','This flow draft is no longer active.');return flowDraft.draft.tool(name,args);}
 function presetTool(id,name,args){if(!presetDraft||presetDraft.id!==id||job?.id!==id||job.status!=='running'||job.target!=='preset')fail(409,'inactive_draft','This preset draft is no longer active.');return presetDraft.draft.tool(name,args);}
 function flowDelivery(id,before,after){if(job?.target==='flow'&&job.status==='complete'&&job.calls?.includes(id)){job.delivered=[...(job.delivered||[]),id];job.message+='\nBrowser receipt confirmed arrival: '+id+'.';}if(lastUndo?.target==='flow'&&lastUndo.calls.includes(id)&&lastUndo.revision===before)lastUndo.revision=after;}
 return {status,start,cancel,undo,flowTool,presetTool,flowDelivery,close:cancel};
}
module.exports={createAgentJobs};
