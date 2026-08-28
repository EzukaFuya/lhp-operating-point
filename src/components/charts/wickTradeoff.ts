/**
 * Capillary margin against pore radius.
 *
 * The wick is the one place in the loop where a design choice pulls two ways
 * at once. Shrinking the pores raises the head the meniscus can hold as 1/r_p,
 * but costs permeability as 1/r_p², so the wick's own loss grows faster than
 * the head it is buying. There is an optimum, and this is the figure that
 * shows it — everything else in the tool would let you believe smaller is
 * simply better.
 *
 * The load and the sink temperature are held at their current values, so the
 * curve is the trade-off *at this operating point*, not in general.
 */

import { COL, RNG } from '../model/constants.js'
import { solve, type Solution } from '../model/solve.js'
import { figure, h, type Child } from './dom.js'
import { d as pathD, frame, sc, type FrameOpts } from './primitives.js'

const SAMPLES = 220

export function wickTradeoff(r: Solution): SVGSVGElement {
  const [lo, hi] = RNG.rp

  // Margin against pore radius, everything else held where it is.
  const curve: Array<[number, number]> = []
  let best: { rp: number; margin: number } | null = null
  for (let i = 0; i <= SAMPLES; i++) {
    const rp = lo + ((hi - lo) * i) / SAMPLES
    const m = solve(r.t8, r.q, r.tsink, rp).capM
    if (Number.isFinite(m)) {
      curve.push([rp, m])
      if (!best || m > best.margin) best = { rp, margin: m }
    }
  }

  const o: FrameOpts = {
    w: 470,
    h: 300,
    ml: 58,
    mr: 22,
    mt: 26,
    mb: 46,
    xr: [lo, hi],
    yr: [-0.6, 1],
    xticks: [0.5, 1, 1.5, 2, 2.5, 3],
    yticks: [-0.5, 0, 0.5, 1],
    xfmt: (v) => v.toFixed(1),
    yfmt: (v) => (v * 100).toFixed(0),
    xlab: 'r p *',
    ylab: 'capillary margin  %',
  }
  const S = sc(o)
  const c: Child[] = []

  c.push(frame(o, S))

  // Zero margin is the dry-out boundary; below it the meniscus cannot hold.
  const y0 = S.Y(0)
  c.push(
    h('rect', {
      x: o.ml,
      y: y0,
      width: o.w - o.ml - o.mr,
      height: Math.max(0, o.h - o.mb - y0),
      fill: COL.vap,
      fillOpacity: 0.05,
    }),
  )
  c.push(
    h('line', {
      x1: o.ml,
      x2: o.w - o.mr,
      y1: y0,
      y2: y0,
      stroke: COL.vap,
      strokeWidth: 1,
      strokeDasharray: '4 4',
    }),
  )
  c.push(
    h(
      'text',
      {
        x: o.w - o.mr - 6,
        y: y0 + 13,
        textAnchor: 'end',
        fill: COL.vap,
        fontSize: 10.5,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'dry-out',
    ),
  )

  c.push(
    h('path', {
      d: pathD(curve, S),
      fill: 'none',
      stroke: COL.wick,
      strokeWidth: 2.4,
      strokeLinejoin: 'round',
    }),
  )

  // The optimum, and where the wick currently sits.
  if (best && best.rp > lo && best.rp < hi) {
    c.push(
      h('line', {
        x1: S.X(best.rp),
        x2: S.X(best.rp),
        y1: S.Y(best.margin),
        y2: o.h - o.mb,
        stroke: COL.wick,
        strokeWidth: 0.9,
        strokeDasharray: '3 3',
      }),
    )
    c.push(
      h('circle', {
        cx: S.X(best.rp),
        cy: S.Y(best.margin),
        r: 4,
        fill: '#faf8f4',
        stroke: COL.wick,
        strokeWidth: 2,
      }),
    )
    c.push(
      h(
        'text',
        {
          x: S.X(best.rp),
          y: S.Y(best.margin) - 11,
          textAnchor: 'middle',
          fill: COL.wick,
          fontSize: 11,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        `best ${best.rp.toFixed(2)} → ${(best.margin * 100).toFixed(0)} %`,
      ),
    )
  }

  // Deliberately not the selection green: that colour means "this state point
  // is selected" everywhere else, and this marker is not part of that.
  c.push(
    h('circle', {
      cx: S.X(r.rp),
      cy: S.Y(Math.max(o.yr[0], Math.min(o.yr[1], r.capM))),
      r: 5.5,
      fill: COL.node,
      stroke: COL.nodeEdge,
      strokeWidth: 1.6,
    }),
  )
  c.push(
    h(
      'text',
      {
        x: S.X(r.rp),
        y: o.h - o.mb + 31,
        textAnchor: 'middle',
        fill: COL.ink,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'now',
    ),
  )

  return figure(
    {
      viewBox: '0 0 ' + o.w + ' ' + o.h,
      label: 'Capillary margin against pore radius, showing the wick design optimum',
    },
    c,
  )
}
