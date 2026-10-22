# Glyph design system

Open [the local library](http://127.0.0.1:8788/design) after `npm run dev`. The library has three views: objects and motion, component behaviors, and foundations. Preset selection changes only the preview. **Add object to current scene** appends a new instance; **Apply behavior to component** patches the selected layout or receiving method. Both read the current revision before committing and report conflicts. They preserve existing state, handlers and contracts. Scene layer/surface limits still apply. Download creates a baked recipe that needs no preset module at playback time.

The optional `glyph-design.js` module contains the catalog and pure factories. It uses the existing scene compiler and emits ordinary v2 scene JSON. Neither scene schemas nor saved flow documents acquire preset references. Defaults can evolve independently of exported, fully expanded recipes; keep the recipe and library release together when regenerating a preset exactly.

## Objects

| ID | Object | Construction | Layers | Text |
|---|---|---|---:|---|
| sphere | Shell | Glyph lattice on a spherical carrier | 1 | Texture |
| torus | Torus | Lattice on a toroidal carrier | 1 | Texture |
| cylinder | Cylinder | Lattice on a cylindrical carrier | 1 | Texture |
| plane | Plane | Flat glyph carrier | 1 | Texture |
| wave | Wave | Rippled glyph carrier | 1 | Texture |
| signal-ring | Signal ring | Text band on a sphere | 1 | Yes |
| bezier | Cubic path | Free 3D cubic particle trace | 1 | No |
| ribbon | Ribbon | Three parallel mapped cubic curves on a wave carrier | 3 | Yes |
| helix | Helix | Two mapped turns on a cylinder | 2 | Yes |
| spiral | Spiral | Eight tangent-continuous mapped cubic segments on a plane | 8 | Yes |

The helix closes its position/tangent at the carrier seam. Spiral controls derive from an expanding coil's point and derivative functions, converted to cubic handles. They reuse carrier transforms and existing flow behavior. Free cubic geometry retains its existing particle rendering; its flow moves light/color pulses. Text controls are enabled only for objects that support mapped text. A character-change motion needs a material with multiple glyphs.

## Motion and material

Motion presets have explicit channels and settings. Rotation presets (`rotate-y`, `rotate-z`, `tumble`) share the rotation channel. `bob` owns vertical offset. `flow` and `reverse-flow` share the path-flow channel and require a supported path. `flicker` and `stream` share the glyph channel: rapid Matrix change at 12 changes/second or a slower 3-change cadence. `still` stands alone. One preset per channel prevents a later setting from silently overwriting another. Channels can combine:

```html
<script src="scene.js" defer></script>
<script src="glyph-player.js" defer></script>
<script src="glyph-design.js" defer></script>
<glyph-scene id="signal" aria-label="Floating ribbon"></glyph-scene>
```

```js
const recipe = GlyphDesign.scene({
  object: 'ribbon',
  motions: ['rotate-y', 'bob', 'flow'],
  material: 'signal',
  color: 'cyan',
  text: 'ZENITH / OPEN CONSULTANCY / ',
  seed: 42,
  duration: 12
});
document.getElementById('signal').scene = recipe;

// Preserves current scene seed, duration, camera, layers and surfaces.
// New instance IDs are allocated automatically unless explicitly provided.
const next = GlyphDesign.append(currentScene, {object:'helix'});
```

Options are closed: object, motions, material, color, text, seed, duration and id. Explicit instance IDs have at most 20 characters; generated layer/host IDs fit the renderer limit. Unknown presets, unsupported combinations, invalid values, conflicting channels and capacity errors reject before applying. Returned recipes and catalogs are independent copies; factories do not mutate their inputs. A seed and recipe reproduce geometry/characters at a specified frame. Fixed pixels also require a fixed font, viewport, renderer and browser. Loop duration sets the real-time speed of whole-turn motion. Player pause, visibility suspension and reduced-motion behavior are inherited.

Materials are `wire`, `signal`, `matrix` and `spectrum`: reusable glyph/color/opacity/size choices. Optional color overrides use the existing renderer palette, including `rainbow`. Materials and movement remain separate. The gallery switches from a single-cross wire material to Matrix when a character-change motion is selected, so that motion is visible.

## Component behaviors

`GlyphDesign.preset('behavior', id)` returns a descriptor with a target and settings:

| ID | Target | Settings |
|---|---|---|
| shell | Layout | Interactive sphere, geometry reflow,180-character overflow limit |
| spiral-index | Layout | Flow framework's helical record organizer |
| category-grid | Layout | Visual organization by explicit category |
| hop-sort | Interaction | Hopping letters and pixel-sort receiving |
| hop-categorize | Interaction | Hopping letters and category-scan receiving |
| direct | Interaction | Glyph stream with immediate receiving |
| weave | Geometry hook | Curved, staggered 2.8-second local geometry transition |
| quick-settle | Geometry hook | Brief 0.35-second linear local transition |

Scene objects and flow layouts are different interfaces. A multi-layer scene spiral is not a registered flow organizer. Layout settings merge into an existing component and do not replace its state or method implementation. Interaction settings merge into one existing method and leave its input/output schemas and handler intact. Categorize is the visual receiving phase; a grouping handler separately determines how content is stored. Geometry entries are code-defined hooks, not new flow-document fields:

```js
const shell = GlyphDesign.preset('behavior', 'shell');
workspace.configureLayout('source', shell.settings.layout);
const weave = GlyphDesign.preset('behavior', 'weave');
node.reorganize(organize, weave.settings.motion);
node.dispatch('shuffle', {seed:23});
```

The behavior gallery uses an isolated component, with sample words and explicit preview controls. Previewing never inserts sample content into the saved flow. Local geometry reorganization creates no delivery packet. Traveling interactions retain the flow framework's contracts, processing phase, cancellation and commit-on-arrival semantics.

## Foundations and discovery

`GlyphDesign.tokens` is the frozen source for interface colors, renderer colors, mono type, spacing and timing. `design-tokens.css` and `design-system.json` are generated by `scripts/build-design.cjs`, invoked by the normal build. The gallery and flow page use the shared CSS variables, such as `--glyph-accent` and `--glyph-space-16`. Other pages can opt into the same token file without loading the preset runtime.

`GlyphDesign.catalog()` returns version 1 metadata with objects, motions, materials, behaviors and tokens. `GlyphDesign.preset(kind,id)` returns one independent descriptor. Catalog generation and factories live in `player/design-system.js`; generated files are checked by tests.

The Studio Designer reads the same catalog through the existing `glyph_studio_library` tool: `kind:"design-system"`, or a focused `object`, `motion`, `material` or `behavior` plus id. Object entries include a complete validated candidate scene without applying it. Flow and draft reads return behavior `presets` outside their persisted documents. Hermes and Codex retain their existing tool counts and mutation boundaries. No generated JavaScript is executed. The maintained geometry/composition/flow skills describe these capabilities and their distinct schemas.

The original player and flow bundles stay unchanged. The preset module is optional; the gallery loads it with the existing renderers. `dist/player-sizes.json` reports its separate byte/gzip cost. This is component evidence rather than a cross-device frame-rate qualification.

`node test-design.cjs` checks all supported default object/motion combinations, independent channels, loop closure, finite samples, tangent continuity, deterministic output, ID allocation, append immutability, limits, tokens, flow compatibility and authenticated HTTP discovery. `/design-check.html` runs the real gallery in an isolated browser fixture with mocked mutation endpoints: object previews, meaningful text/motion controls, invalid candidates, stale writes, append preservation, behavior patches, receiving before commit and geometry-only shuffle. Full studio, animal, Wasm, flow, provider and Hermes-loader checks remain separate regression evidence.


## Your own objects and animations

The [preset workshop](http://127.0.0.1:8788/presets) extends the library with prompt-created, data-only custom objects and motions. Hermes and Codex edit a separate preview draft; **Save new preset** persists a named variation. Custom entries appear below the built-in gallery and are discoverable by the designer. Reopen a copy, transfer a motion onto other geometry, apply an object to the current scene, or export its JSON. The renderer schema and built-in IDs remain unchanged. See [the preset/voice contract](preset-workshop.md) for persistence, version checks, role-based motion mapping, portability and dictation.

## Editable TypeScript components

The TypeScript designer at `/math#language` can write or edit components from typed or dictated prompts, automatically compile and preview accepted proposals, then save them in the shared custom library. Each component retains `.glyph.ts` source and a matching server-compiled module/manifest. Load & edit, save as variation, update and export work independently of existing JavaScript presets and scene recipes. See [TypeScript workflow and version guards](language.md).
