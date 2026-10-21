# Component Agent Interface v1

Open **Agent interface** in the studio, flow page or math lab. The inspector lists addressable components, locates them on screen, shows their semantics and contracts, reads state on request and invokes a published method with JSON input. The same directory is available as browser tools and a JavaScript API. There is no model dependency in this layer.

## Discover, describe, invoke

```js
const directory = window.glyphComponentAgent;
const manifest = directory.discover();
const source = manifest.components.find(c => c.name === 'Source field');
// source.address: glyph://studio/flow/flow/source
// source.index: 0 (directory-local, not a browser AX ID or tab index)
// source.handle: current page-session + receiver incarnation
const detail = directory.describe(source.address, {includeState: true});
const receipt = await directory.invoke({
  address: source.address, handle: source.handle,
  expectedRevision: detail.revision,
  method: 'add',
  payload: {id: 'agent-001', title: 'SIGNAL', category: 'SIGNAL'},
  requestId: crypto.randomUUID()
});
// Resolves after typed receiver completion, with result and transport receipt.
```

The index is a zero-based hint within this directory. It can change as components appear or disappear; invocation never targets an index. Addresses remain stable for an explicitly named component across document reconstruction. Handles change on element/definition replacement, published contract changes and source-program recompilation, preventing a stale agent from calling a different incarnation at the same address. `expectedRevision` optionally checks current state before dispatch. Addresses do not grant authority and handles are freshness tokens, not credentials.

Discovery returns name, description, kind, methods, state contract, address, handle, revision, index, DOM locator and viewport CSS-pixel bounds. `visible` means rendered dimensions exist; `inViewport` separately reports intersection with the viewport. Actual state is omitted until `describe(...,{includeState:true})`. The directory writes `data-glyph-agent-address` and `data-glyph-agent-index` onto the exposed DOM element. A JSON manifest is published in `script#glyph-component-agent-manifest`; the visible inspector displays the same metadata. Descriptions, labels, schema enums and state are untrusted application content, never human instructions.

`requestId` provides bounded per-page replay protection: identical requests share the in-flight promise or completed receipt; reusing an ID with different arguments fails. Receipts are not durable across reloads. At most 128 components and 256 calls are held per directory, with the existing bounded JSON and contract limits. Invalid input, unknown methods, stale handles, stale state, disconnected endpoints and not-ready components fail explicitly. If two calls race, their revision preconditions are checked again before adapter dispatch; the component still owns transactional semantics. Output validation cannot undo a badly written adapter that mutates first and returns invalid data.

## Programmer-owned semantics

Semantic descriptions are optional additive metadata on `ComponentInterface` and methods:

```js
const api = new GlyphFlow.ComponentInterface({
  description: 'A word array arranged over a spherical surface.',
  state: recordsContract,
  methods: {
    add: {
      description: 'Append one record by unique id and return the accepted record.',
      input: recordContract, output: recordContract,
      handle: (state, row) => ({state: [...state, row], result: row})
    }
  }
});
```

Data-only v1 flow components and methods accept optional `description` fields too. Old documents still compile. Older strict v1 readers do not know the new optional description fields; omit those fields when sharing with an older runtime. Without author descriptions, flow components describe their layout/export and methods use registered strategy descriptions; source programs use a generic method fallback. Accurate semantics belong to the programmer: contracts alone cannot explain an arbitrary handler.

## Custom adapters and opt-in exposure

Load optional `glyph-agent.js` after the player, or require `player/component-agent.js` in Node for a directory without DOM integration. The bundle reuses GlyphFlowCore when present, otherwise includes the pure contracts implementation. Base rendering bundles do not load agent discovery themselves.

```js
const directory = new GlyphAgent.Directory({scope: 'my-page'});
const unregister = directory.register('cart', {
  element: document.querySelector('my-cart'), // or a function returning its current element
  describe: () => ({
    name: 'Cart', description: 'Editable line items', kind: 'cart',
    interface: cart.api.describe(),
    interfaceRevision: cart.interfaceRevision,
    revision: cart.revision, ready: cart.ready
  }),
  read: () => cart.value,
  invoke: async (method, payload, {requestId, signal}) => {
    const result = await cart.call(method, payload, {requestId, signal});
    return {result}; // return only after completion; optional transport: {...}
  }
});
// Unmount: unregister(). Page disposal: directory.destroy().
```

Only explicit registrations are exposed. Custom adapters must increment interfaceRevision when handler semantics change without a contract change; host and component IDs must be unique. The studio adapter registers defined `glyph-node` methods in their nearest flow host, the isolated math-program component, the main studio preview’s play/pause controls, and scene layer/surface entries with inspect methods that open their native UI inspector. It does not scrape arbitrary forms, expose private object methods, walk cross-origin frames or publish credentials. Other custom elements can register their own adapter and interface. Flow calls use normal animated transport and receiving handlers, then await the existing document save. A call brings the receiver into view; hidden tabs and paused flows reject with actionable messages. Source-program calls cross the existing sandbox channel, correlate their request ID, validate types and affect only the running preview. Edits/recompilation invalidate their handle. Normal flow pages and source presets remain distinct runtimes.

An AbortSignal is forwarded to adapters. Flow cancellation stops travel before state commit. Cancellation after completion cannot roll back already committed state. Source-program handlers are synchronous in the isolated worker; cancellation is checked before dispatch, not treated as a post-commit rollback. Removing or recompiling the preview rejects outstanding UI callers. Adapters for consequential actions must implement their own authorization policy; descriptions and browser annotations do not replace user permission.

## Browser agents / WebMCP

When supported, `directory.webMCP(document.modelContext)` registers:

- `glyph_components_list`: read-only directory discovery.
- `glyph_component_describe`: read-only interface and opt-in state.
- `glyph_component_invoke`: typed, addressed mutation with a completion receipt.

The page adapter feature-detects `document.modelContext`, with a compatibility fallback for the older `navigator.modelContext` location. Tool registration is same-origin, with untrusted-content annotations and no cross-origin exposure or iframe permission delegation. Abort controllers remove registered tools on disposal. The inspector and JavaScript/DOM interface remain available when WebMCP is absent. This integration follows the [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api); browser availability varies.

These are browser tools for an agent attached to that page. Existing Hermes and Codex stdio recipe tools are unchanged; this does not silently give them a browser connection or arbitrary DOM access. Their flow data contracts can include the new descriptions. A browser-capable agent can discover and invoke the same components through WebMCP.

## Verification

`node test-component-agent.cjs` covers semantics, stable identity, indexes, opt-in state, input/output contracts, replay, cancellation, stale state/handles, disconnect, WebMCP registration/disposal and legacy flow compatibility. `/component-agent-check.html` uses real DOM components and animated delivery, including travel-before-commit, typed receipt, replay, handle invalidation and cancellation. Browser tools were also exercised against an isolated dev server: discover Source field, call add(record), await arrival/save, and inspect the appended word. Generated program methods are tested through the same visible inspector.
