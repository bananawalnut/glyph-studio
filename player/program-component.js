/* Program content is trusted application code, assigned as an object, never source text. */
(function(root){'use strict';
const A=root.GlyphProgram,P=root.GlyphPlayer,G=P.geometry;
class GlyphProgramElement extends P.GlyphSceneElement{
 set program(value){const candidate=value instanceof A.Program?value:new A.Program(value);P.validate(candidate.renderDescriptor);const first=candidate.sample(0);this._program=candidate;this._buffers=first.buffers;this._scene=candidate.renderDescriptor;this._frame=0;if(this.isConnected)this.makeRenderer();}
 get scene(){throw Error('Program functions are not scene JSON. Export .program.snapshot(phase) for a point frame, or reuse the authored source.');}
 set scene(value){throw Error('Assign .program to a glyph-program element.');}
 get program(){return this._program;}
 set params(value){if(!this._program)throw Error('Assign a program first.');const previous=this._program.params;try{this._program.setParams(value);this._program.sample(this._frame/this.total);}catch(e){this._program.setParams(previous);throw e;}this.draw();}
 get params(){return this._program?structuredClone(this._program.params):null;}
 createEngine(canvas){const engine=P.createRenderer(canvas,{renderer:this.getAttribute('renderer'),transparent:true});engine.setPointBuffers(this._scene,this._buffers);return engine;}
 draw(){if(!this._program||!this.engine)return;const phase=this._frame/this.total;try{const next=this._program.sample(phase);this._buffers=next.buffers;this.engine.setPointBuffers(this._scene,next.buffers);this.engine.render(this._scene,phase);this.positionAnchors(phase);}catch(e){this.pause();this.error(e);}}
 positionAnchors(phase){if(!this._program)return;const rect=this.size||this.getBoundingClientRect();for(const el of this.anchors){try{const id=el.getAttribute('object');let xyz;if(el.hasAttribute('u'))xyz=this._program.at(id,Number(el.getAttribute('u')),Number(el.getAttribute('v')||0),phase);else xyz=(el.getAttribute('position')||'0 0 0').trim().split(/[ ,]+/).map(Number);if(xyz.length!==3||!xyz.every(Number.isFinite))throw Error('Invalid attachment');const p=G.project(this._scene,xyz,rect.width,rect.height);el.inert=!p;el.style.visibility=p?'visible':'hidden';if(p)el.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%)`;}catch{el.inert=true;el.style.visibility='hidden';}}}
 // Point programs have their own JS/typed-buffer compiler. Built-in Wasm recipes remain separate.
 get supportsWasm(){return false;}
 makeRenderer(){super.makeRenderer();if(this.engine)this.dataset.geometry='program';}
}
if(!customElements.get('glyph-program'))customElements.define('glyph-program',GlyphProgramElement);
A.GlyphProgramElement=GlyphProgramElement;
})(globalThis);
