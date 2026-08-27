/**
 * The four verdict cards: the two margins with their bars, the regime, and
 * the pass/fail status. These sit directly under the inputs so the
 * conclusion is legible before any figure is read.
 *
 * The tighter of the two margins is tagged "binding", so a comfortable
 * capillary number cannot make a starved subcooling budget look safe.
 */

import type { JSX, ReactNode } from 'react'
import type { Solution } from '../model/solve'
import type { Verdict } from '../lib/verdict'

const CARD: React.CSSProperties = {
  padding: '14px 16px 15px',
  background: '#fff',
}

const CAP_LABEL: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#5c5648',
}

function MarginCard({
  title,
  value,
  color,
  barWidth,
  tag,
  formula,
}: {
  title: string
  value: string
  color: string
  barWidth: string
  tag: string
  formula: ReactNode
}): JSX.Element {
  return (
    <div style={{ ...CARD, border: '1px solid ' + color, borderTop: '3px solid ' + color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={CAP_LABEL}>{title}</span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {tag}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 30,
          fontWeight: 600,
          marginTop: 7,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ height: 5, background: '#ece7de', marginTop: 11 }}>
        <div style={{ height: 5, width: barWidth, background: color }} />
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10.5,
          color: '#5c5648',
          marginTop: 8,
          lineHeight: 1.6,
        }}
      >
        {formula}
      </div>
    </div>
  )
}

export function ResultCards({ r, v }: { r: Solution; v: Verdict }): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        padding: '22px 0 0',
      }}
    >
      <MarginCard
        title="Capillary margin"
        value={v.capMarginS}
        color={v.capColor}
        barWidth={v.capBarW}
        tag={v.binding === 'cap' ? 'binding' : ''}
        formula={
          <>
            1 − ΔP<sub>cap</sub>/ΔP<sub>cap,max</sub> = 1 − {r.dpCap.toFixed(4)}/
            {r.dpMax.toFixed(4)}
          </>
        }
      />

      <MarginCard
        title="Subcooling margin"
        value={v.subMarginS}
        color={v.subColor}
        barWidth={v.subBarW}
        tag={v.binding === 'sub' ? 'binding' : ''}
        formula={
          <>
            1 − ΔT<sub>sub,req</sub>/ΔT<sub>sub,av</sub> = 1 − {r.subReq.toFixed(4)}/
            {r.subAv.toFixed(4)}
          </>
        }
      />

      <div style={{ ...CARD, border: '1px solid #cfc8bb', borderTop: '3px solid #6f6759' }}>
        <div style={CAP_LABEL}>Regime</div>
        <div style={{ fontSize: 19, fontWeight: 600, marginTop: 9, lineHeight: 1.3 }}>
          {v.regimeName}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            color: '#5c5648',
            marginTop: 9,
            lineHeight: 1.65,
          }}
        >
          {v.regimeNote}
        </div>
      </div>

      <div
        style={{
          ...CARD,
          border: '1px solid ' + v.statusColor,
          borderTop: '3px solid ' + v.statusColor,
        }}
      >
        <div style={CAP_LABEL}>Status</div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 600,
            marginTop: 9,
            lineHeight: 1.3,
            color: v.statusColor,
          }}
        >
          {v.statusTitle}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: '#4a453c',
            marginTop: 9,
            lineHeight: 1.65,
            textWrap: 'pretty',
          }}
        >
          {v.statusBody}
        </div>
      </div>
    </div>
  )
}
