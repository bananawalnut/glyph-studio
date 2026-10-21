'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../dist/scene.js');
const DS=require('../dist/glyph-design.js');
const ROOT=path.join(__dirname,'plugin','glyph-studio'),directory=path.join(ROOT,'designer');
const profile=()=>JSON.parse(fs.readFileSync(path.join(directory,'profile.json'),'utf8'));
function toolNames(provider,target){const names=profile().tools[provider];return !target?names:names.filter(n=>target==='flow'?n.startsWith('glyph_flow_'):!n.startsWith('glyph_flow_'));}
function context(prompt,provider,target){const p=profile(),skills=p.skills.filter(s=>target==='flow'?s.id==='glyph-flow':(s.id!=='glyph-flow'&&(s.always||[s.id,...s.triggers].some(t=>new RegExp('(?<!\\w)'+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?!\\w)','i').test(prompt))))).map(s=>s.id);const text=[...['SOUL.md','WORKFLOW.md'].map(n=>fs.readFileSync(path.join(directory,n),'utf8')),'RUNTIME: '+p.execution[provider],...skills.map(id=>fs.readFileSync(path.join(ROOT,'skills',id,'SKILL.md'),'utf8'))].join('\n\n');return {profile:p.id,name:p.name,skills,text};}
const ANIMALS={
 'pisces':{name:'Paired fish',motion:'Two offset body waves; a symbolic pair, not a separate species.',source:'https://pubmed.ncbi.nlm.nih.gov/34853171/'},
 'jellyfish':{name:'Moon jelly',motion:'Contraction, longer refill and glide; lagging oral arms.',source:'https://pubmed.ncbi.nlm.nih.gov/24101461/'},
 'ray':{name:'Ray',motion:'A Dasyatis-type pectoral disc with a traveling wave; distal movement exceeds central movement.',source:'https://pubmed.ncbi.nlm.nih.gov/11136623/'},
 'koi':{name:'Koi',motion:'Posterior body waves during driven bouts, alternating with coasts and continued pectoral trim.',source:'https://doi.org/10.1242/jeb.001842'},
 'sea-angel':{name:'Sea angel',motion:'Flexible paired parapodia; delayed distal strokes around a quiet translucent trunk.',source:'https://pubmed.ncbi.nlm.nih.gov/22071184/'},
 'betta':{name:'Betta',motion:'Restrained body wave and independently delayed long-fin membranes; membrane lag is art directed.',source:'https://pubmed.ncbi.nlm.nih.gov/34853171/'}
};
function library(args={}){const kind=args.kind||'profile',id=args.id;if(id!==undefined&&typeof id!=='string')throw Error('id must be a string');
 if(kind==='program')return {programmerAPI:fs.readFileSync(path.join(__dirname,'..','docs','programmable-geometry.md'),'utf8'),exampleSource:fs.readFileSync(path.join(__dirname,'..','dist','math-examples.js'),'utf8'),editor:'/math',execution:'Application module code, authored in the repository. The restricted prompt adapter does not execute source strings.'};
 if(kind==='design-system')return {designSystem:DS.catalog()};
 if(['object','motion','material','behavior'].includes(kind)){if(!id)return {[kind+'s']:DS.catalog()[{object:'objects',motion:'motions',material:'materials',behavior:'behaviors'}[kind]]};const entry=DS.preset(kind,id);return {preset:entry,...(kind==='object'?{scene:DS.scene({object:id}),options:['object','motions','material','color','text','seed','duration','id']}:{}),applied:false};}
 if(kind==='profile')return {profile:profile()};
 if(kind==='skill'){const p=profile();if(!id)return {skills:p.skills};if(!p.skills.some(s=>s.id===id))throw Error('Unknown skill');return {id,instructions:fs.readFileSync(path.join(ROOT,'skills',id,'SKILL.md'),'utf8')};}
 if(kind==='preset'){const list=Object.entries(E.EXAMPLES).map(([name,text])=>{const s=E.compile(text).scene;return {id:name,duration:s.duration,objects:s.objects.length,surfaces:s.surfaces?.length||0};});if(!id)return {presets:list};if(!Object.hasOwn(E.EXAMPLES,id))throw Error('Unknown preset');return {id,...E.compile(E.EXAMPLES[id])};}
 if(kind==='animal'){if(!id)return {animals:Object.entries(ANIMALS).map(([id,a])=>({id,...a,editable:false}))};if(!Object.hasOwn(ANIMALS,id))throw Error('Unknown animal');const m=require('../dist/life-geometry.js').generate(id);return {id,...ANIMALS[id],editable:false,editPath:'Separate component source; recipe tools do not edit this geometry.',glyphs:m.count,parts:m.parts,motionEvidence:'Research-informed, art-directed kinematics; not fluid simulation.'};}
 throw Error('Unknown library kind');
}
function audit(scene,revision=null){let s=scene;try{E.validate(s);}catch(e){return {valid:false,revision,errors:[e.message],visualReview:false,performanceMeasured:false};}const points=E.sample(s,0),counts={};let finite=true;for(const p of points){counts[p.id]=(counts[p.id]||0)+1;finite=finite&&p.xyz.every(Number.isFinite);}return {valid:true,revision,errors:[],warnings:E.loopWarnings(s),frame:0,pointCount:points.length,pointsByObject:counts,finiteGeometry:finite,recipeBytes:Buffer.byteLength(JSON.stringify(s)),seed:s.seed,loopFrames:Math.round(s.duration*s.fps),surfaces:(s.surfaces||[]).map(h=>({id:h.id,shape:h.shape,layers:s.objects.filter(o=>o.geometry.host===h.id).map(o=>o.id)})),visualReview:false,performanceMeasured:false,note:'Analytic validation and frame-zero samples, not pixels or measured frame time.'};}
module.exports={profile,toolNames,context,library,audit,ANIMALS};
