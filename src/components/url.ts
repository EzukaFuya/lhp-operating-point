/**
 * The operating point lives in the URL hash, so a calculation can be linked
 * and shared. Ported from the prototype's componentDidMount + syncHash.
 */

import { clampInput, type InputKey } from './model/constants.js'

export interface Inputs {
  tcc: number
  q: number
  tsink: number
}

export interface HashState extends Partial<Inputs> {
  ghost?: boolean
}

/** Read the operating point out of `location.hash`. Never throws. */
export function readHash(): HashState {
  try {
    const h = new URLSearchParams((location.hash || '').replace(/^#/, ''))
    const p: HashState = {}
    ;(['tcc', 'q', 'tsink'] as InputKey[]).forEach((k) => {
      const v = parseFloat(h.get(k) ?? '')
      if (isFinite(v)) p[k] = clampInput(k, v)
    })
    if (h.get('ghost') === '0') p.ghost = false
    return p
  } catch {
    return {}
  }
}

/** Write the operating point back into the hash without adding a history entry. */
export function writeHash(s: Inputs & { ghost: boolean }): void {
  try {
    history.replaceState(
      null,
      '',
      '#tcc=' +
        s.tcc.toFixed(3) +
        '&q=' +
        s.q.toFixed(2) +
        '&tsink=' +
        s.tsink.toFixed(3) +
        '&ghost=' +
        (s.ghost ? 1 : 0),
    )
  } catch {
    /* ignore — hash sync is a convenience, not a requirement */
  }
}
