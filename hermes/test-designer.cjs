'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process'),readline=require('node:readline');
const D=require('./designer.cjs'),{createBridge}=require('./bridge.cjs'),worker=require('./codex-worker.cjs');
(async()=>{const directory=fs.mkdtempSync(path.join(os.tmpdir(),'glyph-designer-'));let bridge,child;
try{
 const profile=D.profile();A.equal(profile.skills.length,6);A.equal(profile.tools.hermes.length,14);A.equal(profile.tools.codex.length,6);
 for(const provider of ['hermes','codex'])for(const prompt of ['Make the koi fins realistic','Change the torus surface and cubic path','A waveform has no keyword match','Check the profile']){
  const js=D.context(prompt,provider),py=spawnSync('python3',[path.join(__dirname,'designer-context.py')],{input:JSON.stringify({prompt,provider}),encoding:'utf8'});A.equal(py.status,0,py.stderr);A.deepEqual(JSON.parse(py.stdout),js);
 }
 A.deepEqual(D.context('A waveform has no keyword match','codex').skills,['glyph-studio','glyph-review']);
 A.throws(()=>D.library({kind:'skill',id:'../../connection.json'}));A.throws(()=>D.library({kind:'preset',id:'__proto__'}));
 A.equal(D.library({kind:'animal'}).animals.length,6);for(const animal of Object.keys(D.ANIMALS)){const entry=D.library({kind:'animal',id:animal});A.equal(entry.editable,false);A(entry.glyphs>0);}
 for(const provider of ['hermes','codex']){const prompt='Add a record to source.add',js=D.context(prompt,provider,'flow'),py=spawnSync('python3',[path.join(__dirname,'designer-context.py')],{input:JSON.stringify({prompt,provider,target:'flow'}),encoding:'utf8'});A.equal(py.status,0,py.stderr);A.deepEqual(JSON.parse(py.stdout),js);A.deepEqual(js.skills,['glyph-flow']);}
 for(const provider of ['hermes','codex']){const request={prompt:'edit component',provider,target:'typescript'},js=D.context(request.prompt,provider,request.target),py=spawnSync('python3',[path.join(__dirname,'designer-context.py')],{input:JSON.stringify(request),encoding:'utf8'});A.equal(py.status,0,py.stderr);A.deepEqual(JSON.parse(py.stdout),js);A.deepEqual(js.skills,['glyph-typescript']);A.deepEqual(D.toolNames(provider,'typescript'),[]);}
 const exported=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/agent-tools.json'),'utf8'));
 const python=spawnSync('python3',['-c','import runpy,json; print(json.dumps(runpy.run_path("hermes/plugin/glyph-studio/schemas.py")["TOOLS"]))'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});A.equal(python.status,0,python.stderr);A.deepEqual(exported,JSON.parse(python.stdout));
 bridge=createBridge({directory});const info=await bridge.start(0);bridge.call('glyph_studio_preview',{frame:0,playing:false,expected_revision:0});const before=bridge.snapshot();
 A.equal(D.audit({}).valid,false);A.equal(D.audit(before.scene).performanceMeasured,false);A(D.audit(before.scene).finiteGeometry);
 const audit=bridge.call('glyph_studio_audit',{});A.equal(audit.revision,before.revision);A(audit.pointCount>0);A.equal(audit.visualReview,false);
 const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/presets/zenith.scene.json')));A(D.audit(legacy).valid);A.equal(bridge.call('glyph_studio_audit',{recipe_json:JSON.stringify(legacy)}).revision,null);
 A.equal(bridge.call('glyph_studio_audit',{recipe_json:'{}'}).valid,false);
 child=spawn(process.execPath,[path.join(__dirname,'studio-mcp.cjs')],{env:{...process.env,GLYPH_STUDIO_CONNECTION:info.connection_file},stdio:['pipe','pipe','pipe']});
 let n=0;const pending=new Map(),lines=readline.createInterface({input:child.stdout});lines.on('line',line=>{const msg=JSON.parse(line);const fn=pending.get(msg.id);if(fn){pending.delete(msg.id);fn(msg);}});
 const rpc=(method,params={})=>new Promise((resolve,reject)=>{const id=++n,timer=setTimeout(()=>reject(Error('MCP timeout: '+method)),10000);pending.set(id,value=>{clearTimeout(timer);resolve(value.result);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 A.equal((await rpc('initialize',{protocolVersion:'2024-11-05'})).serverInfo.name,'glyph-studio-readonly');
 const toolList=(await rpc('tools/list')).tools;A.deepEqual(toolList.map(t=>t.name).sort(),profile.tools.codex.slice().sort());A(toolList.every(t=>t.annotations.readOnlyHint));
 for(const [name,args] of [['glyph_flow_read',{}],['glyph_flow_validate',{}],['glyph_studio_read',{}],['glyph_studio_audit',{}],['glyph_studio_library',{kind:'profile'}],['glyph_studio_compile',{directives:'loop 12s; seed 42\nshell: sphere; white'}]]){
  const result=await rpc('tools/call',{name,arguments:args});A(!result.isError,JSON.stringify(result));A.equal(JSON.parse(result.content[0].text).ok,true);
 }
 A.equal((await rpc('tools/call',{name:'glyph_studio_apply',arguments:{scene:legacy,expected_revision:0}})).isError,true);A.deepEqual(bridge.snapshot(),before);
 const config=worker.command({},'/schema','/answer','/cwd',info.connection_file);A(config.includes('mcp_servers.glyph_studio.enabled_tools='+JSON.stringify(D.toolNames('codex','scene'))));A(config.includes('mcp_servers.glyph_studio.default_tools_approval_mode="auto"'));A(!worker.DISABLED.includes('code_mode_host'));
 console.log('PASS shared skill routing parity, profile/tool contracts, bounded library, legacy/v2 analytic audit, real stdio MCP reads/compile and mutation rejection');
}finally{child?.kill();if(bridge?.server.listening)await bridge.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
