'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),E=require('./dist/scene.js'),G=require('./player/geometry.js');
(async()=>{
 const instance=(await WebAssembly.instantiate(fs.readFileSync(__dirname+'/dist/glyph-core.wasm'))).instance;A.equal(instance.exports.memory.buffer.byteLength,131072);const wasm=G.wasmCompiler(instance.exports);
 const scenes=Object.values(E.EXAMPLES).map(s=>E.compile(s).scene);
 for(const shape of E.SHAPES){const s=E.compile(E.SURFACE_EXAMPLE).scene;s.surfaces[0].shape=shape;for(const o of s.objects.filter(o=>o.geometry.type==='mapped'))o.geometry.count=1400;scenes.push(s);}
 let points=0;
 for(const s of scenes)for(const o of s.objects){const p=G.parameters(o,s),js=G.generate(p),rs=wasm(p),reference=E.objectPoints(o,s.seed,0,s.duration,s.surfaces||[]);A.equal(rs.length,js.length);A.equal(js.length,reference.length*6);for(let i=0;i<js.length;i++){A.ok(Math.abs(js[i]-rs[i])<2e-6,`Rust parity ${o.id} at ${i}`);}for(let i=0;i<reference.length;i++){for(let k=0;k<3;k++)A.ok(Math.abs(reference[i].xyz[k]-G.world(o,s,Array.from(js.subarray(i*6,i*6+3)),0)[k])<2e-6,`recipe parity ${o.id}`);A.equal(js[i*6+3],reference[i].index);}points+=reference.length;}
 for(const s of scenes){const o=s.objects.find(o=>o.geometry.type==='mapped')||s.objects[0],xyz=[.4,-.2,.8];for(const phase of [0,.1,.5,.9,1]){const t=o.geometry.type==='mapped'?s.surfaces.find(h=>h.id===o.geometry.host):o;const expected=E.rotate(xyz.map(v=>v*t.transform.scale),t.motion.turns.map((v,k)=>v*G.mod(phase,1)*G.TAU+t.transform.rotation[k])).map((v,k)=>v+t.transform.position[k]+(k===1?Math.sin(G.mod(phase,1)*G.TAU)*t.motion.bob:0));const got=G.world(o,s,xyz,G.mod(phase,1));got.forEach((x,k)=>A.ok(Math.abs(x-expected[k])<1e-12));}}
 const invalid=new Float64Array(32);invalid[0]=99;A.throws(()=>wasm(invalid),/failed/);const module=new WebAssembly.Module(fs.readFileSync(__dirname+'/dist/glyph-core.wasm'));A.deepEqual(WebAssembly.Module.imports(module),[]);
 console.log(`PASS Rust/Wasm and JS geometry parity with v2 renderer: ${points} points, all shapes/patterns, legacy presets, maximum counts, transform order and loop phases`);
})().catch(e=>{console.error(e);process.exitCode=1;});
