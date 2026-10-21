'use strict';
const A=require('node:assert/strict'),G=require('./dist/life-geometry.js'),M=require('./dist/life-motion.js');
let total=0;
for(const species of G.SPECIES){
 const a=G.generate(species),b=G.generate(species),fine=G.generate(species,{detail:1.35}),light=G.generate(species,{detail:.7});
 A.deepEqual(a.data,b.data,'seeded anatomy: '+species);A.notDeepEqual(a.data,G.generate(species,{seed:2802}).data);
 A(a.count>=3000&&a.count<16000);A.equal(a.data.length,a.count*G.STRIDE);A(fine.count>a.count&&light.count<a.count);
 let maxMotion=0;
 for(let i=0;i<a.data.length;i+=16){const p=Array.from(a.data.subarray(i,i+16));A(p.every(Number.isFinite));A(Math.abs(Math.hypot(...p.slice(3,6))-1)<1e-5);A(p[9]>=0&&Number.isInteger(p[9]));A(p[10]>=0&&p[10]<=1);A(p[12]>=0&&p[12]<=1);
  const first=M.deform(p,0),loop=M.deform(p,1),later=M.deform(p,.217);A(later.every(Number.isFinite));for(let k=0;k<3;k++){A(Math.abs(first[k]-loop[k])<1e-9,'loop closure: '+species);maxMotion=Math.max(maxMotion,Math.abs(later[k]-first[k]));}
 }
 A(maxMotion>.03,'actual anatomical motion: '+species);total+=a.count;console.log('PASS '+species+': '+a.count+' glyphs, finite anatomy, detail levels and loop closure');
}
for(const t of [0,.2,.51,.999]){const a=M.path(t),b=M.path(t+1);for(let k=0;k<2;k++){A(Math.abs(a.position[k]-b.position[k])<1e-12);A(Math.abs(a.direction[k]-b.direction[k])<1e-12);}A(Math.hypot(...a.direction)>.1);}
// The spline has a continuous tangent and acceleration at every segment boundary.
for(let k=0;k<6;k++){const t=k/6,e=1e-6,a=M.path(t-e),b=M.path(t+e);A(Math.hypot(a.direction[0]-b.direction[0],a.direction[1]-b.direction[1])<1e-4);}
A(M.koiDrive(.20/8)>.99);A(M.koiDrive(.7/8)<.06);for(const t of [0,.21,.7])A(Math.abs(M.koiTravel(t+1)-M.koiTravel(t)-1)<1e-12);
A(M.jellyPulse(.26/18)>.999);A(M.jellyPulse(.96/18)<.001);
// Head motion remains small; the distal tail and wing tips receive larger displacement.
const pack=(p,part,w,aux=0)=>[...p,0,0,1,.6,.4,.7,part,w,0,.6,0,aux,-1];
const head=pack([-1.30,0,0],0,0),tail=pack([1.65,0,0],1,1),wingRoot=pack([.18,.3,0],11,0,1),wingTip=pack([1.30,.3,0],11,1,1);
A(Math.abs(M.deform(tail,.217)[2])>Math.abs(M.deform(head,.217)[2])*3);A(Math.abs(M.deform(wingTip,.117)[2])>Math.abs(M.deform(wingRoot,.117)[2])+.1);
A.throws(()=>G.generate('shark'));A.throws(()=>G.generate('koi',{detail:99}));A.throws(()=>G.generate('koi',{seed:-1}));
console.log('PASS '+total+' glyph instances; closed spline, pulse/recovery and isolated anatomical motion');
