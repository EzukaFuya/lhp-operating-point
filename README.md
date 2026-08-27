# Loop heat pipe — operating point study model

An interactive teaching model of a loop heat pipe (LHP): how the compensation
chamber temperature sets the pressure level of the whole loop, how much
capillary head is left, and whether the returning liquid can carry the
parasitic heat leak away.

Built with [Observable Framework](https://observablehq.com/framework/) — the
prose is Markdown, the inputs and figures are reactive cells in the same
document, and the whole thing builds to a static site with no server.

Everything is reduced — divided by its critical-point value — and the closure
is a qualitative corresponding-states fit, not a design correlation. Trends
are meaningful; absolute numbers are not.

## Running it

```bash
npm install
npm run dev        # preview at http://127.0.0.1:3000
npm run build      # static site into dist/
npm run typecheck  # tsc over the model and figure modules
```

### Building without jsDelivr

Framework resolves `npm:` imports — including its own `htl`, `isoformat` and
`katex` — from jsDelivr at build time. Where jsDelivr is unreachable, vendor
those packages from the npm registry first:

```bash
npm run build:offline    # = npm run vendor && npm run build
```

`npm run vendor` installs the same versions from the registry, bundles them
with esbuild and writes them into `src/.observablehq/cache/_npm`, which is
where Framework looks before fetching. The built site inlines its modules
either way, so nothing is fetched from a CDN at run time.

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
      solve.ts        one pass around the loop; the nine state points
    charts/       SVG figures
      dom.ts          a createElement-shaped helper that builds real DOM
      primitives.ts   scales, frame, de-collision, label stacking, markers
      schematic.ts    the loop layout
      ptDetail.ts     the main P–T figure
      ptGlobal.ts     the whole P–T plane, log pressure
      tsChart.ts      the T–s plane
      profChart.ts    pressure around the loop
      condBar.ts      the condenser two-phase / subcooled split
    selection.ts  the shared hover/pin selection, delegated from one listener
    ui.ts         verdict cards, state table, selection bar, legend
    verdict.ts    margins, regime, status and the remedial guidance
    url.ts        the operating point in the URL hash
    exports.ts    CSV, PNG and copy-link
scripts/
  vendor-npm.mjs  populates Framework's npm cache from the registry
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

This is a port of a Claude Design prototype. The original bundle is kept in
place: `HANDOFF.md`, the design sources in `project/` (`LHP動作点解析 v2.dc.html`
and the `support.js` runtime), and the conversation that produced them in
`chats/`.

The port was checked against the prototype rather than eyeballed:

- the solver matches exactly — every field, over a grid of 36,639 operating
  points spanning the full input ranges;
- every drawing operation of all six figures is identical at the default point
  and at the dryout, subcooling-starved, non-physical-`P₉`, inverted-sink and
  low-margin corners;
- hover, pin, preview-over-pin and unpin all match the prototype step for
  step, as do table row states and the selection bar text;
- the CSV export is byte-identical.

Two deliberate departures, both additive:

- the `style-hover` attributes the design runtime never applied are now real
  CSS hover states;
- exports fall back from an anchor download to the artifact viewer's save
  prompt when the page runs embedded, where anchor downloads are inert.

The equations, hand-marked-up in the prototype, are now set with KaTeX.

`project/LHP CC温度と線図.dc.html` is the earlier v1 prototype and was not
ported.
