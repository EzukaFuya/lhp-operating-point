/**
 * Model invariants.
 *
 * These check that the physics closes — the pressure budget, the energy
 * budget, the regime boundary, the saturation dome — rather than that the
 * output matches a stored snapshot. A snapshot would have happily locked in
 * the energy-balance error these tests exist to prevent.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import { buildOnce } from './build.mjs'

const out = buildOnce()
const { solve, solveOperatingPoint, pointList } = await import(out + '/model.mjs')
const props = await import(out + '/properties.mjs')
const { CV, RNG, clampInput, DEF } = await import(out + '/constants.mjs')
const { verdict, warning } = await import(out + '/verdict.mjs')
const { MODEL_VERSION } = await import(out + '/exports.mjs')

/** A coarse sweep of the whole valid input space. */
function* sweep({ dt = 0.01, dq = 0.1, ds = 0.02 } = {}) {
  for (let tcc = RNG.tcc[0]; tcc <= RNG.tcc[1] + 1e-9; tcc += dt)
    for (let q = RNG.q[0]; q <= RNG.q[1] + 1e-9; q += dq)
      for (let ts = RNG.tsink[0]; ts <= RNG.tsink[1] + 1e-9; ts += ds) {
        if (ts >= tcc) continue
        yield { tcc, q, ts }
      }
}

describe('pressure budget', () => {
  it('P1 - P9 equals the sum of the five losses, everywhere', () => {
    let worst = 0
    for (const { tcc, q, ts } of sweep()) {
      const r = solve(tcc, q, ts)
      const sum = r.dpGV + r.dpVL + r.dpCO + r.dpLL + r.dpWK
      // Against P9raw, the physical value — P9 itself is floored for drawing.
      worst = Math.max(worst, Math.abs(r.P1 - r.P9raw - sum))
    }
    assert.ok(worst < 1e-12, `worst |P1-P9-ΣΔP| = ${worst}`)
  })

  it('pressure falls monotonically around the loop from 1 to 9', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      const chain = [r.P1, r.P2, r.P3, r.P4, r.P5, r.P6, r.P78, r.P9raw]
      for (let i = 1; i < chain.length; i++)
        assert.ok(
          chain[i] <= chain[i - 1] + 1e-15,
          `pressure rose between station ${i} and ${i + 1} at ${tcc},${q},${ts}`,
        )
    }
  })

  it('the CC sets the level: P7 and P8 are the saturation pressure at T8', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.05, dq: 0.5, ds: 0.1 })) {
      const r = solve(tcc, q, ts)
      assert.equal(r.P7, r.P78)
      assert.ok(Math.abs(r.P78 - props.pr(tcc)) < 1e-15)
    }
  })
})

describe('CC energy balance', () => {
  it('Rcc is exactly the stated residual, not a fitted quantity', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.05, dq: 0.5, ds: 0.1 })) {
      const r = solve(tcc, q, ts)
      const expected = r.qleak - r.mdot * CV.cpl * (r.t8 - r.T7)
      assert.ok(Math.abs(r.Rcc - expected) < 1e-15)
      assert.ok(Math.abs(r.carried - r.mdot * CV.cpl * (r.t8 - r.T7)) < 1e-15)
    }
  })

  it('T7 is never clamped to fake a closed balance', () => {
    // The old model forced T7 = min(t8 - 0.002, ...), which hid the residual.
    // A forced cap would make T7 stick to that value; nothing should.
    let atCap = 0
    let n = 0
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      n++
      if (Math.abs(r.T7 - (r.t8 - 0.002)) < 1e-12) atCap++
    }
    assert.equal(atCap, 0, `${atCap} of ${n} points sat exactly on the old T7 cap`)
  })

  it('the passive solver drives Rcc to zero wherever a root is bracketed', () => {
    let converged = 0
    let worst = 0
    for (let q = RNG.q[0]; q <= RNG.q[1]; q += 0.1)
      for (let ts = RNG.tsink[0]; ts <= RNG.tsink[1]; ts += 0.05) {
        const op = solveOperatingPoint(q, ts)
        if (!op.energyConverged) continue
        converged++
        worst = Math.max(worst, Math.abs(op.solution.Rcc))
        assert.ok(op.tcc >= RNG.tcc[0] && op.tcc <= RNG.tcc[1], 'root left the allowed range')
      }
    assert.ok(converged > 100, `only ${converged} energy roots converged`)
    assert.ok(worst < 1e-6, `worst |Rcc| at a converged point = ${worst}`)
  })

  it('never calls an unreachable root a passive operating point', () => {
    // An energy-balance root that dries the evaporator out is a root of the
    // equations, not a state the loop can run in.
    let checked = 0
    let unreachableRoots = 0
    for (let q = RNG.q[0]; q <= RNG.q[1]; q += 0.05)
      for (let ts = RNG.tsink[0]; ts <= RNG.tsink[1]; ts += 0.02) {
        const op = solveOperatingPoint(q, ts)
        if (op.tcc === null) continue
        checked++
        assert.equal(
          op.converged && op.solution.status !== 'closed',
          false,
          `converged at an unreachable root (${op.solution.status}) for Q*=${q}, Tsink=${ts}`,
        )
        assert.equal(op.converged, op.energyConverged && op.reachable)
        if (op.energyConverged && !op.reachable) {
          unreachableRoots++
          assert.ok(op.note.length > 0, 'an unreachable root must say why')
        }
      }
    assert.ok(checked > 500, `only ${checked} roots examined`)
    // The case the review found must still be exercised by this sweep.
    assert.ok(unreachableRoots > 0, 'the sweep no longer covers any unreachable root')
  })

  it('reports the bisection work it actually did', () => {
    let checked = 0
    for (let q = RNG.q[0]; q <= RNG.q[1]; q += 0.1)
      for (let ts = RNG.tsink[0]; ts <= RNG.tsink[1]; ts += 0.05) {
        const op = solveOperatingPoint(q, ts)
        if (op.tcc === null) continue
        checked++
        assert.ok(op.iterations > 0, `a converged root reported ${op.iterations} steps`)
      }
    assert.ok(checked > 100)
  })

  it('the reviewed unreachable case is reported honestly', () => {
    // Q* = 1.15, Tr,sink = 0.800 converged on a root with a capillary margin
    // of -4.08% and was labelled a passive operating point.
    const op = solveOperatingPoint(1.15, 0.8)
    assert.equal(op.energyConverged, true)
    assert.equal(op.reachable, false)
    assert.equal(op.converged, false)
    assert.equal(op.solution.status, 'capillary_exceeded')
    assert.match(op.note, /not an operating point|rather than an operating point/)
  })

  it('prefers a reachable root when several exist', () => {
    for (let q = RNG.q[0]; q <= RNG.q[1]; q += 0.05)
      for (let ts = RNG.tsink[0]; ts <= RNG.tsink[1]; ts += 0.02) {
        const op = solveOperatingPoint(q, ts)
        if (op.tcc === null || op.reachable) continue
        // The chosen root is unreachable, so no reachable root may exist
        // anywhere else in range at this load and sink temperature.
        const lo = Math.max(RNG.tcc[0], ts + 1e-3)
        for (let t = lo; t <= RNG.tcc[1]; t += 0.001) {
          const r = solve(t, q, ts)
          if (Math.abs(r.Rcc) < 1e-9 && r.status === 'closed')
            assert.fail(`missed a reachable root at T=${t} for Q*=${q}, Tsink=${ts}`)
        }
      }
  })

  it('reports honestly when no passive point exists in range', () => {
    // A sink hotter than the whole CC range cannot support any operating point.
    const op = solveOperatingPoint(1.0, RNG.tcc[1])
    assert.equal(op.converged, false)
    assert.equal(op.energyConverged, false)
    assert.equal(op.tcc, null)
    assert.ok(op.note.length > 0, 'a failed search must say why')
  })
})

describe('regime classification', () => {
  it('follows condenser utilisation, not the subcooling budget', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.05, dq: 0.25, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      const v = verdict({ tcc, q, tsink: ts }, r)
      const expected = r.f >= 1 ? 'Fixed conductance' : 'Variable conductance'
      assert.equal(v.regimeName, expected, `f = ${r.f} classified as ${v.regimeName}`)
    }
  })

  it('a partly flooded condenser is variable conductance', () => {
    // The point from the review: f = 0.4545 was reported as fixed conductance.
    const r = solve(0.825, 1.5, 0.55)
    assert.ok(r.f < 1)
    assert.equal(verdict({ tcc: 0.825, q: 1.5, tsink: 0.55 }, r).regimeName, 'Variable conductance')
  })

  it('f saturates at exactly 1 and never exceeds it', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const { f } = solve(tcc, q, ts)
      assert.ok(f > 0 && f <= 1, `f = ${f} out of range`)
    }
  })
})

describe('saturation properties', () => {
  it('the dome closes exactly at the critical point', () => {
    assert.equal(props.th(1), 0)
    assert.equal(props.hfg(1), 0)
    assert.equal(props.sig(1), 0)
    assert.equal(props.sv(1) - props.sl(1), 0)
  })

  it('every starred property is 1 at the reference state Tr = 0.7', () => {
    for (const fn of ['hfg', 'sig', 'rhol', 'mul']) {
      assert.ok(Math.abs(props[fn](0.7) - 1) < 1e-12, `${fn}(0.7) = ${props[fn](0.7)}`)
    }
  })

  it('saturation pressure and its inverse round-trip', () => {
    for (let t = 0.5; t <= 0.99; t += 0.01)
      assert.ok(Math.abs(props.trs(props.pr(t)) - t) < 1e-12)
  })

  it('latent heat and surface tension fall monotonically towards the critical point', () => {
    for (let t = 0.5; t < 0.99; t += 0.01) {
      assert.ok(props.hfg(t + 0.01) < props.hfg(t))
      assert.ok(props.sig(t + 0.01) < props.sig(t))
    }
  })
})

describe('status and reporting', () => {
  it('every solution carries a status, and it agrees with the budgets', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      const expected = r.nonphys
        ? 'nonphysical'
        : r.dpCap >= r.dpMax
          ? 'capillary_exceeded'
          : r.subReq > r.subAv
            ? 'subcooling_starved'
            : 'closed'
      assert.equal(r.status, expected)
    }
  })

  it('a state that cannot close is never reported as closed', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      if (r.status !== 'closed') continue
      assert.ok(r.dpCap < r.dpMax, 'closed state exceeds the capillary limit')
      assert.ok(r.subReq <= r.subAv, 'closed state is subcooling starved')
      assert.ok(r.P9raw > 0, 'closed state has a non-physical P9')
    }
  })

  it('the status card never contradicts the solution status', () => {
    // The banner and the figure watermark key off r.status; the card is
    // written separately, so they are checked against each other here.
    const titleFor = {
      nonphysical: 'Not a physical state',
      capillary_exceeded: 'Capillary limit exceeded',
      subcooling_starved: 'Subcooling starved',
    }
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const r = solve(tcc, q, ts)
      const expected = titleFor[r.status]
      if (!expected) continue
      assert.equal(
        verdict({ tcc, q, tsink: ts }, r).statusTitle,
        expected,
        `status ${r.status} at ${tcc},${q},${ts}`,
      )
    }
  })

  it('warns whenever the state cannot be reached', () => {
    let unwarned = 0
    for (const { tcc, q, ts } of sweep({ dt: 0.02, dq: 0.2, ds: 0.05 })) {
      const s = { tcc, q, tsink: ts }
      const r = solve(tcc, q, ts)
      if (r.status === 'closed') continue
      if (!warning(s, r, verdict(s, r), null)) unwarned++
    }
    assert.equal(unwarned, 0, `${unwarned} unreachable states carried no warning`)
  })

  it('all outputs stay finite across the whole input space', () => {
    for (const { tcc, q, ts } of sweep({ dt: 0.01, dq: 0.1, ds: 0.02 })) {
      const r = solve(tcc, q, ts)
      for (const [k, val] of Object.entries(r))
        if (typeof val === 'number')
          assert.ok(Number.isFinite(val), `${k} = ${val} at ${tcc},${q},${ts}`)
      for (const p of pointList(r))
        assert.ok(
          Number.isFinite(p.t) && Number.isFinite(p.p) && Number.isFinite(p.s),
          `state ${p.id} not finite at ${tcc},${q},${ts}`,
        )
    }
  })
})

describe('inputs', () => {
  it('clamps every out-of-range value back into its range', () => {
    for (const k of Object.keys(RNG)) {
      const [lo, hi] = RNG[k]
      assert.equal(clampInput(k, lo - 100), lo)
      assert.equal(clampInput(k, hi + 100), hi)
      assert.equal(clampInput(k, (lo + hi) / 2), (lo + hi) / 2)
    }
  })

  it('the defaults are inside their ranges', () => {
    for (const k of Object.keys(DEF)) {
      const [lo, hi] = RNG[k]
      assert.ok(DEF[k] >= lo && DEF[k] <= hi)
    }
  })

  it('the hash encoding round-trips at its stated precision', () => {
    // url.ts reads and writes through `location`, so the encoding is checked
    // here directly: three decimals on temperatures, two on the load.
    for (const { tcc, q, ts } of sweep({ dt: 0.05, dq: 0.5, ds: 0.1 })) {
      const encoded = `tcc=${tcc.toFixed(3)}&q=${q.toFixed(2)}&tsink=${ts.toFixed(3)}`
      const p = new URLSearchParams(encoded)
      assert.ok(Math.abs(parseFloat(p.get('tcc')) - tcc) < 5e-4)
      assert.ok(Math.abs(parseFloat(p.get('q')) - q) < 5e-3)
      assert.ok(Math.abs(parseFloat(p.get('tsink')) - ts) < 5e-4)
    }
  })
})

describe('release metadata', () => {
  it('the package, the citation and the exported model version agree', () => {
    // An exported CSV is traceable only if its version string matches
    // something a reader can find in the repository.
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const cff = fs.readFileSync(new URL('../CITATION.cff', import.meta.url), 'utf8')
    const cffVersion = /^version:\s*(.+)$/m.exec(cff)?.[1]?.trim()

    assert.equal(cffVersion, pkg.version, 'CITATION.cff and package.json disagree')
    assert.ok(
      MODEL_VERSION.startsWith(pkg.version),
      `MODEL_VERSION ${MODEL_VERSION} does not start with package version ${pkg.version}`,
    )
  })
})
