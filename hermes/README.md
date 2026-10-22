# Glyph Studio for Hermes

This bundle contains a native Hermes plugin, six reusable skills, and a local scene bridge. An agent turns conversational briefs into function calls; the bridge validates changes and updates the browser. The Local Hermes option in the studio and Zenith prompt panels uses an on-device model through a dedicated Hermes home. A separate Codex option can use your signed-in Codex CLI. It does not copy credentials or change your active Hermes profile.

The native registration and skill interfaces were checked against the installed Hermes **0.20.0** runtime. Development checkout reference: `7e8f50a14176e02b514631b0b04470acaadae32a`. See the [official plugin guide](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin).

## Prompt the Zenith version with an on-device model

From the `glyph-studio` folder:

```bash
python3 hermes/start.py
```

Open **http://127.0.0.1:8788/zenith**. Type a change and press **Apply change** or Command/Ctrl+Enter. The animation updates from the live saved scene. **Stop** cancels an in-progress turn; edits already applied remain visible. **Undo** restores the scene from before the last submitted prompt. Undo lasts for this bridge process and restores the whole recipe, including intervening composer edits.

The defaults use your installed Hermes Python and llama.cpp with the existing `~/Models/Qwen3.5-9B-Q4_K_M.gguf`. Nothing is downloaded. The launcher starts a loopback model server on port 8789 with a 64K context and one inference slot, then the editor on 8788. If the configured model server already runs, it reuses it. Ctrl+C stops services the launcher started. The model occupies several GB of unified memory while running.

For another existing GGUF or an already running OpenAI-compatible local model:

```bash
python3 hermes/start.py --model-file /absolute/model.gguf --model my-local-model --model-label "My local model"
python3 hermes/start.py --base-url http://127.0.0.1:1234/v1 --model local-model-id --model-label "Local model"
```

Use `--python /absolute/hermes/.venv/bin/python` if automatic runtime discovery is unavailable. `--configure-only` prepares the private runtime without starting either service. A server must report the model id supplied by `--model`, and must support tool calling and at least 64K context. The worker permits only loopback sockets; hosted-model fallbacks are blocked. Prompts and scene data stay on-device. The dedicated agent exposes nine scene functions or five flow functions, selected by target and skips global project instructions and memory.

The worker reads the current scene afresh for each prompt. It does not retain chat history; use named layers or explicit requests when referring to earlier edits. Prompt replies describe state verified with scene functions, not a visual screenshot review.

The on-device entry point is separate from the optional generic profile attachment below. It never reads another profile's auth store. Private model/runtime settings live in `.runtime/agent.json`; neither that directory nor `.hermes-home` is packaged in exports. To switch model settings, stop current jobs and restart the launcher.

## Start the composer with its bridge

From the `glyph-studio` folder:

```bash
node hermes/bridge.cjs --port 8788
```

Open the printed loopback URL. This is the connected composer; the standalone HTML remains an offline editor. The server prints the path to `.runtime/connection.json`, but never its token. Scene state is saved to `.runtime/scene.json`.

The connection file is a private local credential. Keep `.runtime/` out of repositories and exports. The browser uses the same-origin credential automatically. Native clients read the connection file on each call, so bridge restarts do not require reinstalling the plugin.

## Optional Codex designer

Run `npm run connect:codex`, then choose **Codex** in either prompt panel. This uses your installed Codex CLI and existing sign-in, separately from the Hermes worker and profile. Codex sends the prompt and current built recipe to its hosted model. It returns a scene proposal; the bridge validates it and rejects stale revisions before an atomic apply. See [setup and API compatibility](../docs/codex-connection.md). The Local Hermes option remains on-device and loopback-only.

## Attach a local agent or profile

Choose the exact Hermes home. The default home is commonly `~/.hermes`; a named profile is commonly `~/.hermes/profiles/NAME`. An existing profile retains its provider, credentials, skills, sessions and unrelated configuration. No agent or gateway is launched by installation.

Inspect the plan, then install using the Python environment supplied by Hermes when editing an existing YAML config:

```bash
python3 hermes/attach.py --home /absolute/hermes/home --connection /absolute/glyph-studio/.runtime/connection.json --dry-run
python3 hermes/attach.py --home /absolute/hermes/home --connection /absolute/glyph-studio/.runtime/connection.json
```

The helper installs `plugins/glyph-studio`, six discoverable skills under `skills/creative/`, enables the plugin, and adds the `glyph_studio` toolset to CLI without replacing its other toolsets. It backs up existing config and refuses to overwrite an unrelated installation. Use `--replace` to update a prior installation owned by this bundle.

`--designer-profile` additionally installs the maintained Studio Designer identity into that exact home and backs up existing `SOUL.md` and `studio-designer.json`. It does not switch Hermes’ active profile. The dedicated `start.py` home uses this flag automatically. See [profile and skills](../docs/studio-designer.md).

For a configured messaging gateway, add the explicit platform names with repeated `--platform` flags (for example `--platform cli --platform telegram`). Existing platform toolsets are preserved. If a platform has no configuration yet, configure it in Hermes first rather than guessing defaults.

Run a session against that home, using its existing model configuration:

```bash
python3 hermes/run.py --home /absolute/hermes/home -- chat
```

The same launcher accepts other Hermes commands, such as `gateway start`. Restart an existing agent/gateway after attachment so it discovers the new tools. For a fresh home, configure a model with Hermes setup before making inference calls. No provider or model credentials are included here.

## Functions

| Function | Operation |
|---|---|
| `glyph_studio_read` | Recipe, scene revision, frame/playback state, loop warnings |
| `glyph_studio_compile` | Directives → validated candidate; does not change the scene |
| `glyph_studio_library` | Maintained profile, skill instructions, preset candidates and animal references |
| `glyph_studio_audit` | Validate saved/candidate recipe, loop warnings, counts and finite geometry; no mutation |
| `glyph_studio_apply` | Replace the scene with a validated recipe |
| `glyph_studio_update` | Merge changes into one named surface or object |
| `glyph_studio_add` | Add a partial definition using renderer defaults |
| `glyph_studio_remove` | Remove a target; reject a surface with attached layers |
| `glyph_studio_preview` | Select a reproducible frame and return geometry bounds |

All scene mutations require `expected_revision` from the latest read. Conflicts return `revision_conflict` and leave the scene untouched. Arrays replace whole arrays. Ids cannot be renamed through update. Send built scene publishes the currently built recipe, not unbuilt directive text. The browser preserves unbuilt editor/form changes when an agent update arrives, then offers **Use agent scene** or **Send built scene**.

`preview` controls the viewport and reports geometry, not a rendered image. Visual QA still requires looking at the composer. Local clock playback is anchored when the play state changes; exact reproduction uses frame numbers.

## Skill and fallback

Load `glyph-studio` through normal skill discovery after installation, or explicitly load the plugin's `glyph-studio:design` skill. Both are packaged from the same source. The plugin also registers `glyph-studio:glyph-surfaces`, `glyph-studio:glyph-biomotion` and `glyph-studio:glyph-review` , `glyph-studio:glyph-flow` and `glyph-studio:glyph-typescript`; corresponding folders support normal skill discovery. The dedicated worker injects the maintained identity, workflow and relevant skills automatically.

Without the plugin, the skill can use its dependency-free CLI helper:

```bash
export GLYPH_STUDIO_CONNECTION=/absolute/glyph-studio/.runtime/connection.json
printf '{}' | python3 hermes/plugin/glyph-studio/client.py glyph_studio_read
```

The helper only connects to `127.0.0.1`, disables proxy use and redirects, and never returns the connection token. No remote MCP server, cloud publishing or external agent calls are required.

## Verification

```bash
node test-scene.js
node test-surfaces.js
node hermes/test-bridge.cjs
node hermes/test-agent-jobs.cjs
python3 hermes/test-attach.py
```

`hermes/test-native.py` additionally checks actual Hermes plugin loading and tool dispatch when run with the Python environment installed with Hermes. It uses a temporary home and does not invoke a model or start a gateway.

The `/flow` panel edits staged flow documents and queues typed method calls. Programmer-defined interfaces and browser receipts are documented in [functional components](../docs/functional-components.md). The full reusable plugin registers 14 tools; the dedicated worker advertises only the current target’s tools.

The existing library tool now reads the shared design system with kind design-system/object/motion/material/behavior. Object entries include normal scene candidates without applying them; flow/draft reads include behavior presets outside the stored document. See ../docs/design-system.md for the API and schema distinctions.
