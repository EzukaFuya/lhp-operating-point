/**
 * The cycle on the T–s plane, inside the saturation dome. Raising the CC
 * temperature lifts the cycle and narrows it: the latent heat falls, so the
 * 9→1 crossing of the dome gets shorter.
 */

import type { JSX, ReactNode } from 'react'
import { COL } from '../model/constants'
import { sl, ssh, sv } from '../model/properties'
import { pointList, type Solution } from '../model/solve'
import {
  Figure,
  d as pathD,
  frame,
  glyph,
  hitArea,
  sc,
  stackLabels,
  type FrameOpts,
  type LabelNode,
  type SelectionHandlers,
} from './primitives'

interface Props {
  r: Solution
  /** Reference solution for the ghost overlay, or null when it is off. */
  g: Solution | null
  hi: string | null
  H: SelectionHandlers
}

export function TsChart({ r, g, hi, H: handlers }: Props): JSX.Element {
  const o: FrameOpts = {
    w: 470,
    h: 360,
    ml: 62,
    mr: 26,
    mt: 26,
    mb: 46,
    xr: [0, 6.4],
    yr: [0.48, 1.05],
    xticks: [0, 1, 2, 3, 4, 5, 6],
    yticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    xfmt: (v) => v,
    yfmt: (v) => v.toFixed(1),
    xlab: 's *',
    ylab: 'T r  ↑',
  }
  const S = sc(o)
  const c: ReactNode[] = []

  c.push(...frame(o, S))

  // the dome: saturated liquid and saturated vapour lines
  const dl: Array<[number, number]> = []
  const dv: Array<[number, number]> = []
  for (let t = 0.5; t <= 1.0001; t += 0.005) {
    dl.push([sl(t), t])
    dv.push([sv(t), t])
  }
  c.push(
    <path
      key="dl"
      d={pathD(dl, S)}
      fill="none"
      stroke={COL.liq}
      strokeWidth={2}
      strokeDasharray="9 5"
    />,
  )
  c.push(<path key="dv" d={pathD(dv, S)} fill="none" stroke={COL.vap} strokeWidth={2} />)
  c.push(
    <circle
      key="cp"
      cx={S.X(sl(1))}
      cy={S.Y(1)}
      r={3.4}
      fill="#faf8f4"
      stroke={COL.ink}
      strokeWidth={1.6}
    />,
  )
  c.push(
    <text
      key="cpt"
      x={S.X(sl(1))}
      y={S.Y(1) - 10}
      textAnchor="middle"
      fill={COL.ink}
      fontSize={11.5}
      fontFamily="IBM Plex Mono, monospace"
    >
      CP
    </text>,
  )

  /** The closed cycle 8 → 9 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. */
  const cyc = (m: Solution): Array<[number, number]> => [
    [sl(m.t8), m.t8],
    [sl(m.T9), m.T9],
    [sv(m.T1), m.T1],
    [ssh(m.T2, m.P2), m.T2],
    [ssh(m.T3, m.P3), m.T3],
    [sv(m.T4), m.T4],
    [sl(m.T5), m.T5],
    [sl(m.T6), m.T6],
    [sl(m.T7), m.T7],
    [sl(m.t8), m.t8],
  ]

  if (g)
    c.push(
      <path
        key="gc"
        d={pathD(cyc(g), S)}
        fill="none"
        stroke={COL.ghost}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />,
    )
  c.push(
    <path
      key="cy"
      d={pathD(cyc(r), S)}
      fill={COL.vap}
      fillOpacity={0.08}
      stroke={COL.vap}
      strokeWidth={2.4}
      strokeLinejoin="round"
    />,
  )

  // 2′, 3 and 7 are omitted here: they sit on top of their neighbours in this plane
  const P = pointList(r).filter((p) => p.id !== '2′' && p.id !== '3' && p.id !== '7')
  const pts: LabelNode[] = P.map((p) => ({
    lbl: p.id,
    shape: p.shape,
    sx: S.X(p.s),
    sy: S.Y(p.t),
    side: p.br === 'vap' ? 'R' : 'L',
  }))
  pts.forEach((p, i) => c.push(glyph('tg' + i, p.shape, p.sx, p.sy, hi === p.lbl)))
  c.push(...stackLabels(o, S, pts, hi))
  pts.forEach((p, i) => c.push(hitArea('th' + i, p.sx, p.sy, p.lbl, handlers)))

  const ds = sv(r.T1) - sl(r.T1)
  c.push(
    <text
      key="dsl"
      x={(S.X(sl(r.T1)) + S.X(sv(r.T1))) / 2}
      y={S.Y(r.T1) - 13}
      textAnchor="middle"
      fill={COL.vap}
      fontSize={11.5}
      fontFamily="IBM Plex Mono, monospace"
    >
      {'Δs = ' + ds.toFixed(2)}
    </text>,
  )

  return (
    <Figure
      viewBox={'0 0 ' + o.w + ' ' + o.h}
      label="Temperature-entropy diagram of the cycle"
    >
      {c}
    </Figure>
  )
}
