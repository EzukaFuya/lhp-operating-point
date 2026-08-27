/**
 * The condenser length, inlet to outlet, split into the two-phase and
 * subcooled lengths. The interface at 5 is the position the loop moves to
 * balance the load.
 */

import { COL } from '../model/constants.js'
import type { Shape, Solution } from '../model/solve.js'
import { figure, h, type Child } from './dom.js'
import { glyph, hitArea } from './primitives.js'

const W = 470
const H = 120
const X0 = 6
const X1 = W - 6

export function condBar(r: Solution, hi: string | null): SVGSVGElement {
  // The marker is clamped to 6–94% so it stays visible at the extremes;
  // the true value is printed underneath.
  const xf = X0 + (X1 - X0) * Math.min(0.94, Math.max(0.06, r.f))
  const c: Child[] = []

  c.push(
    h(
      'text',
      { x: X0, y: 13, fill: COL.faint, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' },
      'condenser length, inlet → outlet',
    ),
  )
  c.push(
    h('rect', {
      x: X0,
      y: 26,
      width: xf - X0,
      height: 30,
      fill: COL.vap,
      fillOpacity: 0.16,
      stroke: COL.vap,
      strokeWidth: 1.2,
    }),
  )
  c.push(
    h('rect', {
      x: xf,
      y: 26,
      width: X1 - xf,
      height: 30,
      fill: COL.liq,
      fillOpacity: 0.13,
      stroke: COL.liq,
      strokeWidth: 1.2,
      strokeDasharray: '9 5',
    }),
  )
  c.push(h('line', { x1: xf, x2: xf, y1: 18, y2: 64, stroke: COL.ink, strokeWidth: 1.8 }))
  c.push(
    h(
      'text',
      {
        x: (X0 + xf) / 2,
        y: 46,
        textAnchor: 'middle',
        fill: COL.vap,
        fontSize: 12,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'two-phase',
    ),
  )
  c.push(
    h(
      'text',
      {
        x: (xf + X1) / 2,
        y: 46,
        textAnchor: 'middle',
        fill: COL.liq,
        fontSize: 12,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'subcooled',
    ),
  )
  ;(
    [
      ['4', X0, 'c'],
      ['5', xf, 's'],
      ['6', X1, 's'],
    ] as Array<[string, number, Shape]>
  ).forEach((m) => {
    c.push(glyph(m[2], m[1], 70, hi === m[0]))
    c.push(
      h(
        'text',
        {
          x: m[1],
          y: 92,
          textAnchor: 'middle',
          fill: hi === m[0] ? COL.hi : COL.ink,
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        m[0],
      ),
    )
    c.push(hitArea(m[1], 70, m[0]))
  })

  c.push(
    h(
      'text',
      {
        x: X1,
        y: 114,
        textAnchor: 'end',
        fill: COL.faint,
        fontSize: 11.5,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      'L 2φ / L c = ' + r.f.toFixed(3) + '     ΔT sub = ' + r.sub.toFixed(4),
    ),
  )

  return figure(
    { viewBox: '0 0 ' + W + ' ' + H, label: 'Condenser two-phase and subcooled length split' },
    c,
  )
}
