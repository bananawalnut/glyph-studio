window.addEventListener('DOMContentLoaded',()=>{'use strict';
 const $=id=>document.getElementById(id),editor=$('language-source'),auth=window.GLYPH_BRIDGE;
 let compiled=null,ready=false,running=false,calling=false,edit=0,visible=true,signature=null,compiledText='',store=null,base='',baseRevision=0,dirty=false,loaded=null,polling=false,saving=false,rerun=false,lastFeedback='';
 const status=text=>{lastFeedback=text;$('language-status').textContent=text;};
 async function api(route,body){if(!auth)throw Error('Open the local dev server to prompt, compile and save.');const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error?.message||'TypeScript request failed.');return d;}
 const receive=message=>{
  if(!compiled||compiledText!==editor.value)return;
  if(message.type==='ready'){
   ready=true;signature=message.signature;preview.command({type:'pause',paused:!visible});
   $('language-method').replaceChildren(...Object.keys(signature?.methods||{}).map(name=>{const o=document.createElement('option');o.value=o.textContent=name;return o;}));
   $('language-interface').textContent=JSON.stringify(signature,null,2);$('language-state').textContent=JSON.stringify({state:message.state},null,2);
   status('Type check passed · '+message.audit.points+' points · '+message.renderer+' · preview ready.');
  }
  if(message.type==='receipt'){calling=false;$('language-state').textContent=JSON.stringify({state:message.state,result:message.result},null,2);status('Typed method accepted · state and geometry updated.');}
  if(message.type==='error'){calling=false;ready=false;status('Runtime preview: '+message.message);}
  controls();
 };
 let preview=new GlyphProgramPreview($('language-preview'),receive);
 function controls(){const good=ready&&compiledText===editor.value;
  $('language-compile').disabled=!auth||running||saving;$('language-export').disabled=!compiled;$('language-source-export').disabled=!editor.value.trim();
  $('language-use').disabled=!good||!window.glyphProgramStudio;$('language-call').disabled=!good||calling||!Object.keys(signature?.methods||{}).length;
  $('typescript-save-new').disabled=!auth||!good||running||saving;$('typescript-update').disabled=!auth||!good||!loaded||running||saving;
 }
 function invalidate(){edit++;compiled=null;compiledText='';ready=false;calling=false;signature=null;preview.destroy();preview=new GlyphProgramPreview($('language-preview'),receive);$('language-interface').textContent='';$('language-state').textContent='';$('language-artifact').textContent='';controls();}
 editor.addEventListener('input',()=>{dirty=true;invalidate();status('Source changed. Compile before previewing or saving.');});
 async function flush(){if(!auth||!store)throw Error('The TypeScript draft is still loading.');if(dirty){const text=editor.value,revision=edit,d=await api('typescript/draft',{source:text,expected_revision:baseRevision});base=text;baseRevision=d.draft.revision;store.draft=d.draft;if(revision===edit)dirty=false;else throw Error('Source changed while syncing. Send again against the latest draft.');}return store.draft;}
 async function compile(persist=true){if(running){rerun=true;return;}running=true;ready=false;calling=false;compiled=null;preview.destroy();preview=new GlyphProgramPreview($('language-preview'),receive);controls();status('Type-checking TypeScript…');const revision=edit,text=editor.value;
  try{if(persist&&auth)await flush();if(revision!==edit)return;const result=await api('language/compile',{source:text,filename:'studio.glyph.ts'});if(revision!==edit)return;
   if(!result.ok){status(result.diagnostics.map(d=>`Line ${d.line}:${d.column} · ${d.code} · ${d.message}`).join('\n'));return;}
   compiled=result;compiledText=text;$('language-artifact').textContent=JSON.stringify(result.manifest,null,2);status('Type check passed. Checking the isolated preview…');await preview.run(result.previewSource);
  }catch(error){if(revision===edit)status(error.message);}finally{running=false;controls();if(rerun){rerun=false;compile();}}
 }
 function library(){if(!store)return;$('typescript-library').replaceChildren(...store.presets.map(p=>{const card=document.createElement('article'),title=document.createElement('h4'),description=document.createElement('p'),load=document.createElement('button'),ts=document.createElement('button'),js=document.createElement('button');title.textContent=p.name;description.textContent=p.description;load.type=ts.type=js.type='button';load.textContent='Load & edit TypeScript ↗';load.onclick=async()=>{if(dirty){status('Compile or copy unsent TypeScript edits before loading another component.');return;}editor.value=p.source;loaded=p.id;dirty=true;$('typescript-name').value=p.name;$('typescript-description').value=p.description;invalidate();await compile();};ts.textContent='Export TypeScript ↓';ts.onclick=()=>download(p.source,p.id+'.glyph.ts','text/plain');js.textContent='Export module ↓';js.onclick=()=>download(p.compiled.moduleSource,p.id+'.mjs','text/javascript');card.append(title,description,load,ts,js);return card;}));if(!store.presets.length)$('typescript-library').textContent='Saved TypeScript components appear here, with their editable source and matching compiled module.';}
 function show(d,autoPreview=true){store=d;library();if(dirty){if(base!==d.draft.source)status('A newer TypeScript draft is available. Your unsent source is preserved; copy it before refreshing.');return;}baseRevision=d.draft.revision;if(base!==d.draft.source){editor.value=base=d.draft.source;invalidate();if(autoPreview)compile(false);}controls();}
 async function refresh(){if(!auth||polling)return;polling=true;try{const d=await api('typescript'+(store?'?revision='+store.revision+'&draft_revision='+store.draft.revision:''));if(!d.unchanged)show(d);}catch(error){status(error.message);}finally{polling=false;}}
 async function save(update){if(!ready||compiledText!==editor.value)return;saving=true;controls();try{await flush();const preset={version:1,kind:'typescript-component',id:update?loaded:'component-'+crypto.randomUUID(),name:$('typescript-name').value.trim(),description:$('typescript-description').value,source:editor.value};const d=await api('typescript/save',{preset,expected_revision:store.revision,expected_draft_revision:store.draft.revision});loaded=preset.id;show(d,false);$('typescript-save-status').textContent='Saved '+preset.name+' · editable TypeScript + compiled module.';}catch(error){$('typescript-save-status').textContent=error.message;}finally{saving=false;controls();}}
 $('typescript-save').onsubmit=e=>{e.preventDefault();save(false);};$('typescript-update').onclick=()=>{if($('typescript-save').reportValidity())save(true);};$('typescript-refresh').onclick=refresh;
 $('language-compile').onclick=()=>compile();
 $('language-invoke').onsubmit=e=>{e.preventDefault();try{const payload=JSON.parse($('language-payload').value);calling=true;controls();preview.command({type:'invoke',requestId:crypto.randomUUID(),method:$('language-method').value,payload});}catch(error){calling=false;controls();status(error.message);}};
 $('language-use').onclick=()=>{try{window.glyphProgramStudio.setSource(compiled.previewSource);status('Copied compiled JavaScript into the source workshop. The TypeScript component library above retains editable source.');}catch(error){status(error.message);}};
 function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('language-export').onclick=()=>download(compiled.moduleSource,'component.mjs','text/javascript');$('language-source-export').onclick=()=>download(editor.value,'component.glyph.ts','text/plain');
 $('language-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>64000){status('Source must be at most 64000 bytes.');return;}const revision=edit,text=await file.text();if(revision!==edit)return;editor.value=text;loaded=null;dirty=true;invalidate();status('TypeScript file loaded. Compile or prompt an edit.');};
 $('language-example').onchange=async()=>{const revision=++edit;try{const text=window.GLYPH_TYPESCRIPT_EXAMPLES?.[$('language-example').value]||await fetch('language-'+$('language-example').value+'.txt').then(r=>{if(!r.ok)throw Error('Example unavailable.');return r.text();});if(revision!==edit)return;editor.value=text;loaded=null;dirty=true;invalidate();status('Example loaded. Compile or prompt an edit.');}catch(error){if(revision===edit)status(error.message);}};
 window.glyphTypeScriptStudio={flush,feedback:()=>{const job=$('typescript-agent-result')?.textContent||'';return (lastFeedback+'\n'+job).slice(0,1500);},refresh};
 if(auth){refresh();setInterval(()=>{if(!document.hidden)refresh();},1300);}else{editor.value=window.GLYPH_TYPESCRIPT_SEED||'';status('Open the local dev server to prompt, compile and save TypeScript components.');}
 controls();const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;preview.command({type:'pause',paused:!visible});});observer.observe($('language-preview'));window.addEventListener('pagehide',()=>{observer.disconnect();preview.destroy();});
});
