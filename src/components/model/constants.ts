/**
 * Model constants and the palette, ported verbatim from the design prototype.
 * Everything here is reduced (divided by its critical-point value) and
 * dimensionless; the closure is a qualitative corresponding-states fit.
 */

/** Clausius–Clapeyron slope constant: ln Pr = A(1 − 1/Tr). */
export const A = 7.0

/** Coefficients of the pressure-drop, conductance and property closures. */
export const CV = {
  /** Vapour-groove pressure-drop coefficient. */
  Cg: 0.003,
  /** Vapour-line pressure-drop coefficient. */
  Cv: 0.01,
  /** Condenser pressure-drop coefficient. */
  Cc: 0.008,
  /** Liquid-line pressure-drop coefficient. */
  Cl: 0.002,
  /** Wick pressure-drop coefficient. */
  Cw: 0.005,
  /** Capillary head coefficient in ΔP_cap,max = Ca·σ/r_p. */
  Ca: 0.06,
  /** Condenser conductance UA*. */
  Kc: 12,
  /** Subcooler NTU coefficient. */
  Ks: 0.8,
  /** Evaporator conductance G*, sets the vapour superheat Q/G. */
  Ge: 40,
  /** Wick heat-leak conductance G*. */
  Gw: 1.2,
  /** Ambient heat-leak conductance G*. */
  Ga: 0.4,
  /** Fraction of the liquid line's approach to ambient, on the way back. */
  Gll: 0.15,
  /** Ambient reduced temperature. */
  tamb: 0.75,
  /** Reduced liquid specific heat. */
  cpl: 2.5,
  /** Reduced vapour specific heat. */
  cpv: 1.4,
} as const

/** Allowed input ranges, as [min, max]. */
export const RNG = {
  tcc: [0.58, 0.92],
  q: [0.1, 3],
  tsink: [0.45, 0.88],
} as const

export type InputKey = keyof typeof RNG

/** Default operating point, restored by "Reset to default". */
export const DEF = { tcc: 0.72, q: 1.0, tsink: 0.6 } as const

/** Reference CC temperature drawn as the ghost overlay. */
export const REF_TCC = 0.78

/** Effective pore radius r_p*. */
export const PORE_RADIUS = 1.0

/** Palette. `vap`/`liq`/`wick`/`sat` also carry the line-style coding. */
export const COL = {
  vap: '#bf3320',
  liq: '#26268c',
  wick: '#8e2b6b',
  sat: '#5d3580',
  node: '#e08a3c',
  nodeEdge: '#7a4a12',
  ink: '#33302a',
  mid: '#4a453c',
  faint: '#5c5648',
  grid: '#e8e2d8',
  ghost: '#a9a091',
  hi: '#0d7a5f',
} as const

/** Status / margin colours. */
export const STATUS = {
  bad: '#b8442f',
  warn: '#a4790f',
  good: '#2f6b4f',
} as const

/** Clamp an input to its allowed range. */
export function clampInput(k: InputKey, v: number): number {
  const [lo, hi] = RNG[k]
  return Math.min(hi, Math.max(lo, v))
}
