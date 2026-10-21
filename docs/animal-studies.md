# Anima living glyph studies

Run `npm run dev`, then open `/animals`. This library covers all six identities found in Anima's landing-page source on October 20, 2026: `pisces`, `jellyfish`, `ray`, `koi`, `sea-angel` and `betta`. The first four occur in its main species list; the last two are additional selectable studies. Pisces is a paired-fish motif, not a biological species. The original landing page is being edited separately; this package does not change it.

## Embed

Copy these four scripts together, preserving their order:

```html
<script defer src="betta-geometry.js"></script>
<script defer src="life-geometry.js"></script>
<script defer src="life-motion.js"></script>
<script defer src="life-player.js"></script>
<glyph-animal species="sea-angel" behavior="roam" detail="1"
              style="display:block;width:100%;height:500px"></glyph-animal>
```

There is no framework or model runtime. The Betta generator is reused rather than replaced. These anatomy studies are separate from the v2 composer recipe and its Hermes scene tools. They can be embedded as components now; the Hermes functions do not yet edit their geometry.

| Attribute | Values / default |
| --- | --- |
| `species` | The six IDs above; default `sea-angel` |
| `detail` | `.7`, `1`, `1.35`; default `1` |
| `behavior` | `hold` (default), `roam` |
| `appearance` | `glyphs` (default), `particles` |
| `speed` | `.25`–`2`; default `1` |
| `light` | `.6`–`1.8`; default `1.15` |
| `paused` | Boolean attribute |

Drag to turn; arrow keys turn; space pauses. `resetView()` restores the front view; `saveFrame()` returns a transparent PNG data URL. `geometrychange` and `playchange` events notify a host UI. The element owns and releases its WebGL buffers and listeners when disconnected and rebuilds them when reconnected. It respects reduced motion, off-screen visibility and hidden tabs. There is a clear unavailable message if WebGL2 cannot start; this study has no Canvas fallback.

`AnimalGeometry.generate(id, {seed:2801,detail:1})` returns a packed `Float32Array`. `AnimalMotion.deform(point,phase)` is a CPU reference for the anatomical motion, before camera and composition transforms. `AnimalMotion.path(phase)` samples a closed cubic B-spline and its tangent. The 24-second cycle closes at 720 logical frames; the display caps draws at 30 per second, including accelerated playback. Each element makes one instanced glyph draw per frame. Geometry uploads happen on species/detail edits, not on animation frames. DPR is capped at 1.5. Multiple embedded elements each create their own context; use a modest visible count.

## Movement evidence and interpretation

The following are motion references, not measurements of our specific visual models. Dimensions, colors, rates, fin elasticity and swimming routes are art directed. There is no fluid solver, force integration, wake-energy calculation or claim of physical validation.

| Form | Research basis | Implemented interpretation |
| --- | --- | --- |
| Sea angel | [Szymik & Satterlie, 2011](https://pubmed.ncbi.nlm.nih.gov/22071184/), *Clione limacina*, three-dimensional slow/fast wing kinematics. | Flexible paired parapodia; distal delay; quieter trunk. The preview chooses 2 Hz at 1×. |
| Jellyfish | [Gemmell et al., 2013](https://pubmed.ncbi.nlm.nih.gov/24101461/), passive energy recapture in *Aurelia aurita*. | A brief contraction, longer refill and rest; trailing arms. Roaming speed varies gently across the pulse. This does not reproduce hydrodynamic energy recovery. |
| Ray | [Rosenberger, 2001](https://pubmed.ncbi.nlm.nih.gov/11136623/), eight batoids spanning undulation and oscillation. | A Dasyatis-type disc with roughly 1.3 waves along its length, greater displacement near the margins and a yielding tail. The landing-page ray did not specify a species. |
| Paired fish / betta trunk / koi body envelope | [Di Santo et al., 2021](https://pubmed.ncbi.nlm.nih.gov/34853171/), a comparison of 44 diverse swimmers and their body-wave envelopes. | Small anterior motion increasing quadratically toward the posterior; offset tail and fin strokes. This is a general fish surrogate, not a species-specific fit. Betta fin lag and the paired-fish composition are artistic. |

The koi additionally uses [Wu, Yang & Zeng (2007), *Kinematics, hydrodynamics and energetic advantages of burst-and-coast swimming of koi carps*](https://doi.org/10.1242/jeb.001842). An envelope alternates tail-driven bouts and quieter coasts; pectoral trim continues. Its roaming clock accelerates gently during the bout and slows during the coast. The cycle rates and speed changes are visual choices, not fitted measurements or simulated drag.

The literature does not justify assigning every animal the same rigid rotation. Roaming and anatomical actuation are separate: a path chooses position and heading, while each anatomy has its own phase and displacement. The paired fish face together while roaming and oppose one another in the stationary motif. Jellyfish and sea angels drift approximately upright; the ray and individual fish face their travel tangent.

## Detail pass

- Fish bodies use longitudinal cross-section rings rather than flat silhouette fills. Surface normals drive directional shading, soft edge light and a restrained sheen. Koi have procedural rose/pearl markings, gill shading, eye rims, short barbels, pectoral and median fins, and a forked caudal fin.
- The ray has a three-dimensional central ridge, raised head, eye rims, spiracles, pelvic fins and a long flexible tail. Its outer disc moves more than its centre.
- The jelly has a domed, scalloped bell, radial canals, four gonad loops, marginal tentacles and four frilled oral arms.
- The sea angel has a translucent trunk, head, internal visceral volumes, cephalic tentacles and independently bending parapodia.
- The betta keeps its original fan and silhouette and adds a scale field and opercular arch. The separate original `/betta` demo stays available.

These remain luminous glyph interpretations. The particle switch helps inspect the surface; it does not turn them into photoreal meshes. Finer settings increase sampling density without changing the anatomy or basic motion.

## Validation

`node test-life.cjs` checks all six seeded models, finite/unit normals, three detail levels, all-point loop closure, actual deformation, posterior/wing motion isolation, the spline seam and jelly pulse/recovery. Existing project tests still cover the shared scene and Hermes bridge. Browser checks cover all six rendered forms, controls, pause, roaming, turning and PNG export.

For reproducible GPU and lifecycle checks, open `/animal-check.html`. It compares 30,540 shader coordinates with the CPU motion reference, verifies rendered loop closure for all six species, and exercises PNG export, disconnect/reconnect and context loss/recovery.
