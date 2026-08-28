/**
 * Reading the dimensionless model as one real fluid.
 *
 * Everything the solver computes is dimensionless, and stays that way — this
 * module never feeds back into it. It exists so a reader can see what
 * `T_r,cc = 0.720` would mean for an actual working fluid, because "0.72 of
 * what" is not intuition anyone has.
 *
 * Only two quantities are converted, and the restraint is the point:
 *
 * - **Temperature and saturation pressure** need nothing but the critical
 *   point, and the model's one-constant correlation `ln P_r = A(1 − 1/T_r)`
 *   tracks real ammonia to within about 11 % over the whole input range. That
 *   is honest enough to print, with the band stated.
 *
 * - **Pressure drops are deliberately not converted.** Scaled by P_c the
 *   capillary maximum reads a few hundred kPa, against 4–42 kPa for a real
 *   ammonia wick at 1–10 µm pores: the loss coefficients were chosen to put
 *   the dry-out boundary somewhere useful in the dimensionless range, not to
 *   match any loop. Printing them in kPa would be inventing a design.
 */

/**
 * Ammonia (R-717) — the fluid the source material uses as its example.
 * Critical constants are standard thermophysical data.
 */
export const REFERENCE_FLUID = {
  name: 'Ammonia (R-717)',
  /** Critical temperature, K. */
  Tc: 405.4,
  /** Critical pressure, Pa. */
  Pc: 11.333e6,
} as const

/** Reduced temperature as an absolute temperature, K. */
export const kelvin = (tr: number): number => tr * REFERENCE_FLUID.Tc

/** Reduced temperature in degrees Celsius. */
export const celsius = (tr: number): number => kelvin(tr) - 273.15

/** Reduced pressure as an absolute pressure, Pa. */
export const pascals = (pr: number): number => pr * REFERENCE_FLUID.Pc

/** …and in kPa, which is the unit these pressures are usually quoted in. */
export const kilopascals = (pr: number): number => pascals(pr) / 1e3

/** `≈ 18.7 °C`, for printing beside a reduced temperature. */
export const asCelsius = (tr: number): string => `≈ ${celsius(tr).toFixed(1)} °C`

/** `≈ 744 kPa`, for printing beside a reduced pressure. */
export const asKilopascals = (pr: number): string =>
  `≈ ${kilopascals(pr).toFixed(kilopascals(pr) < 100 ? 1 : 0)} kPa`

/**
 * Measured saturation pressures for ammonia, as [T in K, P in Pa].
 *
 * Held as data rather than described in prose so the accuracy claim printed on
 * the page is a testable assertion: if the correlation constant `A` is ever
 * changed, the test fails rather than the claim quietly becoming false.
 */
export const AMMONIA_SATURATION: ReadonlyArray<readonly [number, number]> = [
  [240, 102e3],
  [260, 255e3],
  [280, 551e3],
  [300, 1062e3],
  [320, 1874e3],
  [340, 3080e3],
]

/**
 * The accuracy band the page is allowed to advertise for the saturation
 * correlation, as a fraction. Checked against `AMMONIA_SATURATION` in the
 * tests.
 */
export const SATURATION_ACCURACY = 0.12
