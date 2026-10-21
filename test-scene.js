'use strict';
const A=require('node:assert/strict'),E=require('./dist/scene.js');
for(const [name,script]of Object.entries(E.EXAMPLES)){
 const r=E.compile(script);A.equal(r.ok,true,JSON.stringify(r));
 A.deepEqual(E.compile(E.toScript(r.scene)).scene,r.scene,'directive/JSON round trip');
 A.deepEqual(E.sample(r.scene,0),E.sample(r.scene,1),'loop closure');
 A.deepEqual(E.sample(r.scene,.25),E.sample(r.scene,.25),'direct deterministic frame sampling');
 console.log('PASS',name);
}
const s=E.compile(E.EXAMPLE).scene,original=structuredClone(s);
s.objects[0].motion.turns=[2,-1,1];
for(const id of ['rain','ribbon','signal'])A.deepEqual(E.sample(s,.33).filter(p=>p.id===id),E.sample(original,.33).filter(p=>p.id===id),'independent object motion');
const sphere=original.objects.find(o=>o.id==='shell');sphere.motion.turns=[0,0,0];
const p=E.objectPoints(sphere,42,0,12),q=E.objectPoints(sphere,42,.4,12);
A.deepEqual(p.map(x=>x.xyz),q.map(x=>x.xyz),'flicker keeps geometry stationary');
A.notDeepEqual(p.map(x=>x.char),q.map(x=>x.char),'flicker changes symbols');
const surface=original.objects.find(o=>o.id==='signal');
for(const x of E.objectPoints(surface,42,.3,12))A.ok(Math.abs(Math.hypot(...x.xyz)-surface.geometry.radius)<1e-9,'surface text stays on sphere');
const b=original.objects.find(o=>o.id==='ribbon');
A.deepEqual(E.bezier(b.geometry.points,0),b.geometry.points[0]);A.deepEqual(E.bezier(b.geometry.points,1),b.geometry.points[3]);
A.deepEqual(E.objectPoints(b,42,0,12).map(x=>x.xyz),E.objectPoints(b,42,.4,12).map(x=>x.xyz),'Bezier flow does not move curve');
for(const script of ['bad: sphere; explode 5','x: sphere\nx: sphere','x: rain; rotate y 1','x: sphere; flow 1','x: bezier; points [[0,0,0]]'])A.equal(E.compile(script).ok,false,'reject invalid directive');
const fractional=E.compile('x: sphere; rotate y 0.5');A.equal(fractional.ok,true);A.equal(fractional.warnings.length,1);
const altered=structuredClone(s);altered.objects[0].transform={position:[.1,.2,.3],rotation:[.2,.3,.4],scale:1.2};altered.objects[0].visible=false;altered.objects[0].glyphs.characters='ABC';altered.camera.yaw=.2;altered.fps=24;A.deepEqual(E.compile(E.toScript(altered)).scene,altered,'full transform round trip');
const unknown=structuredClone(s);unknown.objects[0].motion.surprise=1;A.throws(()=>E.validate(unknown),/unsupported field/);
console.log('PASS motion isolation, stationary flicker, surface constraint, Bezier endpoints/flow, invalid-input rejection, seam warnings, transforms');
