# Loop heat pipe — operating point study model

An interactive teaching model of a loop heat pipe (LHP): how the compensation
chamber temperature sets the pressure level of the whole loop, how much
capillary head is left, and whether the returning liquid can carry the
parasitic heat leak away.

Everything is reduced — divided by its critical-point value — and the closure
is a qualitative corresponding-states fit, not a design correlation. Trends
are meaningful; absolute numbers are not.

## Running it

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build to dist/
npm run typecheck  # tsc only
```

Two extra builds exist for distribution:

```bash
npm run build:single    # one self-contained dist-single/index.html
npm run build:artifact   # the same, stripped for embedding as a page fragment
```

## What the page does

Three reduced inputs — CC temperature `T_r,cc`, heat load `Q*` and sink
temperature `T_r,sink` — drive one solver pass around the loop. The result is
shown as a verdict first and figures second:

1. purpose and caveat
2. the three inputs (slider and direct number entry, both keyboard-reachable)
3. **verdict cards** — capillary margin, subcooling margin, regime, status
4. the loop schematic, with the nine states in their physical positions
5. the main P–T figure, axes magnified about the operating point
6. state-point table and the pressure profile around the loop
7. the T–s plane and the condenser interface position
8. governing relations and assumptions, collapsed by default

One selection runs through everything. Hovering a state point — in any
figure or in the table — previews it; clicking, tapping or tabbing to it and
pressing Enter pins it. The pinned point stays highlighted in every figure
and is described in the bar under the main diagram.

The operating point is kept in the URL hash, so a calculation can be linked.
`Copy link`, `CSV` and `Chart PNG` are in the share/export group.

### Accessibility

The three branches are coded three ways over, so hue is never load-bearing:

| branch | colour | line | marker |
| --- | --- | --- | --- |
| liquid through the wick 8→9 | magenta | dash-dot | diamond |
| meniscus 9→1, then vapour 1→4 | red | solid | circle |
| condensate and liquid line 4→8 | blue | dashed | square |

State points in the main figure are focusable, the table rows are focusable,
and every label is placed by a shared routine that de-collides labels and
clamps them inside the plot frame, so nothing overlaps however the states
converge.

## Layout

```
src/
  model/        the physics — constants, property closures, the solver
    constants.ts    A, the closure coefficients, ranges, palette
    properties.ts   reduced properties as functions of T_r
    solve.ts        one pass around the loop; the nine state points
  charts/       SVG figures
    primitives.tsx  scales, frame, de-collision, label stacking, markers
    Schematic.tsx   the loop layout
    PtDetail.tsx    the main P–T figure
    PtGlobal.tsx    the whole P–T plane, log pressure
    TsChart.tsx     the T–s plane
    ProfChart.tsx   pressure around the loop
    CondBar.tsx     the condenser two-phase / subcooled split
  components/   inputs, verdict cards, state table, governing relations
  lib/          verdict text, URL hash state, CSV / PNG / copy-link
  App.tsx       page composition and the shared selection
```

## Provenance

This is a port of a Claude Design prototype. The original bundle is kept in
place: `HANDOFF.md`, the design sources in `project/` (`LHP動作点解析 v2.dc.html`
and the `support.js` runtime), and the conversation that produced them in
`chats/`.

The port was checked against the prototype rather than eyeballed:

- the solver matches the prototype exactly — every field, over a grid of
  36,639 operating points spanning the full input ranges;
- every drawing operation of all six figures is identical at the default
  point and at the dryout, subcooling-starved, non-physical-`P₉`,
  inverted-sink and low-margin corners;
- hover and pin highlighting, table row states and the selection bar text
  match the prototype step for step.

`project/LHP CC温度と線図.dc.html` is the earlier v1 prototype and was not
ported.
