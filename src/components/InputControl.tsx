/**
 * One input: a label, a direct number entry, a slider, and the range and
 * definition underneath. Number box and slider are bound to the same value,
 * so either can drive it, and both are keyboard-reachable.
 */

import type { JSX, ReactNode } from 'react'

interface Props {
  id: string
  /** Rendered label, including the italic symbol. */
  label: ReactNode
  /** Accessible name for the number box and the slider. */
  ariaLabel: string
  value: number
  min: number
  max: number
  step: number
  /** Formats min/max for the scale underneath. */
  fmt: (v: number) => string
  /** What the quantity means — printed between the range ends. */
  definition: ReactNode
  onChange: (raw: string) => void
}

export function InputControl({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  fmt,
  definition,
  onChange,
}: Props): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
          // keeps the slider baselines aligned across the three columns
          minHeight: 46,
        }}
      >
        <label htmlFor={id} style={{ fontSize: 13.5, fontWeight: 500 }}>
          {label}
        </label>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          aria-label={ariaLabel}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        aria-label={ariaLabel + ' slider'}
        style={{ width: '100%' }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10.5,
          color: '#5c5648',
        }}
      >
        <span>{fmt(min)}</span>
        <span style={{ color: '#6b6456' }}>{definition}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}
