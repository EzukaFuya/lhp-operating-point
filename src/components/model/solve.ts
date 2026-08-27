/**
 * The loop solver.
 *
 * `solve` is a *prescribed-CC* calculation: given the CC temperature it walks
 * the loop once — meniscus, grooves, vapour line, condenser, liquid line, back
 * through the wick — and reports the state points, the two budgets, and the CC
 * energy-balance residual `Rcc` left over. It does not adjust anything to make
 * that residual vanish.
 *
 * `solveOperatingPoint` is the passive calculation: it searches for the CC
 * temperature at which `Rcc` is zero, which is where a loop with no CC heater
 * or cooler actually settles.
 *
 * The closure is qualitative — see `properties.ts` for what the starred
 * quantities are normalised against, and the README for validation status.
 */

import { CV, PORE_RADIUS, RNG } from './constants.js'
import { dpdt, hfg, mul, pr, rhol, rhov, sig, sl, ssh, sv, trs } from './properties.js'

/**
 * Whether a solution is a state the hardware could actually reach.
 *
 * - `closed` — the pressure and subcooling budgets both balance.
 * - `capillary_exceeded` — ΔP_cap has passed the maximum the meniscus can
 *   hold; the evaporator dries out.
 * - `subcooling_starved` — the returning liquid cannot absorb the heat leak.
 * - `nonphysical` — the wick loss exceeds the whole CC pressure, so P₉ would
 *   be negative. The state points are a formal extrapolation only.
 */
export type SolutionStatus =
  | 'closed'
  | 'capillary_exceeded'
  | 'subcooling_starved'
  | 'nonphysical'

export interface Solution {
  // inputs
  t8: number
  q: number
  tsink: number

  // pressures around the loop
  P78: number
  P7: number
  P6: number
  P5: number
  P4: number
  P3: number
  P2: number
  P1: number
  /** Floored copy of P9 used for drawing only; see `P9raw` for the physics. */
  P9: number

  // temperatures around the loop
  T1: number
  T2: number
  T2p: number
  T3: number
  T4: number
  T5: number
  T6: number
  T7: number
  T9: number

  // properties at the CC state
  hfg: number
  mdot: number
  rv: number
  rl: number
  /** Two-phase fraction of the condenser length, L_2φ/L_c. */
  f: number

  // pressure-drop budget
  dpGV: number
  dpVL: number
  dpCO: number
  dpLL: number
  dpWK: number
  dpCap: number
  dpMax: number

  // subcooling budget
  /** Subcooling the CC energy balance needs the returning liquid to carry. */
  subReq: number
  /** Subcooling the subcooler length can deliver, by effectiveness–NTU. */
  subAv: number
  /** Subcooling actually delivered at the condenser exit, T5 − T6. */
  sub: number
  /** Heat leaking into the CC, through the wick and from ambient. */
  qleak: number
  /** Heat the returning liquid actually removes from the CC. */
  carried: number
  /**
   * CC energy-balance residual, `qleak − carried`: the net heat that must be
   * removed from the CC by other means to hold it at this temperature.
   * Positive means active cooling is required, negative means active heating.
   * Rcc = 0 is the passive operating point.
   */
  Rcc: number
  /** Whether this is a state the hardware could reach, and if not, why not. */
  status: SolutionStatus

  dpdt: number
  /**
   * The physical P9. Every pressure identity holds against this value:
   * P1 − P9raw = ΔP_GV + ΔP_VL + ΔP_COND + ΔP_LL + ΔP_WICK. Negative when the
   * wick loss exceeds the whole CC pressure.
   */
  P9raw: number
  /** True when the drawn P9 had to be floored away from the physical one. */
  plotClamped: boolean
  /** True when P9 would be non-positive, i.e. point 9 is not a real state. */
  nonphys: boolean
  /** Capillary margin, 1 − ΔP_cap/ΔP_cap,max. */
  capM: number
  /** Subcooling margin, 1 − ΔT_sub,req/ΔT_sub,av. -1 when none is available. */
  subM: number
}

export function solve(t8: number, q: number, tsink: number, rp = PORE_RADIUS): Solution {
  const K = CV
  const P78 = pr(t8)
  const hfgV = hfg(t8)
  // h_fg vanishes at the critical point; the input range stops well short of
  // it, but the guard keeps the mass flow finite for any caller.
  const mdot = q / Math.max(1e-9, hfgV)
  const rv = rhov(t8)
  const rl = rhol(t8)
  const mu = mul(t8)

  // Two-phase fraction of the condenser: how much length the load needs.
  const f = Math.min(1, q / (K.Kc * Math.max(0.004, t8 - tsink)))

  const dpGV = (K.Cg * mdot) / rv
  const dpVL = (K.Cv * mdot) / rv
  const dpCO = (K.Cc * f * mdot) / rv
  const dpLL = (K.Cl * mu * mdot) / rl
  const dpWK = (K.Cw * mu * mdot) / rl
  const dpCap = dpGV + dpVL + dpCO + dpLL + dpWK
  const dpMax = (K.Ca * sig(t8)) / rp

  // Walk the pressures back from the CC, which fixes the level.
  const P7 = P78
  const P6 = P78 + dpLL
  const P5 = P6 + 0.15 * dpCO
  const P4 = P5 + 0.75 * dpCO
  const P3 = P4 + 0.1 * dpCO
  const P2 = P3 + dpVL
  const P1 = P2 + dpGV

  // P9raw is the physical value and the one every budget identity uses. P9 is
  // a floored copy that exists only so the figures stay legible when the wick
  // loss approaches the whole CC pressure; `plotClamped` says when they differ.
  const P9raw = P78 - dpWK
  const nonphys = P9raw <= 0
  const P9 = Math.max(P78 * 0.05, P9raw)
  const plotClamped = P9 !== P9raw

  const T1 = trs(P1)
  const sup = q / K.Ge
  const T2 = T1 + sup
  const T2p = trs(P2)
  const sh2 = Math.max(0, T2 - T2p)
  const T3 = trs(P3) + 0.45 * sh2
  const T4 = trs(P4)
  const T5 = trs(P5)

  // Heat leaking into the CC: back through the wick from the evaporator, and
  // from ambient across the CC wall.
  const qleak = K.Gw * (T1 + sup - t8) + K.Ga * Math.max(0, K.tamb - t8)

  // The subcooling the CC balance would need the returning liquid to carry.
  const subReq = qleak / Math.max(1e-6, mdot * K.cpl)

  // What the subcooler length can actually deliver, by effectiveness–NTU.
  const ntu = (K.Ks * (1 - f)) / Math.max(1e-6, mdot)
  const subAv = Math.max(0, T5 - tsink) * (1 - Math.exp(-ntu))

  // Walk the liquid forward from the condenser rather than assuming the CC
  // balance closes. T6 is what the subcooler delivers; the liquid line then
  // picks up ambient heat on the way back. Neither is adjusted to make the
  // balance work out — the shortfall is reported instead, as `Rcc`.
  const sub = subAv
  const T6 = T5 - sub
  const T7 = T6 + K.Gll * Math.max(0, K.tamb - T6)

  // CC energy balance. `carried` is the heat the returning liquid actually
  // removes; `Rcc` is what is left over and must be taken out of the CC by
  // some other means to hold it at t8. Rcc = 0 is the passive operating
  // point — see `solveOperatingPoint`.
  const carried = mdot * K.cpl * (t8 - T7)
  const Rcc = qleak - carried

  const dryout = dpCap >= dpMax
  const starved = subReq > subAv
  const status: SolutionStatus = nonphys
    ? 'nonphysical'
    : dryout
      ? 'capillary_exceeded'
      : starved
        ? 'subcooling_starved'
        : 'closed'

  return {
    t8,
    q,
    tsink,
    P78,
    P7,
    P6,
    P5,
    P4,
    P3,
    P2,
    P1,
    P9,
    T1,
    T2,
    T2p,
    T3,
    T4,
    T5,
    T6,
    T7,
    T9: T1,
    hfg: hfgV,
    mdot,
    rv,
    rl,
    f,
    dpGV,
    dpVL,
    dpCO,
    dpLL,
    dpWK,
    dpCap,
    dpMax,
    subReq,
    subAv,
    sub,
    qleak,
    carried,
    Rcc,
    status,
    dpdt: dpdt(t8),
    P9raw,
    plotClamped,
    nonphys,
    capM: 1 - dpCap / dpMax,
    subM: subAv > 0 ? 1 - subReq / subAv : -1,
  }
}

/** Outcome of searching for the CC temperature a passive loop settles at. */
export interface OperatingPoint {
  /** True when a temperature satisfying Rcc = 0 was bracketed and converged. */
  converged: boolean
  /** The CC temperature found, or null when none exists in range. */
  tcc: number | null
  /** The solution there, or null. */
  solution: Solution | null
  /** |Rcc| at the returned point. */
  residual: number
  /** Bisection steps taken. */
  iterations: number
  /** Why the search failed, when it did. */
  note: string
}

/**
 * Find the CC temperature a passive loop settles at for a given load and sink
 * temperature — the temperature at which the CC energy balance closes on its
 * own, Rcc(T_cc) = 0, with no heater or cooler on the compensation chamber.
 *
 * Rcc is not guaranteed monotonic in T_cc across the whole range, so the range
 * is scanned for a sign change first and the first bracket found is bisected.
 * Bisection rather than a secant method because Rcc is only piecewise smooth —
 * `f` saturates at 1 and several terms clamp at zero.
 */
export function solveOperatingPoint(
  q: number,
  tsink: number,
  rp = PORE_RADIUS,
  range: readonly [number, number] = RNG.tcc,
): OperatingPoint {
  const residualAt = (t: number) => solve(t, q, tsink, rp).Rcc

  // The sink temperature is a hard floor: below it the condenser cannot
  // reject heat and the model is meaningless.
  const lo = Math.max(range[0], tsink + 1e-3)
  const hi = range[1]
  if (!(hi > lo))
    return {
      converged: false,
      tcc: null,
      solution: null,
      residual: NaN,
      iterations: 0,
      note: 'The sink temperature leaves no CC temperature range to search.',
    }

  const STEPS = 96
  let aT = lo
  let aR = residualAt(aT)
  let bracket: [number, number, number, number] | null = null

  for (let i = 1; i <= STEPS; i++) {
    const bT = lo + ((hi - lo) * i) / STEPS
    const bR = residualAt(bT)
    if (Number.isFinite(aR) && Number.isFinite(bR) && aR === 0) {
      bracket = [aT, aT, aR, aR]
      break
    }
    if (Number.isFinite(aR) && Number.isFinite(bR) && aR * bR < 0) {
      bracket = [aT, bT, aR, bR]
      break
    }
    aT = bT
    aR = bR
  }

  if (!bracket)
    return {
      converged: false,
      tcc: null,
      solution: null,
      residual: NaN,
      iterations: STEPS,
      note:
        'The CC energy balance does not change sign anywhere in ' +
        `T_r,cc ∈ [${lo.toFixed(3)}, ${hi.toFixed(3)}], so this load and sink ` +
        'temperature admit no passive operating point in range.',
    }

  let [x0, x1, r0] = bracket
  const TOL = 1e-10
  const MAX = 80
  let iterations = 0

  while (iterations < MAX && x1 - x0 > 1e-12) {
    const mid = 0.5 * (x0 + x1)
    const rm = residualAt(mid)
    iterations++
    if (rm === 0 || Math.abs(rm) < TOL) {
      x0 = mid
      x1 = mid
      break
    }
    if (r0 * rm < 0) {
      x1 = mid
    } else {
      x0 = mid
      r0 = rm
    }
  }

  const tcc = 0.5 * (x0 + x1)
  const solution = solve(tcc, q, tsink, rp)
  return {
    converged: Math.abs(solution.Rcc) < 1e-6,
    tcc,
    solution,
    residual: Math.abs(solution.Rcc),
    iterations,
    note: '',
  }
}

/** Which leg of the loop a state point belongs to. Drives colour and line style. */
export type Branch = 'vap' | 'liq' | 'wick'

/** Marker shape: circle, square, diamond, open circle. */
export type Shape = 'c' | 's' | 'd' | 'o'

export interface StatePoint {
  id: string
  name: string
  /** Reduced temperature. */
  t: number
  /** Reduced pressure. */
  p: number
  /** Reduced entropy. */
  s: number
  br: Branch
  shape: Shape
  note: string
}

/** The nine numbered states, plus the construction point 2′. */
export function pointList(r: Solution): StatePoint[] {
  return [
    {
      id: '1',
      name: 'Meniscus, vapour side',
      t: r.T1,
      p: r.P1,
      s: sv(r.T1),
      br: 'vap',
      shape: 'c',
      note: 'Saturated vapour just outside the wick. Its pressure is the highest in the loop; the saturation curve then fixes T₁, which is what the evaporator wall has to sit above.',
    },
    {
      id: '2',
      name: 'Vapour-groove exit',
      t: r.T2,
      p: r.P2,
      s: ssh(r.T2, r.P2),
      br: 'vap',
      shape: 'c',
      note: 'Superheated: the grooves keep heating the vapour while its pressure falls, so the point leaves the saturation curve to the right.',
    },
    {
      id: '2′',
      name: 'Saturation state at P₂',
      t: r.T2p,
      p: r.P2,
      s: sv(r.T2p),
      br: 'vap',
      shape: 'o',
      note: 'Reference point on the curve at the same pressure as 2. The horizontal gap 2′→2 is the vapour superheat.',
    },
    {
      id: '3',
      name: 'Vapour-line exit',
      t: r.T3,
      p: r.P3,
      s: ssh(r.T3, r.P3),
      br: 'vap',
      shape: 'c',
      note: 'The vapour line costs pressure and sheds part of the superheat. ΔP_VL is usually the largest single loss, and it scales as ṁ/ρ_v — which is why it explodes at low CC temperature.',
    },
    {
      id: '4',
      name: 'Onset of condensation',
      t: r.T4,
      p: r.P4,
      s: sv(r.T4),
      br: 'vap',
      shape: 'c',
      note: 'The vapour has cooled back onto the curve. Everything downstream of here is two-phase until point 5.',
    },
    {
      id: '5',
      name: 'End of condensation',
      t: r.T5,
      p: r.P5,
      s: sl(r.T5),
      br: 'liq',
      shape: 's',
      note: 'Saturated liquid. Its position along the condenser is the interface the loop moves to balance the load — see the interface bar.',
    },
    {
      id: '6',
      name: 'Condenser exit, subcooled',
      t: r.T6,
      p: r.P6,
      s: sl(r.T6),
      br: 'liq',
      shape: 's',
      note: 'Off the curve on the liquid side. The gap 5→6 is the subcooling the loop bought with the remaining condenser length; it is the only thing that can absorb the heat leak into the CC.',
    },
    {
      id: '7',
      name: 'Liquid-line exit / CC inlet',
      t: r.T7,
      p: r.P78,
      s: sl(r.T7),
      br: 'liq',
      shape: 's',
      note: 'The liquid line costs ΔP_LL and gives back some of the subcooling to ambient.',
    },
    {
      id: '8',
      name: 'CC, two-phase (saturated)',
      t: r.t8,
      p: r.P78,
      s: sl(r.t8),
      br: 'liq',
      shape: 's',
      note: 'The only saturated volume with a free surface. Set its temperature and you have set P₇,₈ — and with it the pressure level of every other point.',
    },
    {
      id: '9',
      name: 'Wick liquid at meniscus',
      t: r.T9,
      p: r.P9,
      s: sl(r.T9),
      br: 'wick',
      shape: 'd',
      note: 'Lowest pressure in the loop: the liquid paid ΔP_WICK to cross the wick, and is now superheated relative to its own pressure. The jump 9→1 is the capillary head.',
    },
  ]
}
