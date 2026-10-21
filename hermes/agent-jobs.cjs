'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
function createAgentJobs({directory,connectionFile,snapshot,runner}){
 const settings=path.join(directory,'agent.json');
 let job=null,child=null,timer=null,lastUndo=null;
 const config=()=>{if(!fs.existsSync(settings))return null;const c=JSON.parse(fs.readFileSync(settings,'utf8'));for(const k of ['python','home','base_url','model','provider'])if(typeof c[k]!=='string'||!c[k])throw Error('Invalid private agent configuration');return c;};
 const status=()=>{let c;try{c=config();}catch{}return {ok:true,connected:!!c,model:c?.model||null,modelLabel:c?.model_label||c?.model||null,provider:c?.provider||null,profile:'Glyph Studio',job:job?{...job}:null,canUndo:!!lastUndo};};
 function fail(status,code,message){throw Object.assign(Error(message),{status,code});}
 function start(prompt){
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>6000)fail(400,'invalid_prompt','Write a change in 1–6000 characters.');
  if(job?.status==='running')fail(409,'agent_busy','Hermes is already working on a change.');
  const c=config();if(!c)fail(503,'agent_unconfigured','Attach Hermes with hermes/start.py first.');
  lastUndo=structuredClone(snapshot().scene);
  const turn=job={id:crypto.randomUUID(),status:'running',stage:'Connecting to model…',prompt:prompt.trim(),message:'',startedAt:Date.now(),tools:[]};
  child=(runner||spawn)(c.python,[path.join(__dirname,'agent-worker.py')],{cwd:path.dirname(__dirname),env:{...process.env,HERMES_HOME:c.home,GLYPH_STUDIO_CONNECTION:connectionFile,PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
  const processForTurn=child;
  let buffer='';
  child.stdout.on('data',data=>{buffer+=data.toString();if(buffer.length>100000)buffer=buffer.slice(-100000);let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.startsWith('GLYPH_EVENT '))continue;try{const event=JSON.parse(line.slice(12));if(job!==turn||job.status!=='running')continue;if(event.type==='ready')job.stage='Designing your change…';if(event.type==='tool'){job.stage=String(event.name);job.tools.push(String(event.name));}if(event.type==='complete'){job.status='complete';job.message=String(event.message);job.stage='Complete';}if(event.type==='error'){job.status='failed';job.message=String(event.message);job.stage='Needs attention';}}catch{}}});
  child.stderr.on('data',()=>{}); // Provider diagnostics may contain secrets; never expose to the browser.
  const finish=()=>{if(child!==processForTurn)return;clearTimeout(timer);timer=null;child=null;if(job.status==='running'){job.status='failed';job.stage='Needs attention';job.message='Hermes stopped before completing. Your current scene is preserved; retry the change.';}};
  child.on('error',finish);child.on('close',finish);
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({config:c,prompt:prompt.trim()}));
  timer=setTimeout(()=>cancel('Timed out after three minutes. Any applied edits remain visible.'),180000);
  return status();
 }
 function cancel(message='Stopped. Any applied edits remain visible.'){
  if(child){try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}clearTimeout(timer);if(job?.status==='running'){job.status='cancelled';job.message=message;job.stage='Stopped';}}
  return status();
 }
 function undo(call){if(job?.status==='running')fail(409,'agent_busy','Stop Hermes before undoing.');if(!lastUndo)fail(409,'no_undo','No prompt change to undo.');const result=call('glyph_studio_apply',{scene:lastUndo,expected_revision:snapshot().revision});lastUndo=null;if(job){job.status='undone';job.stage='Undone';job.message='Restored the scene from before your last prompt.';}return result;}
 return {status,start,cancel,undo,close:cancel};
}
module.exports={createAgentJobs};
