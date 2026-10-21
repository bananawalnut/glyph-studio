/* One draw call. Static glyph geometry; independent fin motion runs in GLSL. */
(function(){'use strict';
window.addEventListener('DOMContentLoaded',()=>{
 const canvas=document.getElementById('betta'),status=document.getElementById('status'),fallback=document.getElementById('fallback'),toggle=document.getElementById('motion'),G=BettaGeometry,mesh=G.generate(),media=matchMedia('(prefers-reduced-motion: reduce)'),gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,powerPreference:'low-power',preserveDrawingBuffer:true});
 if(!gl){fallback.hidden=false;fallback.textContent='This study needs WebGL2. Your saved Zenith scene is still available in the studio.';toggle.disabled=document.getElementById('save').disabled=true;status.textContent='WebGL2 unavailable';return;}
 const vertex=`#version 300 es
 precision highp float;precision highp int;
 layout(location=0) in vec3 a_position;layout(location=1) in vec3 a_meta;layout(location=2) in vec3 a_look;
 uniform vec2 u_resolution,u_view;uniform float u_phase,u_unit;out vec2 v_uv;out vec3 v_color;out float v_alpha;
 const float T=6.283185307179586;
 void main(){vec3 p=a_position;float part=a_meta.x,w=a_meta.y,seed=a_meta.z,alpha=a_look.x,side=a_look.y,t=u_phase*T;
 if(part==1.){float a=atan(p.y+.01,p.x-.29);p.z+=pow(w,1.5)*(.19*sin(t*3.-w*4.+a*2.)+.055*sin(t*2.+a*9.));p.y+=.035*w*w*sin(t*2.+a*4.);p.x+=.025*w*cos(t*2.+a*3.);}
 if(part==2.||part==3.){p.z+=w*.12*sin(t*3.-p.x*4.+(part==2.?0.:1.2));p.y+=(part==2.?1.:-1.)*w*.025*sin(t*2.+p.x*5.);}
 if(part==4.)p.z+=.10*w*sin(t*3.+p.y*4.);
 if(part==6.){p.z+=.16*w*sin(t*4.);p.y+=.04*w*cos(t*4.);}
 if(part!=0.){p.z+=.035*sin(t*2.+a_position.x*1.6+2.72);p.y+=.035*sin(t);p.x+=.045*sin(t);}
 float yaw=u_view.x+.065*sin(t),pitch=u_view.y+.025*sin(t*2.);float cy=cos(yaw),sy=sin(yaw),cx=cos(pitch),sx=sin(pitch);p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);p.yz=mat2(cx,sx,-sx,cx)*p.yz;
 float perspective=4.8/(4.8-p.z);vec2 pixel=u_resolution*vec2(.48,.52)+vec2(p.x,-p.y)*u_unit*perspective;
 float size=u_unit*.045;vec3 color=vec3(.68,.37,.72);
 if(part==0.){pixel=(a_position.xy*.5+.5)*u_resolution;pixel.y+=sin(t+seed*T)*u_unit*.008;size=u_unit*.022;alpha*=.7+.3*sin(t+seed*T);color=vec3(.40,.23,.48);}
 else if(part==1.){float a=atan(a_position.y+.01,a_position.x-.29),r=length(a_position.xy-vec2(.29,-.01)),light=.5+.5*sin(t*2.-r*4.+a*3.);color=mix(vec3(.49,.22,.55),vec3(.77,.43,.77),light*.62);alpha*=.86+.14*light;}
 else if(part==2.||part==3.){color=mix(vec3(.57,.27,.62),vec3(.78,.46,.79),.5+.5*sin(a_position.x*2.+t));}
 else if(part==5.){float light=clamp((a_position.y+.3)/.65,0.,1.);color=mix(vec3(.61,.31,.67),vec3(.94,.68,.91),light);alpha*=mix(.18,1.,clamp(side*cos(yaw),0.,1.));}
 else if(part==7.){color=vec3(.94,.77,1.);size*=.86;alpha*=clamp(cos(yaw),0.,1.);}
 else if(part==6.){color=vec3(.79,.48,.84);alpha*=.7+.3*sin(t*4.);}
 int tile=int(floor(seed*8.));if(part>0.&&seed>.86)tile=(tile+int(floor(u_phase*24.)))%8;if(a_look.z>=0.)tile=int(a_look.z);
 vec2 corner=vec2((gl_VertexID==1||gl_VertexID==3)?1.:-1.,gl_VertexID>=2?1.:-1.);pixel+=corner*size*.8;gl_Position=vec4(pixel/u_resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);v_uv=(vec2(float(tile),0.)+(corner+1.)*.5)/vec2(8.,1.);v_alpha=alpha;v_color=color;
 }`;
 const fragment=`#version 300 es
 precision highp float;uniform sampler2D u_atlas;in vec2 v_uv;in vec3 v_color;in float v_alpha;out vec4 outColor;
 void main(){vec2 d=vec2(1./512.,1./64.);float a=texture(u_atlas,v_uv).a;float halo=(texture(u_atlas,v_uv+vec2(d.x*1.5,0.)).a+texture(u_atlas,v_uv-vec2(d.x*1.5,0.)).a+texture(u_atlas,v_uv+vec2(0.,d.y*1.5)).a+texture(u_atlas,v_uv-vec2(0.,d.y*1.5)).a)*.075;float opacity=(a+halo)*v_alpha;if(opacity<.001)discard;outColor=vec4(v_color,opacity);}`;
 let program,buffer,vao,atlas,uniforms,lost=false,playing=!media.matches,frame=0,origin=0,start=performance.now(),last=-1,raf=0,view=[0,.015],drag=null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function initialize(){program=gl.createProgram();const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));uniforms=Object.fromEntries(['u_resolution','u_view','u_phase','u_unit','u_atlas'].map(k=>[k,gl.getUniformLocation(program,k)]));vao=gl.createVertexArray();buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);for(let k=0;k<3;k++){gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,3,gl.FLOAT,false,36,k*12);gl.vertexAttribDivisor(k,1);}const c=document.createElement('canvas');c.width=512;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='40px ui-monospace, SFMono-Regular, Menlo, monospace';[...G.CHARS].forEach((ch,i)=>ctx.fillText(ch,i*64+32,32));atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);canvas.dataset.renderer='webgl2';canvas.dataset.glyphs=mesh.count;}
 function draw(){if(lost)return;const w=canvas.width,h=canvas.height;gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindVertexArray(vao);gl.uniform2f(uniforms.u_resolution,w,h);gl.uniform2fv(uniforms.u_view,view);gl.uniform1f(uniforms.u_phase,frame/360);gl.uniform1f(uniforms.u_unit,Math.min(w*.225,h*.275));gl.uniform1i(uniforms.u_atlas,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,mesh.count);last=frame;}
 function label(){toggle.textContent=playing?'Pause':'Swim';toggle.setAttribute('aria-pressed',String(playing));}
 function tick(now){raf=0;if(playing&&!document.hidden&&!lost){frame=(origin+Math.floor((now-start)*.03))%360;if(frame!==last)draw();raf=requestAnimationFrame(tick);}}
 function resumeClock(){origin=frame;start=performance.now();if(raf)cancelAnimationFrame(raf);raf=0;if(playing&&!document.hidden&&!lost)raf=requestAnimationFrame(tick);}
 try{initialize();}catch(e){fallback.hidden=false;fallback.textContent='The fish could not start on this graphics device.';status.textContent='Renderer unavailable';console.error(e);return;}
 new ResizeObserver(()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));draw();}).observe(canvas);
 toggle.onclick=()=>{playing=!playing;label();resumeClock();};document.getElementById('reset').onclick=()=>{view=[0,.015];draw();status.textContent='Profile view restored.';};
 canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,view:[...view]};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;view=[Math.max(-2.9,Math.min(2.9,drag.view[0]+(e.clientX-drag.x)*.006)),Math.max(-.65,Math.min(.65,drag.view[1]+(e.clientY-drag.y)*.004))];draw();};canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
 canvas.onkeydown=e=>{if(e.key===' '){e.preventDefault();toggle.click();}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();view[0]+=(e.key==='ArrowLeft'?-.12:.12);draw();}};
 document.addEventListener('visibilitychange',resumeClock);media.addEventListener('change',()=>{if(media.matches){playing=false;label();resumeClock();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;resumeClock();});canvas.addEventListener('webglcontextrestored',()=>{lost=false;initialize();draw();resumeClock();});
 document.getElementById('save').onclick=()=>{draw();const a=document.createElement('a');a.download='betta-glyph-study.png';a.href=canvas.toDataURL('image/png');a.click();status.textContent='Saved a transparent PNG of this frame.';};
 label();resumeClock();
});
})();
