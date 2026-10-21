---
name: glyph-studio
description: Design or edit reproducible Glyph Studio animations with independent surfaces, glyph patterns, Matrix behavior, and cubic Bezier paths. Use for scene composition and named layer edits in the local composer.
metadata:
  hermes:
    tags: [creative, animation, glyph-studio]
---

# Glyph Studio

Translate the user's visual brief into a saved scene recipe. Read the current scene before editing. Preserve stable ids, meanings, and unrelated objects.

## Model the scene

- A **surface** is a carrier: sphere, torus, cylinder, plane, or wave. Its transform and motion move all attached layers.
- A **mapped object** places a grid, text band, seeded scatter, or UV cubic curve on a named surface. Many objects can share a carrier.
- Glyph hold/flicker/stream behavior is separate from geometry and motion. Flicker regenerates characters at fixed positions.
- Mapped layers use identity transforms and zero rotation/bob. Rotate the host; use flow for a band or curve. This keeps glyphs on the actual surface.
- A free 3D Bezier ribbon and screen-space rain are independent objects without a host. Do not attach or rotate everything together unless requested.

Read [the scene contract](references/scene-contract.txt) for parameters, UV mapping, shape limits and legacy compatibility. Start from [the example](references/example-scene.json) when designing a new composition; [the schema](references/scene.schema.json) describes the complete recipe.

## Use the functions

Use `glyph_studio_library` to inspect the maintained profile, a skill, or an existing preset before inventing recipe fields. The two providers share these instructions but have different execution tools.

For Local Hermes:

1. Read with `glyph_studio_read`; retain `revision`.
2. For a small change, call `glyph_studio_update` with the target kind/id, a minimal `changes` object and `expected_revision`. Arrays replace whole arrays. For new elements, use `glyph_studio_add` with a partial definition; renderer defaults supply omitted fields.
3. For a new composition, compile directives with `glyph_studio_compile`, inspect errors/warnings, then send its returned `scene` to `glyph_studio_apply` with the current revision.
4. Select a frame with `glyph_studio_preview`. It returns geometry bounds, not pixels. Inspect the browser when visual judgment is required; do not claim a visual review from bounds alone.
5. Read again and use `glyph_studio_audit` to verify the requested state. Report changed objects, any loop-seam warnings and whether visual inspection occurred.

For Codex, use the read-only `glyph_studio_read`, `glyph_studio_compile`, `glyph_studio_library` and `glyph_studio_audit` MCP tools. Return the complete scene proposal through the structured response; the bridge checks and applies it once. Mutation and playback tools are unavailable in this connection.

A `revision_conflict` means the user or another client edited the scene. Re-read and reconcile the requested change; do not repeatedly resend a whole stale recipe. Validation failures leave the scene untouched.

For a separately attached Hermes agent with terminal access, the bundled helper accepts the same function names and JSON arguments on stdin:

```bash
printf '{}' | python3 scripts/client.py glyph_studio_read
```

`GLYPH_STUDIO_CONNECTION` identifies a private local connection file. Do not print its contents or put its token in prompts, URLs, exports or scene metadata. If the bridge is offline, report that it needs starting; do not invent a connection or choose a different agent profile.

## Example brief

“A rotating torus carrying flickering code and a counterflowing telemetry band; a rainbow ribbon remains still while light flows along it.”

```text
loop 12s; seed 42
body: shape torus; radius 0.95; tube 0.42; rotate x 1
code: glyphs; on body; pattern grid; count 420; flicker 8; white
telemetry: glyphs; on body; pattern band; text "SIGNAL / "; flow -1; mint
energy: bezier; rainbow; flow 1; size 7
```

Use whole-number turns and flow for geometric loop closure. Reproduction requires the same recipe and frame index; pixel-identical output also requires fixed renderer, font, browser and canvas dimensions.

The shared design system is available through `glyph_studio_library(kind="design-system")`; inspect `object`, `motion`, `material` or `behavior` with an id for a focused entry. Object presets return validated scene candidates without applying them. Reuse these for standard shapes and motion, preserve unrelated layers and content, and distinguish local preview from a committed edit.
