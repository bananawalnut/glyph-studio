# Studio Designer

The studio has one maintained procedural motion designer, available through Local Hermes or Codex. The shared source is `hermes/plugin/glyph-studio/designer/`: `profile.json` declares capabilities and skill routing, `SOUL.md` defines voice and disposition, and `WORKFLOW.md` defines scene practice. These are project files, separate from private model settings.

## Skills

| Skill | Focus | Loaded |
|---|---|---|
| `glyph-studio` | Named layers, coherent composition and recipe edits | Every turn |
| `glyph-surfaces` | Carrier surfaces, UV mapping, independent geometry and cubic paths | Matching geometry/path terms |
| `glyph-biomotion` | Anatomy, distinct locomotion and research/approximation boundaries | Matching animal/movement terms |
| `glyph-review` | Validity, loop closure, density and honest verification | Every turn |

Selection matches whole terms, case-insensitively, against the current prompt. Explicitly naming a skill also selects it. Hermes and Codex assemble the same context using Python and JavaScript implementations checked for parity. The plugin packages all four skill folders for normal Hermes discovery as well.

The designer reads the saved scene afresh. Cross-turn conversational memory is off. Durable direction belongs in the maintained profile/workflow or the scene’s named layers and meanings. Zenith’s Shell + Signal aesthetic is contextual, not imposed on every project.

## Tools and execution

Hermes receives nine native functions: read, compile, apply, update, add, remove, preview, audit and library. Scene writes require the current revision. Its dedicated worker is restricted to the local model and loopback bridge.

Codex receives four read-only MCP functions: read, compile, audit and library. It returns a complete candidate recipe; the bridge validates and applies it atomically against the original revision. A revision conflict preserves newer editor changes. The MCP adapter uses a private local connection file, without returning its token. The per-run configuration leaves global Codex settings alone.

`glyph_studio_library` accepts a fixed kind (`profile`, `skill`, `preset`, `animal`) and optional known id. It never accepts a path. Presets return candidate recipes, without applying them. The six animal entries include motion references, anatomy counts and explicit editability limits.

`glyph_studio_audit` checks the saved scene or optional `recipe_json`. It returns validity, loop warnings, point counts, finite frame-zero geometry, seed, loop frames and approximate recipe size. This is an analytic check, not a rendered screenshot or performance measurement. Invalid recipes return `valid:false`; the saved scene is untouched.

The animal library describes the existing Anima components. These tools cannot alter their separate procedural source or research new studies. An animal brief can produce a concrete implementation plan without falsely claiming an animal edit.

## Installation and review

`npm run dev:agent` installs the maintained identity into the project’s dedicated `.hermes-home`. Attaching the plugin to another Hermes home preserves its identity unless `attach.py --designer-profile` is explicitly selected; that option backs up existing identity files. Neither installation switches the globally active profile or copies provider credentials.

Open **Studio Designer · profile & skills** in the studio Prompt tab or the Zenith prompt panel. It shows the shared role, four skills, effective tool boundary and memory behavior. Provider selection still controls where inference happens.

Live profile checks were completed through both providers: each used the profile library and analytic audit tools while preserving the saved Zenith scene at revision 19.

Run `npm test` for engine, API, lifecycle and designer integration checks. Run `hermes/test-native.py` using Hermes’ Python for real plugin registration and dispatch without inference. The packaged source ZIPs include the maintained profile, skills, both context assemblers and MCP adapter; private runtime/profile state is excluded.
