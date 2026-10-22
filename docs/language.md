# Glyph TypeScript authoring (v1)

Glyph's first compiled authoring language is **TypeScript with a typed component vocabulary**, stored as `.glyph.ts`. It retains ordinary functions, loops, numerical algorithms, classes and closures. There is no new expression parser or restricted shape grammar. TypeScript is pinned as a development dependency; the emitted module contains JavaScript and a small definition adapter, not TypeScript or a new renderer. Custom functions still sample on the CPU into the existing six-float point ABI; WebGL2 draws them. This compiler does not turn arbitrary TypeScript into Rust, Wasm or GLSL and does not by itself improve frame rate.

## Compile and use

```sh
npm ci
npm run compile -- language/examples/signal-shell.glyph.ts --check
npm run compile -- language/examples/signal-shell.glyph.ts --out-dir generated
```

The root `tsconfig.json` resolves `@glyph/author` in editors for `language/examples/` and future `components/**/*.glyph.ts`; `npm run check:types` checks those project files. The single-file compiler also enforces its portable module boundary.

The compiler checks the whole module with strict TypeScript, then emits:

- `signal-shell.mjs`: a self-contained ES module exporting `create`.
- `signal-shell.preview.js`: the same factory as a plain script for the studio's isolated source preview.
- `signal-shell.manifest.json`: compiler/target version, original source SHA256, filename and output byte count. This is build provenance, not an attestation of execution or a component's dynamic method catalog.

Keep the original TypeScript alongside the artifacts. Generated modules don't retain an editable TypeScript AST. The same source and compiler emit the same factory bytes. Callback reproducibility still depends on using phase, seed and keyed randomness rather than wall clocks or mutable external state.

```js
import {create} from './signal-shell.mjs';
const product = create(GlyphProgram, GlyphFlowCore, {
  amplitude:0.35, label:'ZENITH / '
});
const programElement = document.querySelector('glyph-program');
programElement.program = product.program;
const node = document.querySelector('glyph-node');
node.addEventListener('glyph-state', event => {
  programElement.params = product.params(event.detail.value);
});
node.definition = product.component;
```

Load the existing player, program and flow modules first. `glyph-flow.js` installs `GlyphFlowCore`. The factory needs no import resolver, evaluation of source strings or compiler in a production page. The host chooses whether to show the carrier program, the functional node, or both, and synchronizes component state through `product.params(state)`. The module does not implicitly register browser addresses or install global event listeners. Use [the shared Component Interface](component-interface.md) for discovery and peer transport. Native nodes in a flow can use `Directory.flowNode` unchanged.

## Definition

See the complete [signal shell](../language/examples/signal-shell.glyph.ts), [word ring](../language/examples/word-ring.glyph.ts) and maintained [type declarations](../language/author.d.ts).

```ts
import {defineGlyph, schema as s, methods, type Infer} from '@glyph/author';
const props = s.object({amplitude:s.number({minimum:0,maximum:0.65})});
type Props = Infer<typeof props>;
const state = s.object({amplitude:s.number({minimum:0,maximum:0.65})});
type State = Infer<typeof state>;
const method = methods<State>();
const number = s.number({minimum:0,maximum:0.65});
// export default defineGlyph<Props,State>({ ... });
```

`defineGlyph<Props, State>` takes:

| Field | Meaning |
| --- | --- |
| `name`, `description` | Human/agent semantics, returned as product metadata. |
| `atomic?` | Optional `atom`, `molecule`, `organism`, `template` or `page` classification. Metadata only: no forced directory structure or import registry. |
| `props`, `defaults` | Closed object contract and complete defaults. `create(A,F,overrides?)` shallow-merges overrides, rejects unknown fields and validates before building. Nested props replace as a whole. |
| `build(A, props)` | Returns a normal `A.Program`; use surfaces, paths, mapped cubics, layers, composites, transforms or direct buffer writers. |
| `component?` | State contract, `initial(props)`, methods, organizer, motion and optional state-to-program `params(state,props)`. |

`schema` constructors produce ordinary Flow contracts, not a second validator. They support number/integer bounds, string lengths, boolean, null, homogeneous nonempty enums, bounded arrays and closed objects whose declared fields are all required. Use `Infer<typeof contract>` for the associated TypeScript type. The supported contract vocabulary is intentionally the current runtime vocabulary; unions/optional object keys and arbitrary JSON Schema aren't added by this helper. For more advanced existing contract use, ordinary JavaScript and the underlying Flow API remain available.

`methods<State>()` returns a helper that infers each method's payload/result types from its input/output schemas. Handlers receive deeply readonly state and input and return `{state,result}` synchronously. Runtime contracts validate every input, resulting state and result, including numeric ranges that TypeScript cannot prove. A receiver's handler determines semantic ordering; its organizer determines presentation. Keep discovery, async calls and follow-up acknowledgements in a coordinator outside pure handlers.

`component.params` maps semantic state into geometry parameters. Without it the runtime uses state directly; provide it for array/primitive state or whenever geometry needs a different shape. The existing worker preview synchronizes params after methods and restores previous state on a failing update. Programmer hosts should do equivalent synchronization at their own lifecycle boundary.

## Studio

Open **`/math#language`**. Load an example or `.glyph.ts` file, edit and choose **Type-check & compile**. Diagnostics include source line and column. A successful compile is then run inside the existing network-disabled, terminable preview worker. Try a discovered method using JSON. **Export module** downloads portable JavaScript; **Export TypeScript** keeps editable source.

**Use in source workshop** copies only the compiled JavaScript to the existing workshop draft in this page. It refuses to replace unsent JavaScript edits and detaches the previously loaded preset identity. Choose **Run source**, name it and save a new source preset. Compilation and preview alone do not save or replace any scene, flow, draft or preset. The saved preset uses the existing v1 `kind:"program"` format; retain the original `.glyph.ts` separately. Existing JavaScript programs/presets need no migration.

The existing voice/prompt designer continues to generate its supported JavaScript source proposals. Repository coding agents can author TypeScript using the [repository skill](../.agents/skills/glyph-author/SKILL.md) and CLI. The constrained studio model workers do not gain shell tools or TypeScript filesystem access. A dedicated TypeScript prompt target, registry installer and shadcn-style project import are future work.

## Boundaries and checks

Portable v1 components are one self-contained source module, importing only `@glyph/author`. The compiler supplies ES2022 types without browser/Node globals. External module imports, reference directives, dynamic imports and `require` are rejected; it reads only the source, maintained author declarations and pinned TypeScript standard libraries. It never imports or executes the authored module. This portability boundary does not prove function purity or make arbitrary trusted application code safe to run in the page.

The authenticated same-origin dev-server endpoint `POST /api/language/compile` accepts `{source,filename?}` and returns `{ok,diagnostics,...artifacts}`. It changes no saved state. Compilation uses one worker at a time, a 64 KB source/output limit, 128 MB old-generation limit and 8-second timeout. The studio preview keeps its existing 12,000-point and worker compute bounds. Exported application code runs with its host's privileges; inspect it and choose the appropriate host. Type assertions, `any` and TypeScript suppression comments can weaken static checking; runtime contracts remain authoritative.

Run `node test-language.cjs` for type/emit/consumer tests and `node hermes/test-language.cjs` for authenticated API checks. `npm test` includes both. Sample audits prove finite selected frames, not continuity, physical accuracy, formal correctness or performance. Type declarations describe the current API but do not replace runtime vector, layer-budget and rendering validation.
