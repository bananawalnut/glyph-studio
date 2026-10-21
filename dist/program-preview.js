/* Trusted preview host. User source executes ONLY in its terminable worker. */
(function(root){'use strict';
const json=value=>JSON.stringify(value).replace(/</g,'\\u003c');
function previewHost(runtime,source){
 const canvas=document.getElementById('geometry'),layout=document.getElementById('layout'),ctx=layout.getContext('2d'),note=document.getElementById('note');
 const renderer=GlyphPlayer.createRenderer(canvas),workerURL=URL.createObjectURL(new Blob([runtime.worker],{type:'text/javascript'})),worker=new Worker(workerURL);URL.revokeObjectURL(workerURL);
 let timeout=null,pending=true,stopped=false,phase=0,duration=12,ready=null,last=0,paused=false,descriptor=null,descriptorKey='',queued=null;
 const report=data=>parent.postMessage({glyphProgramPreview:1,...data},'*');
 function stop(message){stopped=true;clearTimeout(timeout);worker.terminate();note.textContent=message;report({type:'error',message});}
 function send(data){pending=true;clearTimeout(timeout);timeout=setTimeout(()=>stop('Program exceeded the 2 second compute budget. Edit it and run again.'),2000);worker.postMessage(data);}
 worker.onerror=e=>stop(String(e.message||'Worker failed').slice(0,1000));
 worker.onmessage=e=>{if(stopped)return;const m=e.data;try{
 if(m.type==='error'){stop(String(m.message).slice(0,1000));return;}
 if(m.type==='ready'){ready={audit:m.audit,signature:m.signature,state:m.state};return;}
 if(m.type==='receipt'){report({type:'receipt',method:m.method,result:m.result,state:m.state});return;}
 if(m.type!=='frame')return;
 clearTimeout(timeout);pending=false;
 if(!Array.isArray(m.buffers)||m.buffers.length>16||m.buffers.reduce((n,p)=>n+(p[1]?.length||0),0)>72000||!Array.isArray(m.marks)||m.marks.length>1024)throw Error('Preview frame budget exceeded.');
 const width=Math.max(1,Math.min(1400,innerWidth)),height=360,dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(width*dpr)||canvas.height!==height*dpr){canvas.width=Math.round(width*dpr);canvas.height=height*dpr;}
 const key=JSON.stringify(m.descriptor);if(key!==descriptorKey){descriptor=m.descriptor;descriptorKey=key;}renderer.setPointBuffers(descriptor,new Map(m.buffers));renderer.render(descriptor,m.phase);duration=m.descriptor.duration;
 ctx.clearRect(0,0,600,170);ctx.textAlign='center';ctx.font='11px monospace';for(const mark of m.marks){if(!Number.isFinite(mark.x)||!Number.isFinite(mark.y)||typeof mark.label!=='string'||mark.label.length>120)throw Error('Invalid component layout.');ctx.fillStyle=typeof mark.color==='string'?mark.color:'#86d6ee';ctx.fillText(mark.label,mark.x,mark.y);}
 note.textContent=renderer.stats.instances+' POINTS / '+renderer.kind.toUpperCase()+' / ISOLATED WORKER';
 if(ready){report({type:'ready',...ready,renderer:renderer.kind});ready=null;}if(queued){const next=queued;queued=null;send(next);}
 }catch(error){stop(String(error.message).slice(0,1000));}};
 window.addEventListener('message',e=>{if(e.source!==parent||!e.data||e.data.glyphProgramCommand!==1||stopped)return;const m=e.data;
 if(m.type==='pause'){paused=!!m.paused;return;}
 if(m.type==='invoke'){const next={type:'invoke',method:m.method,payload:m.payload,phase};if(pending){queued=next;return;}send(next);}
 });
 function tick(now){if(stopped)return;requestAnimationFrame(tick);if(paused||document.hidden||pending||now-last<1000/30)return;last=now;phase=(now/1000%duration)/duration;send({type:'frame',phase});}requestAnimationFrame(tick);send({type:'init',source});
 window.addEventListener('pagehide',()=>{clearTimeout(timeout);worker.terminate();renderer.destroy();});
}
class ProgramPreview{
 constructor(container,onEvent){this.container=container;this.onEvent=onEvent;this.onMessage=e=>{if(e.source!==this.frame?.contentWindow||e.data?.glyphProgramPreview!==1)return;this.onEvent(e.data);};window.addEventListener('message',this.onMessage);}
 async run(source){const turn=this.turn=(this.turn||0)+1;const runtime=root.GLYPH_PROGRAM_RUNTIME||await fetch('program-runtime.json').then(r=>{if(!r.ok)throw Error('Preview runtime unavailable');return r.json();});if(turn!==this.turn)return;this.frame?.remove();const frame=document.createElement('iframe');this.frame=frame;frame.title='Isolated geometry and component logic preview';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'");
 const csp="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'";
 frame.srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+csp+'"><style>body{margin:0;background:#080e10;color:#86d6ee;font:10px monospace}canvas{display:block;width:100%;height:360px}#layout{height:170px;border-top:1px solid #29483c}p{padding:10px;margin:0}</style><canvas id="geometry" aria-label="Generated geometry"></canvas><canvas id="layout" width="600" height="170" aria-label="Generated component organizer"></canvas><p id="note">Checking code in isolated worker…</p><script>'+runtime.player.replace(/<\/script/gi,'<\\/script')+'</script><script>('+previewHost.toString()+')('+json({worker:runtime.worker})+','+json(source)+');</script>';
 this.container.replaceChildren(frame);
 }
 command(data){this.frame?.contentWindow.postMessage({glyphProgramCommand:1,...data},'*');}
 destroy(){this.frame?.remove();window.removeEventListener('message',this.onMessage);}
}
root.GlyphProgramPreview=ProgramPreview;
})(globalThis);
