# Functional content and animated handoffs

Glyph Flow is an opt-in component layer. Existing `<glyph-scene>` recipes, WebGL2/Rust-Wasm rendering and `<glyph-anchor>` HTML overlays keep their APIs. Add `dist/glyph-flow.js` only on pages that need structured content and animated transfers; it does not load the editor, agents, base player or a framework.

Open `/flow` for the working study: **Source field → Category clusters → Signal index**. The first receiver accepts an array, groups records, and exports an envelope. The next receiver validates that envelope and chooses a helix layout. Drag the obstacle or enable the moving receiver while a chunk is traveling.

## A component is state + a receiving function + a form

```html
<script src="glyph-flow.js" defer></script>
<glyph-flow id="stage" style="height:400px">
  <glyph-node id="source" style="position:absolute;width:240px;height:250px;left:0">
    <h2>Source</h2>
    <button id="send">Send content</button>
  </glyph-node>
  <glyph-node id="destination" style="position:absolute;width:240px;height:250px;right:0">
    <h2>Destination</h2>
  </glyph-node>
</glyph-flow>
```

After the script loads, define each endpoint in application JavaScript:

```js
const source = document.getElementById('source');
const destination = document.getElementById('destination');
const send = document.getElementById('send');
const item = {
  type: 'object',
  properties: { id: { type: 'string' }, title: { type: 'string' } },
  required: ['id', 'title'], additionalProperties: false
};
const rows = { type: 'array', items: item, maxItems: 24 };
const spec = {
  input: rows,
  output: rows,
  initial: [],
  reduce: (state, incoming) => [...state, ...incoming],
  organize: (state, { width, height }) => state.map((row, i) => ({
    id: row.id, label: row.title, x: width / 2, y: 90 + i * 18, z: 0
  })),
  export: state => state
};
source.definition = { ...spec, initial: [{ id: 'one', title: 'Signal' }] };
destination.definition = spec;
send.onclick = () => source.send('destination', source.export(), {
  id: 'first-handoff'
}).then(receipt => console.log(receipt.status)).catch(console.error);
```

The functions are application-supplied JavaScript, without `eval` or generated-code execution. `reduce(state, input)` returns new JSON state. `organize(state, bounds)` returns positioned marks; it does not decide delivery. `export(state)` derives output according to the sender's output contract. Omit export for identity output. Components may use different input/output shapes and completely different reducers and layouts.

Frozen copies of state/input are passed to hooks. Returned state and output are copied and bounded. Hooks should be pure: the runtime prevents mutation of these supplied snapshots, but cannot prove that arbitrary JavaScript avoids external state, time or other side effects. Pure contract checks, canonicalization, reduction and navigation functions are independently testable in `player/flow-core.js`. Formal verification is not implemented.

`organize` runs on state/size changes, not every frame. Each mark has finite pixel coordinates relative to its component, optional `z`, a label up to 120 UTF-16 code units and optional CSS color. A `spin` attribute rotates the visual around its Y axis; this is presentation, independent of content state. The layout limit is 1024 marks per node. Light-DOM buttons, headings and other HTML remain native. A visually hidden status exposes JSON content to assistive technology; use visible HTML/your own state listener for richer accessible presentation.

## Input and output contracts

The contract language is an intentionally small JSON-Schema-shaped subset, not a complete JSON Schema implementation. Unsupported keywords fail at definition time. Supported types are object, array, string, number, integer, boolean and null. Supported keywords are `enum`; `properties`, `required`, `additionalProperties:false`; `items`, `minItems`, `maxItems`; `minLength`, `maxLength`; and `minimum`, `maximum` for numeric types.

Object properties are explicit and closed. Payload/state values must be finite plain JSON, without cycles, functions, reserved prototype keys or class instances. Limits: 64 KiB encoded JSON, depth 16, 8192 visited values and 1024 entries per array; contract nesting is limited to eight. Domain relationships such as `total === rows.length` belong in the reducer, which can reject them before commit.

The input contract and organizer must both accept a receive operation before the state is assigned. A throwing reducer/organizer leaves previous state and revision intact. `.props = value` is a convenience for direct synchronous receive; `.props` and `.value` return a copy of current state, not a live reference.

## Transfer lifecycle

1. Validate output against the sender and input against the receiver, then capture an immutable payload and receiver definition epoch.
2. Animate a glyph representation of that payload through the local flow world. The actual JSON stays intact; glyph trails are visual marks rather than independently delivered fragments.
3. At arrival, recheck the receiver definition and input, run its reducer against its current state, and validate the resulting organizer output.
4. Commit state/revision once, emit a receipt and resolve the transfer promise. Concurrent arrivals are reduced sequentially in arrival order.

Source state is preserved: this is **copy delivery**, not ownership transfer. Use an application action after a successful receipt if the sender should relinquish content. No implicit source removal, cross-component rollback, network delivery or durable transaction is claimed.

An explicit transfer id deduplicates identical in-flight and settled requests within this flow session. Reusing an id with different endpoints/content fails. The receipt ledger is bounded to 256 pending/settled transfers; `reset()` clears it deliberately. Reloading the page also clears it. This is local duplicate protection, not durable exactly-once messaging.

Cancellation, endpoint removal, a changed receiving definition, domain rejection or an 18-second simulated travel timeout reject the promise without a receive commit. Calls should handle rejection. Changing receiver state alone does not invalidate a flight: the current state is passed to its reducer when the payload arrives.

## Responsive navigation

Other `glyph-node` elements and `[data-glyph-obstacle]` elements inside the same flow define rectangular obstacles. Sender and destination are excluded from collision geometry. Native DOM bounds supply the target/obstacle positions on each animation frame. Explicit obstacles can be moved by pointer, keyboard or application code. They do not confer access to arbitrary page data.

A deterministic visibility-graph route and smoothed steering step use inflated bounds to preserve clearance. Steps use 1/120 second; the scene clock limits catch-up work to 50ms per rendered frame. A moving target changes the route. A blocked route waits and eventually rejects; an obstacle moved directly over a flight can block it rather than push it with a rigid-body collision solver. Paths can go around the flow edge and are clipped by the canvas. This is game-style navigation, without fluid/rigid-body dynamics or packet-to-packet collision.

There is one Canvas 2D overlay per flow and one shared requestAnimationFrame scheduler across flows. The existing GPU player remains separate. Pure layout functions are cached between content/size changes. Flows pause offscreen, in hidden documents or with `paused`; idle flows without flights or spin stop requesting frames. Reduced motion delivers without a traveling animation, respecting explicit pause. Up to 16 nodes, 12 obstacle rectangles per transfer and eight simultaneous transfers are supported. Small gzip size and bounded work are not a claim of measured FPS on every device.

## Public API

| Surface | Behavior |
|---|---|
| `node.definition = { input, output, initial, reduce, organize, export? }` | Validate a definition and initialize state; invalidates older flights to this node |
| `node.value`, `node.props` | JSON copy of current state |
| `node.props = payload`, `node.receive(payload)` | Synchronous validated receive and state revision increment |
| `node.export()` | Derive and validate output |
| `node.send(to, payload?, { id? })` | Promise for a local animated copy; omitted payload uses export |
| `node.reset()` | Restore this node's initial state; keep the flow receipt ledger |
| `flow.transfer({ from, to, payload, id? })` | Transfer between unique defined ids in this flow |
| `flow.cancel(id)` | Cancel a flight before receipt |
| `flow.reset()` | Cancel flights, reset nodes and clear the session ledger |
| `flow.snapshot` | Public content, flight locations and local receipts |
| `flow[paused]` | Freeze scene advancement and defer reduced-motion receipt |
| `glyph-state` | Bubbles with copied value and state revision |
| `glyph-transfer` | Bubbles with id/endpoints/status; settled receipt adds receiving revision/reason |
| `glyph-flow-error` | Bubbles when a responsive layout cannot be recomputed |

The studio's current scene-editing tools do not edit JavaScript reducer/layout source or this flow graph. This library API is the first executable component foundation. An agent-facing declarative flow schema and vetted function registry can follow without allowing arbitrary model-generated code to execute.

## Verification and compatibility

`node test-flow.cjs` checks producer/consumer contracts, immutable state, invalid input/schema rejection and reproducible navigation with moving targets. `/flow-check.html` executes real-browser lifecycle tests, including atomic arrival, idempotency, cancellation, definition changes, domain rejection, removal, blocked-route timeout, capacity and reduced-motion behavior. Existing engine, Wasm, studio and both designer suites remain in `npm test`.

The addition leaves saved recipes and player consumers unchanged. No scene migration or new runtime dependency is required. `dist/player-sizes.json` records both player and optional flow byte/gzip sizes. The source ZIP and standalone **Glyph Flow - Components.html** contain the demo and library. Browser tests are component evidence, not formal proof or a cross-device performance qualification.
