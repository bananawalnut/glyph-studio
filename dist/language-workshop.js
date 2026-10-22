window.addEventListener('DOMContentLoaded',()=>{'use strict';
  const $=id=>document.getElementById(id),editor=$('language-source'),auth=window.GLYPH_BRIDGE;
  let compiled=null,ready=false,running=false,calling=false,signature=null,edit=0,visible=true;
  const status=text=>$('language-status').textContent=text;
  const receive=message=>{
    if(!compiled)return;
    if(message.type==='ready'){
      ready=true;signature=message.signature;
      preview.command({type:'pause',paused:!visible});
      $('language-method').replaceChildren(...Object.keys(signature?.methods||{}).map(name=>{const option=document.createElement('option');option.value=option.textContent=name;return option;}));
      $('language-interface').textContent=JSON.stringify(signature,null,2);$('language-state').textContent=JSON.stringify({state:message.state},null,2);
      status('Type check passed · '+message.audit.points+' points · '+message.renderer+' · preview ready.');
    }
    if(message.type==='receipt'){calling=false;$('language-state').textContent=JSON.stringify({state:message.state,result:message.result},null,2);status('Typed method accepted · state and geometry updated.');}
    if(message.type==='error'){calling=false;ready=false;status('Runtime preview: '+message.message);}
    controls();
  };
  let preview=new GlyphProgramPreview($('language-preview'),receive);
  function controls(){
    $('language-compile').disabled=!auth||running;
    $('language-export').disabled=!compiled;
    $('language-source-export').disabled=!editor.value.trim();
    $('language-use').disabled=!ready||!window.glyphProgramStudio;
    $('language-call').disabled=!ready||calling||!Object.keys(signature?.methods||{}).length;
  }
  function invalidate(){edit++;compiled=null;ready=false;calling=false;signature=null;preview.destroy();preview=new GlyphProgramPreview($('language-preview'),receive);$('language-interface').textContent='';$('language-state').textContent='';$('language-artifact').textContent='';controls();status('Source changed. Type-check and compile before using it.');}
  editor.addEventListener('input',invalidate);
  $('language-compile').onclick=async()=>{
    const revision=edit;running=true;ready=false;calling=false;compiled=null;preview.destroy();preview=new GlyphProgramPreview($('language-preview'),receive);controls();status('Type-checking TypeScript…');
    try{
      const response=await fetch('/api/language/compile',{method:'POST',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:JSON.stringify({source:editor.value,filename:'studio.glyph.ts'})});
      const result=await response.json();
      if(revision!==edit)return;
      if(!response.ok)throw Error(result.error?.message||'Compiler request failed.');
      if(!result.ok){status(result.diagnostics.map(d=>`Line ${d.line}:${d.column} · ${d.code} · ${d.message}`).join('\n'));return;}
      compiled=result;$('language-artifact').textContent=JSON.stringify(result.manifest,null,2);
      status('Type check passed. Checking compiled component in the isolated preview…');
      await preview.run(result.previewSource);
    }catch(error){if(revision===edit)status(error.message);}finally{running=false;controls();}
  };
  $('language-invoke').onsubmit=e=>{e.preventDefault();try{const payload=JSON.parse($('language-payload').value);calling=true;controls();preview.command({type:'invoke',requestId:crypto.randomUUID(),method:$('language-method').value,payload});}catch(error){calling=false;controls();status(error.message);}};
  $('language-use').onclick=()=>{try{window.glyphProgramStudio.setSource(compiled.previewSource);status('Compiled JavaScript copied to the source workshop. Run source, then name and save a preset.');}catch(error){status(error.message);}};
  function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('language-export').onclick=()=>download(compiled.moduleSource,'component.mjs','text/javascript');
  $('language-source-export').onclick=()=>download(editor.value,'component.glyph.ts','text/plain');
  $('language-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>64000){status('Source must be at most 64000 bytes.');return;}const revision=edit,text=await file.text();if(revision!==edit)return;editor.value=text;invalidate();};
  $('language-example').onchange=async()=>{const revision=++edit;try{const text=window.GLYPH_TYPESCRIPT_EXAMPLES?.[$('language-example').value]||await fetch('language-'+$('language-example').value+'.txt').then(r=>{if(!r.ok)throw Error('Example unavailable.');return r.text();});if(revision!==edit)return;editor.value=text;invalidate();}catch(error){if(revision===edit)status(error.message);}};
  if(window.GLYPH_TYPESCRIPT_SEED){editor.value=window.GLYPH_TYPESCRIPT_SEED;controls();}
  else fetch('language-signal-shell.txt').then(r=>r.text()).then(text=>{if(!editor.value){editor.value=text;controls();}}).catch(()=>status('Load a .glyph.ts file to begin.'));
  status(auth?'Author in TypeScript. Compile and preview without changing any saved draft.':'TypeScript compilation needs the local dev server and npm ci. Exported JavaScript components run without the compiler.');controls();
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;preview.command({type:'pause',paused:!visible});});observer.observe($('language-preview'));
  window.addEventListener('pagehide',()=>{observer.disconnect();preview.destroy();});
});
