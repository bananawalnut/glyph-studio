'use strict';
// Local scene service. Same rendering/validation engine as the browser.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../dist/scene.js'),D=require('./designer.cjs');
const {createAgentJobs}=require('./agent-jobs.cjs');
const {FlowStore}=require('./flow-store.cjs');
const clone=value=>structuredClone(value);
function fault(status,code,message,extra={}){return Object.assign(new Error(message),{status,code,...extra});}
function plain(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function merge(target,changes){
 if(!plain(changes))throw fault(400,'invalid_patch','Changes must be an object');
 for(const [key,value] of Object.entries(changes)){
  if(['__proto__','constructor','prototype'].includes(key))throw fault(400,'invalid_patch','Unsafe property name');
  if(plain(value)){if(!plain(target[key]))target[key]={};merge(target[key],value);}else target[key]=clone(value);
 }return target;
}
function createBridge(options={}){
 const directory=path.resolve(options.directory||path.join(__dirname,'..','.runtime'));
 fs.mkdirSync(directory,{recursive:true,mode:0o700});fs.chmodSync(directory,0o700);
 const flows=new FlowStore(directory);
 const presets=new (require('./preset-store.cjs').PresetStore)(directory);
 const programs=new (require('./program-store.cjs').ProgramStore)(directory);
 const voice=require('./voice.cjs').createVoice(directory,options.voiceRunner);
 const stateFile=path.join(directory,'scene.json'),connectionFile=path.join(directory,'connection.json');
 let state={scene:E.compile(options.preset==='zenith'?E.ZENITH_EXAMPLE:E.SURFACE_EXAMPLE).scene,revision:0,view:{frame:0,playing:true,revision:0}};
 if(fs.existsSync(stateFile)){const saved=JSON.parse(fs.readFileSync(stateFile,'utf8'));E.validate(saved.scene);if(!Number.isInteger(saved.revision)||saved.revision<0)throw Error('Invalid stored revision');state={...state,scene:saved.scene,revision:saved.revision};}
 const token=crypto.randomBytes(32).toString('hex');
 let origin,viewStartedAt=Date.now();
 const snapshot=()=>{const data=clone(state);if(data.view.playing)data.view.frame=(data.view.frame+Math.floor((Date.now()-viewStartedAt)/1000*data.scene.fps))%Math.round(data.scene.duration*data.scene.fps);return {...data,warnings:E.loopWarnings(state.scene)};};
 function atomic(file,data){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(temp,file);fs.chmodSync(file,0o600);}
 function expect(args){if(!Number.isInteger(args.expected_revision)||args.expected_revision<0)throw fault(400,'revision_required','Read the scene and supply expected_revision.');if(args.expected_revision!==state.revision)throw fault(409,'revision_conflict','Scene changed. Read the latest revision before retrying.',{current_revision:state.revision});}
 function commit(scene,args){expect(args);try{E.validate(scene);}catch(e){throw fault(400,'invalid_scene',e.message);}const next={scene:clone(scene),revision:state.revision+1};atomic(stateFile,next);viewStartedAt=Date.now();state={...next,view:{...state.view,frame:0,revision:state.view.revision+1}};return {ok:true,...snapshot()};}
 function call(name,args={},context={}){
  if(!plain(args))throw fault(400,'invalid_arguments','Arguments must be an object');
  if(context.scope==='preset'){if(!context.job_id)throw fault(400,'draft_required','A preset draft job is required.');return agent.presetTool(context.job_id,name,args);}
  if(typeof name==='string'&&name.startsWith('glyph_flow_')){try{return context.job_id?agent.flowTool(context.job_id,name,args):flows.tool(name,args);}catch(e){if(e.status)throw e;throw fault(400,'invalid_flow',e.message);}}
  if(name==='glyph_studio_library'){try{const custom=presets.state.presets.find(p=>p.id===args.id);return custom?{ok:true,preset:clone(custom),applied:false}:{ok:true,...D.library(args),customPresets:presets.summary(),codePresets:programs.summary()};}catch(e){throw fault(400,'invalid_library_request',e.message);}}
  if(name==='glyph_studio_audit'){let candidate=state.scene;if(args.recipe_json!==undefined){if(typeof args.recipe_json!=='string'||args.recipe_json.length>100000)throw fault(400,'invalid_arguments','recipe_json must be JSON text under 100000 characters');try{candidate=JSON.parse(args.recipe_json);}catch{throw fault(400,'invalid_json','Invalid candidate recipe JSON');}}return {ok:true,...D.audit(candidate,args.recipe_json===undefined?state.revision:null)};}
  if(name==='glyph_studio_read')return {ok:true,...snapshot()};
  if(name==='glyph_studio_compile'){
   if(typeof args.directives!=='string'||args.directives.length>100000)throw fault(400,'invalid_arguments','Supply directives as text, at most 100000 characters');
   return E.compile(args.directives);
  }
  if(name==='glyph_studio_apply')return commit(args.scene,args);
  if(['glyph_studio_update','glyph_studio_add','glyph_studio_remove'].includes(name)){
   expect(args);if(!['surface','object'].includes(args.kind))throw fault(400,'invalid_target','kind must be surface or object');
   const next=clone(state.scene),key=args.kind==='surface'?'surfaces':'objects';next[key]??=[];
   if(name==='glyph_studio_add'){
    const d=args.definition;if(!plain(d)||typeof d.id!=='string')throw fault(400,'invalid_definition','definition must include an id');
    const base=args.kind==='surface'?E.baseSurface(d.id,d.shape||'sphere'):d.geometry?.type==='mapped'?E.mapped(d.id):E.base(d.id,d.geometry?.type||'bezier');
    next[key].push(merge(base,d));
   }else{
    const index=next[key].findIndex(x=>x.id===args.id);if(index<0)throw fault(404,'target_not_found','No such '+args.kind+': '+args.id);
    if(name==='glyph_studio_remove'){
     if(args.kind==='surface'&&next.objects.some(o=>o.geometry.host===args.id))throw fault(400,'surface_in_use','Rebind or remove attached glyph layers first.');
     next[key].splice(index,1);
    }else{
     if(!plain(args.changes)||Object.hasOwn(args.changes,'id'))throw fault(400,'invalid_patch','Changes must be an object; target ids cannot be renamed.');
     merge(next[key][index],args.changes);
    }
   }return commit(next,args);
  }
  if(name==='glyph_studio_preview'){
   const total=Math.round(state.scene.duration*state.scene.fps);
   if(!Number.isInteger(args.frame)||args.frame<0||args.frame>=total)throw fault(400,'invalid_frame',`frame must be an integer in 0..${total-1}`);
   if(args.expected_revision!==state.revision)throw fault(409,'revision_conflict','Read the latest scene before previewing.',{current_revision:state.revision});
   if(args.playing!==undefined&&typeof args.playing!=='boolean')throw fault(400,'invalid_arguments','playing must be boolean');
   viewStartedAt=Date.now();state.view={frame:args.frame,playing:args.playing??false,revision:state.view.revision+1};
   const points=E.sample(state.scene,args.frame/total),bounds={};
   for(const p of points){const b=bounds[p.id]??={count:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};b.count++;p.xyz.forEach((x,k)=>{b.min[k]=Math.min(b.min[k],x);b.max[k]=Math.max(b.max[k],x);});}
   return {ok:true,revision:state.revision,view:clone(state.view),objects:bounds,note:'Frame selection and geometry bounds; this is not a visual screenshot.'};
  }
  throw fault(404,'unknown_tool','Unknown scene tool');
 }
 const agent=createAgentJobs({directory,connectionFile,snapshot,call,flows,presets,programs,runner:options.agentRunner});
 flows.onDelivery=(id,before,after)=>agent.flowDelivery(id,before,after);
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  try{
   if(req.headers.host!==new URL(origin).host)throw fault(403,'host_denied','Invalid Host header');
   if(req.headers.origin&&req.headers.origin!==origin)throw fault(403,'origin_denied','Cross-origin access denied');
   if(req.headers['sec-fetch-site']==='cross-site')throw fault(403,'origin_denied','Cross-site access denied');
   const url=new URL(req.url,origin);
   if(url.pathname.startsWith('/api/')){
    const actual=req.headers.authorization||'',expected='Bearer '+token;
    if(actual.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw fault(401,'unauthorized','A bridge credential is required');
    if(req.method==='GET'&&url.pathname==='/api/programs')return send(res,200,programs.poll(url.searchParams.get('revision'),url.searchParams.get('draft_revision')));
    if(req.method==='GET'&&url.pathname==='/api/presets')return send(res,200,presets.poll(url.searchParams.get('revision'),url.searchParams.get('draft_revision')));
    if(req.method==='GET'&&url.pathname==='/api/voice')return send(res,200,voice.status());
    if(req.method==='POST'&&url.pathname==='/api/voice'){if(!['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-wav'].includes(String(req.headers['content-type']||'').split(';')[0]))throw fault(415,'content_type','Send a supported audio recording.');let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>10000000)throw fault(413,'too_large','Recording exceeds 10 MB.');chunks.push(chunk);}return send(res,200,await voice.transcribe(Buffer.concat(chunks)));}
    if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,{ok:true,...snapshot()});
    if(req.method==='GET'&&url.pathname==='/api/flow')return send(res,200,flows.read());
    if(req.method==='GET'&&url.pathname==='/api/agent')return send(res,200,agent.status(url.searchParams.has('provider')?url.searchParams.get('provider'):undefined,url.searchParams.get('target')||undefined));
    if(req.method!=='POST'||!['/api/language/compile','/api/programs/save','/api/programs/draft','/api/presets/save','/api/presets/draft','/api/tool','/api/agent','/api/agent/cancel','/api/agent/undo','/api/flow/claim','/api/flow/complete','/api/flow/receipts/reset'].includes(url.pathname))throw fault(404,'not_found','Unknown API route');
    if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fault(415,'content_type','Use application/json');
    let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>256000)throw fault(413,'too_large','Request exceeds 256 KB');chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fault(400,'invalid_json','Invalid JSON');}
    if(!plain(body))throw fault(400,'invalid_arguments','Request body must be an object.');
    if(url.pathname==='/api/language/compile')return send(res,200,await require('../language/service.cjs').compileRequest(body));
    if(url.pathname==='/api/programs/draft')return send(res,200,{ok:true,draft:programs.commit(body.source,body.expected_revision)});
    if(url.pathname==='/api/programs/save')return send(res,200,programs.save(body));
    if(url.pathname==='/api/presets/save')return send(res,200,presets.save(body));
    if(url.pathname==='/api/presets/draft')return send(res,200,{ok:true,draft:presets.commit(body.scene,body.expected_revision)});
    if(url.pathname==='/api/agent')return send(res,202,agent.start(body.prompt,body.provider,body.target,body.preview_feedback));
    if(url.pathname==='/api/agent/cancel')return send(res,200,agent.cancel());
    if(url.pathname==='/api/agent/undo')return send(res,200,agent.undo(call,body.target));
    if(url.pathname==='/api/flow/receipts/reset')return send(res,200,flows.clearReceipts());
    if(url.pathname==='/api/flow/claim')return send(res,200,flows.claim(body.owner));
    if(url.pathname==='/api/flow/complete')return send(res,200,flows.complete(body));
    return send(res,200,call(body.name,body.arguments,body.context));
   }
   if(req.method!=='GET')throw fault(405,'method_not_allowed','Use GET');
   if(['/','/zenith','/zenith.html','/flow','/flow.html','/design','/design-system.html','/presets','/math'].includes(url.pathname)){
    let html=fs.readFileSync(path.join(__dirname,'..','dist',url.pathname==='/math'?'math-lab.html':url.pathname==='/presets'?'preset-designer.html':url.pathname==='/'?'index.html':url.pathname.startsWith('/design')?'design-system.html':url.pathname.startsWith('/flow')?'flow.html':'zenith.html'),'utf8');
    const boot='<script>window.GLYPH_BRIDGE='+JSON.stringify({token})+';</script>'+ (url.pathname==='/'?'<script defer src="bridge-client.js"></script>':'');
    html=html.replace('</head>',boot+'</head>');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html);
   }
   const names={'/language-workshop.js':['dist/language-workshop.js','text/javascript'],'/language-workshop.css':['dist/language-workshop.css','text/css'],'/language-signal-shell.txt':['language/examples/signal-shell.glyph.ts','text/plain'],'/language-word-ring.txt':['language/examples/word-ring.glyph.ts','text/plain'],'/exchange-model.js':['dist/exchange-model.js','text/javascript'],'/shared-exchange.js':['dist/shared-exchange.js','text/javascript'],'/shared-exchange.css':['dist/shared-exchange.css','text/css'],'/shared-interface-check.html':['dist/shared-interface-check.html','text/html'],'/glyph-agent.js':['dist/glyph-agent.js','text/javascript'],'/component-agent-ui.js':['dist/component-agent-ui.js','text/javascript'],'/component-agent.css':['dist/component-agent.css','text/css'],'/component-agent-check.html':['dist/component-agent-check.html','text/html'],'/program-workshop.js':['dist/program-workshop.js','text/javascript'],'/program-preview.js':['dist/program-preview.js','text/javascript'],'/program-runtime.json':['dist/program-runtime.json','application/json'],'/program-seed.js':['dist/program-seed.js','text/javascript'],'/program-check.html':['dist/program-check.html','text/html'],'/glyph-program.js':['dist/glyph-program.js','text/javascript'],'/math-examples.js':['dist/math-examples.js','text/javascript'],'/math-lab.js':['dist/math-lab.js','text/javascript'],'/math-lab.css':['dist/math-lab.css','text/css'],'/math-check.html':['dist/math-check.html','text/html'],'/preset-check.html':['dist/preset-check.html','text/html'],'/presets.js':['dist/presets.js','text/javascript'],'/preset-designer.js':['dist/preset-designer.js','text/javascript'],'/preset-designer.css':['dist/preset-designer.css','text/css'],'/design-system.css':['dist/design-system.css','text/css'],'/design-system.js':['dist/design-system.js','text/javascript'],'/design-tokens.css':['dist/design-tokens.css','text/css'],'/glyph-design.js':['dist/glyph-design.js','text/javascript'],'/design-system.json':['dist/design-system.json','application/json'],'/design-check.html':['dist/design-check.html','text/html'],'/flow':['dist/flow.html','text/html'],'/flow.html':['dist/flow.html','text/html'],'/glyph-flow.js':['dist/glyph-flow.js','text/javascript'],'/flow.css':['dist/flow.css','text/css'],'/flow-demo.js':['dist/flow-demo.js','text/javascript'],'/flow-check.html':['dist/flow-check.html','text/html'],'/agent-panel.js':['dist/agent-panel.js','text/javascript'],'/agent-panel.css':['dist/agent-panel.css','text/css'],'/animal-check.html':['dist/animal-check.html','text/html'],'/animals':['dist/life.html','text/html'],'/life.html':['dist/life.html','text/html'],'/life-lab.css':['dist/life-lab.css','text/css'],'/life-geometry.js':['dist/life-geometry.js','text/javascript'],'/life-motion.js':['dist/life-motion.js','text/javascript'],'/life-player.js':['dist/life-player.js','text/javascript'],'/life-lab.js':['dist/life-lab.js','text/javascript'],'/betta':['dist/betta.html','text/html'],'/betta.html':['dist/betta.html','text/html'],'/betta.js':['dist/betta.js','text/javascript'],'/betta-geometry.js':['dist/betta-geometry.js','text/javascript'],'/glyph-player.js':['dist/glyph-player.js','text/javascript'],'/glyph-core.wasm':['dist/glyph-core.wasm','application/wasm'],'/player-sizes.json':['dist/player-sizes.json','application/json'],'/components':['dist/components.html','text/html'],'/components.html':['dist/components.html','text/html'],'/benchmark.html':['dist/benchmark.html','text/html'],'/presets/zenith.scene.json':['dist/presets/zenith.scene.json','application/json'],'/zenith':['dist/zenith.html','text/html'],'/zenith.html':['dist/zenith.html','text/html'],'/scene.js':['dist/scene.js','text/javascript'],'/app.js':['dist/app.js','text/javascript'],'/style.css':['dist/style.css','text/css'],'/bridge-client.js':['hermes/browser-client.js','text/javascript'],'/flow-guide.txt':['dist/flow-guide.txt','text/plain'],'/agent-guide.txt':['dist/agent-guide.txt','text/plain'],'/scene.schema.json':['dist/scene.schema.json','application/json'],'/example-scene.json':['dist/example-scene.json','application/json']};
   const entry=names[url.pathname];if(!entry)throw fault(404,'not_found','Not found');
   res.writeHead(200,{'Content-Type':entry[1]+'; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(__dirname,'..',entry[0])));
  }catch(e){send(res,e.status||500,{ok:false,error:{code:e.code||'internal_error',message:e.status?e.message:'Bridge operation failed',...(e.current_revision!==undefined?{current_revision:e.current_revision}:{})}});}
 });
 return {server,call,snapshot,flows,presets,programs,connectionFile,directory,
  async start(port=8788){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;atomic(connectionFile,{version:1,url:origin,token,pid:process.pid});return {url:origin,connection_file:connectionFile};},
  async close(){agent.close();voice.close();await new Promise(r=>server.close(r));try{const c=JSON.parse(fs.readFileSync(connectionFile,'utf8'));if(c.pid===process.pid)fs.unlinkSync(connectionFile);}catch{}}
 };
}
if(require.main===module){
 const args=process.argv.slice(2),read=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
 const bridge=createBridge({directory:read('--state-dir',undefined),preset:read('--preset','surfaces')});
 bridge.start(Number(read('--port',8788))).then(info=>{console.log(JSON.stringify(info));}).catch(e=>{console.error(e.message);process.exitCode=1;});
 for(const event of ['SIGINT','SIGTERM'])process.once(event,()=>bridge.close().then(()=>process.exit(0)));
}
module.exports={createBridge,merge};
