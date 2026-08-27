/**
 * How the compensation chamber sets the loop operating point.
 *
 * Reading order, top to bottom: what the model is and what it is not → the
 * three inputs → the verdict → the loop itself → the main P–T figure → the
 * state table and pressure profile → the T–s plane and the condenser
 * interface → the closure, folded away.
 *
 * One selection runs through every figure and the table: hover previews,
 * click / tap / Enter pins.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { CondBar } from './charts/CondBar'
import type { SelectionHandlers } from './charts/primitives'
import { ProfChart } from './charts/ProfChart'
import { PtDetail } from './charts/PtDetail'
import { PtGlobal } from './charts/PtGlobal'
import { Schematic } from './charts/Schematic'
import { TsChart } from './charts/TsChart'
import { GoverningRelations } from './components/GoverningRelations'
import { InputControl } from './components/InputControl'
import { ResultCards } from './components/ResultCards'
import { StatePointTable } from './components/StatePointTable'
import { copyLink, exportCsv, exportPng } from './lib/exports'
import { readHash, writeHash, type Inputs } from './lib/url'
import { verdict, warning } from './lib/verdict'
import { clampInput, COL, DEF, REF_TCC, RNG, type InputKey } from './model/constants'
import { pointList, solve } from './model/solve'

const MONO = "'IBM Plex Mono', monospace"
const SERIF_ITALIC: React.CSSProperties = {
  fontFamily: "'Source Serif 4', serif",
  fontStyle: 'italic',
}

const f3 = (v: number) => v.toFixed(3)
const f2 = (v: number) => v.toFixed(2)

export function App(): JSX.Element {
  const [inputs, setInputs] = useState<Inputs>({ ...DEF })
  const [ghost, setGhost] = useState(true)
  /** Previewed by hover or focus. */
  const [hi, setHi] = useState<string | null>(null)
  /** Pinned by click, tap or Enter. */
  const [sel, setSel] = useState<string | null>(null)
  const [showEq, setShowEq] = useState(false)
  const [outOfRange, setOutOfRange] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)
  const linkTimer = useRef<number | undefined>(undefined)

  // Restore an operating point that was shared as a link.
  useEffect(() => {
    const p = readHash()
    if (p.tcc !== undefined || p.q !== undefined || p.tsink !== undefined)
      setInputs((s) => ({ ...s, ...p }))
    if (p.ghost === false) setGhost(false)
  }, [])

  useEffect(() => {
    writeHash({ ...inputs, ghost })
  }, [inputs, ghost])

  useEffect(() => () => window.clearTimeout(linkTimer.current), [])

  /** Accept a raw input value, clamping it into range and saying so. */
  const setIn = useCallback((k: InputKey, raw: string) => {
    const v = parseFloat(raw)
    if (!isFinite(v)) return
    const c = clampInput(k, v)
    setInputs((s) => ({ ...s, [k]: c }))
    setLinked(false)
    setOutOfRange(
      Math.abs(c - v) > 1e-9
        ? k + ' = ' + v + ' is outside [' + RNG[k][0] + ', ' + RNG[k][1] + '] and was clamped to ' + c.toFixed(3) + '.'
        : null,
    )
  }, [])

  const r = useMemo(() => solve(inputs.tcc, inputs.q, inputs.tsink), [inputs])
  const g = useMemo(
    () => (ghost ? solve(REF_TCC, inputs.q, inputs.tsink) : null),
    [ghost, inputs.q, inputs.tsink],
  )
  const v = useMemo(() => verdict(inputs, r), [inputs, r])
  const warn = useMemo(() => warning(inputs, r, v, outOfRange), [inputs, r, v, outOfRange])

  /** A hover preview beats the pin for display, but does not replace it. */
  const active = hi ?? sel
  const hiPt = useMemo(
    () => pointList(r).find((p) => p.id === active) ?? null,
    [r, active],
  )

  const H: SelectionHandlers = useMemo(
    () => ({
      onHover: (id) => setHi(id),
      onPick: (id) => setSel((cur) => (cur === id ? null : id)),
    }),
    [],
  )

  const doReset = () => {
    setInputs({ ...DEF })
    setOutOfRange(null)
  }

  const doLink = () => {
    writeHash({ ...inputs, ghost })
    copyLink()
    setLinked(true)
    window.clearTimeout(linkTimer.current)
    linkTimer.current = window.setTimeout(() => setLinked(false), 1800)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf8f4',
        color: COL.ink,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        padding: '34px 40px 60px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1560, margin: '0 auto' }}>
        {/* --- purpose and caveat --- */}
        <div style={{ borderBottom: '1px solid ' + COL.ink, paddingBottom: 15 }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.16em',
              color: COL.faint,
              textTransform: 'uppercase',
            }}
          >
            Loop heat pipe · interactive study model
          </div>
          <h1
            style={{
              margin: '8px 0 0',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              maxWidth: '24em',
              textWrap: 'pretty',
            }}
          >
            How the compensation chamber sets the loop operating point
          </h1>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 14.5,
              lineHeight: 1.7,
              color: COL.mid,
              maxWidth: '62em',
              textWrap: 'pretty',
            }}
          >
            The CC is the only saturated volume in the loop, so its temperature fixes the pressure
            level everything else hangs from. Move the three inputs and watch where the cycle sits
            on the saturation curve, how much capillary head is left, and whether the returning
            liquid can carry the parasitic heat leak away. All quantities are reduced (divided by
            their critical-point values); the closure is a qualitative corresponding-states fit, not
            a design correlation.
          </p>
        </div>

        {/* --- inputs --- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '26px 38px',
            padding: '24px 0 22px',
            borderBottom: '1px solid #e3ddd2',
          }}
        >
          <InputControl
            id="in-tcc"
            label={
              <>
                CC temperature &nbsp;<span style={SERIF_ITALIC}>T</span>
                <sub style={{ fontFamily: MONO, fontSize: 10 }}>r,cc</sub>
              </>
            }
            ariaLabel="CC temperature, reduced"
            value={inputs.tcc}
            min={RNG.tcc[0]}
            max={RNG.tcc[1]}
            step={0.005}
            fmt={f3}
            definition={
              <>
                T / T<sub>c</sub> — dimensionless
              </>
            }
            onChange={(raw) => setIn('tcc', raw)}
          />
          <InputControl
            id="in-q"
            label={
              <>
                Heat load &nbsp;<span style={SERIF_ITALIC}>Q</span>
                <span style={{ fontFamily: MONO, fontSize: 11 }}>*</span>
              </>
            }
            ariaLabel="Heat load, reduced"
            value={inputs.q}
            min={RNG.q[0]}
            max={RNG.q[1]}
            step={0.05}
            fmt={f2}
            definition={
              <>
                Q / (ṁ<sub>ref</sub> h<sub>fg,ref</sub>) — dimensionless
              </>
            }
            onChange={(raw) => setIn('q', raw)}
          />
          <InputControl
            id="in-ts"
            label={
              <>
                Sink temperature &nbsp;<span style={SERIF_ITALIC}>T</span>
                <sub style={{ fontFamily: MONO, fontSize: 10 }}>r,sink</sub>
              </>
            }
            ariaLabel="Sink temperature, reduced"
            value={inputs.tsink}
            min={RNG.tsink[0]}
            max={RNG.tsink[1]}
            step={0.005}
            fmt={f3}
            definition={
              <>
                must stay below T<sub>r,cc</sub>
              </>
            }
            onChange={(raw) => setIn('tsink', raw)}
          />
        </div>

        {/* --- status line, overlay switch, reset, share / export --- */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px 26px',
            alignItems: 'center',
            padding: '14px 0',
            borderBottom: '1px solid #e3ddd2',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: MONO,
              fontSize: 11.5,
              color: COL.faint,
            }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#2f6b4f' }}
              aria-hidden="true"
            />
            live — recomputed on every input
          </div>

          <div
            onClick={() => setGhost((p) => !p)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                setGhost((p) => !p)
              }
            }}
            role="switch"
            aria-checked={ghost}
            tabIndex={0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              cursor: 'pointer',
              userSelect: 'none',
              fontFamily: MONO,
              fontSize: 11.5,
            }}
          >
            <span
              style={{
                width: 34,
                height: 18,
                borderRadius: 999,
                background: ghost ? COL.ghost : '#efebe2',
                border: '1px solid #cfc8bb',
                position: 'relative',
                display: 'inline-block',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: ghost ? 18 : 3,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#faf8f4',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.18)',
                }}
              />
            </span>
            Reference overlay &nbsp;T<sub>r,cc</sub> = {REF_TCC.toFixed(3)}
          </div>

          <button
            className="btn-reset"
            onClick={doReset}
            style={{
              fontSize: 12.5,
              padding: '9px 4px',
              border: 'none',
              borderBottom: '1px solid #a39b8c',
              borderRadius: 0,
              background: 'transparent',
              color: COL.faint,
              marginLeft: 'auto',
            }}
          >
            Reset to default
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              border: '1px solid #a39b8c',
              borderRadius: 5,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: COL.faint,
                fontFamily: MONO,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: '#f2eee5',
                borderRight: '1px solid #d8d1c4',
              }}
            >
              Share / export
            </span>
            <button
              className="btn-export"
              onClick={doLink}
              style={{
                fontSize: 12.5,
                padding: '9px 14px',
                border: 'none',
                borderRight: '1px solid #d8d1c4',
                background: '#fff',
                color: COL.ink,
                minHeight: 40,
              }}
            >
              {linked ? '✓ Copied' : 'Copy link'}
            </button>
            <button
              className="btn-export"
              onClick={() => exportCsv(inputs, r)}
              style={{
                fontSize: 12.5,
                padding: '9px 14px',
                border: 'none',
                borderRight: '1px solid #d8d1c4',
                background: '#fff',
                color: COL.ink,
                minHeight: 40,
              }}
            >
              CSV
            </button>
            <button
              className="btn-export"
              onClick={exportPng}
              style={{
                fontSize: 12.5,
                padding: '9px 14px',
                border: 'none',
                background: '#fff',
                color: COL.ink,
                minHeight: 40,
              }}
            >
              Chart PNG
            </button>
          </div>
        </div>

        {warn && (
          <div
            role="status"
            style={{
              marginTop: 16,
              border: '1px solid #b8442f',
              background: '#fbf1ee',
              padding: '11px 14px',
              fontFamily: MONO,
              fontSize: 12,
              color: '#8f2f1e',
              lineHeight: 1.6,
            }}
          >
            {warn}
          </div>
        )}

        <ResultCards r={r} v={v} />

        {/* --- the loop --- */}
        <div style={{ paddingTop: 34 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            The loop, and where the nine states sit in it
          </h2>
          <p
            style={{
              margin: '5px 0 12px',
              fontSize: 13,
              color: COL.mid,
              lineHeight: 1.65,
              maxWidth: '62em',
            }}
          >
            One evaporator with a wick, a compensation chamber holding the only free liquid surface,
            a vapour line, a condenser that splits itself into a two-phase and a subcooled length,
            and a liquid line back to the CC. The same hover and pin selection works here.
          </p>
          <div style={{ overflowX: 'auto', paddingBottom: 14 }}>
            <div style={{ minWidth: 1060, maxWidth: 1060 }}>
              <Schematic r={r} hi={active} H={H} />
            </div>
          </div>
        </div>

        {/* --- main P-T figure --- */}
        <div style={{ paddingTop: 34 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 24,
              flexWrap: 'wrap',
              marginBottom: 4,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>The cycle on the P–T plane</h2>
              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: 13,
                  color: COL.mid,
                  lineHeight: 1.65,
                  maxWidth: '54em',
                }}
              >
                Axes are linear and magnified about the operating point, so the pressure drops that
                the log-scale plane hides become visible. Hover a state point to preview it, or
                click, tap or tab-and-press-Enter to pin it — the selection follows through every
                figure and the table.
              </p>
            </div>
            <Legend />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 1060, maxWidth: 1060 }}>
              <PtDetail r={r} hi={active} H={H} />
            </div>
          </div>

          {/* --- what is selected --- */}
          <div
            style={{
              border: '1px solid ' + (hiPt ? COL.hi : '#cfc8bb'),
              background: '#fff',
              padding: '12px 15px',
              marginTop: 10,
              display: 'flex',
              gap: '8px 18px',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              minHeight: 24,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 16,
                fontWeight: 600,
                color: hiPt ? COL.hi : COL.faint,
              }}
            >
              {hiPt ? hiPt.id : '—'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {hiPt ? hiPt.name : 'Hover a state point or a table row'}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: COL.mid }}>
              {hiPt
                ? 'T r ' +
                  hiPt.t.toFixed(3) +
                  '   P r ' +
                  hiPt.p.toFixed(4) +
                  '   s * ' +
                  hiPt.s.toFixed(2)
                : ''}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: hiPt ? COL.hi : COL.faint,
              }}
            >
              {sel ? (hi && hi !== sel ? 'previewing · ' + sel + ' pinned' : 'pinned') : hiPt ? 'click to pin' : ''}
            </span>
            {sel && (
              <button
                className="btn-clear"
                onClick={() => setSel(null)}
                style={{
                  fontSize: 11.5,
                  padding: '5px 10px',
                  border: '1px solid #a39b8c',
                  borderRadius: 4,
                  background: '#fff',
                  color: COL.faint,
                }}
              >
                Clear selection
              </button>
            )}
            <span
              style={{
                fontSize: 13,
                color: COL.mid,
                lineHeight: 1.65,
                flex: 1,
                minWidth: 260,
                textWrap: 'pretty',
              }}
            >
              {hiPt ? hiPt.note : ''}
            </span>
          </div>
        </div>

        {/* --- table, profile, T-s, condenser --- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: 34,
            paddingTop: 36,
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>State points</h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: COL.mid, lineHeight: 1.65 }}>
              Hover a row to preview it; click or press Enter to pin that point across every figure.
            </p>
            <StatePointTable r={r} active={active} pinned={sel} H={H} />
          </div>

          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
              Pressure around the loop
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: COL.mid, lineHeight: 1.65 }}>
              The step at the meniscus is the capillary head; everything else is a loss that head
              has to pay for.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 460, maxWidth: 560 }}>
                <ProfChart r={r} hi={active} H={H} />
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
              The cycle on the T–s plane
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: COL.mid, lineHeight: 1.65 }}>
              Raising T<sub>r,cc</sub> lifts the cycle and narrows it: the latent heat falls, so the
              9→1 crossing of the dome gets shorter.
            </p>
            <div style={{ maxWidth: 470 }}>
              <TsChart r={r} g={g} hi={active} H={H} />
            </div>
          </div>

          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
              Where the cycle sits, and where the interface is
            </h2>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: COL.mid, lineHeight: 1.65 }}>
              The whole cycle is a small box sliding along the saturation line. The condenser splits
              itself into a two-phase and a subcooled length to absorb the load.
            </p>
            <div style={{ maxWidth: 470 }}>
              <PtGlobal r={r} g={g} />
            </div>
            <div style={{ marginTop: 16, maxWidth: 470 }}>
              <CondBar r={r} hi={active} H={H} />
            </div>
          </div>
        </div>

        <GoverningRelations open={showEq} onToggle={() => setShowEq((p) => !p)} />
      </div>
    </div>
  )
}

/**
 * Colour, line style and marker shape all carry the same three-way coding, so
 * the figures stay readable without relying on hue alone.
 */
function Legend(): JSX.Element {
  const item: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7 }
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        flexWrap: 'wrap',
        fontFamily: MONO,
        fontSize: 11,
        color: COL.mid,
      }}
    >
      <span style={item}>
        <svg width="30" height="10" aria-hidden="true">
          <line
            x1="0"
            y1="5"
            x2="30"
            y2="5"
            stroke={COL.wick}
            strokeWidth="2.4"
            strokeDasharray="9 3 2 3"
          />
          <polygon points="15,0.6 19.4,5 15,9.4 10.6,5" fill={COL.node} stroke={COL.nodeEdge} />
        </svg>
        liquid through the wick 8→9
      </span>
      <span style={item}>
        <svg width="30" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="30" y2="5" stroke={COL.vap} strokeWidth="2.4" />
          <circle cx="15" cy="5" r="3.6" fill={COL.node} stroke={COL.nodeEdge} />
        </svg>
        meniscus 9→1, then vapour 1→4
      </span>
      <span style={item}>
        <svg width="30" height="10" aria-hidden="true">
          <line
            x1="0"
            y1="5"
            x2="30"
            y2="5"
            stroke={COL.liq}
            strokeWidth="2.4"
            strokeDasharray="7 4"
          />
          <rect x="11.5" y="1.5" width="7" height="7" fill={COL.node} stroke={COL.nodeEdge} />
        </svg>
        condensate and liquid line 4→8
      </span>
      <span style={item}>
        <svg width="30" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="30" y2="5" stroke={COL.sat} strokeWidth="3" />
        </svg>
        saturation
      </span>
    </div>
  )
}
