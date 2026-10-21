(function(root){
'use strict';
const TAU=Math.PI*2, GLYPHS='012345789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:+=*#%@';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=(x,n)=>((x%n)+n)%n;
const hash=(a,b,c=0)=>{let x=Math.imul(a+1,374761393)^Math.imul(b+1,668265263)^Math.imul(c+1,1442695041);x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;};
const base=(id,type)=>({id,meaning:'',visible:true,geometry:{type,radius:1.3,latitude:20,points:[[-1.1,-1.1,0],[-1.6,1.2,1],[1.5,-1.0,-1],[.9,1.2,0]]},transform:{position:[0,0,0],rotation:[0,0,0],scale:1},motion:{turns:[0,0,0],flow:0,bob:0},glyphs:{mode:'hold',rate:8,characters:GLYPHS,text:'SIGNAL / 001 / '},material:{color:'white',opacity:1,size:13}});
function empty(){return {surfaces:[],version:2,seed:42,duration:12,fps:30,camera:{yaw:0,pitch:.12,distance:5},objects:[]};}
const SHAPES=['sphere','torus','cylinder','plane','wave'];
const PATTERNS=['grid','band','scatter','curve'];
const baseSurface=(id,shape)=>({id,shape,radius:1.3,tube:.38,width:2.6,height:2.6,depth:2.6,transform:{position:[0,0,0],rotation:[0,0,0],scale:1},motion:{turns:[0,0,0],bob:0}});
function mapped(id){const o=base(id,'mapped');Object.assign(o.geometry,{host:'',pattern:'grid',count:338,uvPoints:[[0,.25],[.3,.85],[.7,.15],[1,.75]]});return o;}
function surfacePoint(s,u,v){
 const a=u*TAU,b=v*TAU,r=s.radius;
 if(s.shape==='sphere'){const lat=(v-.5)*Math.PI;return [r*Math.cos(lat)*Math.cos(a),r*Math.sin(lat),r*Math.cos(lat)*Math.sin(a)];}
 if(s.shape==='torus')return [(r+s.tube*Math.cos(b))*Math.cos(a),s.tube*Math.sin(b),(r+s.tube*Math.cos(b))*Math.sin(a)];
 if(s.shape==='cylinder')return [r*Math.cos(a),(v-.5)*s.height,r*Math.sin(a)];
 return [(u-.5)*s.width,(v-.5)*s.height,s.shape==='wave'?s.depth*.14*Math.sin(a)*Math.cos(b):0];
}
function surfaceTransform(surface,point,phase){const p=mod(phase,1);return rotate(point.map(v=>v*surface.transform.scale),surface.motion.turns.map((v,k)=>v*p*TAU+surface.transform.rotation[k])).map((v,k)=>v+surface.transform.position[k]+(k===1?Math.sin(p*TAU)*surface.motion.bob:0));}
function parseSurface(id,type,bits){
 const shape=type.slice(6).trim();if(!SHAPES.includes(shape))throw Error('Surface shape must be '+SHAPES.join(', '));
 const h=baseSurface(id,shape),number='(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+))';
 for(const bit of bits){let m;
  if((m=bit.match(new RegExp('^rotate\\s+([xyz])\\s+'+number+'(?:\\s+turns?)?$','i'))))h.motion.turns['xyz'.indexOf(m[1].toLowerCase())]=+m[2];
  else if((m=bit.match(new RegExp('^(radius|tube|width|height|depth|scale|bob)\\s+'+number+'$','i')))){const k=m[1].toLowerCase();if(k==='scale')h.transform.scale=+m[2];else if(k==='bob')h.motion.bob=+m[2];else h[k]=+m[2];}
  else if((m=bit.match(/^(position|orientation)\s+(\[.*\])$/i)))h.transform[m[1].toLowerCase()==='position'?'position':'rotation']=JSON.parse(m[2]);
  else if(/^still$/i.test(bit))h.motion.turns=[0,0,0];
  else throw Error('Unknown surface directive: '+bit);
 }return h;
}
const SURFACE_EXAMPLE=`loop 12s; seed 42
body: shape torus; radius 0.95; tube 0.42; rotate x 1
shell: glyphs; on body; pattern grid; count 420; flicker 8; white; opacity 0.7
signal: glyphs; on body; pattern band; latitude 20; text "TELEMETRY / "; flow -1; mint
route: glyphs; on body; pattern curve; uv [[0,0.2],[0.2,0.9],[0.8,0.1],[1,0.8]]; flow 1; amber; text "ROUTE / "
ribbon: bezier; rainbow; flow 1; size 7
rain: rain; stream 6; mint; opacity 0.16`;
const EXAMPLE=`loop 12s; seed 42
shell: sphere; rotate y 1; flicker 8; white; means "spatial field"
rain: rain; stream 6; mint; opacity 0.24; means "ambient code"
ribbon: bezier; rainbow; flow 1; size 7; means "energy path"
signal: surface; latitude 25; text "SIGNAL / 001 / "; rotate y -1; mint; means "telemetry"`;
const ZENITH_EXAMPLE="loop 16s; seed 2001\nshell: sphere; radius 1.3; rotate y 1; hold; white; opacity 0.4; size 13; means \"sparse cross shell\"\nsignal: surface; radius 1.3; latitude -15; text \"ZENITH / OPEN CONSULTANCY / \"; rotate y -1; hold; cyan; size 13; means \"Zenith identity / open consultancy\"";
const EXAMPLES={
'Zenith / Open consultancy':ZENITH_EXAMPLE,
'Surface playground':SURFACE_EXAMPLE,
'Wave typography':`loop 12s; seed 31
paper: shape wave; width 3; height 2.3; depth 1.6; rotate y 1
field: glyphs; on paper; pattern grid; count 480; flicker 5; mint; opacity 0.6
headline: glyphs; on paper; pattern curve; text \"WAVE / SIGNAL / \"; flow 1; white; size 18
dust: glyphs; on paper; pattern scatter; count 90; amber; size 8`,
'Depth composition':EXAMPLE,
'Independent signals':`loop 16s; seed 93
shell: sphere; rotate x 1; flicker 10; mint; opacity 0.55
equator: surface; latitude 0; text "EQUATOR / "; rotate y -1; white
north: surface; latitude 45; text "NORTH / "; rotate z 1; amber
thread: bezier; points [[-1.4,-1,0],[-1,2,1],[1,-2,-1],[1.3,1,0]]; rainbow; flow 2
rain: rain; stream 8; mint; opacity 0.16`,
'Quiet geometry':`loop 12s; seed 7
shell: sphere; rotate y 1; white; opacity 0.4
signal: surface; latitude -15; text "OBSERVE / "; rotate y -1; cyan
ribbon: bezier; points [[-1,-1,-0.6],[-2,0.8,1],[2,1,-1],[1,-0.8,0.5]]; amber; flow 1; size 5`
};
function splitOutsideQuotes(line,separator=';'){
 let quoted=false,escaped=false,depth=0,start=0,out=[];
 for(let i=0;i<line.length;i++) {const c=line[i];if(escaped){escaped=false;continue;}if(c==='\\'&&quoted){escaped=true;continue;}if(c==='"')quoted=!quoted;if(!quoted){if(c==='[')depth++;if(c===']')depth--;if(c===separator&&depth===0){out.push(line.slice(start,i).trim());start=i+1;}}}
 if(quoted)throw Error('Unclosed quotation mark');
 out.push(line.slice(start).trim());return out.filter(Boolean);
}
function compile(source){
 const scene=empty(),errors=[];
 const number='(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+))';
 for(const [i,raw] of source.split('\n').entries()){
  const line=raw.trim();if(!line||line.startsWith('//'))continue;
  try{
   if(/^(loop|seed|fps|camera)\b/i.test(line)){
    for(const bit of splitOutsideQuotes(line)){let m;if((m=bit.match(/^loop\s+(\d+(?:\.\d+)?)s?$/i)))scene.duration=+m[1];else if((m=bit.match(/^seed\s+(\d+)$/i)))scene.seed=+m[1];else if((m=bit.match(/^fps\s+(\d+)$/i)))scene.fps=+m[1];else if((m=bit.match(/^camera\s+(\{.*\})$/i)))scene.camera=JSON.parse(m[1]);else throw Error(`Unknown scene directive: ${bit}`);}continue;
   }
   const head=line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*)$/i);if(!head)throw Error('Start with a name and colon, e.g. shell: sphere; rotate y 1');
   const bits=splitOutsideQuotes(head[2]),type=bits.shift()?.toLowerCase();
   if(type?.startsWith('shape ')){scene.surfaces.push(parseSurface(head[1],type,bits));continue;}
   if(!['sphere','rain','bezier','surface','glyphs'].includes(type))throw Error('Geometry must be sphere, rain, bezier, or surface');
   const o=type==='glyphs'?mapped(head[1]):base(head[1],type);if(type==='rain'){o.material.opacity=.22;o.material.color='mint';o.glyphs.mode='stream';}if(type==='bezier')o.material.size=7;
   for(const bit of bits){let m;
    if((m=bit.match(new RegExp('^rotate\\s+([xyz])\\s+'+number+'(?:\\s+turns?)?$','i'))))o.motion.turns['xyz'.indexOf(m[1].toLowerCase())]=+m[2];
    else if((m=bit.match(new RegExp('^(flow|bob|radius|latitude|opacity|size|scale)\\s+'+number+'$','i')))){const k=m[1].toLowerCase(),v=+m[2];if(k==='scale')o.transform.scale=v;else if(['flow','bob'].includes(k))o.motion[k]=v;else if(['radius','latitude'].includes(k))o.geometry[k]=v;else o.material[k]=v;}
    else if((m=bit.match(/^(hold|flicker|stream)(?:\s+(\d+(?:\.\d+)?))?$/i))){o.glyphs.mode=m[1].toLowerCase();if(m[2])o.glyphs.rate=+m[2];}
    else if(/^hidden$/i.test(bit))o.visible=false;
    else if(/^still$/i.test(bit))o.motion.turns=[0,0,0];
    else if(/^(white|mint|cyan|amber|acid|rainbow)$/i.test(bit))o.material.color=bit.toLowerCase();
    else if((m=bit.match(/^(text|chars|means)\s+("(?:[^"\\]|\\.)*")$/i))){const v=JSON.parse(m[2]);if(m[1].toLowerCase()==='text')o.glyphs.text=v;else if(m[1].toLowerCase()==='chars')o.glyphs.characters=v;else o.meaning=v;}
    else if((m=bit.match(/^(points|position|orientation)\s+(\[.*\])$/i))){const v=JSON.parse(m[2]);if(m[1].toLowerCase()==='points')o.geometry.points=v;else if(m[1].toLowerCase()==='orientation')o.transform.rotation=v;else o.transform.position=v;}
    else if(type==='glyphs'&&(m=bit.match(/^on\s+([a-z][a-z0-9_-]*)$/i)))o.geometry.host=m[1];
    else if(type==='glyphs'&&(m=bit.match(/^pattern\s+(grid|band|scatter|curve)$/i)))o.geometry.pattern=m[1].toLowerCase();
    else if(type==='glyphs'&&(m=bit.match(/^count\s+(\d+)$/i)))o.geometry.count=+m[1];
    else if(type==='glyphs'&&(m=bit.match(/^uv\s+(\[.*\])$/i)))o.geometry.uvPoints=JSON.parse(m[1]);
    else throw Error(`Unknown directive: ${bit}`);
   }
   if(type==='glyphs'&&!bits.some(b=>/^count\s/i.test(b))&&['band','curve'].includes(o.geometry.pattern))o.geometry.count=96;
   scene.objects.push(o);
  }catch(e){errors.push(`Line ${i+1}: ${e.message}`);}
 }
 if(errors.length)return {ok:false,errors};
 try{validate(scene);return {ok:true,scene,warnings:loopWarnings(scene)};}catch(e){return {ok:false,errors:[e.message]};}
}
function validate(s){
 const fail=m=>{throw Error(m);};
 const obj=(v,keys,path,optional=[])=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(`${path}: expected an object`);for(const k of Object.keys(v))if(!keys.includes(k)&&!optional.includes(k))fail(`${path}.${k}: unsupported field`);for(const k of keys)if(!(k in v))fail(`${path}.${k}: required field`);};
 const num=(v,a,b,path)=>{if(!Number.isFinite(v)||v<a||v>b)fail(`${path}: expected ${a}…${b}`);};
 const vec=(v,a,b,path)=>{if(!Array.isArray(v)||v.length!==3)fail(`${path}: expected [x,y,z]`);v.forEach(x=>num(x,a,b,path));};
 const str=(v,max,path)=>{if(typeof v!=='string'||v.length>max)fail(`${path}: invalid text`);};
 obj(s,['version','seed','duration','fps','camera','objects'],'scene',['surfaces']);if(s.version!==2)fail('scene.version: expected 2');
 num(s.seed,0,4294967295,'seed');if(!Number.isInteger(s.seed))fail('Seed must be an integer');num(s.duration,1,120,'duration');num(s.fps,1,60,'fps');if(!Number.isInteger(s.fps))fail('fps must be an integer');
 obj(s.camera,['yaw','pitch','distance'],'camera');num(s.camera.yaw,-TAU,TAU,'yaw');num(s.camera.pitch,-1.5,1.5,'pitch');num(s.camera.distance,3.5,10,'distance');
 const hosts=new Map();
 if(s.surfaces!==undefined&&!Array.isArray(s.surfaces))fail('surfaces must be an array');
 if((s.surfaces||[]).length>8)fail('Use at most 8 surfaces');
 for(const h of s.surfaces||[]){
  obj(h,['id','shape','radius','tube','width','height','depth','transform','motion'],'surface');
  if(typeof h.id!=='string'||!(/^[a-z][a-z0-9_-]{0,31}$/i.test(h.id)))fail('Invalid surface name');
  if(hosts.has(h.id))fail('Duplicate surface name: '+h.id);hosts.set(h.id,h);
  if(!SHAPES.includes(h.shape))fail('Unsupported surface shape');num(h.radius,.1,2.5,'surface.radius');num(h.tube,.05,1,'surface.tube');
  for(const k of ['width','height','depth'])num(h[k],.1,6,'surface.'+k);
  if(h.shape==='torus'&&h.tube>=h.radius)fail('Torus tube must be smaller than its main radius');
  obj(h.transform,['position','rotation','scale'],'surface.transform');vec(h.transform.position,-3,3,'surface.position');vec(h.transform.rotation,-TAU,TAU,'surface.rotation');num(h.transform.scale,.1,3,'surface.scale');
  obj(h.motion,['turns','bob'],'surface.motion');vec(h.motion.turns,-8,8,'surface.turns');num(h.motion.bob,0,1,'surface.bob');
 }
 if(!Array.isArray(s.objects)||!s.objects.length||s.objects.length>16)fail('Use 1…16 objects');const ids=new Set();
 for(const o of s.objects){
  obj(o,['id','meaning','visible','geometry','transform','motion','glyphs','material'],'object');
  if(typeof o.id!=='string'||!(/^[a-z][a-z0-9_-]{0,31}$/i.test(o.id)))fail('Use a short object name starting with a letter');if(hosts.has(o.id))fail('Surface and layer names must be distinct: '+o.id);if(ids.has(o.id))fail(`Duplicate object name: ${o.id}`);ids.add(o.id);str(o.meaning,160,o.id+'.meaning');if(typeof o.visible!=='boolean')fail('visible must be boolean');
  obj(o.geometry,['type','radius','latitude','points'],o.id+'.geometry',o.geometry.type==='mapped'?['host','pattern','count','uvPoints']:[]);if(!['sphere','rain','bezier','surface','mapped'].includes(o.geometry.type))fail('Unsupported geometry');num(o.geometry.radius,.1,2.5,'radius');num(o.geometry.latitude,-85,85,'latitude');if(!Array.isArray(o.geometry.points)||o.geometry.points.length!==4)fail('A cubic Bezier needs four 3D control points');o.geometry.points.forEach(p=>vec(p,-3,3,'control point'));
  obj(o.transform,['position','rotation','scale'],'transform');vec(o.transform.position,-3,3,'position');vec(o.transform.rotation,-TAU,TAU,'rotation');num(o.transform.scale,.1,3,'scale');
  obj(o.motion,['turns','flow','bob'],'motion');vec(o.motion.turns,-8,8,'turns');num(o.motion.flow,-8,8,'flow');num(o.motion.bob,0,1,'bob');
  obj(o.glyphs,['mode','rate','characters','text'],'glyphs');if(!['hold','flicker','stream'].includes(o.glyphs.mode))fail('Unsupported glyph mode');num(o.glyphs.rate,0,30,'glyph rate');str(o.glyphs.characters,128,'characters');if(!o.glyphs.characters.length)fail('characters cannot be empty');str(o.glyphs.text,128,'text');
  obj(o.material,['color','opacity','size'],'material');if(!['white','mint','cyan','amber','acid','rainbow'].includes(o.material.color))fail('Unsupported color');num(o.material.opacity,0,1,'opacity');num(o.material.size,3,24,'size');
  if(o.geometry.type==='mapped'){
   const g=o.geometry;if(!hosts.has(g.host))fail(o.id+': unknown surface '+g.host);if(!PATTERNS.includes(g.pattern))fail('Unsupported mapped pattern');num(g.count,12,1400,'count');if(!Number.isInteger(g.count))fail('count must be an integer');
   if(!Array.isArray(g.uvPoints)||g.uvPoints.length!==4)fail('UV curve needs four [u,v] points');
   for(const uv of g.uvPoints){if(!Array.isArray(uv)||uv.length!==2)fail('UV point must be [u,v]');uv.forEach(x=>num(x,0,1,'UV coordinate'));}
   if([...o.motion.turns,...o.transform.position,...o.transform.rotation].some(x=>x!==0)||o.transform.scale!==1||o.motion.bob)fail(o.id+': mapped layers use the host transform. Rotate the surface; use flow on its band or curve.');
   if(o.motion.flow&&!['band','curve'].includes(g.pattern))fail(o.id+': flow needs a band or curve pattern');
  }
  if(o.geometry.type==='rain'&&(o.motion.turns.some(x=>x!==0)||o.motion.flow||o.motion.bob))fail(`${o.id}: rain is screen-space; use stream for falling code. Rotation, flow, and bob apply to 3D objects.`);
  if(!['surface','bezier','mapped'].includes(o.geometry.type)&&o.motion.flow)fail(`${o.id}: flow needs a surface string or Bezier curve`);
 }
 return s;
}
function loopWarnings(s){const w=[];for(const h of s.surfaces||[])if(h.motion.turns.some(x=>!Number.isInteger(x)))w.push(h.id+': fractional rotation will jump at the loop seam.');for(const o of s.objects){if([...o.motion.turns,o.motion.flow].some(x=>!Number.isInteger(x)))w.push(`${o.id}: fractional turns/flow will jump at the loop seam.`);}return w;}
function bezier(p,t){const a=1-t;return [0,1,2].map(k=>a*a*a*p[0][k]+3*a*a*t*p[1][k]+3*a*t*t*p[2][k]+t*t*t*p[3][k]);}
function rotate(p,r){let [x,y,z]=p;let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);return [x*c-y*s,x*s+y*c,z];}
function objectPoints(o,seed,phase,duration,surfaces=[]){
 const p=mod(phase,1),tick=Math.floor(p*Math.round(o.glyphs.rate*duration)),sid=hash(seed,[...o.id].reduce((a,c)=>a+c.charCodeAt(0),0));
 const out=[];const put=(pos,i,u=0,alpha=1,screen=false)=>{let char;const ci=o.geometry.type==='mapped'&&o.geometry.pattern==='curve'?i+Math.floor(p*o.motion.flow*o.geometry.count):i;
  if((o.geometry.type==='sphere'||(o.geometry.type==='mapped'&&o.geometry.pattern==='grid'))&&o.glyphs.mode==='hold'&&o.glyphs.characters===GLYPHS)char='+';
  else if(o.glyphs.mode==='hold'&&o.glyphs.text&&(o.geometry.type==='surface'||(o.geometry.type==='mapped'&&['band','curve'].includes(o.geometry.pattern))))char=[...o.glyphs.text][mod((o.geometry.type==='surface'||o.geometry.pattern==='band')?-ci:ci,[...o.glyphs.text].length)];
  else {const chars=[...o.glyphs.characters];char=chars[hash(sid,i,o.glyphs.mode==='hold'?0:tick)%chars.length];}
  let xyz=pos;
  if(o.geometry.type==='mapped')xyz=surfaceTransform(surfaces.find(h=>h.id===o.geometry.host),pos,p);
  else if(!screen){xyz=rotate(pos.map(v=>v*o.transform.scale),o.motion.turns.map((v,k)=>v*p*TAU+o.transform.rotation[k]));xyz=xyz.map((v,k)=>v+o.transform.position[k]+(k===1?Math.sin(p*TAU)*o.motion.bob:0));}
  const point={xyz,char,alpha,u,screen,id:o.id,index:i,color:o.material.color,size:o.material.size,opacity:o.material.opacity,particle:o.geometry.type==='bezier'};
  out.push(point);
 };
 const r=o.geometry.radius;
 if(o.geometry.type==='mapped'){
  const g=o.geometry,h=surfaces.find(s=>s.id===g.host),count=g.count;
  const emit=(u,v,i,travel=u)=>put(surfacePoint(h,u,v),i,travel);
  if(g.pattern==='grid'){const rows=Math.max(3,Math.round(Math.sqrt(count/2))),cols=Math.max(4,Math.round(count/rows));for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)emit(col/cols,(row+.5)/rows,row*cols+col);}
  else if(g.pattern==='scatter'){for(let i=0;i<count;i++)emit(hash(sid,i,44)/4294967296,hash(sid,i,91)/4294967296,i);}
  else if(g.pattern==='band'){for(let i=0;i<count;i++){const u=mod(i/count+p*o.motion.flow,1);emit(u,(g.latitude+90)/180,i,u);}}
  else {for(let i=0;i<count;i++){const t=i/(count-1),uv=bezier(g.uvPoints.map(q=>[...q,0]),t),travel=mod(t-p*o.motion.flow,1);emit(uv[0],uv[1],i,travel);}}
 }else if(o.geometry.type==='sphere'){
  for(let lat=1;lat<14;lat++){const v=Math.PI*lat/14;for(let lon=0;lon<26;lon++){const u=TAU*(lon/26+lat%2/52);put([r*Math.sin(v)*Math.cos(u),r*Math.cos(v),r*Math.sin(v)*Math.sin(u)],lat*26+lon);}}
 }else if(o.geometry.type==='rain'){
  for(let col=0;col<40;col++)for(let row=0;row<30;row++){
   const head=mod(p*30+hash(sid,col)%30,30),tail=mod(head-row,30),a=o.glyphs.mode==='stream'?(tail<9?Math.pow(1-tail/10,2):.025):.3;
   put([(col/39-.5)*2,(row/29-.5)*2,0],col*30+row,0,a,true);
  }
 }else if(o.geometry.type==='surface'){
  const latitude=o.geometry.latitude/360*TAU,count=86;
  for(let i=0;i<count;i++){const u=mod(i/count+p*o.motion.flow,1),a=u*TAU;put([r*Math.cos(latitude)*Math.cos(a),r*Math.sin(latitude),r*Math.cos(latitude)*Math.sin(a)],i,u);}
 }else if(o.geometry.type==='bezier'){
  for(let i=0;i<110;i++){
   // Curve positions are stationary. Flow carries color and light pulses along it.
   const u=i/109,travel=mod(u-p*o.motion.flow,1),a=o.motion.flow?.25+.75*Math.pow(.5+.5*Math.cos(travel*TAU*3),4):1;
   put(bezier(o.geometry.points,u),i,travel,a);
  }
 }
 return out;
}
function sample(scene,phase){return scene.objects.filter(o=>o.visible).flatMap(o=>objectPoints(o,scene.seed,phase,scene.duration,scene.surfaces||[]));}
function render(canvas,scene,phase,selected=null,handles=false){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,unit=Math.min(w,h)*.30;
 ctx.fillStyle='#080c0d';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.textBaseline='middle';
 const palette={white:'#e0e5e2',mint:'#95f2c4',cyan:'#86d6ee',amber:'#e6bd75',acid:'#c9ff38'};
 function project(xyz){const q=rotate(xyz,[scene.camera.pitch,scene.camera.yaw,0]),d=scene.camera.distance-q[2];if(d<.25)return null;const scale=4.1/d;return {x:w/2+q[0]*scale*unit,y:h/2-q[1]*scale*unit,z:q[2],scale};}
 const raw=sample(scene,phase),points=[];
 for(const q of raw){const v=q.screen?{x:(q.xyz[0]+1)*w*.5,y:(q.xyz[1]+1)*h*.5,z:-100,scale:1}:project(q.xyz);if(v)points.push({...q,...v});}
 points.sort((a,b)=>a.z-b.z);
 for(const q of points){if(q.x<-20||q.x>w+20||q.y<-20||q.y>h+20)continue;
  const depth=q.screen?1:clamp((q.z+2.2)/4.4,.16,1),fade=selected&&q.id!==selected&&!scene.objects.some(o=>o.id===q.id&&o.geometry.host===selected)?.67:1;
  ctx.globalAlpha=q.alpha*q.opacity*(q.screen?1:.18+.82*depth)*fade;
  const col=q.color==='rainbow'?`hsl(${mod(q.u*340+190,360)} 90% 66%)`:palette[q.color];ctx.fillStyle=col;
  if(q.particle){ctx.shadowBlur=6*w/900;ctx.shadowColor=col;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1,q.size*.36*w/900*q.scale),0,TAU);ctx.fill();ctx.shadowBlur=0;}
  else{ctx.font=`${Math.max(6,q.size*w/900*(q.screen?1:clamp(q.scale,.65,1.7)))}px ui-monospace, SFMono-Regular, Menlo, monospace`;ctx.fillText(q.char,q.x,q.y);}
 }
 if(handles&&selected){const o=scene.objects.find(x=>x.id===selected);if(o?.visible&&o.geometry.type==='bezier'){
  const p=mod(phase,1),vertices=o.geometry.points.map(pt=>rotate(pt.map(v=>v*o.transform.scale),o.motion.turns.map((v,k)=>v*p*TAU+o.transform.rotation[k]))).map(pt=>pt.map((v,k)=>v+o.transform.position[k]+(k===1?Math.sin(p*TAU)*o.motion.bob:0))).map(project);
  if(vertices.every(Boolean)){ctx.globalAlpha=.7;ctx.strokeStyle='#95f2c4';ctx.lineWidth=w/900;ctx.setLineDash([4*w/900,5*w/900]);ctx.beginPath();vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.stroke();ctx.setLineDash([]);vertices.forEach((v,i)=>{ctx.fillStyle='#95f2c4';ctx.beginPath();ctx.arc(v.x,v.y,4*w/900,0,TAU);ctx.fill();ctx.font=`${12*w/900}px monospace`;ctx.fillText('P'+i,v.x,v.y-13*w/900);});}
 }}ctx.globalAlpha=1;ctx.shadowBlur=0;return points;
}
function toScript(s){
 let header=[`loop ${s.duration}s`,`seed ${s.seed}`];
 if(s.fps!==30)header.push('fps '+s.fps);
 if(JSON.stringify(s.camera)!==JSON.stringify(empty().camera))header.push('camera '+JSON.stringify(s.camera));
 let out=[header.join('; ')];
 for(const h of s.surfaces||[]){const a=['shape '+h.shape,...['radius','tube','width','height','depth'].map(k=>k+' '+h[k])];for(let k=0;k<3;k++)if(h.motion.turns[k])a.push('rotate '+'xyz'[k]+' '+h.motion.turns[k]);if(h.motion.bob)a.push('bob '+h.motion.bob);if(h.transform.position.some(Boolean))a.push('position '+JSON.stringify(h.transform.position));if(h.transform.rotation.some(Boolean))a.push('orientation '+JSON.stringify(h.transform.rotation));if(h.transform.scale!==1)a.push('scale '+h.transform.scale);out.push(h.id+': '+a.join('; '));}
 for(const o of s.objects){
  const d=base(o.id,o.geometry.type),a=[o.geometry.type==='mapped'?'glyphs':o.geometry.type];
  if(o.geometry.type==='mapped')a.push('on '+o.geometry.host,'pattern '+o.geometry.pattern,'count '+o.geometry.count,'uv '+JSON.stringify(o.geometry.uvPoints));
  if(o.geometry.radius!==d.geometry.radius)a.push('radius '+o.geometry.radius);
  if(o.geometry.type==='mapped'||o.geometry.type==='surface'||o.geometry.latitude!==d.geometry.latitude)a.push('latitude '+o.geometry.latitude);
  if(o.geometry.type==='mapped'||o.geometry.type==='surface'||o.glyphs.text!==d.glyphs.text)a.push('text '+JSON.stringify(o.glyphs.text));
  if(o.geometry.type==='bezier'||JSON.stringify(o.geometry.points)!==JSON.stringify(d.geometry.points))a.push('points '+JSON.stringify(o.geometry.points));
  for(let k=0;k<3;k++)if(o.motion.turns[k])a.push(`rotate ${'xyz'[k]} ${o.motion.turns[k]}`);
  if(o.motion.flow)a.push('flow '+o.motion.flow);if(o.motion.bob)a.push('bob '+o.motion.bob);
  a.push(o.glyphs.mode+' '+o.glyphs.rate);
  if(o.glyphs.characters!==d.glyphs.characters)a.push('chars '+JSON.stringify(o.glyphs.characters));
  a.push(o.material.color,'opacity '+o.material.opacity,'size '+o.material.size);
  if(o.meaning)a.push('means '+JSON.stringify(o.meaning));
  if(o.transform.position.some(x=>x))a.push('position '+JSON.stringify(o.transform.position));
  if(o.transform.rotation.some(x=>x))a.push('orientation '+JSON.stringify(o.transform.rotation));
  if(o.transform.scale!==1)a.push('scale '+o.transform.scale);if(!o.visible)a.push('hidden');
  out.push(o.id+': '+a.join('; '));
 }return out.join('\n');
}
const api={ZENITH_EXAMPLE,SHAPES,PATTERNS,SURFACE_EXAMPLE,baseSurface,mapped,surfacePoint,surfaceTransform,EXAMPLE,EXAMPLES,base,empty,compile,validate,loopWarnings,bezier,rotate,objectPoints,sample,render,toScript};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlyphScene=api;
})(typeof globalThis!=='undefined'?globalThis:this);
