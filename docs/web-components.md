# Embed the player

Copy `dist/glyph-player.js` and a v2 scene JSON recipe to your website. This player has no framework, editor, Hermes, model, or Node dependency in the visitor's browser. Its canvas is transparent, so it can sit beside or over your own content.

```html
<script src="/glyph-player.js" defer></script>
<glyph-scene src="/zenith.scene.json" style="width: 32rem; max-width: 100%">
  <glyph-anchor object="shell" position="1.3 0 0">
    <button type="button">Open a conversation</button>
  </glyph-anchor>
</glyph-scene>
```

Buttons, links, inputs, and text remain real HTML. Style them with your page's CSS and attach normal event listeners. They retain native focus and accessibility behavior. Supply an accessible name on the scene when it conveys meaning, or mark a decorative scene `aria-hidden="true"` only when it contains no interactive content.

`<glyph-anchor>` is an upright DOM overlay whose position follows a named object's transform. `position` supplies local XYZ coordinates. For mapped objects, optional `u="0.25" v="0.5"` anchors a point on the host surface. Anchors do not implement mesh occlusion, arbitrary perspective deformation of DOM content, or pointer interactions with the canvas itself. Other slotted HTML can use its own CSS layout over the scene.

## Component API

| Attribute / property | Behavior |
| --- | --- |
| `src="scene.json"` | Fetch a v2 recipe over HTTP(S); browser CORS rules apply |
| `.scene = recipe` | Validate and clone a recipe supplied by your application |
| `.scene` | Read a clone; use the setter to publish edits |
| `paused` | Boolean attribute; no animation advancement |
| `frame="30"` / `.seek(30)` | Select a deterministic frame, wrapping at the loop length |
| `.frame` | Current zero-based frame |
| `.play()` / `.pause()` | Set playback; honors reduced motion |
| `renderer="canvas"` | Force the Canvas 2D compatibility path |
| `geometry="wasm"` | Load the optional Rust compiler; JavaScript is the default |
| `.stats` | Renderer, geometry backend, visible instance count and draw-call count |
| `glyph-ready` event | Scene/player ready, with `.detail` containing stats; fires again after Wasm loads |
| `glyph-error` event | Recoverable loading/validation error in `.detail.message` |

CSS `::part(canvas)` and `::part(content)` expose the two visual layers. Size the host with normal CSS; the default aspect ratio is 1. GPU glyphs scale with canvas width using the same sizing convention as the v2 renderer.

Playback uses one shared `requestAnimationFrame` scheduler for connected components. Offscreen components and hidden documents stop advancing. Reduced-motion preference renders a static frame. Disconnection removes observers, scheduling and GPU resources; reconnecting rebuilds them. WebGL context restoration rebuilds the last scene, including a paused frame. Each scene owns one graphics context; use multiple anchors in one scene for a collection of controls, rather than creating hundreds of canvases.

The component accepts all existing v2 recipes, including legacy objects without `surfaces`. There is no stored-scene migration. Floating-point GPU calculations and atlas text rasterization can differ slightly from Canvas. Transparent GPU layers composite in recipe order, rather than the legacy renderer's per-point depth sort; use Canvas when that ordering is important for an overlapping composition. Anchors remain readable DOM overlays regardless of surface depth.

## Optional Rust/Wasm

Place `dist/glyph-core.wasm` alongside `glyph-player.js` and opt in:

```html
<glyph-scene src="scene.json" geometry="wasm"></glyph-scene>
```

Wasm compiles static geometry buffers on scene load/edit. It is not called for each animation frame: GPU shaders handle transforms, band flow, glyph selection, rain and particle pulses. Fetch/instantiation adds startup work, so the default JavaScript compiler keeps the smallest initial payload. If Wasm cannot load, JavaScript rendering continues and the component emits `glyph-error`.

The Rust crate uses `no_std`, no dependencies, a bounded 128 KiB linear memory and a small raw ABI. No wasm-bindgen glue is shipped. The generated module is included in Git so a normal `npm run build` does not require Rust. To rebuild it:

```bash
rustup target add wasm32-unknown-unknown
npm run build:wasm
npm test
```

ABI 1 uses a 32-element f64 parameter buffer and emits interleaved f32 `[x, y, z, index, u, v]` records into a fixed buffer. The wrapper copies the result before the next call, so layers never retain views into overwritten memory. Surface angles use a bounded polynomial rather than a general-purpose math library; geometry parity is verified against the original engine within float32 precision.

## Check size and performance

`dist/player-sizes.json` records raw and gzip byte counts. Gzip counts describe compressed payload size; configure compression on your production server to receive that transfer size.

```bash
npm run bench:geometry
npm run dev
# Open http://127.0.0.1:8788/benchmark.html
```

The browser benchmark compares the original Canvas renderer with WebGL2 at fixed scene/frame/canvas settings, and reports median/p95 JavaScript render-call time. GPU completion is synchronized outside the measured CPU interval. These numbers do not measure total GPU time, browser compositing, FPS, power, or every device. Very short calls are limited by browser timer resolution. Rust template timings are scene-compilation measurements, not animation FPS.

The same page checks every preset, GPU pixel output, exact full-loop closure, context recovery, Canvas fallback, native HTML button activation, anchor movement, paused frames, disconnect/reconnect and browser Wasm parity. `npm test` checks 34,670 sampled points across the original engine, JavaScript template compiler and Rust/Wasm compiler, including all shapes/patterns and maximum counts.

## Current scope

This is a component foundation: one scene element, real HTML overlays and anchored content. It does not yet include a complete widget/design-system library, arbitrary mesh imports, graph topology algorithms, DOM surface warping, a WebGPU backend, or an npm registry release.

Implementation references: [WebGL2 instanced drawing](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawArraysInstanced), [native custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements), and [Rust wasm32 target](https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-unknown-unknown.html). See the [local validation snapshot](performance.md) for measured results and limits.
