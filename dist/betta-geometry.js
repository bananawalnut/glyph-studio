/* A separate procedural study. It does not extend or mutate v2 scene recipes. */
(function(root){'use strict';
const TAU=Math.PI*2,CHARS='×+#0H.:*';
function hash(a,b=0,c=0){let x=Math.imul(a+1,374761393)^Math.imul(b+1,668265263)^Math.imul(c+1,1442695041);x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;}
const random=(a,b,c=0)=>hash(a,b,c)/4294967296;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function cubic(p,t){const a=1-t;return [0,1].map(k=>a*a*a*p[0][k]+3*a*a*t*p[1][k]+3*a*t*t*p[2][k]+t*t*t*p[3][k]);}
function patch(inner,outer){const a=[],b=[];for(let i=0;i<=48;i++){a.push(cubic(inner,i/48));b.push(cubic(outer,i/48));}return [...a,...b.reverse()];}
function inside(polygon,x,y){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if(((a[1]>y)!==(b[1]>y))&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
const DORSAL=patch([[-1.04,.20],[-.55,.43],[.17,.37],[.50,.08]],[[-1.04,.20],[-.34,1.24],[.42,1.04],[.50,.08]]);
const ANAL=patch([[-1.03,-.19],[-.55,-.36],[.12,-.31],[.52,-.10]],[[-1.03,-.19],[-.77,-1.21],[.25,-1.17],[.66,-.13]]);
const PECTORAL=patch([[-.96,.03],[-.76,.09],[-.57,.03],[-.42,-.10]],[[-.96,.03],[-.80,-.64],[-.24,-.67],[-.42,-.10]]);
function tailRadius(theta){return 1.66*(1+.045*Math.cos(theta*5)+.025*Math.cos(theta*11));}
function generate({seed=2801,spacing=.052}={}){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(spacing)||spacing<.035||spacing>.09)throw Error('Invalid study seed or spacing');
 const out=[],parts={};
 // xyz, part, membrane distance, seed, alpha, normal side, glyph override.
 const put=(x,y,z,part,weight,alpha,side=1,glyph=-1)=>{const id=out.length/9;out.push(x,y,z,part,weight,random(seed,id,part),alpha,side,glyph);parts[part]=(parts[part]||0)+1;};
 for(let row=0;row<78;row++)for(let col=0;col<110;col++){const n=random(seed,row*110+col,79);if(n>.20)continue;put(col/109*2-1,row/77*2-1,0,0,0,.012+.035*Math.pow(random(seed,col,row),6));}
 const scan=(part,fn)=>{let row=0;for(let y=-1.77;y<=1.78;y+=spacing,row++){let col=0;for(let x=-1.78;x<=2.15;x+=spacing*.89,col++){const sample=fn(x,y,col,row);if(!sample)continue;const [z,w,alpha,side=1,glyph=-1]=sample;put(x+(row%2)*spacing*.055,y,z,part,w,alpha,side,glyph);}}};
 scan(1,(x,y,col,row)=>{const dx=x-.29,dy=y+.01,theta=Math.atan2(dy,dx),r=Math.hypot(dx,dy),R=tailRadius(theta);if(theta< -1.27||theta>1.27||r<.08||r>R)return;const u=r/R,edge=clamp((1-u)*13),vein=Math.pow(.5+.5*Math.cos(theta*29-r*.8),6),fade=(.23+.28*vein+.14*Math.max(0,Math.sin(theta*2)))*edge;if(u>.88&&random(seed,col,row)>.78)return;return [.03*Math.sin(theta*8)*u,u,fade];});
 scan(2,(x,y)=>{if(!inside(DORSAL,x,y))return;const w=clamp((y-.18)/.67),rib=Math.pow(.5+.5*Math.sin((x+.9)*34+y*8),6);return [.035+.05*Math.sin(x*7)*w,w,(.23+.30*rib)*(1-.22*w)];});
 scan(3,(x,y)=>{if(!inside(ANAL,x,y))return;const w=clamp((-y-.19)/.72),rib=Math.pow(.5+.5*Math.sin((x+.9)*27-y*6),6);return [-.025+.065*Math.sin(x*6)*w,w,.20+.25*rib];});
 // A pair of narrow ventral streamers under the head.
 for(let strand=0;strand<2;strand++)for(let i=0;i<13;i++){const t=i/12;put(-1.06+.20*t+strand*.07,-.18-.55*t,.04+strand*.02,4,t,.40*(1-t*.7));}
 for(const side of [-1,1])scan(5,(x,y)=>{const t=(x+.66)/1.02,height=.345*(1-.17*t),q=t*t+(y/height)**2;if(q>1)return;if(Math.hypot(x+1.36,y-.09)<.065)return;const normal=Math.sqrt(1-q),rim=Math.pow(clamp(y/height*.5+.5),3),shade=.37+.38*rim+.14*normal;return [side*.265*normal,clamp((x+1.7)/2.1),shade,side];});
 scan(6,(x,y)=>{if(!inside(PECTORAL,x,y))return;const w=clamp((-y+.05)/.55);return [.30+.055*w,w,.25];});
 // One restrained eye glint and two mouth marks, still made of glyphs.
 put(-1.367,.092,.272,7,0,.80,1,6);put(-1.407,.104,.264,7,0,.45,1,1);
 put(-1.66,-.025,.06,5,0,.58,1,1);put(-1.648,-.069,.06,5,0,.32,1,6);
 return {data:new Float32Array(out),parts,count:out.length/9,seed,spacing};
}
function deform(point,phase){const [x0,y0,z0,part,w]=point,t=((phase%1)+1)%1*TAU;let x=x0,y=y0,z=z0;
 if(part===1){const a=Math.atan2(y+.01,x-.29);z+=Math.pow(w,1.5)*(.19*Math.sin(t*3-w*4+a*2)+.055*Math.sin(t*2+a*9));y+=.035*w*w*Math.sin(t*2+a*4);x+=.025*w*Math.cos(t*2+a*3);}
 if(part===2||part===3){z+=w*.12*Math.sin(t*3-x*4+(part===2?0:1.2));y+=(part===2?1:-1)*w*.025*Math.sin(t*2+x*5);}
 if(part===4)z+=.10*w*Math.sin(t*3+y*4);
 if(part===6){z+=.16*w*Math.sin(t*4);y+=.04*w*Math.cos(t*4);}
 if(part!==0){z+=.035*Math.sin(t*2+(x+1.7)*1.6);y+=.035*Math.sin(t);x+=.045*Math.sin(t);}
 return [x,y,z];
}
const api={generate,deform,CHARS,tailRadius};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BettaGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
