/**
 * Shared SVG chart primitives: scales, the plot frame, path building, the
 * de-collision routine and the leader-line label stacker that every figure
 * uses so labels never overlap however the state points move.
 */

import { COL } from '../model/constants.js'
import type { Shape } from '../model/solve.js'
import { h } from './dom.js'

/** Geometry and axis description of one figure. */
export interface FrameOpts {
  /** viewBox width. */
  w: number
  /** viewBox height. */
  h: number
  /** Margins: left, right, top, bottom. */
  ml: number
  mr: number
  mt: number
  mb: number
  /** Data range [min, max] on each axis. */
  xr: [number, number]
  yr: [number, number]
  /** Plot the y axis logarithmically. */
  logy?: boolean
  xticks?: number[]
  yticks?: number[]
  xfmt?: (v: number) => string | number
  yfmt?: (v: number) => string | number
  xlab?: string
  ylab?: string
}

export interface Scale {
  /** Data x → pixel x. */
  X: (v: number) => number
  /** Data y → pixel y. */
  Y: (v: number) => number
}

/** Build the linear (or semi-log) scale for a figure. */
export function sc(o: FrameOpts): Scale {
  const ya = o.logy ? Math.log10(o.yr[0]) : o.yr[0]
  const yb = o.logy ? Math.log10(o.yr[1]) : o.yr[1]
  return {
    X: (v) => o.ml + ((v - o.xr[0]) / (o.xr[1] - o.xr[0])) * (o.w - o.ml - o.mr),
    Y: (v) =>
      o.h -
      o.mb -
      (((o.logy ? Math.log10(Math.max(1e-12, v)) : v) - ya) / (yb - ya)) * (o.h - o.mt - o.mb),
  }
}

/** Grid lines, tick labels, the plot box and the axis titles. */
export function frame(o: FrameOpts, S: Scale): SVGElement[] {
  const out: SVGElement[] = []
  const xfmt = o.xfmt ?? ((v: number) => v)
  const yfmt = o.yfmt ?? ((v: number) => v)

  ;(o.xticks ?? []).forEach((t) => {
    const x = S.X(t)
    out.push(h('line', { x1: x, x2: x, y1: o.mt, y2: o.h - o.mb, stroke: COL.grid }))
    out.push(
      h(
        'text',
        {
          x,
          y: o.h - o.mb + 18,
          textAnchor: 'middle',
          fill: COL.faint,
          fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        xfmt(t),
      ),
    )
  })
  ;(o.yticks ?? []).forEach((t) => {
    const y = S.Y(t)
    out.push(h('line', { x1: o.ml, x2: o.w - o.mr, y1: y, y2: y, stroke: COL.grid }))
    out.push(
      h(
        'text',
        {
          x: o.ml - 8,
          y: y + 4,
          textAnchor: 'end',
          fill: COL.faint,
          fontSize: 12,
          fontFamily: 'IBM Plex Mono, monospace',
        },
        yfmt(t),
      ),
    )
  })

  out.push(
    h('rect', {
      x: o.ml,
      y: o.mt,
      width: o.w - o.ml - o.mr,
      height: o.h - o.mt - o.mb,
      fill: 'none',
      stroke: COL.ink,
      strokeWidth: 1.2,
    }),
  )
  if (o.xlab)
    out.push(
      h(
        'text',
        {
          x: (o.ml + o.w - o.mr) / 2,
          y: o.h - 4,
          textAnchor: 'middle',
          fill: COL.ink,
          fontSize: 14,
          fontFamily: 'Source Serif 4, serif',
          fontStyle: 'italic',
        },
        o.xlab,
      ),
    )
  if (o.ylab)
    out.push(
      h(
        'text',
        {
          x: 2,
          y: 14,
          fill: COL.ink,
          fontSize: 14,
          fontFamily: 'Source Serif 4, serif',
          fontStyle: 'italic',
        },
        o.ylab,
      ),
    )
  return out
}

/** Build an SVG path `d` from data-space points. */
export function d(pts: Array<[number, number]>, S: Scale): string {
  return pts
    .map((p, i) => (i ? 'L' : 'M') + S.X(p[0]).toFixed(2) + ' ' + S.Y(p[1]).toFixed(2))
    .join(' ')
}

/**
 * Push apart items that sit closer than `gap` along one axis, preserving
 * order. Each result carries `orig`, the position before the shift.
 */
export function decol<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  key: K,
  gap: number,
): Array<T & { orig: number }> {
  const s = items
    .map((v, i) => ({ i, p: v[key] as number, o: v[key] as number }))
    .sort((a, b) => a.p - b.p)
  for (let k = 1; k < s.length; k++) if (s[k].p - s[k - 1].p < gap) s[k].p = s[k - 1].p + gap

  const out = items.slice() as Array<T & { orig: number }>
  s.forEach((x) => {
    out[x.i] = { ...items[x.i], [key]: x.p, orig: x.o } as T & { orig: number }
  })
  return out
}

/** One node to be labelled by `stackLabels`. */
export interface LabelNode {
  lbl: string
  shape: Shape
  /** Pixel position of the node. */
  sx: number
  sy: number
  /** Which side of the node the label stack hangs off. */
  side: 'L' | 'R'
}

/**
 * Place node labels in leader-lined vertical stacks, de-collided within each
 * side and clamped inside the plot frame, so nothing overlaps however the
 * state points converge.
 */
export function stackLabels(o: FrameOpts, items: LabelNode[], hi: string | null): SVGElement[] {
  const out: SVGElement[] = []

  ;(['L', 'R'] as const).forEach((sd) => {
    const grp = items.filter((p) => p.side === sd)
    if (!grp.length) return

    const rows = decol(
      grp.map((p) => ({ p, y: p.sy })),
      'y',
      24,
    )

    // Re-centre the stack on the mean of the original positions, then clamp
    // the whole stack into the frame.
    let mo = 0
    let mn = 0
    rows.forEach((R) => {
      mo += R.orig
      mn += R.y
    })
    let sh = (mn - mo) / rows.length
    const ys = rows.map((R) => R.y - sh)
    const top = Math.min.apply(null, ys)
    const bot = Math.max.apply(null, ys)
    if (top < o.mt + 12) sh -= o.mt + 12 - top
    else if (bot > o.h - o.mb - 10) sh += bot - (o.h - o.mb - 10)

    rows.forEach((R) => {
      const ly = R.y - sh
      let dir = sd === 'L' ? -1 : 1
      let lx = R.p.sx + dir * 32
      if (lx < o.ml + 24) {
        dir = 1
        lx = R.p.sx + 32
      } else if (lx > o.w - o.mr - 24) {
        dir = -1
        lx = R.p.sx - 32
      }
      const hl = hi === R.p.lbl
      out.push(
        h('path', {
          d:
            'M' +
            (R.p.sx + dir * 6).toFixed(1) +
            ' ' +
            R.p.sy.toFixed(1) +
            'L' +
            (R.p.sx + dir * 20).toFixed(1) +
            ' ' +
            ly.toFixed(1) +
            'L' +
            (lx - dir * 5).toFixed(1) +
            ' ' +
            ly.toFixed(1),
          fill: 'none',
          stroke: hl ? COL.hi : '#cfc8bb',
          strokeWidth: hl ? 1.4 : 0.9,
        }),
      )
      out.push(
        h(
          'text',
          {
            x: lx,
            y: ly + 5,
            textAnchor: dir < 0 ? 'end' : 'start',
            fill: hl ? COL.hi : COL.ink,
            fontSize: hl ? 16 : 14.5,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono, monospace',
          },
          R.p.lbl,
        ),
      )
    })
  })

  return out
}

/**
 * A state-point marker. Shape carries the branch redundantly with colour:
 * circle = vapour, square = liquid, diamond = wick, open = construction point.
 */
export function glyph(shape: Shape, cx: number, cy: number, hl: boolean): SVGElement {
  const r = hl ? 6.6 : 5
  const sw = hl ? 2 : 1.2
  const fill = hl ? COL.hi : COL.node
  const ed = hl ? '#08483a' : COL.nodeEdge

  if (shape === 's')
    return h('rect', {
      x: cx - r,
      y: cy - r,
      width: r * 2,
      height: r * 2,
      fill,
      stroke: ed,
      strokeWidth: sw,
    })
  if (shape === 'd')
    return h('polygon', {
      points: [cx, cy - r * 1.25, cx + r * 1.25, cy, cx, cy + r * 1.25, cx - r * 1.25, cy].join(' '),
      fill,
      stroke: ed,
      strokeWidth: sw,
    })
  if (shape === 'o')
    return h('circle', {
      cx,
      cy,
      r: r - 0.5,
      fill: '#faf8f4',
      stroke: hl ? '#08483a' : COL.nodeEdge,
      strokeWidth: sw + 0.3,
    })
  return h('circle', { cx, cy, r, fill, stroke: ed, strokeWidth: sw })
}

/**
 * An invisible, generously sized hit target over a node.
 *
 * It carries the state id as `data-pt` rather than bound handlers: the page
 * delegates pointer, click and focus events from a container that outlives
 * any single render, so re-drawing a figure under the cursor cannot drop the
 * hover it is currently showing.
 *
 * `focusable` adds keyboard reachability — used on the main figure only, so
 * tabbing through the cycle does not repeat the same nine stops six times.
 */
export function hitArea(cx: number, cy: number, id: string, focusable = false): SVGElement {
  const p: Record<string, unknown> = {
    cx,
    cy,
    r: 14,
    fill: 'transparent',
    'data-pt': id,
    style: { cursor: 'pointer' },
  }
  if (focusable) {
    p.tabIndex = 0
    p.role = 'button'
    p['aria-label'] = 'State point ' + id
  }
  return h('circle', p)
}
