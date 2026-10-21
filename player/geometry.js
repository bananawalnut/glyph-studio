// Geometry ABI 1. This file also runs in Node for Rust/JS parity benchmarks.
(function(root){'use strict';
const TAU=Math.PI*2,SHAPES=['sphere','torus','cylinder','plane','wave'],PATTERNS=['grid','band','scatter','curve'],KINDS=['sphere','surface','bezier','rain','mapped'];
const mod=(x,n)=>((x%n)+n)%n,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(a,b,c=0){let x=Math.imul(a+1,374761393)^Math.imul(b+1,668265263)^Math.imul(c+1,1442695041);x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;}
const sid=(seed,id)=>hash(seed,[...id].reduce((a,c)=>a+c.charCodeAt(0),0));
function bezier(p,t,d=3){const a=1-t;return Array.from({length:d},(_,k)=>a*a*a*p[k]+3*a*a*t*p[d+k]+3*a*t*t*p[2*d+k]+t*t*t*p[3*d+k]);}
function surface(p,u,v){const a=u*TAU,b=v*TAU,r=p[3];if(p[2]===0){const l=(v-.5)*Math.PI;return [r*Math.cos(l)*Math.cos(a),r*Math.sin(l),r*Math.cos(l)*Math.sin(a)];}if(p[2]===1)return [(r+p[4]*Math.cos(b))*Math.cos(a),p[4]*Math.sin(b),(r+p[4]*Math.cos(b))*Math.sin(a)];if(p[2]===2)return [r*Math.cos(a),(v-.5)*p[6],r*Math.sin(a)];return [(u-.5)*p[5],(v-.5)*p[6],p[2]===4?p[7]*.14*Math.sin(a)*Math.cos(b):0];}
function parameters(o,scene){const h=o.geometry.type==='mapped'?(scene.surfaces||[]).find(s=>s.id===o.geometry.host):null,g=o.geometry,p=new Float64Array(32);p[0]=KINDS.indexOf(g.type);p[1]=PATTERNS.indexOf(g.pattern);p[2]=h?SHAPES.indexOf(h.shape):0;p[3]=h?h.radius:g.radius;p[4]=h?.tube||0;p[5]=h?.width||0;p[6]=h?.height||0;p[7]=h?.depth||0;p[8]=g.latitude;p[9]=g.count||0;p[10]=sid(scene.seed,o.id);p.set((g.type==='mapped'?g.uvPoints:g.points).flat(),12);return p;}
function generate(p){const out=new Float32Array(2048*6);let n=0;const put=(xyz,i,u=0,v=0)=>{out.set([xyz[0],xyz[1],xyz[2],i,u,v],n*6);n++;};
 if(p[0]===0){for(let lat=1;lat<14;lat++){const v=Math.PI*lat/14;for(let lon=0;lon<26;lon++){const u=TAU*(lon/26+lat%2/52);put([p[3]*Math.sin(v)*Math.cos(u),p[3]*Math.cos(v),p[3]*Math.sin(v)*Math.sin(u)],lat*26+lon);}}}
 else if(p[0]===1){for(let i=0;i<86;i++){const u=i/86,l=p[8]/180*Math.PI;put([p[3]*Math.cos(l)*Math.cos(u*TAU),p[3]*Math.sin(l),p[3]*Math.cos(l)*Math.sin(u*TAU)],i,u);}}
 else if(p[0]===2){for(let i=0;i<110;i++){const t=i/109;put(bezier(p.slice(12,24),t),i,t);}}
 else if(p[0]===3){for(let col=0;col<40;col++)for(let row=0;row<30;row++)put([(col/39-.5)*2,(row/29-.5)*2,0],col*30+row);}
 else{const count=p[9],emit=(u,v,i,travel=u)=>put(surface(p,u,v),i,travel,v);if(p[1]===0){const rows=Math.max(3,Math.round(Math.sqrt(count/2))),cols=Math.max(4,Math.round(count/rows));for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)emit(col/cols,(row+.5)/rows,row*cols+col);}
 else if(p[1]===1)for(let i=0;i<count;i++)emit(i/count,(p[8]+90)/180,i);
 else if(p[1]===2)for(let i=0;i<count;i++)emit(hash(p[10],i,44)/4294967296,hash(p[10],i,91)/4294967296,i);
 else for(let i=0;i<count;i++){const t=i/(count-1),uv=bezier(p.slice(12,20),t,2);emit(uv[0],uv[1],i,t);}}
 return out.slice(0,n*6);
}
function wasmCompiler(exports){if(exports.abi_version()!==1)throw Error('Unsupported geometry ABI');return p=>{new Float64Array(exports.memory.buffer,exports.params_ptr(),32).set(p);const n=exports.generate();if(n<1||n>2048)throw Error('Geometry compilation failed');return new Float32Array(exports.memory.buffer,exports.output_ptr(),n*6).slice();};}
function matrix(x,y,z,out=[]){const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);out[0]=cy*cz;out[1]=cy*sz;out[2]=-sy;out[3]=sx*sy*cz-cx*sz;out[4]=sx*sy*sz+cx*cz;out[5]=sx*cy;out[6]=cx*sy*cz+sx*sz;out[7]=cx*sy*sz-sx*cz;out[8]=cx*cy;return out;}
function rotation(r){return matrix(r[0],r[1],r[2]);}
function rotationAt(o,p,out){const t=o.motion.turns,r=o.transform.rotation;return matrix(t[0]*p*TAU+r[0],t[1]*p*TAU+r[1],t[2]*p*TAU+r[2],out);}

const mul=(m,p)=>[m[0]*p[0]+m[3]*p[1]+m[6]*p[2],m[1]*p[0]+m[4]*p[1]+m[7]*p[2],m[2]*p[0]+m[5]*p[1]+m[8]*p[2]];
function world(o,scene,xyz,phase){const h=o.geometry.type==='mapped'?(scene.surfaces||[]).find(s=>s.id===o.geometry.host):o,t=h.transform,m=h.motion;return mul(rotation(m.turns.map((v,k)=>v*phase*TAU+t.rotation[k])),xyz.map(x=>x*t.scale)).map((x,k)=>x+t.position[k]+(k===1?Math.sin(phase*TAU)*m.bob:0));}
function project(scene,xyz,w,h){const q=mul(rotation([scene.camera.pitch,scene.camera.yaw,0]),xyz),d=scene.camera.distance-q[2],s=4.1/d;return d<.25?null:{x:w/2+q[0]*s*Math.min(w,h)*.3,y:h/2-q[1]*s*Math.min(w,h)*.3,z:q[2],scale:s};}
const api={TAU,SHAPES,PATTERNS,KINDS,hash,sid,mod,clamp,surface,parameters,generate,wasmCompiler,matrix,rotation,rotationAt,mul,world,project};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GlyphGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
