---
name: glyph-surfaces
description: Design Glyph Studio carrier surfaces, mapped text and cubic paths when geometry, topology or independent object motion is part of the brief.
---
# Geometry and paths

Choose the carrier separately from what lies on it. Sphere, torus, cylinder, plane and wave are available; general mesh import is not. A text band, scatter or curve can share a host with other layers. Use stable IDs for host/layer relationships.

Rotate the host when all mapped marks should turn with the surface. Use flow to move a band or curve along its carrier. Use hold/flicker/stream to change characters independently of shape motion. Avoid a whole-scene swirl unless the brief asks for one.

A mapped cubic uses four UV controls on the named carrier. A free cubic uses four XYZ controls and does not need a host. On a closed U direction, crossing the seam is different from jumping between endpoints. Prefer whole turns and flows for loops; preserve fractional motion when the user intends a non-looping study and report its seam warning.

Read the maintained capability routing with `glyph_studio_library(kind="profile")` for capability routing, and `glyph_studio_library(kind="preset")` for a starting composition. Compile a candidate before replacing a recipe. Review mapped-host dependencies before removing or reshaping a surface. This skill does not add new renderer geometry types.
