# Glyph Studio

A local tool for reproducible 3D glyph animations. Compose sparse shells, text signals, flickering glyphs and cubic Bézier ribbons, with independent geometry and motion. The included Zenith / Open Consultancy scene uses a dim cross sphere and a thin cyan text ring rotating in opposite directions.

## Run the dev server

Requires Node.js 18 or newer. The browser tool has no npm dependencies and needs no build step.

```bash
git clone https://github.com/bananawalnut/glyph-studio.git
cd glyph-studio
npm run dev
```

- Composer: http://127.0.0.1:8788/
- Zenith: http://127.0.0.1:8788/zenith

The server binds to `127.0.0.1` only. Edit `dist/` and refresh the page. The authenticated local bridge saves the working scene in `.runtime/scene.json`; a first run starts with the Zenith preset. Both views show the same live scene. Choose another preset in the composer to explore the other geometries.

## Prompt changes with local Hermes

Stop the plain dev server, then run:

```bash
npm run dev:agent
```

This starts the same editor with an on-device Hermes designer. It requires an installed [Hermes Agent](https://github.com/NousResearch/hermes-agent), [llama.cpp](https://github.com/ggml-org/llama.cpp), Python 3.10 or newer, and local model weights. No weights are downloaded or included in this repository. The default is `~/Models/Qwen3.5-9B-Q4_K_M.gguf`; see [local model and plugin setup](hermes/README.md) for other paths and endpoints.

The Zenith prompt box supports Apply change, Stop, and Undo. The worker exposes only seven scene functions, uses a dedicated `.hermes-home`, and blocks non-loopback network connections. It does not use your hosted model credentials. Each prompt reads the current scene; chat history is not retained. Local inference may take about a minute, especially for the first prompt.

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

Exports are written to ignored `releases/`: standalone composer and Zenith HTML, the Zenith JSON recipe, and portable source/plugin ZIPs. `python3 build.py --output /absolute/directory` chooses another export location. Building needs only standard-library Python.

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
| `build.py` | Standalone exports and portable packages |

This project runs independently of GPT Sites. Private runtime state, tokens, local Hermes homes and model weights are ignored by Git and excluded from exports. Public source does not include your working scene or agent conversations.
