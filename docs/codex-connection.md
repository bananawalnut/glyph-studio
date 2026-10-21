# Codex in Glyph Studio

The studio's **Prompt** tab and the Zenith prompt panel share the same designer picker. **Local Hermes** preserves the existing on-device worker. **Codex** starts a separate bounded Codex CLI request using its existing sign-in.

## Setup

Install and sign in to Codex CLI, then run:

```bash
npm run connect:codex
npm run dev
```

For both designers, use `npm run dev:agent` after connecting Codex. The model server is only needed for Local Hermes. Codex does not run through Hermes or change its profile.

`connect-codex.cjs` discovers Codex on PATH, checks `codex login status`, and writes `.runtime/codex.json` with mode `0600`. `--binary` chooses an explicit executable; `--model` optionally chooses an accessible model ID. Without `--model`, Codex uses its CLI default, not a model guessed by the studio. Remove or disable that private config to disconnect it. Do not commit runtime files.

## Data and behavior

The Codex selection sends the user's prompt and the current built recipe to Codex using its signed-in account. The UI identifies this connection before submission. The maintained Studio Designer identity, workflow, selected skills and scene contract are included. No screenshot, local source tree, private Hermes configuration, agent history or bridge token is included in the prompt. Scene strings and meanings are explicitly treated as design data, not instructions.

The worker uses an empty temporary working folder, ignores user configuration, disables shell/browser/apps/plugins/hooks/multi-agent features and uses a read-only sandbox. A private stdio MCP adapter exposes four read-only tools in scene scope: `glyph_studio_read`, `glyph_studio_compile`, `glyph_studio_library` and `glyph_studio_audit`. The adapter reads the local connection file itself and only calls the loopback bridge; the model cannot request arbitrary URLs or files. Only this MCP server is configured for the run. The CLI produces structured output with a message and a JSON scene string. Only the bridge may apply the proposal. Temporary request output is removed at completion; ephemeral mode avoids local session rollouts. Normal Codex account service behavior still applies.

This is a CLI integration, not a message sent into an existing desktop chat. The implementation follows the [official non-interactive mode documentation](https://developers.openai.com/codex/noninteractive) for structured output and ephemeral runs, and was checked against the installed CLI's supported flags. The scoped read-only tools are automatically approved through per-run MCP configuration; no sandbox-bypass flags are used. See the [official MCP configuration documentation](https://developers.openai.com/codex/mcp).

The bridge validates the returned scene, compares its starting revision and commits once. A cancelled process, an invalid scene or a newer editor revision prevents the proposal from applying. Codex undo also checks for later edits so it does not replace them. Local Hermes retains its established tool behavior; it can apply incremental changes before Stop. Both share one job slot and the existing Stop/Undo controls.

## Additive HTTP contract

All routes retain the existing bearer token and loopback host/origin protections.

```text
GET  /api/agent                     # legacy default: Hermes
GET  /api/agent?provider=hermes
GET  /api/agent?provider=codex
POST /api/agent {"prompt":"…"}      # legacy default: Hermes
POST /api/agent {"prompt":"…","provider":"codex"}
POST /api/agent/cancel {}
POST /api/agent/undo {}
```

Existing status fields remain. Added `selectedProvider` and `providers` describe the two choices. Jobs add their `provider` ID. The additive `designer` field supplies the shared public profile, skills and provider-specific tool lists. Existing `profile` remains unchanged for older clients. Selecting a provider does not change the persisted recipe or global agent profile. Invalid provider IDs return `400`; missing connection settings return `503`; overlapping jobs and stale undo return `409`.

The scene schema remains unchanged, and both legacy and v2 recipes still validate with the same engine. Unbuilt directive/inspector edits block a new studio prompt until built; incoming agent updates continue to offer the existing conflict resolution controls. Codex is not an animal-geometry editor: the separate `<glyph-animal>` studies are still edited in their source files.

## Verification

`hermes/test-codex.cjs` covers provider selection, legacy default behavior, invalid/stale proposals, cross-provider concurrency, cancellation races, undo after newer edits, both page entry points and worker restrictions. `hermes/test-designer.cjs` additionally checks shared Python/JavaScript skill routing, exported tool-schema parity, library lookup boundaries, legacy/v2 audits and real stdio MCP calls with mutation rejection. The existing Hermes, attachment and scene tests remain in `npm test`. A live Codex connection check returned an unchanged, validated scene, followed by a browser check through the studio's Prompt tab.

## Flow proposals

The `/flow` prompt sets `target:flow`. Its scoped MCP exposes only `glyph_flow_read` and `glyph_flow_validate`. The response includes `message`, `flow_json` and `calls_json`. Calls are data-only `{id,component,method,payload}` values; the bridge queues them after validating the complete proposal against its original revision. The browser animates each invocation and the bridge validates its exact resulting receiving state before persisting a receipt. Queueing does not claim delivery. Scene scope and the older request shape are unchanged.
