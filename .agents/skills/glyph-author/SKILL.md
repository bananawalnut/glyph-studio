---
name: glyph-author
description: Author, edit and compile reusable Glyph TypeScript geometry and functional components in this repository, including props, typed contracts, custom math, organizers and motion. Use for .glyph.ts source and portable component modules; scene/flow recipe-only edits use their existing tools.
---

# Glyph component authoring

Work from the repository root containing `scripts/glyphc.cjs`. Read [the language contract](../../../docs/language.md) and [maintained types](../../../language/author.d.ts). Start from the [signal shell](../../../language/examples/signal-shell.glyph.ts) or [word ring](../../../language/examples/word-ring.glyph.ts) when their structure fits. Keep source in `.glyph.ts`, not a new ad-hoc math grammar.

Use `defineGlyph<Props,State>` with semantic name/description, closed props/defaults and `build(A,props)`. Components optionally add state/initial, typed methods, organizer, motion and `params(state,props)`. `schema` is the runtime contract vocabulary; `Infer` avoids a parallel handwritten payload type. `methods<State>()` infers each input/result while requiring pure synchronous `{state,result}` handlers. Runtime contracts enforce bounds and data validity even after successful type checking.

Write custom geometry as ordinary functions using `Surface`, `Path`, mapped cubics, `Layer`, `Composite` and `BufferGeometry`. Preserve stable layer/mark IDs. Use context phase/time, seeded `random(key)` and immutable params for reproducibility. Keep carrier transforms, path flow, glyph changes, state reordering and transport distinct. Avoid claiming the TypeScript compiler generates Wasm/GLSL; it targets the existing JavaScript/typed-buffer runtime.

Preserve existing props, state semantics and method contracts unless the brief changes them. Let the receiver own data ordering and its organizer own layout. Keep asynchronous discovery and peer calls outside handlers; [shared component endpoints](../../../docs/component-interface.md) already supply discover/describe/invoke/call and typed receipts. Optional atomic classification is descriptive metadata; don't reorganize a consuming project or build a registry installer merely to add an atom/molecule label.

After edits:

```sh
npm run compile -- path/to/component.glyph.ts --check
npm run compile -- path/to/component.glyph.ts --out-dir generated
```

Use `npm ci` if the pinned compiler is missing. Check expected failures as well as the happy path for new behavior. Open `/math#language` for a real isolated preview and method call; compilation alone isn't visual validation. Keep the TypeScript source. Distribute the generated `.mjs` and the existing runtime modules; the compiler is development-only. Saving a reusable studio preset requires previewing the exact compiled source and the workshop's explicit save action. Don't claim a generated module was imported into another project, saved or published without performing that authorized operation.

Portable v1 permits only the `@glyph/author` import. Keep dependencies self-contained or discuss a broader repository-module build when genuinely required. Source modules are parsed and type-checked without host execution; preview them only through the isolated worker, not by evaluating unreviewed code in the bridge process. A repository coding agent may edit files and run tests within its normal permissions. This skill doesn't grant constrained studio designers shell access or expand their recipe tools.
