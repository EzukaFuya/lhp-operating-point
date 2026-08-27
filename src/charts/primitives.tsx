/**
 * Shared SVG chart primitives: scales, the plot frame, path building, the
 * de-collision routine and the leader-line label stacker that every figure
 * uses so labels never overlap however the state points move.
 *
 * Ported from the design prototype's chart helpers.
 */

import type { JSX, ReactNode } from 'react'
import { COL } from '../model/constants'
import type { Shape } from '../model/solve'

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
export function frame(o: FrameOpts, S: Scale): JSX.Element[] {
  const out: JSX.Element[] = []
  const xfmt = o.xfmt ?? ((v: number) => v)
  const yfmt = o.yfmt ?? ((v: number) => v)

  ;(o.xticks ?? []).forEach((t, i) => {
    const x = S.X(t)
    out.push(<line key={'xg' + i} x1={x} x2={x} y1={o.mt} y2={o.h - o.mb} stroke={COL.grid} />)
    out.push(
      <text
        key={'xt' + i}
        x={x}
        y={o.h - o.mb + 18}
        textAnchor="middle"
        fill={COL.faint}
        fontSize={12}
        fontFamily="IBM Plex Mono, monospace"
      >
        {xfmt(t)}
      </text>,
    )
  })
  ;(o.yticks ?? []).forEach((t, i) => {
    const y = S.Y(t)
    out.push(<line key={'yg' + i} x1={o.ml} x2={o.w - o.mr} y1={y} y2={y} stroke={COL.grid} />)
    out.push(
      <text
        key={'yt' + i}
        x={o.ml - 8}
        y={y + 4}
        textAnchor="end"
        fill={COL.faint}
        fontSize={12}
        fontFamily="IBM Plex Mono, monospace"
      >
        {yfmt(t)}
      </text>,
    )
  })

  out.push(
    <rect
      key="bx"
      x={o.ml}
      y={o.mt}
      width={o.w - o.ml - o.mr}
      height={o.h - o.mt - o.mb}
      fill="none"
      stroke={COL.ink}
      strokeWidth={1.2}
    />,
  )
  if (o.xlab)
    out.push(
      <text
        key="xl"
        x={(o.ml + o.w - o.mr) / 2}
        y={o.h - 4}
        textAnchor="middle"
        fill={COL.ink}
        fontSize={14}
        fontFamily="Source Serif 4, serif"
        fontStyle="italic"
      >
        {o.xlab}
      </text>,
    )
  if (o.ylab)
    out.push(
      <text
        key="yl"
        x={2}
        y={14}
        fill={COL.ink}
        fontSize={14}
        fontFamily="Source Serif 4, serif"
        fontStyle="italic"
      >
        {o.ylab}
      </text>,
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
 * side and clamped inside the plot frame. Replaces the hand-tuned pixel
 * offsets the first draft used, which overlapped whenever points converged.
 */
export function stackLabels(
  o: FrameOpts,
  _S: Scale,
  items: LabelNode[],
  hi: string | null,
): JSX.Element[] {
  const out: JSX.Element[] = []

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

    rows.forEach((R, i) => {
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
        <path
          key={sd + 'sd' + i}
          d={
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
            ly.toFixed(1)
          }
          fill="none"
          stroke={hl ? COL.hi : '#cfc8bb'}
          strokeWidth={hl ? 1.4 : 0.9}
        />,
      )
      out.push(
        <text
          key={sd + 'st' + i}
          x={lx}
          y={ly + 5}
          textAnchor={dir < 0 ? 'end' : 'start'}
          fill={hl ? COL.hi : COL.ink}
          fontSize={hl ? 16 : 14.5}
          fontWeight={600}
          fontFamily="IBM Plex Mono, monospace"
        >
          {R.p.lbl}
        </text>,
      )
    })
  })

  return out
}

/**
 * A state-point marker. Shape carries the branch redundantly with colour:
 * circle = vapour, square = liquid, diamond = wick, open = construction point.
 */
export function glyph(
  key: string,
  shape: Shape,
  cx: number,
  cy: number,
  hl: boolean,
): JSX.Element {
  const r = hl ? 6.6 : 5
  const sw = hl ? 2 : 1.2
  const fill = hl ? COL.hi : COL.node
  const ed = hl ? '#08483a' : COL.nodeEdge

  if (shape === 's')
    return (
      <rect
        key={key}
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        fill={fill}
        stroke={ed}
        strokeWidth={sw}
      />
    )
  if (shape === 'd')
    return (
      <polygon
        key={key}
        points={[cx, cy - r * 1.25, cx + r * 1.25, cy, cx, cy + r * 1.25, cx - r * 1.25, cy].join(
          ' ',
        )}
        fill={fill}
        stroke={ed}
        strokeWidth={sw}
      />
    )
  if (shape === 'o')
    return (
      <circle
        key={key}
        cx={cx}
        cy={cy}
        r={r - 0.5}
        fill="#faf8f4"
        stroke={hl ? '#08483a' : COL.nodeEdge}
        strokeWidth={sw + 0.3}
      />
    )
  return <circle key={key} cx={cx} cy={cy} r={r} fill={fill} stroke={ed} strokeWidth={sw} />
}

/** Callbacks every figure needs to take part in the shared selection. */
export interface SelectionHandlers {
  /** Preview a point (hover / focus). */
  onHover: (id: string | null) => void
  /** Pin or unpin a point (click / Enter / Space). */
  onPick: (id: string) => void
}

/**
 * An invisible, generously sized hit target over a node. `focusable` adds
 * keyboard reachability — used on the main figure so the whole cycle can be
 * tabbed through without every figure repeating the same tab stops.
 */
export function hitArea(
  key: string,
  cx: number,
  cy: number,
  id: string,
  H: SelectionHandlers,
  focusable = false,
): JSX.Element {
  const common = {
    key,
    cx,
    cy,
    r: 14,
    fill: 'transparent',
    style: { cursor: 'pointer' },
    onMouseEnter: () => H.onHover(id),
    onMouseLeave: () => H.onHover(null),
    onClick: () => H.onPick(id),
  }
  if (!focusable) return <circle {...common} />
  return (
    <circle
      {...common}
      tabIndex={0}
      role="button"
      aria-label={'State point ' + id}
      onFocus={() => H.onHover(id)}
      onBlur={() => H.onHover(null)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          H.onPick(id)
        }
      }}
    />
  )
}

/** Standard wrapper for every figure: scales to its container, never clips. */
export function Figure({
  viewBox,
  label,
  chartId,
  children,
}: {
  viewBox: string
  label: string
  chartId?: string
  children: ReactNode
}): JSX.Element {
  return (
    <svg
      data-chart={chartId}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {children}
    </svg>
  )
}
