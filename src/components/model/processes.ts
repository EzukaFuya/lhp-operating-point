/**
 * The nine legs between the state points.
 *
 * `pointList` says where the loop *is*; this says what happens *between* those
 * places — the relation that governs each leg, which way it moves on each
 * plane, what this model actually computes for it, and the assumption that
 * fails first.
 *
 * Two registers are kept deliberately separate on every leg. `governing` is
 * the physics, and holds regardless of this model. `computed` is what this
 * qualitative closure does about it, which is often much cruder. Where the two
 * differ, `breaks` says so.
 *
 * TeX is carried as source rather than rendered here, so the module stays free
 * of any DOM or renderer and can be imported by the tests.
 */

import type { Solution } from './solve.js'

/** Direction of travel on a plane, as a reader would describe it. */
export interface Direction {
  /** e.g. 'right and down'. */
  label: string
  /** Sign of dP/dT on P–T, where it is meaningful. */
  detail: string
}

export interface Process {
  /** e.g. '1→2'. */
  id: string
  from: string
  to: string
  name: string
  /** The relation that governs the leg, as TeX source. */
  governing: string
  /** Prose gloss on the governing relation. */
  physics: string
  pt: Direction
  ts: Direction
  /** What this model computes for the leg, given a solution. */
  computed: (r: Solution) => string
  /** The assumption most likely to fail first. */
  breaks: string
}

const f4 = (v: number) => v.toFixed(4)
const f3 = (v: number) => v.toFixed(3)

export const PROCESSES: Process[] = [
  {
    id: '1→2',
    from: '1',
    to: '2',
    name: 'Vapour groove — heated duct',
    governing: String.raw`\frac{dP}{dT} \simeq -\frac{f_D\,\rho\,u_f^2\,c_p}{2\,D_h\,q'_m}`,
    physics:
      'Two things happen at once: the grooves keep heating the vapour, so T rises, while duct friction drops P. Heat harder and the point travels further right; make the duct tighter and it travels further down.',
    pt: { label: 'right and down', detail: 'dP/dT < 0' },
    ts: { label: 'right and up', detail: 'both heating and friction raise s' },
    computed: (r) =>
      `ΔP_GV = ${f4(r.dpGV)} (= C_g·ṁ*/ρ_v*), superheat T₂ − T₁ = ${f4(r.T2 - r.T1)} (= Q*/G_e)`,
    breaks:
      'Low Mach, and the groove treated as one simple duct. The superheat is a single conductance rather than a wall-to-vapour heat transfer problem.',
  },
  {
    id: '2→3',
    from: '2',
    to: '3',
    name: 'Vapour line — adiabatic, not isentropic',
    governing: String.raw`d\!\left(h + \tfrac{u_f^2}{2} + gz\right) = 0, \qquad ds \simeq -\frac{v}{T}\,dP > 0`,
    physics:
      'Adiabatic does not mean isentropic. No heat crosses the wall, but friction still generates entropy. At low Mach h is very nearly constant, so an ideal gas holds its temperature and the leg runs almost straight down. Push the flow harder and it becomes Fanno flow: friction accelerates subsonic vapour, so T falls slightly.',
    pt: { label: 'down, tipping slightly left at higher Mach', detail: 'dP/dT → −∞ at low Mach' },
    ts: { label: 'right, almost horizontal', detail: 'ds > 0 with no heat added at all' },
    computed: (r) =>
      `ΔP_VL = ${f4(r.dpVL)} (= C_v·ṁ*/ρ_v*), and T₃ keeps 45 % of the superheat: ${f3(r.T3)}`,
    breaks:
      'The 45 % retained superheat is a lumped fraction, not derived. Neither the Fanno acceleration nor the sonic limit is modelled, so this leg is least trustworthy at high load and low CC temperature — exactly where ΔP_VL dominates.',
  },
  {
    id: '3→4',
    from: '3',
    to: '4',
    name: 'Condenser inlet — desuperheat',
    governing: String.raw`T_4 - T_3 \simeq \frac{\dot Q_{34}}{\dot m\,c_p} < 0`,
    physics:
      'The vapour gives up sensible heat until it reaches the saturation curve. Everything downstream of 4 is two-phase.',
    pt: { label: 'left and down', detail: 'dP/dT > 0' },
    ts: { label: 'left and down', detail: 'heat removal outweighs friction, so s falls' },
    computed: (r) => `ΔP = ${f4(0.1 * r.dpCO)} (10 % of ΔP_COND), and T₄ = T_sat(P₄) = ${f3(r.T4)}`,
    breaks:
      'How ΔP_COND divides between desuperheating, condensing and subcooling is prescribed (10 / 75 / 15 %), not solved from the flow.',
  },
  {
    id: '4→5',
    from: '4',
    to: '5',
    name: 'Condensation — along the saturation curve',
    governing: String.raw`\frac{dP_{\mathrm{sat}}}{dT} = \frac{h_{fg}}{T\,(v_g - v_l)} \simeq \frac{h_{fg}\,P}{R_v T^2}`,
    physics:
      'The only leg that runs along the saturation curve itself, so Clapeyron sets its slope — always positive. This is why condenser pressure drop converts directly into a condensing temperature drop: for ammonia near 300 K the slope is about 28 kPa/K, so 10 kPa of loss costs roughly 0.36 K.',
    pt: { label: 'down the saturation curve', detail: 'dP/dT > 0, fixed by Clapeyron' },
    ts: { label: 'left, nearly horizontal', detail: 'ds = s_fg·dx with dx < 0' },
    computed: (r) =>
      `ΔP = ${f4(0.75 * r.dpCO)} (75 % of ΔP_COND) over L_2φ/L_c = ${f3(r.f)}; T₄ → T₅ = ${f3(r.T4)} → ${f3(r.T5)}`,
    breaks:
      'No quality distribution along the leg: both ends sit on the curve and the path between them is not solved. Local thermodynamic equilibrium is assumed throughout.',
  },
  {
    id: '5→6',
    from: '5',
    to: '6',
    name: 'Subcooler — the only margin the CC has',
    governing: String.raw`\Delta T_{\mathrm{sub,av}} = (T_5 - T_{\mathrm{sink}})\left[1 - e^{-\mathrm{NTU}_{\mathrm{sub}}}\right], \qquad \frac{dT}{ds} \simeq \frac{T}{c_p}`,
    physics:
      'Whatever condenser length the two-phase front did not need becomes subcooler. This is the only thing that can absorb the heat leak into the CC, so it competes directly with condensing length for the same hardware.',
    pt: { label: 'left and down', detail: 'dP/dT > 0' },
    ts: { label: 'left and down', detail: 'liquid, so ds ≈ (c_p/T)dT' },
    computed: (r) =>
      `ΔT_sub available ${f4(r.subAv)}, required by the CC balance ${f4(r.subReq)} → margin ${(r.subM * 100).toFixed(0)} %`,
    breaks:
      'ε–NTU with NTU lumped as K_s(1−f)/ṁ. Real subcoolers are not a single effectiveness, and the sink is taken as one uniform temperature.',
  },
  {
    id: '6→7',
    from: '6',
    to: '7',
    name: 'Liquid line — Joule–Thomson, and why it does not matter',
    governing: String.raw`\left(\frac{\partial T}{\partial P}\right)_h = \frac{v}{c_p}\left(\alpha T - 1\right) < 0 \quad\text{for liquids}`,
    physics:
      'Counter-intuitively, throttling a liquid warms it: αT < 1 for ordinary liquids, so the Joule–Thomson coefficient is negative and dP < 0 gives dT > 0. But v/c_p is tiny for a liquid — of order 0.1 K per MPa — so against a loop pressure drop measured in kPa the effect is negligible. If the liquid line warms in a real loop, parasitic heat gain is doing it, not thermodynamics.',
    pt: { label: 'right and slightly down', detail: 'dP/dT < 0, but very nearly vertical' },
    ts: { label: 'slightly right and up', detail: 'ds = −(v/T)dP > 0' },
    computed: (r) =>
      `ΔP_LL = ${f4(r.dpLL)}, and T₆ → T₇ = ${f3(r.T6)} → ${f3(r.T7)} from ambient gain alone`,
    breaks:
      'The model carries only the ambient term, T₇ = T₆ + G_ll·max(0, T_amb − T₆), and omits Joule–Thomson entirely — defensible at kPa scale, but it means this leg cannot show the effect at all. The gain itself is one lumped coefficient.',
  },
  {
    id: '7→8',
    from: '7',
    to: '8',
    name: 'Compensation chamber — two different motions',
    governing: String.raw`\dot m\,c_{p,l}\,(T_8 - T_7) = \dot Q_{\mathrm{absorbed}}, \qquad P_8 = P_{\mathrm{sat}}(T_{\mathrm{CC}})`,
    physics:
      'Two motions must not be confused. Within one steady operating point, returning liquid is warmed at nearly constant pressure — the leg runs right, almost horizontally. Between operating points, raising the CC setpoint slides state 8 along the saturation curve itself, because the chamber is two-phase. The first is a process; the second is a change of operating point.',
    pt: { label: 'right, nearly horizontal within one point', detail: 'but along P_sat(T) between points' },
    ts: { label: 'right and up', detail: 'ds = (c_p/T)dT' },
    computed: (r) =>
      `P₇ = P₈ = ${f4(r.P78)} exactly; Q_leak* ${f4(r.qleak)} against ṁ*c_p,l*(T₈−T₇) = ${f4(r.carried)}, leaving R_cc = ${f4(r.Rcc)}`,
    breaks:
      'This is the distinction the two modes implement: prescribed CC reports R_cc, the passive solve drives it to zero. Liquid inventory and the CC vapour fraction are not modelled, so nothing here says whether the chamber still holds a free surface.',
  },
  {
    id: '8→9',
    from: '8',
    to: '9',
    name: 'Through the wick — Darcy',
    governing: String.raw`\Delta P_{\mathrm{wick}} = \frac{\mu\,L_w}{K\,\rho\,A_w}\,\dot m, \qquad K \propto r_p^{2}`,
    physics:
      'Darcy flow through the porous structure, so pressure always falls along the flow. Permeability scales as the square of pore size (Kozeny–Carman at fixed porosity), which is the root of the wick trade-off: shrinking pores raises the capillary head as 1/r_p but costs permeability as 1/r_p². The loss grows faster than the head, so an optimum pore size exists. Temperature needs an advection–conduction equation and has no universal slope.',
    pt: { label: 'right and down', detail: 'dP/dT < 0' },
    ts: { label: 'right and up', detail: 'heating plus viscous dissipation in the pores' },
    computed: (r) =>
      `ΔP_WICK = ${f4(r.dpWK)} at r_p* = ${f3(r.rp)} (K* = ${f4(r.kperm)}); the temperature rise is not solved — T₉ is taken as T₁`,
    breaks:
      'Darcy assumes Re_pore ≪ 1; higher flux needs the Forchheimer term, and a real wick permeability may be an anisotropic tensor rather than a scalar. State 9 can also be metastable superheated liquid, which no equilibrium property model covers. Note too that the wick heat-leak conductance G_w is held fixed here, so pore size changes whether the loop can run but never where it settles — in a real wick the two are coupled.',
  },
  {
    id: '9→1',
    from: '9',
    to: '1',
    name: 'The meniscus — a jump, not a process',
    governing: String.raw`P_v - P_l = \frac{2\sigma\cos\theta}{r_m}, \qquad \Delta P_{\mathrm{cap,max}} = \frac{2\sigma\cos\theta}{r_{\mathrm{eff}}}`,
    physics:
      'Not a duct process at all: a discontinuity across the liquid–vapour interface. Pressure jumps up by the Young–Laplace value across a surface of essentially zero thickness, so T₁ ≈ T₉ and the leg is vertical. Writing |dP/dT| → ∞ is a statement that this is not a derivative. This jump is the pump — everything else in the loop spends what it provides.',
    pt: { label: 'vertically up', detail: 'a discontinuity, not a slope' },
    ts: { label: 'right, at nearly constant T', detail: 's_g − s_l = h_fg/T' },
    computed: (r) =>
      `ΔP_cap = P₁ − P₉ = ${f4(r.dpCap)} against a maximum of ${f4(r.dpMax)} (= C_a·σ*/r_p*) → margin ${(r.capM * 100).toFixed(0)} %`,
    breaks:
      'C_a lumps 2cosθ and the reference scales into one calibration constant. A curved interface is not in equilibrium at the flat-surface P_sat(T) either, and once nucleation begins the single-state description stops applying.',
  },
]

/** The processes entering and leaving a state, in flow order. */
export function processesAt(stateId: string): Process[] {
  // 2′ is a construction point on the saturation curve, not a station in the
  // loop, so no leg enters or leaves it.
  if (stateId === '2′') return []
  return PROCESSES.filter((p) => p.from === stateId || p.to === stateId)
}
