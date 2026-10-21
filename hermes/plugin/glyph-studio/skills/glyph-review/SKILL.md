---
name: glyph-review
description: Review a Glyph Studio recipe for validation, loop seams, sampling density and independence; use when checking or completing a scene change.
---
# Reproducibility and review

Use `glyph_studio_audit` for the saved recipe, or supply `recipe_json` to inspect a candidate without applying it. Address validation failures before a commit. Treat density and byte counts as analytic information; they do not measure rendering speed.

Read loop warnings in the context of the brief. A user may intentionally choose a fractional turn or a non-closing glyph phase. Explain that effect rather than silently changing the requested motion. Preserve the seed and frame convention when comparing revisions.

After a Hermes mutation, read back the actual saved state and audit it. Select a frame with preview only when it helps; it returns bounds, not a screenshot. Codex audits its proposed data and leaves the actual commit to the bridge.

For visual quality, require actual browser or image evidence from an available authorized viewer. For performance, require a measurement on the target browser/device. If those tools are absent, report the analytic result and the remaining check plainly. Do not invent FPS, claim photorealism from a glyph count, or call a loop warning a measured visual failure.
