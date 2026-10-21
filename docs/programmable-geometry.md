# Programmable geometry and behavior

Open `/math` for the live code-defined geometry and component study. Presets are convenience data; application source is the full authoring interface. There is no required shape enum or mathematical expression parser in this layer. Author functions, numerical solvers, imported math code and Wasm writers in the repository as normal application modules. The restricted studio prompt adapter can discover this API through `glyph_studio_library(kind:"program")`; executing arbitrary generated source through that adapter is not implemented.

Load `glyph-player.js` and optional `glyph-program.js`; add `glyph-flow.js` for contracts, components and handoffs. No framework dependency is needed.

```js
const {Surface, Path, Layer, Composite, Program, math} = GlyphProgram;
const shell = new Surface((u, v, {phase, params}) => {
  const r = 1 + params.amplitude * Math.sin(v)**2
    * Math.cos(5*u + math.TAU*phase);
  return [r*Math.sin(v)*Math.cos(u), r*Math.cos(v),
          r*Math.sin(v)*Math.sin(u)];
}, {u:[0, math.TAU], v:[0.08, Math.PI-0.08], wrapU:true});
const ribbon = new Path((t, {phase}) =>
  [t+phase*math.TAU, Math.PI/2+0.3*Math.sin(3*t)],
  {dimensions:2, domain:[0,math.TAU], closed:true}).on(shell);
const root = new Composite([
  new Layer('skin', shell, {rows:30, columns:56, size:8, opacity:0.45}),
  new Layer('signal', ribbon, {count:160, text:'CUSTOM / ', color:'cyan'})
], {transform:ctx => math.rotateY(ctx.phase*math.TAU)});
const authored = new Program({root, params:{amplitude:0.22}, seed:42});
document.querySelector('glyph-program').program = authored;
```

`Surface.at(u,v,ctx)` takes actual authored domain coordinates. `du` and `dv` callbacks optionally provide analytic derivatives; otherwise `.derivative('u'|'v',u,v,ctx)` uses central differences with one-sided boundaries and wrapped periodic domains. `.normal` normalizes the cross product of derivatives. Singular points reject; change sampling or supply suitable analytic derivatives. Numeric derivatives are approximations. `wrapU`/`wrapV` omit duplicate endpoint samples, not prove seam continuity.

`Path.at(t,ctx)` evaluates a 3D curve or a 2D UV curve (`dimensions:2`). `.on(surface)` maps UV coordinates onto a surface; `.tangent(t,ctx)` returns a normalized analytic or finite-difference tangent. `cubic([p0,p1,p2,p3])` supplies a 2D UV or 3D cubic evaluator and analytic tangent. A `closed` curve omits duplicate endpoints when sampled; its author owns closure. Nonperiodic functions remain nonperiodic at phase 1.

A `Layer` supplies sampling resolution, material/glyph style, optional point deformation and its own transform. `Composite` nests layers/composites and mat4 transforms. Parent matrices multiply before child matrices; coordinates are column vectors and matrices are column-major. Transform callbacks and geometry callbacks receive `{phase,time,duration,seed,params,random(key)}`. Params are frozen finite plain data; `random(key)` is seeded and keyed. Use these inputs instead of wall clocks or unseeded randomness when deterministic replay is wanted. Functions may close over imported modules, static domain data and solver instances; reproducibility then requires preserving those dependencies too. Pure functions are a convention, not an enforced proof or security sandbox.

`Program.sample(phase)` returns `{descriptor,buffers,context}`. Each buffer is interleaved float32 `[x,y,z,index,u,v]`. Buffers are reused: copy them before retaining a frame across another sample. `renderDescriptor` is an internal glyph/material/camera carrier and does **not** encode the program geometry. Do not save it as a scene preset. Reuse the authored source plus params, or export `program.snapshot(phase)` as an explicit single point frame. That frame is not a time-varying scene recipe. Existing preset JSON and v2 scene recipes remain unchanged.

`program.at(layerId,u,v,phase)` evaluates exact authored coordinates and nested transforms for an attachment, independent of tessellation. Under `<glyph-program>`, `<glyph-anchor object="skin" u="0" v="1.57"><button>…</button></glyph-anchor>` retains real native HTML interactions. Raw buffer layers require an explicit world-space `position` anchor because they have no continuous evaluator. Offscreen/hidden playback, reduced motion, pause, seek, disconnection and context recovery use the existing player lifecycle. Program errors emit `glyph-error` and pause. The last valid buffers remain intact on an invalid sample. `.params = data` resamples without resetting playback and rejects a failing update atomically.

## Direct buffers and performance

```js
const geometry = new GlyphProgram.BufferGeometry(count, (out, ctx) => {
  // A numerical solver, worker result or custom Wasm module can fill out directly.
  // Six float32 values per instance: x, y, z, index, u, v.
  for (let i=0; i<count; i++) out.set([i/count, 0, 0, i, i/count, 0], i*6);
});
```

`GlyphPlayer.createRenderer(canvas).setPointBuffers(descriptor, map)` is the low-level rendering entry. It uploads supplied world-space instance positions through `bufferSubData` when dimensions are stable. It reuses the glyph atlas, shader program and instanced draw pipeline; it does not rebuild these on every frame. Materials and glyph descriptors are fixed per compiled program. Sampling custom functions runs on the CPU; WebGL draws the glyphs. The existing Rust/Wasm geometry compiler continues to handle built-in recipes. Custom callbacks are not automatically compiled to Wasm or shaders. A custom Wasm writer can fill this buffer ABI directly; the test suite exercises this using the included geometry Wasm module. Buffer writers must finish synchronously; publish worker/async results before sampling. Choosing a GLSL/WebGPU backend for a particular evaluator requires a separate implementation and measurement.

Default program budget is 65,536 points, configurable up to 131,072 total, at most 65,536 per layer and 16 material layers. Budgets are checked before evaluating user functions. These are resource bounds, not shape restrictions. Mark `dynamic:false` only when geometry/deformation is independent of time; it caches the sampled layer until params change. Function-valued ancestor/layer transforms still update. Dynamic layers use a staging buffer so invalid coordinates do not partially publish. Finite checks and CPU sampling have real cost: adjust sample resolution, profile your evaluator and use raw writers for dense geometry. Sample audits test finite values over selected frames; they are not proofs of continuity, loop closure, physics or performance.

## Custom component semantics

`GlyphFlow.ComponentInterface` accepts programmer-named typed methods and arbitrary pure handlers returning `{state,result}`. An organizer `(state,bounds)=>marks` owns its content layout. The lab’s `sculpt(number)` method updates deformation amplitude only after an animated input arrives, then a custom organizer and transition express the changed state.

```js
node.definition = {
  interface: new GlyphFlow.ComponentInterface({
    state: stateSchema,
    methods: {
      sculpt: {input:numberSchema, output:numberSchema,
        handle:(state, amplitude)=>({state:{...state,amplitude}, result:amplitude})}
    }
  }),
  initial: {amplitude:0.2},
  organize: (state,bounds)=>myParametricLayout(state,bounds),
  motion: {type:'custom', duration:1.8,
    sample:(from,to,{progress:t,seed})=>myTransition(from,to,t,seed)}
};
```

Custom transitions return finite `{x,y,z?}` for normalized progress. The framework preserves mark identity, labels and metadata, fixes the exact start/end points, and falls back to the destination plus `glyph-flow-error` if sampling fails. Callbacks are application code, not function strings in saved flow documents.

For declarative configurations, `registry.register(kind,id,factory,description,paramsContract)` optionally declares a contract for `spec.params`. Factories receive frozen validated data. Catalogs expose the parameter contract. Built-ins reject undeclared params. Register corresponding application implementations on the bridge and browser when sharing persisted documents; arbitrary function bodies still do not travel in JSON. Existing handlers, layouts, exports and flow documents keep their current behavior.

The source modules in `player/program.js`, `player/program-component.js` and `dist/math-examples.js` are the extension points. `node test-program.cjs` checks domains, derivatives, mapped paths, nested transforms, direct buffers, atomic finite validation, cache invalidation, authored loop examples, custom transitions and parameter contracts. `/math-check.html` checks real GPU/Canvas rendering, native anchors, lifecycle, custom component receipt-before-commit and error recovery.
