/* Runs only in an opaque-origin, network-disabled preview worker. */
(()=>{'use strict';
const send=postMessage.bind(globalThis),A=GlyphProgram,F=GlyphFlowCore;
let product,program,component,state,from=[],transitionAt=0;
function layout(){return component?F.organized(component,state,{width:600,height:170}):[];}
function sync(){if(component)program.setParams(product.params?product.params(state):state);}
function frame(phase){const sample=program.sample(phase),buffers=[...sample.buffers].map(([id,array])=>[id,array.slice()]),target=layout(),progress=Math.min(1,(performance.now()-transitionAt)/((component?.motion.duration||1)*1000));const prior=new Map(from.map(m=>[m.id,m]));const marks=target.map(m=>F.morph(prior.get(m.id)||m,m,progress,component.motion));send({type:'frame',descriptor:sample.descriptor,phase,buffers,marks},buffers.map(([,a])=>a.buffer));}
onmessage=e=>{try{const m=e.data;if(m.type==='init'){
 product=new Function('A','F','"use strict";\n'+m.source+'\nreturn create(A,F);')(A,F);
 if(!product||!(product.program instanceof A.Program))throw Error('create(A,F) must return {program: new A.Program(...)}.');
 program=product.program;if(program.entries.reduce((n,e)=>n+e.buffer.length/6,0)>12000)throw Error('Studio previews allow at most 12000 points.');
 component=product.component?F.definition(product.component):null;state=component?.initial??null;sync();
 const audit=program.audit({frames:8});if(component){layout();F.morph({x:0,y:0,z:0},{id:'audit',x:1,y:1,z:1},.5,component.motion);}
 send({type:'ready',audit,signature:component?.interface?.describe()||null,state});frame(0);
 }else if(m.type==='frame')frame(m.phase);
 else if(m.type==='invoke'){
 if(!component?.interface)throw Error('This program has no component interface.');
 const next=F.prepare(component,state,m.payload,m.method),previousState=state,previousParams=program.params;
 const previous=layout();try{state=next.state;sync();layout();program.sample(m.phase||0);}catch(error){state=previousState;program.setParams(previousParams);throw error;}
 from=previous;transitionAt=performance.now();send({type:'receipt',method:m.method,result:next.result,state,signature:component.interface.describe()});frame(m.phase||0);
 }
 }catch(error){send({type:'error',message:String(error.message||error).slice(0,1000)});}};
})();
