/**
 * The loop layout: evaporator (core, wick, grooves, meniscus), compensation
 * chamber, vapour line, condenser split into a two-phase and a subcooled
 * length, and the liquid line back to the CC. The nine state points are drawn
 * where they physically live, and take part in the shared selection.
 */

import { COL } from '../model/constants.js'
import type { Shape, Solution } from '../model/solve.js'
import { figure, h, type Child } from './dom.js'
import { glyph, hitArea } from './primitives.js'

const W = 1060
const H = 366

/** A labelled station: id, x, y, marker shape, and the label offset. */
type Station = [string, number, number, Shape, number, number]

export function schematic(r: Solution, hi: string | null): SVGSVGElement {
  const c: Child[] = []

  const box = (
    x: number,
    y: number,
    w: number,
    ht: number,
    fill: string,
    op: number,
    stroke: string,
    dash?: string,
  ) =>
    h('rect', {
      x,
      y,
      width: w,
      height: ht,
      fill,
      fillOpacity: op,
      stroke,
      strokeWidth: 1.4,
      strokeDasharray: dash ?? 'none',
    })

  const cap = (
    x: number,
    y: number,
    t: string,
    col?: string,
    sz?: number,
    anc?: 'start' | 'middle' | 'end',
  ) =>
    h(
      'text',
      {
        x,
        y,
        textAnchor: anc ?? 'middle',
        fill: col ?? COL.faint,
        fontSize: sz ?? 12,
        fontFamily: 'IBM Plex Mono, monospace',
      },
      t,
    )

  c.push(
    h(
      'defs',
      null,
      h(
        'pattern',
        { id: 'wickhatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        h('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: '#8e2b6b', strokeWidth: 1.1, strokeOpacity: 0.5 }),
      ),
    ),
  )

  // Condenser interface position, clamped to stay visible inside the box.
  const xf = 700 + 290 * Math.min(0.94, Math.max(0.06, r.f))

  // --- rails ---
  c.push(h('path', { d: 'M320 110 L690 110', fill: 'none', stroke: COL.vap, strokeWidth: 3 }))
  c.push(
    h('path', {
      d: 'M990 140 L990 236 L300 236',
      fill: 'none',
      stroke: COL.liq,
      strokeWidth: 3,
      strokeDasharray: '9 5',
    }),
  )
  c.push(
    h('path', {
      d: 'M110 205 L110 170',
      fill: 'none',
      stroke: COL.liq,
      strokeWidth: 3,
      strokeDasharray: '9 5',
    }),
  )
  ;(
    [
      [500, 110, 1, COL.vap],
      [640, 236, -1, COL.liq],
    ] as Array<[number, number, number, string]>
  ).forEach((a) =>
    c.push(
      h('path', {
        d:
          'M' + (a[0] - 7 * a[2]) + ' ' + (a[1] - 6) +
          'L' + (a[0] + 7 * a[2]) + ' ' + a[1] +
          'L' + (a[0] - 7 * a[2]) + ' ' + (a[1] + 6) + 'Z',
        fill: a[3],
      }),
    ),
  )
  c.push(cap(505, 96, 'vapour line', COL.vap))
  c.push(cap(645, 226, 'liquid line', COL.liq))

  // --- evaporator ---
  c.push(box(90, 80, 230, 90, 'none', 1, COL.ink))
  c.push(box(96, 86, 50, 78, COL.liq, 0.12, COL.liq, '6 4'))
  c.push(box(146, 86, 90, 78, 'url(#wickhatch)', 1, COL.wick))
  c.push(box(236, 86, 78, 78, COL.vap, 0.13, COL.vap))
  c.push(h('line', { x1: 236, x2: 236, y1: 86, y2: 164, stroke: COL.wick, strokeWidth: 2.6 }))
  c.push(cap(205, 72, 'EVAPORATOR', COL.ink, 12.5))
  c.push(cap(121, 152, 'core', COL.liq, 11))
  c.push(cap(191, 152, 'wick', COL.wick, 11))
  c.push(cap(275, 152, 'grooves', COL.vap, 11))
  c.push(cap(236, 178, 'meniscus', COL.wick, 11))

  // --- compensation chamber ---
  c.push(box(90, 205, 210, 64, COL.liq, 0.06, COL.ink))
  c.push(h('path', { d: 'M104 233 L286 233', fill: 'none', stroke: COL.liq, strokeWidth: 1.6 }))
  c.push(cap(195, 199, 'COMPENSATION CHAMBER', COL.ink, 12.5))
  c.push(cap(104, 226, 'vapour', COL.vap, 10.5, 'start'))
  c.push(cap(104, 249, 'liquid', COL.liq, 10.5, 'start'))
  c.push(cap(286, 249, 'saturated — sets P₇,₈', COL.faint, 10.5, 'end'))

  // --- condenser ---
  c.push(box(700, 86, 290, 54, 'none', 1, COL.ink))
  c.push(box(700, 86, xf - 700, 54, COL.vap, 0.14, 'none'))
  c.push(box(xf, 86, 990 - xf, 54, COL.liq, 0.11, 'none'))
  c.push(h('line', { x1: xf, x2: xf, y1: 80, y2: 146, stroke: COL.ink, strokeWidth: 1.8 }))
  c.push(cap(845, 72, 'CONDENSER', COL.ink, 12.5))
  c.push(cap((700 + xf) / 2, 118, 'two-phase', COL.vap, 11))
  c.push(cap((xf + 990) / 2, 118, 'subcooled', COL.liq, 11))
  c.push(cap(845, 165, 'heat out to sink  T r,sink = ' + r.tsink.toFixed(3), COL.faint, 11.5))
  ;[0, 1, 2, 3].forEach((i) =>
    c.push(
      h('path', {
        d: 'M' + (760 + i * 60) + ' 142 L' + (760 + i * 60) + ' 152',
        fill: 'none',
        stroke: COL.faint,
        strokeWidth: 1.2,
      }),
    ),
  )

  // --- heat in ---
  ;[0, 1, 2].forEach((i) =>
    c.push(
      h('path', {
        d: 'M' + (170 + i * 45) + ' 40 L' + (170 + i * 45) + ' 56',
        fill: 'none',
        stroke: COL.vap,
        strokeWidth: 1.6,
      }),
    ),
  )
  c.push(cap(205, 32, 'heat in  Q* = ' + r.q.toFixed(2), COL.vap, 11.5))

  // --- stations ---
  const st: Station[] = [
    ['8', 195, 233, 's', -17, -12],
    ['7', 312, 236, 's', 0, 26],
    ['9', 224, 125, 'd', -16, 5],
    ['1', 250, 125, 'c', 17, 5],
    ['2', 314, 110, 'c', 0, -12],
    ['3', 692, 110, 'c', -6, 30],
    ['4', 712, 110, 'c', 4, -14],
    ['5', xf, 113, 's', 0, 30],
    ['6', 986, 110, 's', 8, -14],
  ]
  st.forEach((p) => {
    const hl = hi === p[0]
    c.push(glyph(p[3], p[1], p[2], hl))
    c.push(
      h(
        'text',
        {
          x: p[1] + p[4],
          y: p[2] + p[5],
          textAnchor: p[4] === 0 ? 'middle' : p[4] < 0 ? 'end' : 'start',
          fill: hl ? COL.hi : COL.ink,
          fontSize: hl ? 16 : 14.5,
          fontWeight: 600,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        p[0],
      ),
    )
    c.push(hitArea(p[1], p[2], p[0]))
  })

  c.push(
    cap(
      2,
      318,
      'flow: 8 → 9 through the wick, evaporates at the meniscus 9 → 1, vapour 1 → 4, condensate 4 → 6, liquid line 6 → 7 → 8',
      COL.faint,
      11.5,
      'start',
    ),
  )
  c.push(
    cap(
      2,
      338,
      '2′ is a construction point on the saturation curve at P₂ — it has no location in the hardware.',
      COL.faint,
      11.5,
      'start',
    ),
  )

  return figure(
    { viewBox: '0 0 ' + W + ' ' + H, label: 'Loop heat pipe layout with the nine state points marked' },
    c,
  )
}
