/**
 * The main figure: the cycle on the P–T plane, with both axes linear and
 * magnified about the operating point, so the pressure drops a log-scale
 * plane would hide become visible.
 *
 * Left gutter carries P₁…P₉ with the ΔP brackets; the bottom gutter carries
 * T₆…T₂. Both gutters are de-collided and leader-lined back to their true
 * positions, so nothing overlaps however the states converge.
 */

import { COL } from '../model/constants.js'
import { pr } from '../model/properties.js'
import { pointList, type Solution } from '../model/solve.js'
import { figure, h, type Child } from './dom.js'
import {
  d as pathD,
  decol,
  frame,
  glyph,
  hitArea,
  sc,
  stackLabels,
  type FrameOpts,
  type LabelNode,
} from './primitives.js'

/** Which side of each node its label stack hangs off. */
const SIDE: Record<string, 'L' | 'R'> = {
  '1': 'L',
  '2': 'R',
  '2′': 'L',
  '3': 'R',
  '4': 'R',
  '5': 'L',
  '6': 'L',
  '7': 'L',
  '8': 'L',
  '9': 'R',
}

export function ptDetail(r: Solution, hi: string | null): SVGSVGElement {
  const P = pointList(r)
  const Ts = P.map((p) => p.t)
  const Ps = P.map((p) => p.p)
  const tlo = Math.min.apply(null, Ts)
  const thi = Math.max.apply(null, Ts)
  const plo = Math.min.apply(null, Ps)
  const phi = Math.max.apply(null, Ps)
  const tp = Math.max(1e-4, (thi - tlo) * 0.1)
  const pp = Math.max(1e-6, (phi - plo) * 0.16)

  const o: FrameOpts = {
    w: 1060,
    h: 540,
    ml: 158,
    mr: 40,
    mt: 34,
    mb: 70,
    xr: [tlo - tp * 1.5, thi + tp],
    yr: [plo - pp, phi + pp],
    xticks: [],
    yticks: [],
    xlab: 'Temperature  T r  →',
    ylab: 'Pressure  P r  ↑',
  }
  const S = sc(o)
  const c: Child[] = []
  const cid = 'clip-ptd2'

  c.push(
    h(
      'defs',
      null,
      h(
        'clipPath',
        { id: cid },
        h('rect', { x: o.ml, y: o.mt, width: o.w - o.ml - o.mr, height: o.h - o.mt - o.mb }),
      ),
    ),
  )
  c.push(frame(o, S))

  // saturation curve, clipped to the frame
  const sat: Array<[number, number]> = []
  for (let i = 0; i <= 150; i++) {
    const t = o.xr[0] + ((o.xr[1] - o.xr[0]) * i) / 150
    sat.push([t, pr(t)])
  }
  c.push(
    h(
      'g',
      { clipPath: 'url(#' + cid + ')' },
      h('path', { d: pathD(sat, S), fill: 'none', stroke: COL.sat, strokeWidth: 3 }),
    ),
  )
  // caption sits above the frame so it cannot collide with the label stacks
  c.push(
    h(
      'text',
      {
        x: o.w - o.mr,
        y: 14,
        textAnchor: 'end',
        fill: COL.sat,
        fontSize: 14,
        fontFamily: 'Source Serif 4, serif',
        fontStyle: 'italic',
      },
      'P_sat(T) saturation curve',
    ),
  )

  // --- left gutter: pressure levels ---
  const lv: Array<[string, number, number]> = [
    ['P₁', r.P1, r.T1],
    ['P₂', r.P2, r.T2],
    ['P₃', r.P3, r.T3],
    ['P₄', r.P4, r.T4],
    ['P₅', r.P5, r.T5],
    ['P₆', r.P6, r.T6],
    ['P₇,₈', r.P78, r.t8],
    ['P₉', r.P9, r.T9],
  ]
  const lrow = decol(
    lv.map((L) => ({ lbl: L[0], p: L[1], t: L[2], y: S.Y(L[1]) })),
    'y',
    21,
  )
  lrow.forEach((L) => {
    const ty = S.Y(L.p)
    c.push(
      h('line', {
        x1: 134,
        x2: S.X(L.t),
        y1: ty,
        y2: ty,
        stroke: COL.faint,
        strokeWidth: 0.9,
        strokeDasharray: '5 4',
      }),
    )
    c.push(
      h('path', {
        d: 'M104 ' + L.y.toFixed(1) + 'L120 ' + L.y.toFixed(1) + 'L134 ' + ty.toFixed(1),
        fill: 'none',
        stroke: '#cfc8bb',
        strokeWidth: 0.9,
      }),
    )
    c.push(
      h(
        'text',
        {
          x: 78,
          y: L.y + 5,
          fill: COL.ink,
          fontSize: 14,
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 500,
        },
        L.lbl,
      ),
    )
  })

  // --- ΔP brackets ---
  const br: Array<[string, number, number]> = [
    ['ΔP GV', r.P1, r.P2],
    ['ΔP VL', r.P2, r.P3],
    ['ΔP COND', r.P3, r.P5],
    ['ΔP LL', r.P6, r.P78],
    ['ΔP WICK', r.P78, r.P9],
  ]
  const bx = 68
  br.forEach((B) => {
    const y1 = S.Y(B[1])
    const y2 = S.Y(B[2])
    if (Math.abs(y2 - y1) < 11) return // too thin to letter
    c.push(h('line', { x1: bx, x2: bx, y1, y2, stroke: COL.ink, strokeWidth: 1 }))
    c.push(
      h('path', {
        d:
          'M' + (bx - 3.4) + ' ' + (y1 + 5) + 'L' + bx + ' ' + y1 + 'L' + (bx + 3.4) + ' ' + (y1 + 5) +
          ' M' + (bx - 3.4) + ' ' + (y2 - 5) + 'L' + bx + ' ' + y2 + 'L' + (bx + 3.4) + ' ' + (y2 - 5),
        fill: 'none',
        stroke: COL.ink,
        strokeWidth: 1,
      }),
    )
    c.push(
      h(
        'text',
        {
          x: bx - 8,
          y: (y1 + y2) / 2 + 4,
          textAnchor: 'end',
          fill: COL.ink,
          fontSize: 12.5,
          fontFamily: 'Source Serif 4, serif',
          fontStyle: 'italic',
        },
        B[0],
      ),
    )
  })

  // --- bottom gutter: temperature levels ---
  const tl: Array<[string, number, number]> = [
    ['T₆', r.T6, r.P6],
    ['T₇', r.T7, r.P78],
    ['T₈', r.t8, r.P78],
    ['T₅', r.T5, r.P5],
    ['T₄', r.T4, r.P4],
    ['T₃', r.T3, r.P3],
    ['T₁', r.T1, r.P1],
    ['T₂', r.T2, r.P2],
  ]
  const trow = decol(
    tl.map((L) => ({ lbl: L[0], t: L[1], p: L[2], x: S.X(L[1]) })),
    'x',
    30,
  )
  const yb = o.h - o.mb
  trow.forEach((L) => {
    const tx = S.X(L.t)
    c.push(
      h('line', {
        x1: tx,
        x2: tx,
        y1: S.Y(L.p),
        y2: yb,
        stroke: COL.faint,
        strokeWidth: 0.9,
        strokeDasharray: '5 4',
      }),
    )
    c.push(
      h('path', {
        d:
          'M' + tx.toFixed(1) + ' ' + yb +
          'L' + tx.toFixed(1) + ' ' + (yb + 8) +
          'L' + L.x.toFixed(1) + ' ' + (yb + 17),
        fill: 'none',
        stroke: '#cfc8bb',
        strokeWidth: 0.9,
      }),
    )
    c.push(
      h(
        'text',
        {
          x: L.x,
          y: yb + 31,
          textAnchor: 'middle',
          fill: COL.ink,
          fontSize: 14,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        L.lbl,
      ),
    )
  })

  // --- the three legs ---
  c.push(
    h('path', {
      d: pathD(
        [
          [r.T9, r.P9],
          [r.T1, r.P1],
          [r.T2, r.P2],
          [r.T3, r.P3],
          [r.T4, r.P4],
        ],
        S,
      ),
      fill: 'none',
      stroke: COL.vap,
      strokeWidth: 2.8,
      strokeLinejoin: 'round',
    }),
  )
  c.push(
    h('path', {
      d: pathD(
        [
          [r.T4, r.P4],
          [r.T5, r.P5],
          [r.T6, r.P6],
          [r.T7, r.P78],
          [r.t8, r.P78],
        ],
        S,
      ),
      fill: 'none',
      stroke: COL.liq,
      strokeWidth: 2.8,
      strokeDasharray: '9 5',
      strokeLinejoin: 'round',
    }),
  )
  c.push(
    h('path', {
      d: pathD(
        [
          [r.t8, r.P78],
          [r.T9, r.P9],
        ],
        S,
      ),
      fill: 'none',
      stroke: COL.wick,
      strokeWidth: 2.8,
      strokeDasharray: '11 4 3 4',
    }),
  )
  c.push(
    h(
      'text',
      {
        x: o.ml + 12,
        y: o.mt + 22,
        fill: COL.vap,
        fontSize: 13,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'ΔP cap = P₁ − P₉ = ' + r.dpCap.toFixed(4),
    ),
  )

  // A state the hardware cannot reach still gets drawn — the shape of the
  // formal solution is instructive — but it is marked as such, so the figure
  // is never mistaken for a reachable operating point.
  if (r.status !== 'closed') {
    const why =
      r.status === 'nonphysical'
        ? 'NON-PHYSICAL — P₉ < 0'
        : r.status === 'capillary_exceeded'
          ? 'FORMAL EXTRAPOLATION — capillary limit exceeded'
          : 'FORMAL EXTRAPOLATION — subcooling starved'
    c.push(
      h(
        'text',
        {
          x: (o.ml + o.w - o.mr) / 2,
          y: (o.mt + o.h - o.mb) / 2,
          textAnchor: 'middle',
          fill: '#b8442f',
          fillOpacity: 0.16,
          fontSize: 44,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono, monospace',
          style: { pointerEvents: 'none' },
        },
        why,
      ),
    )
  }

  // --- nodes, labels, hit targets ---
  const nl: LabelNode[] = P.map((pt) => ({
    lbl: pt.id,
    shape: pt.shape,
    sx: S.X(pt.t),
    sy: S.Y(pt.p),
    side: SIDE[pt.id],
  }))
  nl.forEach((n) => c.push(glyph(n.shape, n.sx, n.sy, hi === n.lbl)))
  c.push(stackLabels(o, nl, hi))
  nl.forEach((n) => c.push(hitArea(n.sx, n.sy, n.lbl, true)))

  return figure(
    {
      viewBox: '0 0 ' + o.w + ' ' + o.h,
      label: 'Pressure-temperature diagram of the loop heat pipe cycle',
      chartId: 'main',
    },
    c,
  )
}
