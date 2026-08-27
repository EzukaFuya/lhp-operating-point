/**
 * The whole P–T plane on a log pressure axis, showing the cycle as a small
 * box sliding along the saturation line as the CC temperature changes. The
 * dashed box is the reference overlay.
 */

import type { JSX, ReactNode } from 'react'
import { COL } from '../model/constants'
import { pr } from '../model/properties'
import type { Solution } from '../model/solve'
import { Figure, d as pathD, frame, glyph, sc, type FrameOpts } from './primitives'

const Y_LABEL: Record<string, string> = {
  '0.001': '10⁻³',
  '0.01': '10⁻²',
  '0.1': '10⁻¹',
  '1': '1',
}

interface Props {
  r: Solution
  /** Reference solution for the ghost overlay, or null when it is off. */
  g: Solution | null
}

export function PtGlobal({ r, g }: Props): JSX.Element {
  const o: FrameOpts = {
    w: 470,
    h: 330,
    ml: 62,
    mr: 66,
    mt: 26,
    mb: 46,
    xr: [0.5, 1.0],
    yr: [1.2e-3, 1.4],
    logy: true,
    xticks: [0.6, 0.7, 0.8, 0.9, 1.0],
    yticks: [1e-3, 1e-2, 1e-1, 1],
    xfmt: (v) => v.toFixed(1),
    yfmt: (v) => Y_LABEL[String(v)] ?? v,
    xlab: 'T r',
    ylab: 'P r  (log)',
  }
  const S = sc(o)
  const c: ReactNode[] = []

  c.push(...frame(o, S))

  const sat: Array<[number, number]> = []
  for (let t = 0.5; t <= 1.0001; t += 0.005) sat.push([t, pr(t)])
  c.push(<path key="sat" d={pathD(sat, S)} fill="none" stroke={COL.sat} strokeWidth={2.6} />)

  c.push(
    <circle
      key="cp"
      cx={S.X(1)}
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
      x={S.X(1) - 6}
      y={S.Y(1) - 10}
      textAnchor="end"
      fill={COL.ink}
      fontSize={11.5}
      fontFamily="IBM Plex Mono, monospace"
    >
      CP
    </text>,
  )
  c.push(
    <text
      key="lq"
      x={S.X(0.55)}
      y={S.Y(0.42)}
      fill={COL.liq}
      fontSize={12}
      fontFamily="IBM Plex Mono, monospace"
    >
      liquid
    </text>,
  )
  c.push(
    <text
      key="vp"
      x={S.X(0.84)}
      y={S.Y(3.2e-3)}
      fill={COL.vap}
      fontSize={12}
      fontFamily="IBM Plex Mono, monospace"
    >
      vapour
    </text>,
  )

  /** Bounding box of the main figure's extent, in this plane. */
  const box = (m: Solution): Array<[number, number]> => {
    const t1 = Math.min(m.T6, m.T7)
    const t2 = Math.max(m.T2, m.T1)
    return [
      [t1, m.P9],
      [t2, m.P9],
      [t2, m.P1],
      [t1, m.P1],
      [t1, m.P9],
    ]
  }

  if (g) {
    c.push(
      <path
        key="gb"
        d={pathD(box(g), S)}
        fill="none"
        stroke={COL.ghost}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />,
    )
    c.push(<circle key="gd" cx={S.X(g.t8)} cy={S.Y(g.P78)} r={3.2} fill={COL.ghost} />)
    const gy = Math.min(o.h - o.mb - 6, S.Y(g.P9) + 15)
    c.push(
      <text
        key="gt"
        x={S.X(Math.min(g.T6, g.T7)) - 6}
        y={gy}
        textAnchor="end"
        fill="#7d7466"
        fontSize={11.5}
        fontWeight={500}
        fontFamily="IBM Plex Mono, monospace"
        paintOrder="stroke"
        stroke="#faf8f4"
        strokeWidth={3}
        strokeLinejoin="round"
      >
        ref
      </text>,
    )
  }

  c.push(
    <path
      key="bx"
      d={pathD(box(r), S)}
      fill={COL.vap}
      fillOpacity={0.09}
      stroke={COL.vap}
      strokeWidth={1.8}
    />,
  )
  c.push(glyph('op', 's', S.X(r.t8), S.Y(r.P78), false))
  c.push(
    <text
      key="opt"
      x={S.X(r.t8) - 10}
      y={S.Y(r.P78) + 17}
      textAnchor="end"
      fill={COL.ink}
      fontSize={13.5}
      fontWeight={600}
      fontFamily="IBM Plex Mono, monospace"
    >
      8
    </text>,
  )
  c.push(
    <line
      key="hl"
      x1={o.ml}
      x2={o.w - o.mr}
      y1={S.Y(r.P78)}
      y2={S.Y(r.P78)}
      stroke={COL.vap}
      strokeWidth={0.9}
      strokeDasharray="3 3"
    />,
  )
  c.push(
    <text
      key="hlt"
      x={o.w - o.mr + 7}
      y={S.Y(r.P78) + 4}
      fill={COL.vap}
      fontSize={11.5}
      fontFamily="IBM Plex Mono, monospace"
    >
      {r.P78.toFixed(4)}
    </text>,
  )
  c.push(
    <text
      key="zn"
      x={o.ml + 9}
      y={o.mt + 16}
      fill={COL.faint}
      fontSize={11.5}
      fontFamily="IBM Plex Mono, monospace"
    >
      box = extent of the main figure
    </text>,
  )

  return (
    <Figure
      viewBox={'0 0 ' + o.w + ' ' + o.h}
      label="Global pressure-temperature plane with the cycle extent"
    >
      {c}
    </Figure>
  )
}
