/**
 * Reduced fluid properties. A corresponding-states closure in the reduced
 * temperature Tr = T/Tc, with θ = (1 − Tr)/0.3 as the distance from the
 * critical point. Ported verbatim from the design prototype.
 */

import { A, CV } from './constants.js'

/** Saturation pressure: ln Pr = A(1 − 1/Tr). */
export const pr = (tr: number): number => Math.exp(A * (1 - 1 / tr))

/** Saturation temperature, the inverse of `pr`. */
export const trs = (p: number): number => 1 / (1 - Math.log(Math.max(1e-12, p)) / A)

/** Slope of the saturation curve, (dPr/dTr)_sat. */
export const dpdt = (tr: number): number => (pr(tr) * A) / (tr * tr)

/** Reduced distance from the critical point. */
export const th = (tr: number): number => Math.max(1e-4, (1 - tr) / 0.3)

/** Reduced latent heat, h_fg* = θ^0.38. */
export const hfg = (tr: number): number => Math.pow(th(tr), 0.38)

/** Reduced surface tension, σ* = θ^1.26. */
export const sig = (tr: number): number => Math.pow(th(tr), 1.26)

/** Reduced vapour density, ideal gas: ρ_v* ∝ Pr/Tr. */
export const rhov = (tr: number): number => pr(tr) / tr / 0.07112

/** Reduced liquid density, ρ_l* = θ^0.28. */
export const rhol = (tr: number): number => Math.pow(th(tr), 0.28)

/** Reduced liquid viscosity, μ_l* = exp[2.5(1/Tr − 1/0.7)]. */
export const mul = (tr: number): number => Math.exp(2.5 * (1 / tr - 1 / 0.7))

/** Saturated-liquid entropy. */
export const sl = (tr: number): number => CV.cpl * Math.log(tr / 0.5)

/** Saturated-vapour entropy. */
export const sv = (tr: number): number => sl(tr) + (CV.cpl * hfg(tr)) / tr

/** Superheated-vapour entropy at temperature `tr` and pressure `prv`. */
export const ssh = (tr: number, prv: number): number => {
  const ts = trs(prv)
  return sv(ts) + CV.cpv * Math.log(Math.max(1e-6, tr / ts))
}
