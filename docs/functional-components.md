# Functional content and animated handoffs

Glyph Flow is an opt-in component layer. Existing `<glyph-scene>` recipes, WebGL2/Rust-Wasm rendering and `<glyph-anchor>` HTML overlays keep their APIs. Add `dist/glyph-flow.js` only on pages that need structured content and animated transfers; it does not load the editor, agents, base player or a framework.

Open `/flow` for the working study: **Source field → Category clusters → Signal index**. The first receiver accepts an array, groups records, and exports an envelope. The next receiver validates that envelope and chooses a helix layout. Drag the obstacle while a chunk is traveling. Invoke `source.add(record)` to animate a new record into the rotating sphere. The receiving mark follows its live rotation.

## Programmer-owned interfaces

The framework supplies transport and dispatch. **The component programmer owns method names, input and result contracts, state, handlers, HTML and organization.** `add` is a demo method, not a reserved framework verb. Use composition with `ComponentInterface`; subclass `GlyphFlow.GlyphNode` when a custom element needs its own HTML/lifecycle. Keep callable methods under `node.api` so names such as `remove` do not collide with native DOM methods.

```html
<script src="glyph-flow.js" defer></script>
<glyph-flow id="stage" style="height:400px">
  <glyph-node id="source" style="position:absolute;left:0;width:240px;height:280px">
    <h2>Source field</h2>
    <button id="add">Add a signal</button>
  </glyph-node>
</glyph-flow>
```

After the script loads:

```js
const source = document.getElementById('source');
const record = {
  type: 'object', properties: {
    id: { type: 'string' }, title: { type: 'string' }
  }, required: ['id', 'title'], additionalProperties: false
};
const records = { type: 'array', items: record, maxItems: 24 };
source.definition = {
  interface: new GlyphFlow.ComponentInterface({
    state: records,
    methods: {
      add: {
        input: record, output: record,
        handle: (state, row) => ({ state: [...state, row], result: row })
      },
      remove: {
        input: { type: 'string' }, output: { type: 'boolean' },
        handle: (state, id) => ({
          state: state.filter(row => row.id !== id),
          result: state.some(row => row.id === id)
        })
      }
    }
  }),
  initial: [],
  organize: (state, { width }) => state.map((row, i) => ({
    id: row.id, label: row.title, x: width / 2, y: 100 + i * 18, z: 0
  }))
};
document.getElementById('add').onclick = () => source.api.add({
  id: 'one', title: 'Signal'
}, { id: 'first-add' }).then(receipt => console.log(receipt.result));
// A different component can invoke this same interface:
// stage.invoke({ from: 'producer', to: 'source', method: 'add', payload: row });
```

Handlers return `{ state, result }`. The state contract and the method's result contract must both pass before committing; the organizer must also succeed. Every method has an independent input/result shape. Omit component `output`/`export` for state identity output, or supply an export contract and function for connections. The legacy `{ input, output, initial, reduce, organize, export? }` definition still works through the implicit `receive` method.

`node.dispatch(method, payload)` performs synchronous atomic dispatch and returns its result. `node.api[method](payload, options)` and `node.invoke` animate input and return a receipt promise. `flow.invoke({from?,to,method,payload,origin?,id?})` validates the receiving method without requiring a sender export contract. `node.send(to, payload, {method,id})` validates both the sender's published output and receiving method input. Omit `from` for ingress; the default origin is just outside the left edge, or supply flow-local `{x,y}` pixels. Programmer-owned pure handlers can set `preview:true` to calculate the proposed receiving mark during transit; they may run more than once. Registry handlers opt into this. Without preview the transport targets the component center and evaluates the method only at arrival.

The functions are application-supplied JavaScript, without `eval` or generated-code execution. They can implement application-specific semantics rather than using the studio registry. Register custom tags with `customElements.define('my-node', class extends GlyphFlow.GlyphNode {})`; they participate in the same flow protocol.

Frozen copies of state/input are passed to hooks. Returned state and output are copied and bounded. Hooks should be pure: the runtime prevents mutation of these supplied snapshots, but cannot prove that arbitrary JavaScript avoids external state, time or other side effects. Pure contract checks, canonicalization, reduction and navigation functions are independently testable in `player/flow-core.js`. Formal verification is not implemented.

`organize` runs on state/size changes, not every frame. Each mark has finite pixel coordinates relative to its component, optional `z`, a label up to 120 UTF-16 code units and optional CSS color. A `spin` attribute rotates the visual around its Y axis; this is presentation, independent of content state. The layout limit is 1024 marks per node. Light-DOM buttons, headings and other HTML remain native. A visually hidden status exposes JSON content to assistive technology; use visible HTML/your own state listener for richer accessible presentation.

## Input and output contracts

The contract language is an intentionally small JSON-Schema-shaped subset, not a complete JSON Schema implementation. Unsupported keywords fail at definition time. Supported types are object, array, string, number, integer, boolean and null. Supported keywords are `enum`; `properties`, `required`, `additionalProperties:false`; `items`, `minItems`, `maxItems`; `minLength`, `maxLength`; and `minimum`, `maximum` for numeric types.

Object properties are explicit and closed. Payload/state values must be finite plain JSON, without cycles, functions, reserved prototype keys or class instances. Limits: 64 KiB encoded JSON, depth 16, 8192 visited values and 1024 entries per array; contract nesting is limited to eight. Domain relationships such as `total === rows.length` belong in the reducer, which can reject them before commit.

The input contract and organizer must both accept a receive operation before the state is assigned. A throwing reducer/organizer leaves previous state and revision intact. `.props = value` is a convenience for direct synchronous receive; `.props` and `.value` return a copy of current state, not a live reference.

## Transfer lifecycle

1. Validate output against the sender and input against the receiver, then capture an immutable payload and receiver definition epoch.
2. Animate a glyph representation of that payload through the local flow world. The actual JSON stays intact; glyph trails are visual marks rather than independently delivered fragments.
3. After arrival and any configured receiving animation, recheck the receiver definition and input, run its receiving method against current state, and validate state, method result and organizer output.
4. Commit state/revision once, emit a receipt and resolve the transfer promise. Concurrent arrivals are reduced sequentially in arrival order.

Source state is preserved: this is **copy delivery**, not ownership transfer. Use an application action after a successful receipt if the sender should relinquish content. No implicit source removal, cross-component rollback, network delivery or durable transaction is claimed.

An explicit transfer id deduplicates identical in-flight and settled requests within this flow session. Reusing an id with different endpoints, method, origin or content fails. The receipt ledger is bounded to 256 pending/settled transfers; `reset()` clears it deliberately. Reloading the page also clears it. This is local duplicate protection, not durable exactly-once messaging.

Cancellation, endpoint removal, a changed receiving definition, domain rejection or an 18-second simulated travel timeout reject the promise without a receive commit. Calls should handle rejection. Changing receiver state alone does not invalidate a flight: the current state is passed to its handler when the payload arrives.

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

## Form events, travel and receiving behavior

The `/flow` word form is a native HTML form above Source field. Submit maps a word to a typed record (`{id, title: word, category: 'SIGNAL'}`) and calls `source.api.add` with an origin measured from the input's actual DOM bounds. Each word gets a fresh ID. The form supports Enter, validation and one pending word at a time. Its **Interaction settings** edit the receiving method's travel style, receiving style and process duration while preserving current content.

A method can define presentation independently of its state handler:

```js
add: {
  input: record, output: record,
  interaction: {
    travel: 'hop', receive: 'pixel-sort',
    duration: 0.9, textField: 'title'
  },
  handle: (state, row) => ({state: [...state, row], result: row})
}
```

The interaction runs **submit → travel → receive → commit → organize**. `hop` releases letters at staggered times along the routed carrier's position history; small quantized hops and shadows make them feel pixel-like. All letters converge before the receiving phase. `pixel-sort` reassembles them in a small stepped animation at the projected receiving mark, then the handler adds the intact record and the organizer assigns its place. This name refers to visual reassembly; application data remains in its handler-defined order. Other methods can use `stream` and/or `none`. Duration is bounded to 0..3 simulated seconds. textField selects one top-level string field; a string input supplies its own text. Without text configuration, transport keeps its JSON glyph representation.

`glyph-transfer` adds an optional `processing` status between `started` and a terminal receipt. `flow.snapshot.flights` exposes `phase`, resolved letters and normalized interaction settings. Receiving state remains unchanged throughout travel and processing. Cancellation, changed receiving definitions and invalid final handler results still reject without a commit. Reduced-motion mode bypasses both animation phases and delay. These are visual lifecycle stages around a synchronous pure handler, not asynchronous background jobs or distributed transactions.

`new GlyphFlow.Document(element,{insetTop:130})` reserves a top rail for programmer-authored controls, projecting percentage boxes into the remaining height. `workspace.load` emits `document`; applications can reattach their own native form after a new graph is loaded. The word form is application HTML, while interaction metadata belongs to the component interface and can also be edited through designer prompts. Existing saved flows omit this optional metadata and retain stream/immediate behavior. Reload open flow pages after upgrading their bundled validator.

## Data documents and the prompt designer

`GlyphFlow.Document` is a DOM adapter over the same pure `GlyphFlow.model` compiler used by the bridge:

```js
const workspace = new GlyphFlow.Document(document.getElementById('stage'));
workspace.load(GlyphFlow.model.defaultDocument());
await workspace.run('source-to-cluster');
const saved = workspace.document; // includes current state
```

Flow v1 has `title`, named `contracts`, `components`, `connections` and `obstacles`. Each component owns `stateContract`, `initial`, `state`, `methods`, a published `output` and `layout`. Methods reference named/inline input and result contracts and a registered handler. Connections name `from`, `to`, receiving `method`, and `identity`, `first` or `batch` mapping. See [the compact document contract](../dist/flow-guide.txt) and `player/flow-model.js` for exact fields and registry options. Initial is the reset baseline; editing a layout preserves current state. Definitions are bounded to 10 components, 16 methods each, 32 contracts, 24 connections, three declared obstacles and 64 KiB. Unknown fields, strategy names and code strings fail validation. Connections check current exported data against the next input; this is not a static proof for all future values.

The optional registry has append/upsert/remove/replace/group/accept-envelope/select handlers, sphere/grid/helix organizers and identity/flatten/envelope exports. Programmers can register trusted factories with `GlyphFlow.model.registry.register(kind, id, factory, description)` or pass their own registry to `new GlyphFlow.Document(element,{registry})`. These factories are application code. Register server and browser implementations together when using the bridge; the bridge uses its own known registry. The data document does not contain JavaScript.

`/flow` provides a method console, JSON document editor, and **Studio Designer** prompt panel. Both providers share the flow skill:

| Provider | Flow tool surface | Commit |
|---|---|---|
| Local Hermes | read, validate, apply, edit, invoke | All mutations are staged in a per-job draft; completion commits once against its original revision |
| Codex | read, validate | Structured complete flow plus optional calls; the bridge validates and revision-checks it |

Use prompts such as “Add an upsert method to source, accepting and returning record; preserve its state” or “Send this record to source.add, then organize the index as a grid.” A programmer adds new handler semantics in code; a prompt configures those registered capabilities. Stop or a stale revision discards a staged proposal. The saved Zenith scene is a separate target and store. Existing scene requests default to `target:scene`; flow requests explicitly use `target:flow`.

Invocations are queued with `{id,component,method,payload}` after proposal validation. A visible, idle flow browser claims one, animates it, and acknowledges the exact resulting receiving state. The bridge re-evaluates the method and accepts only that expected state transition, then persists state and a typed result receipt. It rejects other edits bundled into an acknowledgment. A queued request is not delivery. Browser closure, a changed definition, a changed saved revision, cancellation or a two-minute claim expiry can fail it; failed requests are not automatically retried. Flow prompts can undo their own delivered calls while no unrelated revision has intervened. This is an authenticated local studio protocol, not a distributed transaction service. Local manual transfers save after arrival; multi-tab conflicts require reloading the current flow.

The bridge ledger persists up to 128 invocation IDs, while each browser flow has 256 in-session receipts. The former protects replay across browser reloads. Use “Clear settled call receipts” to begin a new explicit deduplication window after all queued/claimed calls settle; clearing permits ID reuse, so fresh IDs remain recommended. Do not reuse a failed id for a different call. Flow state and receipts stay in private `.runtime/flow.json` and are excluded from Git/exports. The portable HTML runs without bridge/agent persistence.

## Verification and compatibility

`node test-flow.cjs` and `node test-flow-model.cjs` check producer/consumer contracts, immutable state, invalid input/schema rejection and reproducible navigation with moving targets. `hermes/test-flow-agent.cjs` exercises staged proposals, persistent call receipts, cancellation, stale edits, both provider paths and safe undo with mocked inference. The native plugin test uses the actual Hermes loader and flow dispatch. `/flow-check.html` executes real-browser lifecycle tests, including atomic arrival, idempotency, cancellation, definition changes, domain rejection, removal, blocked-route timeout, capacity, reduced-motion behavior, programmer-defined method results, `api.remove` and a custom element subclass. Existing engine, Wasm, studio and both designer suites remain in `npm test`.

The addition leaves saved recipes and player consumers unchanged. No scene migration or new runtime dependency is required. `dist/player-sizes.json` records both player and optional flow byte/gzip sizes. The source ZIP and standalone **Glyph Flow - Components.html** contain the demo and library. Browser tests are component evidence, not formal proof or a cross-device performance qualification.
