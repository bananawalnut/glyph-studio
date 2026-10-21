# Glyph Studio

A local tool for reproducible 3D glyph animations. Compose sparse shells, text signals, flickering glyphs and cubic Bézier ribbons, with independent geometry and motion. The included Zenith / Open Consultancy scene uses a dim cross sphere and a thin cyan text ring rotating in opposite directions.

## Work tracking

DevGraph is the canonical tracker: **Front-end tools and component libraries** (`frontend-tools-components`) → **Glyph component library** (`glyph-component-library`) → **Functional content components and responsive handoffs** (`glyph-functional-handoffs`). Arena placement and a separate ongoing-work kind remain open organizational decisions.

## Functional component handoffs

Open **http://127.0.0.1:8788/flow** after starting the dev server. Glyph Flow adds optional native components that accept structured content, validate input/output contracts, organize content through pure function hooks and animate immutable data copies between components. The receiving component chooses its own structure and commits only after arrival. The demo includes a draggable obstacle, a moving receiver, different signatures and invalid-input rejection.

Use the separate `dist/glyph-flow.js` module; the original player payload and saved scenes stay unchanged. See [the API, delivery semantics and current limits](docs/functional-components.md).

## Embed it as a Web Component

The default renderer is now WebGL2 with GLSL shaders and a glyph atlas, with Canvas 2D as a fallback. A standalone component attaches normal HTML content and buttons to points in the scene:

```html
<script src="glyph-player.js" defer></script>
<glyph-scene src="scene.json" geometry="wasm">
  <glyph-anchor object="shell" position="1.3 0 0">
    <button>Open a conversation</button>
  </glyph-anchor>
</glyph-scene>
```

Copy the player and scene JSON; include `glyph-core.wasm` next to the player when using `geometry="wasm"`. Omit that attribute for the smallest initial payload. The optional Rust module compiles geometry once per load/edit; GPU shaders animate it without per-glyph JavaScript work. No editor or agent runtime is shipped to visitors.

See [component API, constraints and performance notes](docs/web-components.md). With the dev server running, open [the component demo](http://127.0.0.1:8788/components.html) or [the browser benchmark](http://127.0.0.1:8788/benchmark.html).

## Run the dev server

Requires Node.js 18 or newer. The browser tool has no npm dependencies and needs no build step.

```bash
git clone https://github.com/bananawalnut/glyph-studio.git
cd glyph-studio
npm run dev
```

- Composer: http://127.0.0.1:8788/
- Zenith: http://127.0.0.1:8788/zenith
- Betta study: http://127.0.0.1:8788/betta
- Anima animal lab: http://127.0.0.1:8788/animals

The server binds to `127.0.0.1` only. Edit `dist/` and refresh the page. The authenticated local bridge saves the working scene in `.runtime/scene.json`; a first run starts with the Zenith preset. Both views show the same live scene. Choose another preset in the composer to explore the other geometries.

## Betta study

A separate violet glyph fish, with a rounded body, a broad caudal fan, and independently rippling dorsal, anal and pectoral fins. Drag to turn it, pause the motion, restore its profile, or save a transparent PNG frame. Reduced motion starts the study paused.

`dist/betta-geometry.js` generates 4,755 seeded glyph instances from an ellipsoid, a scalloped fan and cubic Bézier fin patches. `dist/betta.js` animates those static instances in GLSL with one WebGL2 draw call, a 30 fps ceiling, a 12-second loop and a device pixel ratio capped at 1.5. The animation sleeps while paused or hidden. There are no libraries, model calls or image assets. It needs WebGL2.

This study has its own procedural geometry and does not change the v2 recipe contract or your working Zenith scene. The Hermes scene functions currently edit the composer and Zenith recipes; the fish is edited in its two source files. Seed and frame reproduce geometry and motion; pixels also depend on the font, browser and viewport.

## Anima animals

The [animal lab](http://127.0.0.1:8788/animals) builds out Anima’s six identities: paired fish, jellyfish, ray, koi, sea angel and betta. Each has its own anatomy and swimming pattern, with hover/roaming behavior, three detail levels, glyph/particle surfaces, directional light and a PNG frame export. The reusable `<glyph-animal>` component runs independently of the editor and agent. See [embedding, movement research and limitations](docs/animal-studies.md). These are kinematic interpretations; the implementation does not simulate fluid forces.

## Prompt changes with local Hermes

Stop the plain dev server, then run:

```bash
npm run dev:agent
```

This starts the same editor with an on-device Hermes designer. It requires an installed [Hermes Agent](https://github.com/NousResearch/hermes-agent), [llama.cpp](https://github.com/ggml-org/llama.cpp), Python 3.10 or newer, and local model weights. No weights are downloaded or included in this repository. The default is `~/Models/Qwen3.5-9B-Q4_K_M.gguf`; see [local model and plugin setup](hermes/README.md) for other paths and endpoints.

The Zenith prompt box supports Apply change, Stop, and Undo. The scene worker exposes nine studio functions; the flow worker exposes five flow functions, uses a dedicated `.hermes-home`, and blocks non-loopback network connections. It does not use your hosted model credentials. Each prompt reads the current scene; chat history is not retained. Local inference may take about a minute, especially for the first prompt.

## Studio Designer profile

Both connections load the same maintained identity and five skills: scene composition, geometry and paths, animal motion, reproducibility/review, and functional flows. Scene composition and review load for scene turns; flow turns load the flow skill. The other skills load for matching scene briefs. Open **Studio Designer · profile & skills** in either prompt panel to inspect the role, skills and current provider’s tools. The profile uses the saved scene or flow, without cross-turn chat memory.

See [the profile, skill routing and tool boundary](docs/studio-designer.md). Animal references can inform a plan; their procedural source is not editable through scene recipes.

## Prompt changes with Codex

Codex is an additional designer in the studio’s **Prompt** tab and the Zenith prompt panel. Local Hermes remains available in the same **Designer** picker. With an installed, signed-in Codex CLI:

```bash
npm run connect:codex
npm run dev
```

Use `npm run dev:agent` instead to run both Codex and on-device Hermes. The connection command checks Codex sign-in and stores only its executable path and optional model choice in private `.runtime/codex.json`; it does not copy credentials or alter your Codex configuration. Add `-- --binary /absolute/path/to/codex` if it is not on PATH. An optional `-- --model MODEL_ID` selects a model you already have access to; otherwise the CLI default is used.

Selecting Codex sends the prompt and current built scene (or current flow on `/flow`) to your signed-in Codex account. It proposes a complete scene in a bounded, ephemeral CLI run. The local bridge validates that scene and applies it atomically only if its starting revision is still current. Codex can use four read-only studio MCP tools for scene reads, directive compilation, library lookup and analytic audits. Its model gets no bridge token; the private MCP adapter reads that credential locally. The run disables shell, browser, apps, plugins and hooks and uses a read-only sandbox. Failed, cancelled or stale proposals do not mutate the scene. Undo rejects intervening edits after a Codex change. Both designers share one job slot so they cannot edit simultaneously.

Requests without a `provider` still use Hermes, preserving older clients. The on-device Hermes worker remains loopback-only. The v2 recipe format and animal components are unchanged. See [Codex connection and request contract](docs/codex-connection.md).

## Shared design system

Open [the design library](http://127.0.0.1:8788/design) for 10 object presets (including mapped ribbons, helices and spirals), 9 motion choices, 4 materials and 8 component behaviors. Preview, combine motion with material/content, download baked recipes, append an object to the current scene, or apply layout/receiving settings to a selected flow component. Shared color, spacing, type and timing tokens are included. The Studio Designer discovers the same catalog; the core player stays unchanged. See [presets, API and compatibility](docs/design-system.md).

## Component interfaces and flow design

[Glyph Flow](http://127.0.0.1:8788/flow) now supports programmer-owned named methods and typed results, such as `source.api.add(record)`. Components own state, handlers, contracts, native HTML and visual organizers. The shared transport animates method input and commits on arrival. Programmer subclasses and custom pure handlers work through the same API.

**Shuffle source** reorders the real array with seeded geometry motion. Source geometry settings can shatter overfull words into letters over the sphere, and re-form them without changing their records. The array strip displays the committed order.

Words in Source field are clickable: their letters travel to Category clusters, pass through its own receiving process, then settle under their category. The source retains its copy. The flow page includes a native word form with hopping letters and a configurable receiving animation, a method console, a JSON flow editor, and prompt editing with Hermes or Codex. Designers can create/edit components, interfaces, contracts, layouts and connections using registered strategies, or queue animated method calls. Flow edits are staged and revision-checked; a call is delivered only after browser receipt. The saved scene remains separate. See [interfaces, protocol, document format and boundaries](docs/functional-components.md).

## Scene model

- **Surfaces:** sphere, torus, cylinder, plane, or wave.
- **Mapped glyphs:** grid, band, seeded scatter, or a surface Bézier curve, attached to a named surface.
- **Independent objects:** free 3D Bézier ribbons and screen-space rain.
- **Independent behavior:** transforms, rotation, flow, bob, and hold/flicker/stream glyph changes.

Scenes are seeded JSON recipes. The same recipe and frame reproduce geometry and characters; identical pixels additionally require a fixed font, renderer, browser and canvas size. Whole-number turns and flows close the animation loop. The [agent guide](dist/agent-guide.txt), [schema](dist/scene.schema.json), and [presets](dist/presets) describe the contract.

```text
loop 12s; seed 42
body: shape torus; radius 0.95; tube 0.42; rotate x 1
code: glyphs; on body; pattern grid; count 420; flicker 8; white
telemetry: glyphs; on body; pattern band; text "SIGNAL / "; flow -1; mint
energy: bezier; rainbow; flow 1; size 7
```

## Validate and export

```bash
npm test
npm run build
```

Exports are written to ignored `releases/`: standalone composer, Zenith, Betta and Anima animal HTML, the Zenith JSON recipe, and portable source/plugin ZIPs. `python3 build.py --output /absolute/directory` chooses another export location. Building needs only standard-library Python.

Optional native plugin validation, using Hermes' virtualenv Python:

```bash
/path/to/hermes/.venv/bin/python hermes/test-native.py
```

## Source layout

| Path | Purpose |
| --- | --- |
| `dist/` | Browser source, rendering engine, schema and presets |
| `hermes/bridge.cjs` | Local dev server and validated scene functions |
| `hermes/agent-worker.py` | Restricted on-device Hermes turn |
| `hermes/plugin/glyph-studio/` | Reusable Hermes plugin and skill |
| `hermes/start.py` | Local model and editor launcher |
| `player/` | Dependency-free Web Component and WebGL2 player source |
| `rust/glyph-core/` | Optional, allocation-free Rust/Wasm geometry compiler |
| `scripts/` | Player build and geometry benchmark |
| `build.py` | Standalone exports and portable packages |

This project runs independently of GPT Sites. Private runtime state, tokens, local Hermes homes and model weights are ignored by Git and excluded from exports. Public source does not include your working scene or agent conversations.


### Prompt-created presets and local dictation

Open [Preset Workshop](http://127.0.0.1:8788/presets) to ask the Studio Designer (local Hermes or Codex) for new objects or animations. Both providers edit a separate revision-checked draft. Preview it, name it, choose Object or Motion, and click **Save new preset**. Saved entries also appear in the [design system](http://127.0.0.1:8788/design). Reopen a copy for refinement, apply to the current scene, or export portable JSON. See [preset and voice contracts](docs/preset-workshop.md).

Every designer prompt field includes **Dictate**. It records only after a click, stops after 59 seconds, transcribes through local Whisper, and inserts text for review without sending the prompt. Connect an existing Python environment containing `openai-whisper` and a local `.pt` model:

```sh
npm run connect:voice -- --python /absolute/path/to/venv/bin/python --model /absolute/path/to/tiny.pt
```

`ffmpeg` must be installed (`--ffmpeg /absolute/path/to/ffmpeg` overrides detection). Setup downloads nothing. Microphone permission belongs to your browser. Audio is temporary and removed after processing. Your selected designer provider receives text only when you submit. Dictation runs in the local dev server; standalone HTML previews remain offline without agent or recording services.


### Programmable math and component logic

Open [Math & logic lab](http://127.0.0.1:8788/math) for code-defined surfaces, mapped paths, independent composites and a typed component that deforms geometry on receipt. The optional `glyph-program.js` API accepts ordinary functions, analytic/numeric derivatives, nested mat4 transforms, deformations and direct typed-buffer writers. Component interfaces own their methods, handlers, organizers and custom transition callbacks. Registered behaviors can declare typed `params` rather than only use predefined setting names.

Read [the programmer API](docs/programmable-geometry.md) and [authored examples](dist/math-examples.js). These are application modules a coding agent can edit and test. Existing scene/preset JSON stays compatible; it does not serialize or execute function bodies. CPU math sampling feeds the existing WebGL2 instancing pipeline, with Canvas fallback. Custom Wasm writers can fill the buffer ABI; arbitrary JS is not automatically compiled into Wasm/GLSL.
