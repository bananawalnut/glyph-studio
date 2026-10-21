'use strict';
const $=id=>document.getElementById(id),E=GlyphScene;
const canvas=$('canvas'),prompt=$('prompt'),json=$('json');
const renderer=GlyphPlayer.createRenderer(canvas,{fallback:E.render});
let scene=E.compile(E.SURFACE_EXAMPLE).scene,selected=null,mode='script',playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,frame=0,start=performance.now(),origin=0,lastFrame=-1,dirty=false,handles=false,formDirty=false;
const total=()=>Math.max(1,Math.round(scene.duration*scene.fps));
function persist(){formDirty=false;window.glyphBridge?.publish(scene);try{localStorage.setItem('glyph-studio-v2',JSON.stringify({scene,prompt:prompt.value}));$('saved').textContent='Saved on this browser';}catch{$('saved').textContent='Storage unavailable — export to keep this scene';}}
try{const data=JSON.parse(localStorage.getItem('glyph-studio-v2'));if(data?.scene){E.validate(data.scene);scene=data.scene;prompt.value=typeof data.prompt==='string'?data.prompt:E.toScript(scene);}}catch{}
if(!prompt.value)prompt.value=E.SURFACE_EXAMPLE;
Object.keys(E.EXAMPLES).forEach(name=>{const o=document.createElement('option');o.textContent=name;$('preset').append(o);});
function status(text,type=''){$('message').textContent=text;$('message').className=type;}
function updateWarnings(){const w=E.loopWarnings(scene);$('loop-state').textContent=w.length?'CHECK LOOP SEAM':'SEAMLESS LOOP';$('loop-state').style.color=w.length?'#e6bd75':'';return w;}
function setMode(value){mode=value;for(const m of ['script','json','agent']){$(m+'-panel').hidden=m!==mode;$(m+'-tab').setAttribute('aria-selected',String(m===mode));}$('compile').hidden=mode==='agent';if(mode==='json')json.value=JSON.stringify(scene,null,2);}
$('script-tab').onclick=()=>setMode('script');$('json-tab').onclick=()=>setMode('json');$('agent-tab').onclick=()=>setMode('agent');
function setScene(value,syncScript=true){E.validate(value);scene=structuredClone(value);if(selected&&!scene.objects.some(o=>o.id===selected)&&!(scene.surfaces||[]).some(h=>h.id===selected))selected=null;frame=0;origin=0;start=performance.now();if(syncScript)prompt.value=E.toScript(scene);json.value=JSON.stringify(scene,null,2);dirty=false;syncPreset();objects();inspect();meta();draw();persist();}
function meta(){canvas.setAttribute('aria-label','3D glyph composition: '+scene.objects.filter(o=>o.visible).map(o=>o.id+' ('+o.geometry.type+', '+o.glyphs.mode+')').join(', '));$('scene-meta').textContent=`${(scene.surfaces||[]).length} SURFACE${(scene.surfaces||[]).length===1?'':'S'} / ${scene.objects.length} LAYERS / ${scene.duration}s`;$('timeline').max=total()-1;updateWarnings();}
$('compile').onclick=()=>{if(mode==='agent')return;try{let result;if(mode==='script'){result=E.compile(prompt.value);if(!result.ok){status(result.errors.join('\n'),'error');return;}setScene(result.scene,false);}else{setScene(JSON.parse(json.value));result={warnings:E.loopWarnings(scene)};}const w=result.warnings||[];status(w.length?w.join('\n'):`Built ${scene.objects.length} independent objects.`,w.length?'warning':'');}catch(e){status(e.message,'error');}};
$('preset').onchange=()=>{if(!$('preset').value)return;prompt.value=E.EXAMPLES[$('preset').value];setMode('script');$('compile').click();};
prompt.addEventListener('input',()=>{dirty=true;status('Unbuilt changes. Build scene to apply.');});json.addEventListener('input',()=>{dirty=true;status('Unbuilt JSON changes. Build scene to validate.');});
function objects(){surfaces();const host=$('objects');host.replaceChildren();for(const o of scene.objects){const row=document.createElement('div');row.className='object-row'+(selected===o.id?' selected':'');const select=document.createElement('button');select.type='button';select.className='object-select';select.setAttribute('aria-pressed',String(selected===o.id));const dot=document.createElement('span');dot.className='dot '+(o.material.color==='rainbow'?'rainbow':'');const text=document.createElement('span');text.append(document.createTextNode(o.id));const small=document.createElement('small');small.textContent=`${o.geometry.type==='mapped'?o.geometry.pattern+' on '+o.geometry.host:o.geometry.type} / ${o.glyphs.mode}`;text.append(small);select.append(dot,text);select.onclick=()=>{selected=o.id;objects();inspect();draw();};const visibility=document.createElement('button');visibility.type='button';visibility.className='visibility';visibility.textContent=o.visible?'ON':'OFF';visibility.setAttribute('aria-label',`${o.visible?'Hide':'Show'} ${o.id}`);visibility.setAttribute('aria-pressed',String(o.visible));visibility.onclick=()=>{if(dirty){status('Build the editor changes before changing layer visibility.','warning');return;}o.visible=!o.visible;syncEditors();objects();draw();persist();};row.append(select,visibility);host.append(row);}}
$('clear-selection').onclick=()=>{selected=null;objects();inspect();draw();};
function syncEditors(){prompt.value=E.toScript(scene);json.value=JSON.stringify(scene,null,2);dirty=false;}
function inspect(){formDirty=false;const o=scene.objects.find(x=>x.id===selected);inspectSurface();$('inspector-form').hidden=!o;$('selected-label').textContent=o?o.id.toUpperCase():'ALL OBJECTS';if(!o){$('selected-label').textContent=selected?selected.toUpperCase():'ALL OBJECTS';return;}$('object-name').textContent=o.id;$('object-type').textContent=(o.geometry.type==='mapped'?'SURFACE '+o.geometry.pattern:o.geometry.type).toUpperCase();$('object-meaning').textContent=o.meaning||'Independent object';$('glyph-mode').value=o.glyphs.mode;$('glyph-rate').value=o.glyphs.rate;$('color').value=o.material.color;$('text').value=o.glyphs.text;$('radius').value=o.geometry.radius;$('latitude').value=o.geometry.latitude;for(let k=0;k<3;k++)$('turn-'+'xyz'[k]).value=o.motion.turns[k];$('flow').value=o.motion.flow;$('bob').value=o.motion.bob;$('opacity').value=o.material.opacity;$('size').value=o.material.size;$('points').value=JSON.stringify(o.geometry.points,null,1);$('bezier-fields').hidden=o.geometry.type!=='bezier';$('glyph-fields').hidden=o.geometry.type==='bezier';$('geometry-fields').hidden=!['sphere','surface'].includes(o.geometry.type);$('motion-fields').hidden=o.geometry.type==='rain';$('latitude-field').hidden=o.geometry.type!=='surface';$('text-field').hidden=o.geometry.type!=='surface';$('flow-field').hidden=!['surface','bezier'].includes(o.geometry.type);$('radius').disabled=!['sphere','surface'].includes(o.geometry.type);$('object-error').textContent='';inspectMapping(o);}
$('handles').onchange=()=>{handles=$('handles').checked;draw();};
$('inspector-form').onsubmit=e=>{e.preventDefault();try{if(dirty)throw Error('Build or discard the editor changes before editing an object.');const next=structuredClone(scene),o=next.objects.find(x=>x.id===selected);o.glyphs.mode=$('glyph-mode').value;o.glyphs.rate=+$('glyph-rate').value;o.glyphs.text=$('text').value;o.material.color=$('color').value;o.material.opacity=+$('opacity').value;o.material.size=+$('size').value;o.geometry.radius=+$('radius').value;o.geometry.latitude=+$('latitude').value;o.geometry.points=JSON.parse($('points').value);o.motion.turns=[... 'xyz'].map(k=>+$('turn-'+k).value);o.motion.flow=+$('flow').value;o.motion.bob=+$('bob').value;if(o.geometry.type==='mapped'){o.geometry.host=$('host').value;o.geometry.pattern=$('pattern').value;o.geometry.count=+$('count').value;o.geometry.latitude=+$('mapped-latitude').value;o.geometry.uvPoints=JSON.parse($('uv-points').value);if(!['band','curve'].includes(o.geometry.pattern))o.motion.flow=0;}E.validate(next);scene=next;syncEditors();objects();draw();persist();const w=updateWarnings();status(w.length?w.join('\n'):`Updated ${selected}. Other objects keep their own motion.`,w.length?'warning':'');$('object-error').textContent='';inspectMapping(o);}catch(err){$('object-error').textContent=err.message;}};
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{download('glyph-scene-v2.json',JSON.stringify(scene,null,2),'application/json');status(dirty?'Exported the built scene. Editor changes are still unbuilt.':'Exported the scene recipe.');};
function draw(){renderer.render(scene,frame/total(),selected,handles);$('timeline').value=frame;$('time').value=`${(frame/scene.fps).toFixed(2).padStart(5,'0')} / ${scene.duration}s`;lastFrame=frame;}
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);draw();}).observe(canvas);
function playLabel(){$('play').textContent=playing?'Pause':'Play';$('play').setAttribute('aria-pressed',String(playing));}
$('play').onclick=()=>{playing=!playing;origin=frame;start=performance.now();playLabel();};$('timeline').oninput=()=>{playing=false;playLabel();frame=+$('timeline').value;draw();};
function tick(now){if(playing&&!document.hidden){frame=(origin+Math.floor((now-start)/1000*scene.fps))%total();if(frame!==lastFrame)draw();}requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',()=>{origin=frame;start=performance.now();});
// An agent can supply data through this API; recipe strings are never evaluated as code.
window.glyphStudio={getScene:()=>structuredClone(scene),setScene:recipe=>setScene(recipe),compile:text=>E.compile(text),getFrame:()=>frame,hasUnbuiltChanges:()=>dirty||formDirty,getView:()=>({frame,playing}),setView:view=>{const max=total()-1;if(!Number.isInteger(view.frame)||view.frame<0||view.frame>max||typeof view.playing!=='boolean')throw Error('Invalid preview state');frame=view.frame;playing=view.playing;origin=frame;start=performance.now();playLabel();draw();}};
function syncPreset(){const matching=Object.entries(E.EXAMPLES).find(([name,script])=>E.toScript(E.compile(script).scene)===E.toScript(scene));if(matching)$('preset').value=matching[0];else{if(![...$('preset').options].some(o=>o.value==='')){const option=document.createElement('option');option.textContent='Saved scene';option.value='';$('preset').prepend(option);}$('preset').value='';}}
syncPreset();
objects();inspect();meta();playLabel();json.value=JSON.stringify(scene,null,2);requestAnimationFrame(tick);

function surfaces(){
 const list=$('surfaces');list.replaceChildren();
 for(const h of scene.surfaces||[]){const button=document.createElement('button');button.type='button';button.className='surface-select'+(selected===h.id?' active':'');button.setAttribute('aria-pressed',String(selected===h.id));button.textContent=h.id+' / '+h.shape;button.onclick=()=>{selected=h.id;objects();inspect();draw();};list.append(button);}
 if(!(scene.surfaces||[]).length){const note=document.createElement('p');note.className='hint';note.textContent='Legacy scene. Try Surface playground to map layers onto shared shapes.';list.append(note);}
}
function inspectSurface(){
 const h=(scene.surfaces||[]).find(x=>x.id===selected);$('surface-form').hidden=!h;if(!h)return;
 $('surface-name').textContent=h.id;$('surface-shape').value=h.shape;
 for(const k of ['radius','tube','width','height','depth'])$('surface-'+k).value=h[k];
 for(let k=0;k<3;k++)$('surface-'+'xyz'[k]).value=h.motion.turns[k];
 $('surface-error').textContent='';surfaceFields();
}
function surfaceFields(){const shape=$('surface-shape').value;
 $('surface-radius-field').hidden=!['sphere','torus','cylinder'].includes(shape);
 $('surface-tube-field').hidden=shape!=='torus';$('surface-width-field').hidden=!['plane','wave'].includes(shape);
 $('surface-height-field').hidden=!['plane','wave','cylinder'].includes(shape);$('surface-depth-field').hidden=shape!=='wave';
}
$('surface-shape').onchange=surfaceFields;
$('surface-form').onsubmit=e=>{e.preventDefault();try{
 if(dirty)throw Error('Build the editor changes before editing a surface.');
 const next=structuredClone(scene),h=next.surfaces.find(x=>x.id===selected);h.shape=$('surface-shape').value;
 for(const k of ['radius','tube','width','height','depth'])h[k]=+$('surface-'+k).value;
 h.motion.turns=[...'xyz'].map(k=>+$('surface-'+k).value);E.validate(next);scene=next;syncEditors();objects();meta();draw();persist();$('surface-error').textContent='';
 status('Remapped '+scene.objects.filter(o=>o.geometry.host===selected).length+' layers onto '+h.shape+'.');
 }catch(err){$('surface-error').textContent=err.message;}};
function inspectMapping(o){
 const mapped=o.geometry.type==='mapped';$('mapping-fields').hidden=!mapped;
 $('rotation-fields').hidden=mapped;$('bob-field').hidden=mapped;
 if(!mapped)return;
 $('host').replaceChildren();for(const h of scene.surfaces||[]){const option=document.createElement('option');option.value=h.id;option.textContent=h.id+' / '+h.shape;$('host').append(option);}
 $('host').value=o.geometry.host;$('pattern').value=o.geometry.pattern;$('count').value=o.geometry.count;$('uv-points').value=JSON.stringify(o.geometry.uvPoints);$('mapped-latitude').value=o.geometry.latitude;
 $('motion-fields').hidden=false;$('geometry-fields').hidden=true;mappingFields();
}
function mappingFields(){const pattern=$('pattern').value;
 $('mapped-latitude-field').hidden=pattern!=='band';$('uv-field').hidden=pattern!=='curve';
 $('text-field').hidden=!['band','curve'].includes(pattern);$('flow-field').hidden=!['band','curve'].includes(pattern);
}
$('pattern').onchange=mappingFields;

for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.closest('#inspector-form, #surface-form'))formDirty=true;});
