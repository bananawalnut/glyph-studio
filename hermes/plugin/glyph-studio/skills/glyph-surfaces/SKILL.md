---
name: glyph-surfaces
description: Design Glyph Studio carrier surfaces, mapped text and cubic paths when geometry, topology or independent object motion is part of the brief.
---
# Geometry and paths

Choose the carrier separately from what lies on it. Sphere, torus, cylinder, plane and wave are available; general mesh import is not. A text band, scatter or curve can share a host with other layers. Use stable IDs for host/layer relationships.

Rotate the host when all mapped marks should turn with the surface. Use flow to move a band or curve along its carrier. Use hold/flicker/stream to change characters independently of shape motion. Avoid a whole-scene swirl unless the brief asks for one.

A mapped cubic uses four UV controls on the named carrier. A free cubic uses four XYZ controls and does not need a host. On a closed U direction, crossing the seam is different from jumping between endpoints. Prefer whole turns and flows for loops; preserve fractional motion when the user intends a non-looping study and report its seam warning.

Read the maintained capability routing with `glyph_studio_library(kind="profile")` for capability routing, and `glyph_studio_library(kind="preset")` for a starting composition. Compile a candidate before replacing a recipe. Review mapped-host dependencies before removing or reshaping a surface. This skill does not add new renderer geometry types.

Use the shared design system before inventing another primitive. `glyph_studio_library(kind="design-system")` lists object, motion, material and component-behavior presets plus tokens. `kind="object", id="ribbon"` (or helix/spiral/sphere/etc.) returns a normal validated scene candidate; it is not applied. Preserve the current composition and its clock when combining candidates, allocate unique host/layer IDs, and keep total surface/layer limits. Motions carry explicit channel/settings data: rotation, offset, path flow and glyph change can combine; conflicting presets in one channel cannot. Text belongs on mapped bands/curves; free cubic traces use particles and flow carries their light pulse. The catalog declares text/flow/particle capabilities. Presets expand into the existing recipe schema, not new renderer geometry types.


## Programmable math and component code

The fixed recipe palette is a convenient data interface, not the full programmer API. For authored functions, request `glyph_studio_library(kind="program")` for the API and real example source. `GlyphProgram.Surface`, `Path`, `Layer`, `Composite` and `BufferGeometry` accept ordinary application code with exact parameter domains, optional derivatives, custom deformations and nested mat4 transforms. Program sample contexts provide phase, time, seed, immutable params and keyed random. Sample functions must return finite vectors; raw writers fill typed buffers. Nonperiodic functions do not become periodic merely because playback loops.

Programmer-owned component interfaces, handlers and organizers remain ordinary code. Custom transition callbacks and registered strategy parameter contracts support new semantics instead of forcing built-in handler/layout names. Scene JSON and preset saves cannot serialize functions. A repository coding agent authors trusted modules and tests; the scene/flow recipe targets only read the API and configure registered data behaviors. The separate program target at /math writes complete self-contained function create(A,F) source, including ComponentInterface, initial state, organizer and custom motion. Return {message,source_js}; use no tools, imports, DOM, networking or external libraries. Return {program,component?,params?} from create. Preserve unrelated code on edits. The host syntax-checks a staged proposal; the opaque worker preview checks finite samples and typed calls. The user runs the preview and saves or updates a reusable code preset. Do not claim execution, visual review or saving from generation alone. Do not claim to have installed or executed a new module through recipe tools. Reuse the program source plus parameter data for reproducibility, not its renderer descriptor alone.
