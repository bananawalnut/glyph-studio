/* <glyph-animal>: no dependencies, one instanced draw, geometry uploads on edits only. */
(function(){'use strict';
const bounded=(value,fallback,lo,hi)=>{const n=Number(value);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;};
const V=`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec3 a_position;layout(location=1) in vec3 a_normal;layout(location=2) in vec3 a_color;layout(location=3) in vec4 a_behavior;layout(location=4) in vec3 a_meta;
uniform vec2 u_resolution,u_view,u_location;uniform float u_phase,u_scale,u_angle,u_species,u_detail,u_light,u_roam;out vec2 v_uv;out vec3 v_color;out float v_alpha;
const float T=6.283185307179586;
${AnimalMotion.GLSL}
mat3 rotY(float a){float s=sin(a),c=cos(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotX(float a){float s=sin(a),c=cos(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 rotZ(float a){float s=sin(a),c=cos(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){float part=a_behavior.x,w=a_behavior.y,group=a_meta.x,aux=a_meta.y;
 vec3 p=animalDeform(a_position,part,w,aux,group),n=a_normal;
 vec3 tangent=normalize(cross(n,abs(n.z)<.9?vec3(0.,0.,1.):vec3(0.,1.,0.))),bitangent=cross(n,tangent);
 vec3 dx=animalDeform(a_position+tangent*.005,part,w,aux,group)-p,dy=animalDeform(a_position+bitangent*.005,part,w,aux,group)-p;n=normalize(cross(dx,dy));
 if(u_species==0.){mat3 pair=rotZ(u_roam>.5?.10:(group==0.?.35:3.49159));p=pair*(p*.70)+vec3(group==0.?-.16:.16,group==0.?.53:-.53,group==0.?.04:-.04);n=pair*n;}
 if(u_species==2.)p.y+=.65;if(u_species==1.)p.y+=.20;if(u_species==4.)p.y+=.08;if(u_species==3.)p.x-=.15;
 mat3 turn=rotZ(u_angle)*rotX(u_view.y)*rotY(u_view.x);p=turn*p;n=turn*n;
 float perspective=6./(6.-p.z),unit=min(u_resolution.x/5.1,u_resolution.y/3.8)*u_scale*(u_species==3.?1.20:1.);
 vec2 center=u_resolution*.5+vec2(u_location.x,-u_location.y)*unit;vec2 pixel=center+vec2(p.x,-p.y)*unit*perspective;
 float face=smoothstep(-.15,.3,n.z),diffuse=max(0.,dot(n,normalize(vec3(-.4,.65,1.)))),rim=pow(1.-abs(n.z),2.5),specular=pow(max(0.,dot(n,normalize(vec3(-.2,.35,1.)))),20.);
 float alpha=a_behavior.w*(.12+.88*face);vec3 color=a_color*(.34+.64*diffuse)+vec3(.30,.21,.35)*rim+vec3(.4,.35,.45)*specular;
 if(part==11.||part==5.||part==20.||part==21.||part==2.||part==1.||part==16.||part==17.){alpha=a_behavior.w*(.48+.52*abs(n.z));color+=vec3(.13,.08,.16)*rim;}
 if(part==12.)alpha=a_behavior.w;
 float density=clamp(dot(color,vec3(.3,.5,.2)),0.,1.);int tile=int(floor(a_behavior.z/T*8.));if(density>.72)tile=3;else if(density<.22)tile=0;if(a_meta.z>=0.)tile=int(a_meta.z);
 vec2 corner=vec2((gl_VertexID==1||gl_VertexID==3)?1.:-1.,gl_VertexID>=2?1.:-1.);pixel+=corner*unit*.030/u_detail;
 gl_Position=vec4(pixel/u_resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);v_uv=(vec2(float(tile),0.)+(corner+1.)*.5)/vec2(8.,1.);v_alpha=alpha;v_color=color*u_light;
}`;
const F=`#version 300 es
precision highp float;uniform sampler2D u_atlas;uniform float u_style;in vec2 v_uv;in vec3 v_color;in float v_alpha;out vec4 outColor;
void main(){float ink=texture(u_atlas,v_uv).a;if(u_style>.5){vec2 p=fract(v_uv*vec2(8.,1.))-.5;ink=1.-smoothstep(.25,.48,length(p));}float glow=(texture(u_atlas,v_uv+vec2(1./512.,0.)).a+texture(u_atlas,v_uv+vec2(0.,1./64.)).a)*.055;float a=(ink+glow)*v_alpha;if(a<.002)discard;outColor=vec4(v_color,a);}`;
class GlyphAnimal extends HTMLElement{
 static get observedAttributes(){return ['species','detail','behavior','paused','speed','light','appearance'];}
 connectedCallback(){if(this._ready)return;this._ready=true;(this.shadowRoot||this.attachShadow({mode:'open'})).innerHTML='<style>:host{display:block;position:relative;min-height:350px}canvas{display:block;width:100%;height:100%;position:absolute;inset:0;touch-action:none;cursor:grab}canvas:active{cursor:grabbing}.error{position:absolute;inset:20%;color:#bca7c9;font:13px/1.6 monospace}canvas:focus-visible{outline:1px solid #b68fbf;outline-offset:-4px}</style><canvas tabindex="0" role="img"></canvas><div class="error" hidden></div>';
  this.canvas=this.shadowRoot.querySelector('canvas');this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,powerPreference:'low-power'});this._frame=0;this._last=-1;this._raf=0;this.view=[0,.08];this._time=0;this._lastTime=0;this._paintTime=0;this._visible=true;this._reduced=matchMedia('(prefers-reduced-motion: reduce)');if(this._reduced.matches)this.setAttribute('paused','');
  if(!this.gl){this.fail('This animal study needs WebGL2.');return;}
  this._events=new AbortController();const signal=this._events.signal;
  try{this.init();this.load();}catch(e){this.fail('This graphics device could not start the study.');console.error(e);return;}
  this._resize=new ResizeObserver(()=>{const r=this.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.draw();});this._resize.observe(this);
  this._intersection=new IntersectionObserver(entries=>{this._visible=entries[0].isIntersecting;this.clock();});this._intersection.observe(this);
  document.addEventListener('visibilitychange',()=>this.clock(),{signal});this._reduced.addEventListener('change',()=>{if(this._reduced.matches)this.setAttribute('paused','');},{signal});
  let drag;this.canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY,...this.view];this.canvas.setPointerCapture(e.pointerId);},{signal});this.canvas.addEventListener('pointermove',e=>{if(!drag)return;this.view=[drag[2]+(e.clientX-drag[0])*.006,Math.max(-1.2,Math.min(1.2,drag[3]+(e.clientY-drag[1])*.004))];this.draw();},{signal});for(const type of ['pointerup','pointercancel'])this.canvas.addEventListener(type,()=>{drag=null;},{signal});
  this.canvas.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();this.toggleAttribute('paused');this.dispatchEvent(new Event('playchange'));}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.view[0]+=e.key==='ArrowLeft'?-.15:.15;this.draw();}},{signal});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this._lost=true;this.clock();},{signal});this.canvas.addEventListener('webglcontextrestored',()=>{this._lost=false;this.init();this.load();this.draw();this.clock();},{signal});this.clock();
 }
 disconnectedCallback(){if(!this._ready)return;cancelAnimationFrame(this._raf);this._raf=0;this._resize?.disconnect();this._intersection?.disconnect();this._events?.abort();this.dispose();this._ready=false;this.shadowRoot.replaceChildren();}
 attributeChangedCallback(name,old,value){if(old===value||!this._ready||!this.gl||!this.program)return;if(name==='species'||name==='detail'){this.load();this.view=[0,.08];}this.draw();this.clock();}
 get species(){const s=this.getAttribute('species')||'sea-angel';return AnimalGeometry.SPECIES.includes(s)?s:'sea-angel';}
 fail(text){const e=this.shadowRoot.querySelector('.error');e.hidden=false;e.textContent=text;this.dataset.renderer='unavailable';}
 init(){const g=this.gl;this.program=g.createProgram();for(const [type,source] of [[g.VERTEX_SHADER,V],[g.FRAGMENT_SHADER,F]]){const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));g.attachShader(this.program,s);g.deleteShader(s);}g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));this.uniforms=Object.fromEntries(['u_resolution','u_view','u_location','u_phase','u_scale','u_angle','u_species','u_detail','u_light','u_style','u_atlas','u_roam'].map(k=>[k,g.getUniformLocation(this.program,k)]));this.vao=g.createVertexArray();this.buffer=g.createBuffer();g.bindVertexArray(this.vao);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);let offset=0;[3,3,3,4,3].forEach((n,i)=>{g.enableVertexAttribArray(i);g.vertexAttribPointer(i,n,g.FLOAT,false,64,offset*4);g.vertexAttribDivisor(i,1);offset+=n;});const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d');x.fillStyle='white';x.font='40px ui-monospace,SFMono-Regular,Menlo,monospace';x.textAlign='center';x.textBaseline='middle';[...'.:+#0H*×'].forEach((ch,i)=>x.fillText(ch,i*64+32,32));this.atlas=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.atlas);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,c);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.LINEAR);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);this.dataset.renderer='webgl2';}
 load(){const d=Number(this.getAttribute('detail')||1);this.mesh=AnimalGeometry.generate(this.species,{detail:[.7,1,1.35].includes(d)?d:1});this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,this.mesh.data,this.gl.STATIC_DRAW);this.dataset.glyphs=this.mesh.count;this.canvas.setAttribute('aria-label',this.species.replace('-',' ')+' made of luminous glyphs. Drag to rotate. Space pauses; arrow keys turn.');this.dispatchEvent(new Event('geometrychange'));}
 draw(){if(this._lost||!this.mesh)return;const g=this.gl,w=this.canvas.width,h=this.canvas.height,u=this.uniforms,roam=this.getAttribute('behavior')==='roam',phase=this._frame/720,s=this.species,pose=AnimalMotion.path(s==='jellyfish'?phase+.0028*Math.sin(phase*Math.PI*36-1.4):s==='koi'?AnimalMotion.koiTravel(phase):phase),isFish=['koi','betta','pisces'].includes(s);let loc=[0,0],angle=0,scale=1;if(roam){loc=[pose.position[0]*.85,pose.position[1]*.65];scale=.80;if(isFish)angle=Math.atan2(-pose.direction[1],-pose.direction[0]);else if(s==='ray')angle=Math.atan2(pose.direction[1],pose.direction[0])-Math.PI/2;else angle=.22*Math.sin(phase*Math.PI*2);}else loc=[0,.025*Math.sin(phase*Math.PI*4)];
  g.viewport(0,0,w,h);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.bindVertexArray(this.vao);g.uniform2f(u.u_resolution,w,h);g.uniform2fv(u.u_view,this.view);g.uniform2fv(u.u_location,loc);g.uniform1f(u.u_phase,phase);g.uniform1f(u.u_roam,roam?1:0);g.uniform1f(u.u_scale,scale);g.uniform1f(u.u_angle,angle);g.uniform1f(u.u_species,AnimalGeometry.SPECIES.indexOf(s));g.uniform1f(u.u_detail,this.mesh.detail);g.uniform1f(u.u_light,bounded(this.getAttribute('light')||1.15,1.15,.6,1.8));g.uniform1f(u.u_style,this.getAttribute('appearance')==='particles'?1:0);g.uniform1i(u.u_atlas,0);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.atlas);g.drawArraysInstanced(g.TRIANGLE_STRIP,0,4,this.mesh.count);this.dataset.frame=this._frame;this._last=this._frame;
 }
 clock(){cancelAnimationFrame(this._raf);this._raf=0;this._lastTime=performance.now();if(!this.hasAttribute('paused')&&!document.hidden&&this._visible&&!this._lost)this._raf=requestAnimationFrame(n=>this.tick(n));}
 tick(now){this._raf=0;const delta=Math.max(0,Math.min(.1,(now-this._lastTime)/1000));this._lastTime=now;const speed=bounded(this.getAttribute('speed')||1,1,.25,2);this._time=(this._time+delta*speed)%24;this._frame=Math.floor(this._time*30)%720;if(this._frame!==this._last&&now-this._paintTime>=1000/30){this.draw();this._paintTime=now;}if(!this.hasAttribute('paused')&&!document.hidden&&this._visible&&!this._lost)this._raf=requestAnimationFrame(n=>this.tick(n));}
 resetView(){this.view=[0,.08];this.draw();}
 saveFrame(){this.draw();return this.canvas.toDataURL('image/png');}
 dispose(){if(!this.gl)return;const g=this.gl;g.deleteBuffer(this.buffer);g.deleteVertexArray(this.vao);g.deleteTexture(this.atlas);g.deleteProgram(this.program);}
}
customElements.define('glyph-animal',GlyphAnimal);
})();
