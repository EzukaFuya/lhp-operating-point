# Loop heat pipe — operating point study model

An interactive teaching model of a loop heat pipe (LHP): how the compensation
chamber temperature sets the pressure level of the whole loop, how much
capillary head is left, and whether the returning liquid can carry the
parasitic heat leak away.

Built with [Observable Framework](https://observablehq.com/framework/) — the
prose is Markdown, the inputs and figures are reactive cells in the same
document, and the whole thing builds to a static site with no server.

## Model status — read this first

**This is a teaching model. It has not been validated against experiment or
against a high-fidelity code, and it must not be used for design.**

- **Dimensionless throughout.** Temperature and pressure are genuinely reduced
  by their critical-point values. The interfacial and transport properties are
  *not* — dividing the latent heat or the surface tension by its critical
  value is meaningless, since both vanish there. They are normalised at a
  reference state of `Tr,ref = 0.7`, where every starred quantity equals one.
- **Qualitative closure.** `h_fg* = θ^0.38`, `σ* = θ^1.26` and the rest are
  shape functions chosen to reproduce the right trends, not a fit to any real
  fluid. The capillary coefficient `Ca = 0.06` lumps the reference pressure,
  reference surface tension and pore geometry into one constant, chosen to put
  the dry-out boundary in a useful part of the range. It is not measured.
- **No experimental comparison.** There is no benchmark case in this
  repository, so no error bar and no stated range of applicability. The
  "Physical scale" section carries real dimensional values for ammonia, but
  they are there to anchor intuition and are computed independently of the
  model — no number in that section is a model prediction, and no LHP-specific
  design value is cited, because this repository has no source to cite one
  from.
- **The T–s figure is a schematic state map.** State points come from the
  solver, but the segments between them are straight lines: no quality
  distribution and no enthalpy balance is solved along the two-phase legs.

What the model *is* good for: seeing how the pieces trade off — how the CC
temperature moves the whole pressure level, why the vapour-line loss explodes
at low CC temperature, why subcooling and capillary head compete for the same
condenser length.

## Two modes

The tool is explicit about the difference between a state you impose and a
state the loop would reach on its own.

- **Prescribed CC** (default) — `Tr,cc` is an input. The page reports the CC
  energy-balance residual left over,
  `Rcc = Q_leak − ṁ·c_p,l·(T₈ − T₇)`: the heat a chamber held at that
  temperature would need removing by other means. Nothing in the solver is
  adjusted to make that residual vanish.
- **Solve passive point** — searches for the `Tr,cc` at which `Rcc = 0`, which
  is where a loop with no CC heater or cooler actually settles. Bracket-scan
  then bisection, because `Rcc` is only piecewise smooth. It reports when no
  root exists in range rather than returning something plausible-looking.

## The wick trade-off

Pore radius is an input, and it pulls two ways at once. The capillary head the
meniscus can hold goes as `1/r_p`; the wick's own pressure loss goes as `1/K`,
and Kozeny–Carman at fixed porosity gives `K ∝ r_p²`. The loss therefore grows
faster than the head it is buying, so shrinking pores is not a free
improvement — there is an optimum, and the "wick trade-off" figure shows where
it currently sits.

Two limits of this, stated because the figure looks more authoritative than it
is: porosity is held fixed, where a real wick trades that too; and the wick
heat-leak conductance `G_w` is a constant, so pore size changes *whether* the
loop can run but never *where* it settles. In a real wick those are coupled.

## Regimes

Classified by condenser utilisation `f = L_2φ/L_c`, following the usual
definition: while part of the condenser is still flooded the interface moves
with the load and the conductance varies; once the two-phase front reaches the
outlet there is no length left to recruit.

| condition | regime |
| --- | --- |
| `f < 1` | variable conductance |
| `f = 1` | fixed conductance |

This is a classification *within this model*, from a single lumped condenser
utilisation. The liquid charge distribution and the phase state inside the
compensation chamber — which set the regime boundary in a real loop, and which
determine whether the CC still holds a free surface at all — are not solved
here. Read the label as "the condenser is fully utilised", not as a verified
mode transition.

## Running it

```bash
npm install
npm run dev        # preview at http://127.0.0.1:3000
npm run build      # static site into dist/
npm run typecheck  # tsc over the model and figure modules
npm test           # model invariants
```

## Tests

`npm test` runs `node --test` over the model, bundled to ESM by esbuild first.
These are invariants, not snapshots — a snapshot would have locked in the
energy-balance error these exist to catch:

- `P₁ − P₉ = ΣΔP` across the whole input space, and pressure falls
  monotonically around the loop
- `Rcc` is exactly `Q_leak − ṁ·c_p,l·(T₈ − T₇)`, and no temperature is clamped
  to force it towards zero
- the passive solver drives `|Rcc|` below 1e-6 wherever a root is bracketed,
  and says so when none exists
- the regime follows `f`, and `f` saturates at exactly 1
- the saturation dome closes exactly at the critical point, and every starred
  property is 1 at `Tr = 0.7`
- a state that cannot close is never reported as closed, always warns, and its
  status card, banner and figure watermark agree
- every output is finite everywhere in range
- `rp = 1` reproduces the pre-coupling wick loss exactly, the head goes as
  `1/rp` and the loss as `1/rp²`, and the capillary margin has an **interior**
  optimum — the test that would have caught the missing trade-off
- the nine process legs chain 1→…→1 without repeating or skipping a station,
  each carries physics and a failure mode, and none produces `NaN` anywhere in
  range

### Building without jsDelivr

Framework resolves `npm:` imports — including its own `htl`, `isoformat` and
`katex` — from jsDelivr at build time. Where jsDelivr is unreachable, vendor
those packages from the npm registry first:

```bash
npm run build:offline    # = npm run vendor && npm run build
```

`npm run vendor` installs the same versions from the registry, bundles them
with esbuild and writes them into `src/.observablehq/cache/_npm`, which is
where Framework looks before fetching. The built site inlines its JavaScript
either way, so no code is fetched from a CDN at run time — the one remaining
external request is the Google Fonts stylesheet and its font files, declared
in `observablehq.config.js`. Drop that `<link>` and self-host the faces if the
page must load with no third-party requests at all.

## What the page does

Four reduced inputs — CC temperature `T_r,cc`, heat load `Q*`, sink
temperature `T_r,sink` and pore radius `r_p*` — drive one solver pass around the
loop. The result is
shown as a verdict first and figures second:

1. purpose and caveat
2. the four inputs (slider and direct number entry, both keyboard-reachable)
3. **verdict cards** — capillary margin, subcooling margin, regime, status,
   and the CC energy-balance residual
4. the loop schematic, with the nine states in their physical positions
5. the main P–T figure, axes magnified about the operating point
6. state-point table and the pressure profile around the loop
7. the T–s plane and the condenser interface position
8. the wick trade-off — capillary margin against pore radius
9. physical scale — real dimensional values, kept apart from model output
10. governing relations and assumptions, collapsed by default

Selecting a state point also shows the physics of the legs either side of it:
the governing relation, which way the leg moves on each plane, what this model
computes for it, and the assumption that fails first. The relation and the
model's treatment of it are marked out separately, because they are often not
the same thing — the liquid line is the clearest case, where the physics is
Joule–Thomson and the model carries only an ambient-gain term.

One selection runs through everything. Hovering a state point — in any figure
or in the table — previews it; clicking, tapping or tabbing to it and pressing
Enter pins it. The pinned point stays highlighted in every figure and is
described in the bar under the main diagram.

The operating point is kept in the URL hash, so a calculation can be linked.
`Copy link`, `CSV` and `Chart PNG` are in the share/export group.

### Accessibility

The three branches are coded three ways over, so hue is never load-bearing:

| branch | colour | line | marker |
| --- | --- | --- | --- |
| liquid through the wick 8→9 | magenta | dash-dot | diamond |
| meniscus 9→1, then vapour 1→4 | red | solid | circle |
| condensate and liquid line 4→8 | blue | dashed | square |

State points in the main figure are focusable, table rows are focusable, and
every label is placed by a shared routine that de-collides labels and clamps
them inside the plot frame, so nothing overlaps however the states converge.

## Layout

```
observablehq.config.js   site config; the built-in themes are replaced outright
src/
  index.md      the page: prose, reactive cells, and the slots figures render into
  style.css     the design's visual language
  components/
    model/        the physics — framework-agnostic and separately testable
      constants.ts    A, the closure coefficients, ranges, palette
      properties.ts   reduced properties as functions of T_r
      solve.ts        one pass around the loop; the passive root-find
      processes.ts    the nine legs: governing relations and where they break
    charts/       SVG figures
      dom.ts          a createElement-shaped helper that builds real DOM
      primitives.ts   scales, frame, de-collision, label stacking, markers
      schematic.ts    the loop layout
      ptDetail.ts     the main P–T figure
      ptGlobal.ts     the whole P–T plane, log pressure
      tsChart.ts      the T–s plane
      profChart.ts    pressure around the loop
      condBar.ts      the condenser two-phase / subcooled split
      wickTradeoff.ts capillary margin against pore radius
    selection.ts  the shared hover/pin selection, delegated from one listener
    ui.ts         verdict cards, state table, selection bar, legend
    verdict.ts    margins, regime, status and the remedial guidance
    url.ts        the operating point in the URL hash
    exports.ts    CSV, PNG and copy-link
scripts/
  vendor-npm.mjs  populates Framework's npm cache from the registry
  physical-scale.mjs  computes the dimensional reference values, reproducibly
test/
  build.mjs       bundles the model to ESM for the test runner
  model.test.mjs  the invariants above
```

The figures build SVG through a helper shaped like `React.createElement`, so
the drawing code reads the same as the prototype it was verified against while
producing plain DOM.

## Deploying

`.github/workflows/deploy.yml` typechecks, builds and publishes to this
repository's GitHub Pages on every push to `main`.

One setting is needed the first time: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. After that the site is live at
`https://<owner>.github.io/<repo>/`, or at a custom domain if one is set.

The page emits relative asset paths, so it works at a domain root and under a
`/<repo>/` sub-path without configuration. `SITE_BASE` is wired through the
workflow for the day the site grows a second page and needs absolute links.

## Provenance

This is a port of a design prototype, kept in `project/`:
`LHP動作点解析 v2.dc.html` and the `support.js` runtime that renders it.

The port was checked against that prototype figure by figure. Note that the
*model* has since diverged from the prototype deliberately: the prototype
forced `T₇` to keep the CC energy balance looking closed, misnamed the
conductance regimes, and stated a scaling it did not use. Those are fixed here,
so state-point values no longer match the prototype — by design.

The original port fidelity, for the record:

- the solver matches exactly — every field, over a grid of 36,639 operating
  points spanning the full input ranges;
- every drawing operation of all six figures is identical at the default point
  and at the dryout, subcooling-starved, non-physical-`P₉`, inverted-sink and
  low-margin corners;
- hover, pin, preview-over-pin and unpin all match the prototype step for
  step, as do table row states and the selection bar text;
- the CSV export is byte-identical.

Two deliberate departures: the `style-hover` attributes the design runtime
never applied are now real CSS hover states, and the equations, hand-marked-up
in the prototype, are set with KaTeX.

`project/LHP CC温度と線図.dc.html` is the earlier v1 prototype and was not
ported.
