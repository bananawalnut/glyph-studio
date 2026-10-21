'use strict';
// Source is parsed, persisted and proposed here. It is NEVER executed by the host.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fail(status,message){throw Object.assign(Error(message),{status,code:status===409?'revision_conflict':'invalid_program'});}
function text(source){if(typeof source!=='string'||!source.trim()||Buffer.byteLength(source)>64000)fail(400,'Use JavaScript source up to 64 KB.');return source;}
function validate(source){text(source);try{new vm.Script('"use strict";\n'+source+'\n;typeof create;');}catch(e){fail(400,'Source syntax: '+e.message);}if(!/\bfunction\s+create\s*\(/.test(source))fail(400,'Define function create(A, F) returning {program, component?, params?}.');return source;}
class ProgramStore{
 constructor(directory){this.file=path.join(directory,'programs.json');this.state=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{version:1,revision:0,presets:[],draft:{revision:0,source:fs.readFileSync(path.join(__dirname,'../dist/program-seed.js'),'utf8')}};if(this.state.version!==1||!Number.isSafeInteger(this.state.revision)||!Array.isArray(this.state.presets)||!Number.isSafeInteger(this.state.draft?.revision))throw Error('Invalid program store');text(this.state.draft.source);for(const p of this.state.presets)this.validatePreset(p);}
 read(){return {ok:true,...structuredClone(this.state)};}
 draft(){return structuredClone(this.state.draft);}
 summary(){return this.state.presets.map(({source,...p})=>({...p,bytes:Buffer.byteLength(source)}));}
 persist(next){fs.writeFileSync(this.file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);this.state=next;return this.read();}
 commit(source,revision,checkSyntax=false){text(source);if(checkSyntax)validate(source);if(revision!==this.state.draft.revision)fail(409,'The program draft changed. Read the latest source before applying.');return this.persist({...this.state,draft:{revision:revision+1,source}}).draft;}
 validatePreset(p){if(!p||p.version!==1||p.kind!=='program'||typeof p.id!=='string'||!/^program-[a-z0-9-]{1,80}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.description!=='string'||p.description.length>500||Object.keys(p).some(k=>!['version','kind','id','name','description','source'].includes(k)))fail(400,'Use a named version 1 program preset.');validate(p.source);}
 save({preset,expected_revision,expected_draft_revision}){this.validatePreset(preset);if(expected_revision!==this.state.revision||expected_draft_revision!==this.state.draft.revision||preset.source!==this.state.draft.source)fail(409,'The library or source changed. Preview the latest draft before saving.');const list=structuredClone(this.state.presets),index=list.findIndex(p=>p.id===preset.id);if(index<0){if(list.length>=100)fail(400,'At most 100 source presets.');list.push(structuredClone(preset));}else list[index]=structuredClone(preset);return this.persist({...this.state,revision:this.state.revision+1,presets:list});}
}
module.exports={ProgramStore,validate};
