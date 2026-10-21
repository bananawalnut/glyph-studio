'use strict';
const A=require('node:assert/strict'),E=require('./dist/scene.js');
for(const shape of E.SHAPES){
 const result=E.compile(`loop 12s; seed 42\nbody: shape ${shape}; radius 1; tube 0.35; rotate y 1\nfield: glyphs; on body; pattern grid; count 200; flicker 8\nlabel: glyphs; on body; pattern band; text "DATA / "; flow -1\nroute: glyphs; on body; pattern curve; flow -1; text "ROUTE / "\ndust: glyphs; on body; pattern scatter; count 80`);
 A.equal(result.ok,true,JSON.stringify(result));const s=result.scene;
 A.deepEqual(E.compile(E.toScript(s)).scene,s,'contract round trip');
 A.deepEqual(E.sample(s,0),E.sample(s,1),'loop closure');
 for(const q of E.sample(s,.3)){A.ok(q.xyz.every(Number.isFinite),'finite mapping');A.equal(typeof q.char,'string','negative flow character lookup');}
 const staticScene=structuredClone(s);staticScene.surfaces[0].motion.turns=[0,0,0];
 for(const id of ['field','dust'])A.deepEqual(E.sample(staticScene,0).filter(q=>q.id===id).map(q=>q.xyz),E.sample(staticScene,.4).filter(q=>q.id===id).map(q=>q.xyz),'fixed geometry with glyph flicker');
 const band=E.sample(staticScene,.1).filter(q=>q.id==='label');
 for(const q of band){const [x,y,z]=q.xyz,h=s.surfaces[0];if(shape==='sphere')A.ok(Math.abs(Math.hypot(x,y,z)-h.radius)<1e-9);if(shape==='torus')A.ok(Math.abs(Math.hypot(Math.hypot(x,z)-h.radius,y)-h.tube)<1e-9);if(shape==='cylinder')A.ok(Math.abs(Math.hypot(x,z)-h.radius)<1e-9);if(shape==='plane')A.equal(z,0);if(shape==='wave')A.ok(Math.abs(z-h.depth*.14*Math.sin((x/h.width+.5)*Math.PI*2)*Math.cos((y/h.height+.5)*Math.PI*2))<1e-9);}
 console.log('PASS',shape,'mapping, patterns, flow, loop and round trip');
}
const original=E.compile(E.EXAMPLE).scene;delete original.surfaces;E.validate(original);A.deepEqual(E.sample(original,.3),E.sample(E.compile(E.toScript(original)).scene,.3),'old recipes without surfaces retain geometry');
for(const script of ['x: glyphs; on missing','body: shape sphere\nx: glyphs; on body; rotate y 1','body: shape torus; radius 0.2; tube 0.5\nx: glyphs; on body','body: shape plane\nx: glyphs; on body; uv [[2,0],[0,0],[0,0],[0,0]]'])A.equal(E.compile(script).ok,false,'invalid mapping rejected');
const s=E.compile(E.SURFACE_EXAMPLE).scene,before=E.sample(s,.3).filter(q=>q.id==='rain');s.surfaces[0].shape='plane';A.deepEqual(E.sample(s,.3).filter(q=>q.id==='rain'),before,'changing a host does not affect free objects');
console.log('PASS legacy compatibility, invalid host/UV/motion rejection, free-object independence');
