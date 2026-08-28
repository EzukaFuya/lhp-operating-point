/**
 * Stylesheet invariants that a type checker cannot see.
 *
 * These are here because a CSS regression once made every slider's track
 * invisible with no error anywhere: the global `border-box` reset turned the
 * range input's `height` into a total, the padding then exceeded it, and
 * `background-clip: content-box` had a zero-height box to paint into. Nothing
 * failed — the line just went away.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'

const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

/** The declarations of the first rule whose selector matches. */
function rule(selector) {
  const i = css.indexOf(selector + ' {')
  assert.notEqual(i, -1, `no rule for ${selector}`)
  const open = css.indexOf('{', i)
  const close = css.indexOf('}', open)
  return Object.fromEntries(
    css
      .slice(open + 1, close)
      .split(';')
      .map((d) => d.split(':').map((x) => x.trim()))
      .filter((d) => d.length === 2 && d[0]),
  )
}

const px = (v) => {
  const m = /^(-?[\d.]+)px$/.exec(v ?? '')
  assert.ok(m, `expected a px length, got ${v}`)
  return parseFloat(m[1])
}

describe('stylesheet', () => {
  it('assumes border-box everywhere, which the rules below depend on', () => {
    assert.match(css, /\*,\s*\n\s*\*::before,\s*\n\s*\*::after\s*\{\s*\n\s*box-sizing:\s*border-box/)
  })

  it('leaves the slider a visible track under border-box', () => {
    // The regression: height is the *total*, so it must exceed the padding or
    // the content box — which is the only part painted — collapses to nothing.
    const r = rule("input[type='range']")
    const height = px(r.height)
    // Vertical first, then horizontal, which is written as a bare `0`.
    const pad = /^([\d.]+)px\s+\S+$/.exec(r.padding)
    assert.ok(pad, `expected "Npx <horizontal>" padding, got ${r.padding}`)
    const vertical = 2 * parseFloat(pad[1])

    assert.equal(r['background-clip'], 'content-box')
    assert.ok(
      height > vertical,
      `slider track is ${height - vertical}px tall: height ${height}px against ${vertical}px of vertical padding`,
    )
    // The design calls for a 6px line inside a 24px tap target.
    assert.equal(height - vertical, 6)
    assert.equal(height, 24)
  })

  it('gives the slider thumb a real tap target', () => {
    const thumb = rule("input[type='range']::-webkit-slider-thumb")
    assert.ok(px(thumb.width) >= 24 && px(thumb.height) >= 24)
  })

  it('lets grid children shrink, so wide content cannot widen the page', () => {
    // The other silent layout bug: a grid item's default min-width is its
    // content's, so a wide table pushed the whole document sideways on mobile.
    assert.match(css, /\.grid-2\s*>\s*\*\s*\{\s*\n\s*min-width:\s*0/)
  })
})
