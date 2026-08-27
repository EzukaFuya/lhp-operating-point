/**
 * Fluid properties for the qualitative corresponding-states closure.
 *
 * Temperature and pressure are genuinely reduced — Tr = T/Tc, Pr = P/Pc — but
 * the transport and interfacial properties are NOT divided by critical-point
 * values, which would be meaningless: the latent heat and the surface tension
 * both vanish at the critical point. They are instead normalised at the
 * reference state Tr,ref = 0.7, where every starred quantity equals one:
 *
 *   h_fg* = h_fg / h_fg(0.7)      σ*    = σ / σ(0.7)
 *   ρ_l*  = ρ_l / ρ_l(0.7)        μ_l*  = μ_l / μ_l(0.7)
 *   ρ_v*  = ρ_v / ρ_v(0.7)
 *
 * with θ = (1 − Tr)/0.3, so θ = 1 at that reference state.
 *
 * These are shape functions chosen to reproduce the right qualitative trends,
 * not a fit to any real fluid. See README for the model's validation status.
 */

import { A, CV } from './constants.js'

/** Saturation pressure: ln Pr = A(1 − 1/Tr). */
export const pr = (tr: number): number => Math.exp(A * (1 - 1 / tr))

/** Saturation temperature, the inverse of `pr`. */
export const trs = (p: number): number => 1 / (1 - Math.log(Math.max(1e-12, p)) / A)

/** Slope of the saturation curve, (dPr/dTr)_sat. */
export const dpdt = (tr: number): number => (pr(tr) * A) / (tr * tr)

/**
 * Distance from the critical point, scaled so that θ = 1 at the reference
 * state Tr = 0.7. It reaches exactly zero at Tr = 1, which is what closes the
 * saturation dome there; callers that divide by a θ-derived quantity guard
 * against zero themselves.
 */
export const th = (tr: number): number => Math.max(0, (1 - tr) / 0.3)

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
