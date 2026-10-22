# Shared Component Interface

A component owns one typed interface: its methods, state contract, meanings, handlers and receiving behavior. A person, an agent and another component call those same methods. Caller type does not select a different handler.

The runtime has three layers:

- `ComponentInterface` validates inputs, state and returned results.
- `GlyphComponents.Directory` discovers registered interfaces and dispatches addressed calls with current handles, optional state revisions and replay protection.
- Adapters supply transport and presentation. The shared flow adapter animates data from the actual calling node to its receiver and returns the typed receipt. Other adapters can use different transport.

`GlyphComponents` is the browser runtime name and `window.glyphComponents` is the studio directory instance. `GlyphAgent` and `window.glyphComponentAgent` remain aliases. Existing browser tool names and `protocol: "glyph-component-agent/v1"` remain readable; discovery also advertises `sharedProtocol: "glyph-component/v1"`. Existing calls without a component origin are unchanged.

## Try the two-component example

Open `/math#shared-interface`, enter a word and choose **Send through shared interface**.

1. The form calls **Word field.add(packet)** through `directory.invoke`. `packet` is `{id, word}`. The field stores it as pending and returns a packet under its own output contract.
2. The field’s coordinator uses its bound endpoint to discover peers, excluding itself. It selects the single ready peer whose `add` input accepts that packet. The destination address is discovered, not hardcoded.
3. It calls **Sorted archive.add(packet)** through `endpoint.call`. Letters travel from the field to the archive. The archive owns its alphabetical organization and returns `{id, word, position}`.
4. The archive independently discovers a peer with a compatible **acknowledge(receipt)** method and calls it. A reply travels back from the archive to the field.
5. The field records the acknowledgement only when that reply arrives. The live trace shows discovery, method contracts, calls, typed results and receipts in both directions.

The browser agent can invoke the exact same field `add` method through `glyph_component_invoke`; the application’s reactive coordinators then perform the same exchange. Calling the archive directly remains valid but, without a component caller, does not trigger a return reply. The field acknowledgement method requires a matching source word. Human and agent controls do not bypass those domain rules.

The form’s replay button resubmits the exact ingress request ID. It returns the existing receipt and does not rerun downstream delivery. Invalid input is rejected before travel and cannot change either state. The archive’s returned position is its index at receipt time, not a promise that later insertions preserve that rank. The demo is local page state, separate from saved scenes, source presets and flow documents.

## Bind a component endpoint

```js
const me = directory.connect(myAddress); // captures the current incarnation
const peers = me.discover();            // excludes myAddress
const peer = peers.components.find(c => {
  const method = c.interface.methods.add;
  if (!method || !c.ready) return false;
  try { GlyphFlow.core.validate(method.input, packet); return true; }
  catch { return false; }
});

const receipt = await me.call(peer, 'add', packet, {
  requestId: crypto.randomUUID(),
  expectedRevision: peer.revision
});
```

The endpoint can also `invoke` its own methods, or `describe(address,{includeState:true})`. Fresh peer descriptors provide current handles. Both the caller and receiver are checked before dispatch; a replaced caller produces `stale_caller`. `from:{address,handle}` in an invocation and returned receipt records the origin. It is provenance within a local runtime, not authentication or additional authority. A custom caller cannot acquire permissions merely by naming another component.

The example chooses peers by method name and validation of this particular value. It does not prove schema subtyping or compatibility for every future payload. No match or multiple matches fail explicitly rather than selecting an arbitrary target. A larger application can select a peer explicitly by address and semantics.

## Reuse the flow adapter

```js
const unregister = directory.flowNode('flow/my-host/my-node', node, {
  beforeInvoke: async () => { /* application readiness/authorization checks */ },
  afterInvoke: async receipt => { /* persist after receiver completion */ },
  reveal: true
});
```

The adapter publishes the node’s interface, state revision and definition epoch. For calls with a component origin, it resolves the caller to an actual node in the same flow and starts the animation there. Cross-flow peer transport is rejected by this adapter; applications can register another adapter to support a different transport. The adapter rechecks handles and state after asynchronous readiness hooks. Abort signals cancel travel before commit; they cannot undo completed effects.

Pure handlers stay synchronous and side-effect-free. Discovery and follow-up calls live in application coordinators after typed arrivals. Each receiver commits its own method result; the multi-component exchange is not a distributed transaction. A later failure can leave a source word pending or an archive record accepted, with a visible error. This example is bounded to twelve records and does not automatically retry failed deliveries or establish a durable workflow engine.

Source-program methods continue to run in the isolated worker and are callable through their adapter. The worker does not receive the page directory or studio credentials. Application-level coordinators can route their public typed results without weakening that boundary.

See [directory, DOM and browser-tool details](component-agent-interface.md). The example’s contracts/organizers live in `player/exchange-model.js`, with orchestration in `dist/shared-exchange.js`. `test-shared-interface.cjs` covers shared caller semantics, mutual discovery, sorting, acknowledgements, replay, invalid payloads and stale callers; `/shared-interface-check.html` verifies the complete animated browser round trip.
