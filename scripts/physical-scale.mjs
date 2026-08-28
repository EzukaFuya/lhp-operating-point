/**
 * Computes the dimensional reference values quoted in the "Physical scale"
 * section, so they are reproducible rather than typed in from memory.
 *
 *   node scripts/physical-scale.mjs
 *
 * Ammonia is used because it is the fluid the source material examples. The
 * saturation values below are standard thermophysical data (NIST Webbook /
 * CoolProp-grade); the derived quantities are computed here from them.
 *
 * NOTE: nothing here touches the model. These are real dimensional numbers,
 * kept deliberately apart from the dimensionless output so the two can never
 * be read as the same thing.
 */

// Ammonia (R-717) at 300 K — standard saturation data.
const T = 300 // K
const Psat = 1.062e6 // Pa
const hfg = 1165e3 // J/kg
const sigma = 0.0212 // N/m
const M = 17.031e-3 // kg/mol
const Rgas = 8.31446 / M // J/(kg·K)

// Clausius–Clapeyron with v_g >> v_l and an ideal vapour.
const dPdT = (hfg * Psat) / (Rgas * T * T)

const row = (k, v) => console.log('  ' + k.padEnd(38) + v)

console.log('Ammonia (R-717) at ' + T + ' K')
row('P_sat', (Psat / 1e6).toFixed(3) + ' MPa')
row('h_fg', (hfg / 1e3).toFixed(0) + ' kJ/kg')
row('sigma', (sigma * 1e3).toFixed(1) + ' mN/m')
row('dP_sat/dT', (dPdT / 1e3).toFixed(1) + ' kPa/K')
console.log()
console.log('Consequences')
row('10 kPa condenser drop costs', (10e3 / dPdT).toFixed(2) + ' K of saturation temperature')
for (const r of [1e-6, 5e-6, 10e-6]) {
  row(
    'dP_cap,max at r_p = ' + (r * 1e6).toFixed(0) + ' um',
    ((2 * sigma) / r / 1e3).toFixed(1) + ' kPa   (perfect wetting)',
  )
}
console.log()
console.log('Liquid Joule-Thomson, for scale')
{
  const v = 1 / 600 // m3/kg, liquid ammonia near 300 K
  const cp = 4740 // J/(kg K)
  const alpha = 2.4e-3 // 1/K
  const mu = (v / cp) * (alpha * T - 1)
  row('(dT/dP)_h', (mu * 1e6).toFixed(3) + ' K/MPa')
  row('over a 20 kPa liquid line', (mu * 20e3).toFixed(5) + ' K')
}
