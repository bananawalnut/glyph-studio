'use strict';
// Separate, additive source library. Compilation parses/types/checks; never evaluates author code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {compileRequest}=require('../language/service.cjs'),{validate}=require('./program-store.cjs');
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:status===409?'revision_conflict':'invalid_typescript'});};
function text(source){if(typeof source!=='string'||!source.trim()||Buffer.byteLength(source)>64000)fail(400,'Use TypeScript source up to 64000 bytes.');return source;}
class TypeScriptStore {
 constructor(directory){this.file=path.join(directory,'typescript.json');this.state=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{version:1,revision:0,presets:[],draft:{revision:0,source:fs.readFileSync(path.join(__dirname,'../language/examples/signal-shell.glyph.ts'),'utf8')}};
  if(this.state.version!==1||!Number.isSafeInteger(this.state.revision)||this.state.revision<0||!Array.isArray(this.state.presets)||!Number.isSafeInteger(this.state.draft?.revision)||this.state.draft.revision<0)throw Error('Invalid TypeScript library');
  text(this.state.draft.source);for(const p of this.state.presets){this.validatePreset(p);if(!p.compiled?.manifest||p.compiled.manifest.sourceHash!==crypto.createHash('sha256').update(p.source).digest('hex')||p.compiled.moduleSource!==p.compiled.previewSource+'\nexport { create };\n')throw Error('Invalid compiled TypeScript preset');validate(p.compiled.previewSource);}
 }
 read(){return {ok:true,...structuredClone(this.state)};}
 draft(){return structuredClone(this.state.draft);}
 poll(revision,draftRevision){return String(this.state.revision)===revision&&String(this.state.draft.revision)===draftRevision?{ok:true,unchanged:true}:this.read();}
 summary(){return this.state.presets.map(({source,compiled,...p})=>({...p,sourceBytes:Buffer.byteLength(source),bytes:compiled.manifest.bytes,sourceHash:compiled.manifest.sourceHash}));}
 persist(next){fs.writeFileSync(this.file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);this.state=next;return this.read();}
 commit(source,revision){text(source);if(revision!==this.state.draft.revision)fail(409,'The TypeScript draft changed. Read the latest source before applying.');return this.persist({...this.state,draft:{revision:revision+1,source}}).draft;}
 validatePreset(p){if(!p||p.version!==1||p.kind!=='typescript-component'||typeof p.id!=='string'||!/^component-[a-z0-9-]{1,80}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.description!=='string'||p.description.length>500||Object.keys(p).some(k=>!['version','kind','id','name','description','source','compiled'].includes(k)))fail(400,'Use a named version 1 TypeScript component preset.');text(p.source);}
 async save({preset,expected_revision,expected_draft_revision}){
  this.validatePreset(preset);if(Object.hasOwn(preset,'compiled'))fail(400,'The server produces compiled artifacts from the exact TypeScript source.');
  const current=()=>{if(expected_revision!==this.state.revision||expected_draft_revision!==this.state.draft.revision||preset.source!==this.state.draft.source)fail(409,'The library or TypeScript draft changed. Compile the latest source before saving.');};
  current();const compiled=await compileRequest({source:preset.source,filename:'component.glyph.ts'});current();
  if(!compiled.ok)fail(400,compiled.diagnostics.map(d=>`Line ${d.line}:${d.column} ${d.code}: ${d.message}`).join('\n').slice(0,5000));
  const list=structuredClone(this.state.presets),index=list.findIndex(p=>p.id===preset.id),saved={...structuredClone(preset),compiled:{previewSource:compiled.previewSource,moduleSource:compiled.moduleSource,manifest:compiled.manifest}};
  if(index<0){if(list.length>=100)fail(400,'At most 100 TypeScript component presets.');list.push(saved);}else list[index]=saved;
  return this.persist({...this.state,revision:this.state.revision+1,presets:list});
 }
}
module.exports={TypeScriptStore,text};
