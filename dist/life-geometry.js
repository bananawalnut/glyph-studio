/* Seeded anatomy for the Anima studies. Packed once; all motion runs on the GPU. */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const SPECIES=['pisces','jellyfish','ray','koi','sea-angel','betta'];
function hash(a,b){let n=Math.imul(a+1,374761393)^Math.imul(b+1,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function normal(x,y,z){const l=Math.hypot(x,y,z);return l<1e-12?[0,0,1]:[x/l,y/l,z/l];}
const colors={pearl:[.82,.68,.88],ice:[.60,.72,.86],rose:[.85,.43,.65],violet:[.63,.37,.78],amber:[.88,.55,.47]};
function generate(species,{seed=2801,detail=1}={}){
 if(!SPECIES.includes(species))throw Error('Unknown animal');
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||![.7,1,1.35].includes(detail))throw Error('Invalid animal options');
 const data=[],parts={},step=.040/detail;let group=0;
 // position3, normal3, color3, behavior(part,weight,phase,alpha), meta(group,aux,glyph).
 function put(p,n,c,part,w=0,alpha=.65,aux=0,glyph=-1){if(species==='koi'&&part<=4)part+=15;const id=data.length/16;data.push(...p,...n,...c,part,w,hash(seed,id)*TAU,alpha,group,aux,glyph);parts[part]=(parts[part]||0)+1;}
 function ellipsoid(center,radii,c,part=10,alpha=.5){const [rx,ry,rz]=radii;const rows=Math.max(8,Math.ceil(Math.PI*Math.max(rx,ry)/step));for(let i=1;i<rows;i++){const a=i/rows*Math.PI,s=Math.sin(a),cy=Math.cos(a),cols=Math.max(8,Math.round(TAU*Math.max(rx,rz)*s/step));for(let j=0;j<cols;j++){const b=(j+(i%2)*.5)/cols*TAU,p=[rx*s*Math.cos(b),ry*cy,rz*s*Math.sin(b)],n=normal(p[0]/rx**2,p[1]/ry**2,p[2]/rz**2);put(p.map((v,k)=>v+center[k]),n,c,part,clamp((center[1]+ry-p[1])/(2*ry)),alpha);}}}
 function line(fn,part,c,alpha=.65,width=1,aux=0){const count=Math.max(12,Math.ceil(3/step));for(let i=0;i<=count;i++){const t=i/count,p=fn(t);for(let j=0;j<width;j++)put([p[0]+(j-(width-1)/2)*step*.45,p[1],p[2]],[0,0,1],c,part,t,alpha,aux);}}
 function sheet(fn,part,c,alpha=.4,aux=0){const rows=Math.ceil(1.6/step),cols=Math.ceil(.7/step);for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=i/rows,v=j/cols,p=fn(u,v),e=.001,pu=fn(Math.min(1,u+e),v),pv=fn(u,Math.min(1,v+e)),a=pu.map((q,k)=>q-p[k]),b=pv.map((q,k)=>q-p[k]);let n=normal(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);if(n[2]<0)n=n.map(x=>-x);put(p,n,c,part,u,alpha*(.72+.28*Math.cos(v*TAU*9)**8),aux);}}
 function eye(p,r=.065,part=4){for(let i=0;i<24;i++){const a=i/24*TAU;put([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r,p[2]],[0,0,1],colors.amber,part,0,.8,0,2);}put([p[0]-r*.2,p[1]+r*.2,p[2]+.012],[0,0,1],colors.pearl,part,0,1,0,6);}
 function fish(koi=true){
  // Longitudinal rings follow the cross section, so scales wrap a real volume.
  for(let x=-1.35,row=0;x<=1.12;x+=step,row++){const u=(x+1.35)/2.47,h=.065+.34*Math.pow(Math.sin(Math.PI*(.08+.9*u)),1.5)*(1-.43*u),depth=h*.70,cols=Math.max(10,Math.ceil(TAU*h/step));for(let j=0;j<cols;j++){const a=(j+(row%2)*.5)/cols*TAU,y=h*Math.cos(a),z=depth*Math.sin(a),n=normal(-.12*Math.cos(u*Math.PI),y/h**2,z/depth**2),patch=Math.sin(x*6.1+a*1.7)+.65*Math.cos(x*10-a*2.8)+.45*Math.sin(a*4+x*3);let c=koi?(patch>.55?colors.rose:patch< -1.05?[.27,.20,.33]:colors.pearl):colors.ice;c=c.map((v,k)=>v*(.84+.16*Math.cos(a+1.3)));const gill=Math.exp(-(((x+.85)/.028)**2))*clamp(.7+Math.cos(a));put([x,y,z],n,c,0,u,.72*(1-.47*gill),a);}}
  // Forked caudal fin: roots converge at the peduncle; distal lobes split.
  sheet((u,v)=>{const angle=(v-.5)*1.7,r=u*(.28+.65*Math.pow(Math.abs(v-.5)*2,.8));return [1.08+r*Math.cos(angle),r*Math.sin(angle),.018*Math.sin(v*31)*u];},1,colors.rose,.50);
  sheet((u,v)=>[-.55+u*1.30,.31*(1-u*.68)+v*.38*Math.sin(u*Math.PI),.025*Math.sin(u*38)*v],2,colors.violet,.42);
  sheet((u,v)=>[.14+u*.70,-.25+u*.14-v*.30*Math.sin(u*Math.PI),.02*Math.sin(u*35)*v],2,colors.rose,.38);
  for(const side of [-1,1])sheet((u,v)=>[-.80+u*.70,-.08-u*.35*Math.sin(v*Math.PI),side*(.20+u*.20)+.02*Math.sin(v*30)],3,colors.pearl,.38,side);
  eye([-1.11,.105,.215]);
  line(t=>[-1.36+.022*Math.sin(t*Math.PI),-.055+t*.10,.085],4,colors.pearl,.75);
  if(koi)for(const s of [-1,1])line(t=>[-1.32-.085*t,-.08-.045*t,s*.08+.04*Math.sin(t*Math.PI)],4,colors.rose,.40);
 }
 if(species==='koi')fish();
 if(species==='pisces'){fish(false);group=1;fish(false);}
 if(species==='ray'){
  for(let y=-.90;y<=1.02;y+=step){const span=1.45*Math.pow(Math.max(0,1-Math.abs((y-.08)/1.05)),.76);for(let x=-span;x<=span;x+=step){const q=Math.abs(x)/Math.max(.01,span),z=.22*Math.exp(-x*x/.10-(y-.15)**2/.50)+.016*Math.sin(Math.atan2(y-.6,x)*49)*q;const n=normal(.8*x/Math.max(.10,span),-.1,1);const speck=hash(seed,Math.round((x+2)*1000)+Math.round(y*1000)*10000);put([x,y,z],n,speck>.97?colors.pearl:colors.violet,5,q,.6,span);}}
  ellipsoid([0,.62,.15],[.20,.31,.18],colors.violet,5,.73);
  for(const s of [-1,1]){eye([s*.13,.69,.31],.045,5);line(t=>[s*(.13+.055*Math.cos(t*TAU)),.54+.045*Math.sin(t*TAU),.25],5,[.28,.18,.34],.52);}
  line(t=>[.035*Math.sin(t*6)*t,-.78-1.55*t,.04],6,colors.rose,.62,2);
  for(const s of [-1,1])sheet((u,v)=>[s*(.11+u*.31),-.65-u*.35+v*.16*Math.sin(u*Math.PI),.03],5,[.40,.25,.50],.10);
 }
 if(species==='jellyfish'){
  // Bell hemisphere with scalloped rim, radial canals, and four gonad loops.
  const rows=Math.ceil(1.3/step);for(let i=0;i<=rows;i++){const a=(i+.3)/(rows+1)*Math.PI*.49,r=1.12*Math.sin(a),y=.48+.70*Math.cos(a),cols=Math.max(12,Math.ceil(TAU*r/step));for(let j=0;j<cols;j++){const b=j/cols*TAU,scallop=1+.024*Math.cos(b*16)*Math.pow(Math.sin(a),6),p=[r*Math.cos(b)*scallop,y,r*Math.sin(b)*scallop],n=normal(p[0]/1.12**2,(y-.48)/.7**2,p[2]/1.12**2),canal=Math.cos(b*16)>.92;put(p,n,canal?colors.pearl:colors.ice,7,i/rows,canal?.62:.24,b);}}
  for(let k=0;k<4;k++)line(t=>{const a=t*TAU,c=k*Math.PI/2;return [.34*Math.cos(c)+.22*Math.cos(a),.62+.07*Math.sin(a*2),.34*Math.sin(c)+.22*Math.sin(a)];},7,colors.rose,.54);
  for(let k=0;k<52;k++){const a=k/52*TAU;line(t=>[(1.10-.10*t)*Math.cos(a)+.055*Math.sin(t*12+a)*t,.48-.50*t,(1.10-.10*t)*Math.sin(a)],8,colors.ice,.32,1,a);}
  for(let k=0;k<4;k++)sheet((u,v)=>{const a=k*Math.PI/2;return [.25*Math.cos(a)+.12*Math.sin(u*18+k)+(v-.5)*.25*(.7+.3*Math.cos(u*22)),.50-u*2.1,.25*Math.sin(a)+.09*Math.cos(u*16+k)+(v-.5)*.12];},9,colors.rose,.34,k);
 }
 if(species==='sea-angel'){
  // Translucent trunk, head, internal visceral mass and cephalic tentacles.
  ellipsoid([0,-.20,0],[.28,1.04,.24],colors.ice,10,.25);
  ellipsoid([0,.78,.02],[.25,.28,.23],colors.pearl,10,.30);
  for(const s of [-1,1])sheet((u,v)=>[s*(.18+1.12*u),.29+.30*Math.sin(u*Math.PI)+(v-.5)*.63*Math.pow(Math.sin(u*Math.PI),.65),.025*Math.sin(v*18)*u],11,colors.ice,.39,s);
  ellipsoid([0,.37,.035],[.11,.32,.095],colors.rose,12,.70);
  ellipsoid([.035,-.05,.03],[.075,.23,.07],colors.amber,12,.55);
  for(const s of [-1,1])line(t=>[s*(.10+.075*t),.92+.28*t,.02+.035*Math.sin(t*Math.PI)],13,colors.rose,.52,2);
  line(t=>[.025*Math.sin(t*5),-1.02-.35*t,.01],13,colors.ice,.4);
 }
 if(species==='betta'){
  const B=typeof module!=='undefined'&&module.exports?require('./betta-geometry.js'):root.BettaGeometry,m=B.generate({seed,spacing:.052/detail});
  for(let i=0;i<m.data.length;i+=9){const [x,y,z,p,w,s,a,side,g]=m.data.subarray(i,i+9);if(p===0)continue;const n=p===5?normal((x+.66)*.2,y*2,side*.7):[0,0,1],c=p===5?colors.pearl:p===7?colors.amber:colors.rose;put([x,y,z],n,c,p===1?20:p===2||p===3?21:p===4?22:p===5?23:p===6?24:25,w,a,p,g);}
  // Opercular arch and overlapping scale glints follow the existing body.
  line(t=>[-1.08+.12*Math.sin(t*Math.PI),.27-.54*t,.24],23,colors.rose,.58);
  for(let row=0;row<7;row++)for(let col=0;col<19;col++){const x=-1.10+col*.062,y=-.19+row*.06,q=((x+.66)/1.02)**2+(y/.34)**2;if(q<.85)put([x,y,.265*Math.sqrt(1-q)+.005],normal((x+.66)*.2,y*2,.7),colors.ice,23,(x+1.7)/2.1,.30);}
 }
 return {species,seed,detail,data:new Float32Array(data),count:data.length/16,parts,spacing:step};
}
const api={generate,SPECIES,STRIDE:16};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AnimalGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
