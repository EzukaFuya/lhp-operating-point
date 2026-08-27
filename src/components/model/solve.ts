/**
 * The loop solver. Given the CC temperature, the heat load and the sink
 * temperature it walks the loop once — meniscus, grooves, vapour line,
 * condenser, liquid line, back through the wick — and returns every state
 * point plus the capillary and subcooling budgets.
 *
 * Ported verbatim from the design prototype; the numbers are qualitative.
 */

import { CV, PORE_RADIUS } from './constants.js'
import { dpdt, hfg, mul, pr, rhol, rhov, sig, sl, ssh, sv, trs } from './properties.js'

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
  subReq: number
  subAv: number
  sub: number
  qleak: number

  dpdt: number
  /** Unclamped P9; negative when the wick loss exceeds the CC pressure. */
  P9raw: number
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
  const mdot = q / hfgV
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

  const P9raw = P78 - dpWK
  const nonphys = P9raw <= 0
  const P9 = Math.max(P78 * 0.05, P9raw)

  const T1 = trs(P1)
  const sup = q / K.Ge
  const T2 = T1 + sup
  const T2p = trs(P2)
  const sh2 = Math.max(0, T2 - T2p)
  const T3 = trs(P3) + 0.45 * sh2
  const T4 = trs(P4)
  const T5 = trs(P5)

  // CC energy balance: the returning liquid has to absorb the heat leak.
  const qleak = K.Gw * (T1 + sup - t8) + K.Ga * Math.max(0, K.tamb - t8)
  const subReq = qleak / Math.max(1e-6, mdot * K.cpl)
  const ntu = (K.Ks * (1 - f)) / Math.max(1e-6, mdot)
  const subAv = Math.max(0, T5 - tsink) * (1 - Math.exp(-ntu))
  const sub = Math.min(subReq, subAv)

  const T6 = T5 - sub
  const T7 = Math.min(t8 - 0.002, T6 + 0.15 * Math.max(0, K.tamb - T6))

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
    dpdt: dpdt(t8),
    P9raw,
    nonphys,
    capM: 1 - dpCap / dpMax,
    subM: subAv > 0 ? 1 - subReq / subAv : -1,
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
