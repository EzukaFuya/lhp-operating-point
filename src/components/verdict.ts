/**
 * Turns a solution into the judgement shown above the figures: the two
 * margins, which one is binding, the regime, the pass/fail status with its
 * remedial advice, and the warning banner.
 *
 * Ported from the prototype's renderVals().
 */

import { RNG, STATUS } from './model/constants.js'
import type { Solution } from './model/solve.js'
import type { Inputs } from './url.js'

const f3 = (v: number) => v.toFixed(3)
const f4 = (v: number) => v.toFixed(4)
const f2 = (v: number) => v.toFixed(2)

export interface Verdict {
  /** The meniscus cannot hold: ΔP_cap has passed the capillary maximum. */
  dryout: boolean
  /** The returning liquid cannot absorb the heat leak into the CC. */
  starve: boolean
  /** Which budget has the less room, and so governs the design. */
  binding: 'cap' | 'sub'

  statusTitle: string
  statusBody: string
  statusColor: string

  regimeName: string
  regimeNote: string

  capMarginS: string
  subMarginS: string
  capBarW: string
  subBarW: string
  capColor: string
  subColor: string

  /** The CC energy-balance residual, formatted. */
  RccS: string
  /** What that residual means for a real chamber, in one phrase. */
  RccLabel: string
  RccNote: string
  RccColor: string
  /** True when the residual is small enough to call this a passive solution. */
  balanced: boolean
}

/** Format a margin as a percentage; -1 marks "no subcooling available at all". */
export const pct = (v: number): string => (v <= -1 ? 'n/a' : (v * 100).toFixed(0) + ' %')

/** Margin as a bar width, clamped to 0–100%. */
const barW = (v: number): string => Math.max(0, Math.min(100, v * 100)).toFixed(0) + '%'

/** Green above a quarter left, amber below, red once negative. */
const mcol = (v: number): string => (v < 0 ? STATUS.bad : v < 0.25 ? STATUS.warn : STATUS.good)

export function verdict(s: Inputs, r: Solution): Verdict {
  const dryout = r.dpCap >= r.dpMax
  const starve = r.subReq > r.subAv
  const binding: 'cap' | 'sub' = r.subM < r.capM ? 'sub' : 'cap'
  // f saturates at exactly 1 by construction, so this is a clean test.
  const fullyUsed = r.f >= 1

  // Concrete inputs to move, so the advice is actionable rather than generic.
  const upT = f3(Math.min(RNG.tcc[1], s.tcc + 0.05))
  const dnQ = f2(Math.max(RNG.q[0], s.q * 0.6))
  const dnT = f3(Math.max(RNG.tsink[0], s.tsink - 0.05))

  let statusTitle: string
  let statusBody: string
  let statusColor: string

  // Ordered by how fundamental the failure is, so the card agrees with the
  // banner and the figure watermark, which use `r.status`.
  if (r.status === 'nonphysical') {
    statusColor = STATUS.bad
    statusTitle = 'Not a physical state'
    statusBody =
      'ΔP_WICK = ' +
      f4(r.dpWK) +
      ' exceeds the whole CC pressure P₇,₈ = ' +
      f4(r.P78) +
      ', so P₉ would be negative. The figures show the formal solution of the equations, floored so they stay legible. Raise T_r,cc or drop the heat load to about ' +
      dnQ +
      '.'
  } else if (dryout) {
    statusColor = STATUS.bad
    statusTitle = 'Capillary limit exceeded'
    statusBody =
      'ΔP_cap has grown past Ca·σ*/r_p*, so the meniscus cannot hold and the evaporator dries out. Cause: at T_r,cc = ' +
      f3(s.tcc) +
      ' the vapour is thin, so ΔP_VL dominates. To recover, raise CC temperature to about ' +
      upT +
      ', or drop the heat load to about ' +
      dnQ +
      '.'
  } else if (starve) {
    statusColor = STATUS.bad
    statusTitle = 'Subcooling starved'
    statusBody =
      'The returning liquid cannot absorb the heat leak into the CC. Cause: ΔT_sub,req = ' +
      f4(r.subReq) +
      ' against only ' +
      f4(r.subAv) +
      ' available, because L_2φ/L_c = ' +
      f3(r.f) +
      ' leaves little subcooler length. To recover, lower the sink temperature to about ' +
      dnT +
      ', or raise the heat load to thicken the flow.'
  } else if (Math.min(r.capM, r.subM) < 0.25) {
    statusColor = STATUS.warn
    statusTitle = 'Feasible, low margin'
    statusBody =
      'The point closes, but the ' +
      (binding === 'sub' ? 'subcooling' : 'capillary') +
      ' budget has less than a quarter left. ' +
      (binding === 'sub'
        ? 'Lower T_r,sink or raise Q* to buy subcooler length.'
        : 'Raise T_r,cc a few hundredths to gain vapour density.')
  } else {
    statusColor = STATUS.good
    statusTitle = 'Budgets close'
    statusBody =
      'Capillary head and subcooling both have room at this prescribed CC temperature. Whether the loop would settle here is a separate question — read the CC balance card.'
  }

  // How far this prescribed CC temperature is from closing its own energy
  // balance. Scaled against the heat leak, because an absolute residual means
  // little on its own.
  const relative = Math.abs(r.qleak) > 1e-9 ? Math.abs(r.Rcc) / Math.abs(r.qleak) : Infinity
  const balanced = relative < 0.01
  const RccLabel = balanced
    ? 'passive — balance closes'
    : r.Rcc > 0
      ? 'needs active cooling'
      : 'needs active heating'
  const RccNote = balanced
    ? 'The heat leak and the returning liquid cancel, so a chamber with no heater or cooler would hold this temperature.'
    : 'Q_leak* = ' +
      f4(r.qleak) +
      ' against ṁ*c_p,l*(T₈−T₇) = ' +
      f4(r.carried) +
      '. A passive chamber would not hold ' +
      f3(s.tcc) +
      ' — use “Solve passive point” to find where it would settle.'

  return {
    dryout,
    starve,
    binding,
    statusTitle,
    statusBody,
    statusColor,
    RccS: (r.Rcc >= 0 ? '+' : '−') + f4(Math.abs(r.Rcc)),
    RccLabel,
    RccNote,
    RccColor: balanced ? STATUS.good : relative > 0.25 ? STATUS.bad : STATUS.warn,
    balanced,
    // The regime is set by how much of the condenser is in use, not by the
    // subcooling budget. While part of the condenser is still flooded with
    // liquid the interface moves with the load, so the loop conductance
    // varies; once the two-phase front reaches the outlet there is no length
    // left to recruit and the conductance is fixed.
    regimeName: fullyUsed ? 'Fixed conductance' : 'Variable conductance',
    regimeNote: fullyUsed
      ? 'L_2φ/L_c = 1 — the condenser is fully two-phase, so there is no subcooler length left to recruit and the operating temperature rises with the load.'
      : 'L_2φ/L_c = ' +
        f3(r.f) +
        ' — part of the condenser is still flooded, so the interface moves with the load and the loop conductance varies.',
    capMarginS: pct(r.capM),
    subMarginS: pct(r.subM),
    capBarW: barW(r.capM),
    subBarW: barW(r.subM),
    capColor: mcol(r.capM),
    subColor: mcol(r.subM),
  }
}

/**
 * The banner above the cards. Out-of-range clamping wins over physical
 * warnings, which are themselves ordered most-fundamental first.
 */
export function warning(
  s: Inputs,
  r: Solution,
  v: Verdict,
  outOfRange: string | null,
): string | null {
  if (outOfRange) return outOfRange
  if (s.tsink >= s.tcc)
    return (
      'T_r,sink (' +
      f3(s.tsink) +
      ') is at or above T_r,cc (' +
      f3(s.tcc) +
      '). The condenser cannot reject heat; the model output below is not physical.'
    )
  if (r.nonphys)
    return (
      'The wick pressure loss ΔP_WICK (' +
      f4(r.dpWK) +
      ') now exceeds the whole CC pressure P₇,₈ (' +
      f4(r.P78) +
      '), so P₉ would be negative. Point 9 is not a physical state here and is shown clamped; the loop has long since dried out.'
    )
  if (v.dryout)
    return 'Capillary limit exceeded — the curves below show the formal solution of the equations, not a state the hardware can reach.'
  if (v.starve)
    return (
      'Subcooling starved — the returning liquid cannot absorb the heat leak (ΔT_sub,req = ' +
      f4(r.subReq) +
      ' against ' +
      f4(r.subAv) +
      ' available). The curves below show the formal solution of the equations, not a state the hardware can reach.'
    )
  return null
}
