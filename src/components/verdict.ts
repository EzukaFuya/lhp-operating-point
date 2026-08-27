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
  /** The meniscus cannot hold: ΔP_cap has passed 2σ/r_p. */
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

  // Concrete inputs to move, so the advice is actionable rather than generic.
  const upT = f3(Math.min(RNG.tcc[1], s.tcc + 0.05))
  const dnQ = f2(Math.max(RNG.q[0], s.q * 0.6))
  const dnT = f3(Math.max(RNG.tsink[0], s.tsink - 0.05))

  let statusTitle: string
  let statusBody: string
  let statusColor: string

  if (dryout) {
    statusColor = STATUS.bad
    statusTitle = 'Capillary limit exceeded'
    statusBody =
      'ΔP_cap has grown past 2σ/r_p, so the meniscus cannot hold and the evaporator dries out. Cause: at T_r,cc = ' +
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
    statusTitle = 'Feasible'
    statusBody =
      'Capillary head and subcooling both have room. The loop will settle here with the CC free to follow the sink temperature and load.'
  }

  return {
    dryout,
    starve,
    binding,
    statusTitle,
    statusBody,
    statusColor,
    regimeName: starve ? 'Variable conductance' : 'Fixed conductance',
    regimeNote: starve
      ? 'ΔT_sub,req > ΔT_sub,av — the CC temperature is set by its own energy balance, not by the sink.'
      : 'L_2φ/L_c = ' +
        f3(r.f) +
        ' with subcooling to spare, so the CC follows the sink and the load.',
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
  return null
}
