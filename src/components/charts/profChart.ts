/**
 * Pressure around the loop, station by station. The step at the meniscus is
 * the capillary head; everything else is a loss that head has to pay for.
 */

import { COL } from '../model/constants.js'
import type { Branch, Solution } from '../model/solve.js'
import { figure, h, type Child } from './dom.js'
import { d as pathD, frame, glyph, hitArea, sc, type FrameOpts } from './primitives.js'

/** [state id, reduced pressure, branch]. 8 appears at both ends: the loop closes. */
type Station = [string, number, Branch]

export function profChart(r: Solution, hi: string | null): SVGSVGElement {
  const st: Station[] = [
    ['8', r.P78, 'liq'],
    ['9', r.P9, 'wick'],
    ['1', r.P1, 'vap'],
    ['2', r.P2, 'vap'],
    ['3', r.P3, 'vap'],
    ['4', r.P4, 'vap'],
    ['5', r.P5, 'liq'],
    ['6', r.P6, 'liq'],
    ['7', r.P78, 'liq'],
    ['8', r.P78, 'liq'],
  ]

  const vs = st.map((s) => s[1])
  const lo = Math.min.apply(null, vs)
  const hiv = Math.max.apply(null, vs)
  const pd = (hiv - lo) * 0.26

  const o: FrameOpts = {
    w: 560,
    h: 320,
    ml: 84,
    mr: 92,
    mt: 30,
    mb: 58,
    xr: [0, 9],
    yr: [lo - pd, hiv + pd],
    xticks: [],
    yticks: [lo - pd * 0.5, (lo + hiv) / 2, hiv + pd * 0.5],
    xfmt: (v) => v,
    yfmt: (v) => v.toFixed(4),
    xlab: 'loop station',
    ylab: 'P r  ↑',
  }
  const S = sc(o)
  const c: Child[] = []

  c.push(frame(o, S))

  // the CC pressure level, which everything else hangs from
  c.push(
    h('line', {
      x1: o.ml,
      x2: o.w - o.mr,
      y1: S.Y(r.P78),
      y2: S.Y(r.P78),
      stroke: COL.faint,
      strokeWidth: 0.9,
      strokeDasharray: '4 4',
    }),
  )
  c.push(
    h(
      'text',
      {
        x: o.w - o.mr + 7,
        y: S.Y(r.P78) + 4,
        fill: COL.faint,
        fontSize: 11.5,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'P 7,8 (CC)',
    ),
  )

  const pts: Array<[number, number]> = st.map((s, i) => [i, s[1]])
  c.push(
    h('path', {
      d: pathD(pts.slice(0, 2), S),
      fill: 'none',
      stroke: COL.wick,
      strokeWidth: 2.6,
      strokeDasharray: '11 4 3 4',
    }),
  )
  c.push(
    h('path', {
      d: pathD(pts.slice(1, 6), S),
      fill: 'none',
      stroke: COL.vap,
      strokeWidth: 2.6,
      strokeLinejoin: 'round',
    }),
  )
  c.push(
    h('path', {
      d: pathD(pts.slice(5, 10), S),
      fill: 'none',
      stroke: COL.liq,
      strokeWidth: 2.6,
      strokeDasharray: '9 5',
      strokeLinejoin: 'round',
    }),
  )

  const seg: Array<[string, number, number]> = [
    ['ΔP WICK', 0, 1],
    ['ΔP cap', 1, 2],
    ['ΔP VL', 3, 4],
    ['ΔP COND', 4, 7],
    ['ΔP LL', 8, 9],
  ]
  seg.forEach((g2, i) => {
    const xm = (S.X(g2[1]) + S.X(g2[2])) / 2
    const ym = Math.min(S.Y(st[g2[1]][1]), S.Y(st[g2[2]][1])) - 13
    c.push(
      h(
        'text',
        {
          x: xm,
          y: ym,
          textAnchor: 'middle',
          fill: i === 1 ? COL.vap : COL.faint,
          fontSize: 12,
          fontFamily: 'Source Serif 4, serif',
          fontStyle: 'italic',
        },
        g2[0],
      ),
    )
  })

  const yb = o.h - o.mb
  pts.forEach((p, i) => {
    const hl = hi === st[i][0]
    c.push(glyph(st[i][2] === 'liq' ? 's' : st[i][2] === 'wick' ? 'd' : 'c', S.X(p[0]), S.Y(p[1]), hl))
    c.push(
      h(
        'text',
        {
          x: S.X(p[0]),
          y: yb + 20,
          textAnchor: 'middle',
          fill: hl ? COL.hi : COL.ink,
          fontSize: hl ? 15 : 13.5,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        st[i][0],
      ),
    )
    c.push(hitArea(S.X(p[0]), S.Y(p[1]), st[i][0]))
  })

  return figure(
    { viewBox: '0 0 ' + o.w + ' ' + o.h, label: 'Pressure distribution around the loop' },
    c,
  )
}
