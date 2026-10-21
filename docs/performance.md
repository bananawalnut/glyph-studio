# Local validation snapshot — 2026-10-20

Measured on an arm64 Mac (M4 Pro) in Chromium 155. These are local measurements, not cross-device guarantees.

## Browser render-call CPU time

512 × 512 backing canvases, fixed scene/frame values, 5 warm-up batches followed by 30 measured batches of 5 calls. Geometry/atlas uploads happen before the measured WebGL calls. GPU completion/readback is synchronized outside the CPU timer.

| Recipe | Instances | Canvas p50 / p95 | WebGL2 p50 / p95 | WebGL draw calls |
| --- | ---: | ---: | ---: | ---: |
| Zenith | 424 | 2.600 / 4.320 ms | 0.020 / 0.040 ms | 2 |
| Eight dense torus layers | 11,232 | 18.500 / 21.720 ms | 0.020 / 0.040 ms | 8 |

The short WebGL calls approach browser timer resolution. This demonstrates greatly reduced main-thread submission work. It does **not** establish those ratios as FPS improvements, nor measure total GPU time, compositing, battery use or mobile behavior. Both renderers draw the same recipes; text antialiasing, particle glow and transparent overlap can differ.

## Browser geometry compilation

One 1,404-point torus template, median of 7 warmed batches of 200 compiles:

- JavaScript: 0.0745 ms per compile.
- Rust/Wasm: 0.0175 ms per compile (about 4.3× faster).

This work occurs on scene load/edit. Neither compiler runs in the WebGL animation loop. The benchmark was warmed; the Wasm module had already loaded for parity checks, so its reported fetch time is not a cold-network measurement. `npm run bench:geometry` additionally benchmarks 15 shape/pattern cases in Node; timings and ratios vary with the runtime and workload.

## Player size

At this snapshot, the dependency-free player is 29,938 raw bytes / 10,811 gzip bytes. Optional Rust/Wasm is 3,323 raw bytes / 1,564 gzip bytes, with fixed 128 KiB linear memory. Check `dist/player-sizes.json` after rebuilding. A basic embed omits Wasm and does not load the editor, schema compiler, Hermes, model or local bridge.

## Verification

- All existing scene/surface/compiler/bridge/agent tests pass.
- JavaScript, Rust/Wasm and the original engine agree on 34,670 sampled geometry points within float32 precision, including every supported shape and pattern, legacy recipes, maximum counts and transform order.
- Browser checks pass for all six presets, actual GPU pixel output, exact full-loop pixel closure, WebGL context loss/restoration, Canvas-only fallback, anchored native button activation, paused frames and disconnect/reconnect cleanup.
- The component demo's native HTML button was activated through browser UI; the existing Zenith tool renders with the new backend and retains its local Hermes prompt connection.

Reproduce using `npm test`, `npm run bench:geometry`, and the two buttons at `/benchmark.html`.


## Code-defined programs (v0.10.0)

An optional `glyph-program.js` module adds arbitrary CPU evaluators and direct typed-buffer writers. The integration adds a small point-buffer hook to the base player and custom transition/strategy support to optional flow. Raw/gzip sizes are recorded in `dist/player-sizes.json`; presets still load without the program module.

A local Node sampling check of the 1,950-point harmonic example (120 phases, same process, no explicit warm-up) measured p50 0.747 ms and p95 1.091 ms. This measures CPU sampling only, on this machine during development; it includes JS allocation/validation and excludes upload, GPU, browser layout/compositing and any FPS claim. Re-run your actual authored functions and resolutions. The browser fixture verifies that stable-dimension frame updates reuse GPU buffers and the glyph atlas; visual output, Canvas fallback, context recovery and typed receiving behavior are tested separately.
