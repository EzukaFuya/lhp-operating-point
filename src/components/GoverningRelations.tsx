/**
 * The closure, folded away by default: the ten governing relations, the model
 * constants, and the assumptions the whole thing rests on.
 */

import type { JSX, ReactNode } from 'react'
import { CV, PORE_RADIUS } from '../model/constants'

const EQUATIONS: ReactNode[] = [
  <>
    ln <i>P</i>
    <sub>r</sub> = <i>A</i>(1 − 1/<i>T</i>
    <sub>r</sub>) ,&nbsp; <i>A</i> = 7
  </>,
  <>
    <i>P</i>
    <sub>7,8</sub> = <i>P</i>
    <sub>sat</sub>(<i>T</i>
    <sub>8</sub>) — the CC fixes the loop pressure level
  </>,
  <>
    <i>P</i>
    <sub>1</sub> − <i>P</i>
    <sub>9</sub> = Δ<i>P</i>
    <sub>GV</sub> + Δ<i>P</i>
    <sub>VL</sub> + Δ<i>P</i>
    <sub>COND</sub> + Δ<i>P</i>
    <sub>LL</sub> + Δ<i>P</i>
    <sub>WICK</sub>
  </>,
  <>
    Δ<i>P</i>
    <sub>cap</sub> ≤ Δ<i>P</i>
    <sub>cap,max</sub> = 2σ(<i>T</i>
    <sub>8</sub>)/<i>r</i>
    <sub>p</sub>
  </>,
  <>
    <i>T</i>
    <sub>1</sub> = <i>T</i>
    <sub>sat</sub>(<i>P</i>
    <sub>1</sub>) ,&nbsp; <i>T</i>
    <sub>1</sub> − <i>T</i>
    <sub>8</sub> ≈ Δ<i>P</i>
    <sub>ext</sub>(d<i>T</i>/d<i>P</i>)<sub>sat</sub>
  </>,
  <>
    ṁ = <i>Q</i>/<i>h</i>
    <sub>fg</sub> ,&nbsp; Δ<i>P</i>
    <sub>v</sub> ∝ ṁ/ρ<sub>v</sub>(<i>T</i>
    <sub>8</sub>)
  </>,
  <>
    <i>Q</i> = <i>UA</i>
    <sub>2φ</sub>(<i>T</i>
    <sub>5</sub> − <i>T</i>
    <sub>sink</sub>) ⇒ <i>L</i>
    <sub>2φ</sub>/<i>L</i>
    <sub>c</sub>
  </>,
  <>
    <i>Q</i>
    <sub>leak</sub> = ṁ <i>c</i>
    <sub>p,l</sub> Δ<i>T</i>
    <sub>sub</sub> — CC energy balance
  </>,
  <>
    Δ<i>T</i>
    <sub>sub,av</sub> = (<i>T</i>
    <sub>5</sub> − <i>T</i>
    <sub>sink</sub>)[1 − exp(−NTU<sub>sub</sub>)]
  </>,
  <>
    <i>h</i>
    <sub>fg</sub>* = θ<sup>0.38</sup>, σ* = θ<sup>1.26</sup>, ρ<sub>l</sub>* = θ<sup>0.28</sup>, θ =
    (1−<i>T</i>
    <sub>r</sub>)/0.3
  </>,
]

const CONSTANTS: Array<[ReactNode, string]> = [
  [
    <>
      r<sub>p</sub>* pore radius
    </>,
    PORE_RADIUS.toFixed(2),
  ],
  [
    <>
      c<sub>p,l</sub>*
    </>,
    CV.cpl.toFixed(2),
  ],
  [
    <>
      c<sub>p,v</sub>*
    </>,
    CV.cpv.toFixed(2),
  ],
  [<>evaporator G*</>, CV.Ge.toFixed(1)],
  [<>wick leak G*</>, CV.Gw.toFixed(2)],
  [
    <>
      ambient T<sub>r</sub>
    </>,
    CV.tamb.toFixed(3),
  ],
  [<>condenser UA*</>, CV.Kc.toFixed(1)],
  [<>subcooler NTU coeff.</>, CV.Ks.toFixed(2)],
]

interface Props {
  open: boolean
  onToggle: () => void
}

export function GoverningRelations({ open, onToggle }: Props): JSX.Element {
  return (
    <div style={{ paddingTop: 34, borderTop: '1px solid #e3ddd2', marginTop: 34 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          userSelect: 'none',
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        <span
          aria-hidden="true"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#5c5648', width: 12 }}
        >
          {open ? '▾' : '▸'}
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          }}
        >
          Governing relations and assumptions
        </h2>
      </button>

      {open && (
        <div style={{ paddingTop: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '12px 44px',
              fontFamily: "'Source Serif 4', serif",
              fontSize: 15.5,
              lineHeight: 1.85,
            }}
          >
            {EQUATIONS.map((eq, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    color: '#6b6456',
                    width: 24,
                    flexShrink: 0,
                  }}
                >
                  ({i + 1})
                </span>
                <span>{eq}</span>
              </div>
            ))}
          </div>

          <h3
            style={{
              margin: '26px 0 10px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#5c5648',
              fontWeight: 500,
            }}
          >
            Model constants
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '7px 28px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              color: '#4a453c',
            }}
          >
            {CONSTANTS.map(([label, value], i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #ece7de',
                  paddingBottom: 5,
                }}
              >
                <span style={{ color: '#5c5648' }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          <p
            style={{
              margin: '22px 0 0',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              lineHeight: 1.95,
              color: '#5c5648',
              maxWidth: '78em',
            }}
          >
            Closure: ρ<sub>v</sub>* ∝ P<sub>r</sub>/T<sub>r</sub> (ideal gas), μ<sub>l</sub>* =
            exp[2.5(1/T<sub>r</sub> − 1/0.7)], all Δ<i>P</i> laminar (∝ ṁμ/ρ). Segments 2–3 and 3–4
            carry vapour superheat; 5–6 and 6–7 carry liquid subcooling. Gravity, non-condensable
            gas, transient charge redistribution and wick deprime hysteresis are all omitted. The
            pressure and temperature scales of the main P–T figure are magnified about the operating
            point, following the standard schematic construction. This is a study aid: trends are
            meaningful, absolute numbers are not.
          </p>
        </div>
      )}
    </div>
  )
}
