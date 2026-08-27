/**
 * The shared state-point selection.
 *
 * Every figure and the state table mark their hit targets with `data-pt`;
 * this listens once, high up the tree, and works out which point an event
 * belongs to. Delegating rather than binding handlers to the marks matters
 * here: a figure is redrawn whenever the selection changes, so any handler
 * bound to a mark would be torn out from under the pointer that triggered
 * it. The listening element outlives every redraw.
 *
 * Hovering (or focusing) previews a point; clicking, tapping or pressing
 * Enter pins it. A preview is shown over a pin without replacing it.
 */

export interface SelectionState {
  /** Previewed by hover or focus. */
  hi: string | null
  /** Pinned by click, tap or Enter. */
  sel: string | null
}

export interface Selection {
  get(): SelectionState
  /** The point to draw as highlighted: a live preview, else the pin. */
  active(): string | null
  setHover(id: string | null): void
  /** Pin `id`, or unpin it if it is already pinned. */
  pick(id: string): void
  clearPin(): void
  subscribe(fn: (s: SelectionState) => void): () => void
}

export function createSelection(): Selection {
  let state: SelectionState = { hi: null, sel: null }
  const subs = new Set<(s: SelectionState) => void>()

  const set = (next: SelectionState) => {
    if (next.hi === state.hi && next.sel === state.sel) return
    state = next
    subs.forEach((fn) => fn(state))
  }

  return {
    get: () => state,
    active: () => state.hi ?? state.sel,
    setHover: (id) => set({ ...state, hi: id }),
    pick: (id) => set({ ...state, sel: state.sel === id ? null : id }),
    clearPin: () => set({ ...state, sel: null }),
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

/**
 * Whether an element holds focus because of the keyboard rather than a
 * pointer. `:focus-visible` is exactly this distinction, and the browser
 * already tracks it; treat a browser that cannot answer as keyboard, so the
 * preview errs towards being shown.
 */
function isKeyboardFocus(el: Element | null): boolean {
  if (!el || typeof el.matches !== 'function') return false
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

/** The state id an event happened inside, if any. */
function idFor(ev: Event): string | null {
  const t = ev.target as Element | null
  if (!t || typeof t.closest !== 'function') return null
  const el = t.closest('[data-pt]')
  return el ? el.getAttribute('data-pt') : null
}

/**
 * Listen for selection events anywhere inside `root`. Returns a teardown.
 *
 * `mouseover`/`mouseout` are used rather than `mouseenter`/`mouseleave`
 * because only the former bubble, which is what makes one listener able to
 * cover marks that are constantly being redrawn.
 */
export function attachSelection(root: HTMLElement, selection: Selection): () => void {
  const onOver = (ev: Event) => {
    const id = idFor(ev)
    if (id) selection.setHover(id)
  }
  const onOut = (ev: Event) => {
    const id = idFor(ev)
    // Ignore movement between two marks of the same point, and the churn of a
    // redraw swapping a mark out from under a stationary pointer.
    if (!id) return
    const to = (ev as MouseEvent).relatedTarget as Element | null
    const toId = to && typeof to.closest === 'function' ? to.closest('[data-pt]')?.getAttribute('data-pt') : null
    if (toId === id) return
    if (selection.get().hi === id) selection.setHover(toId ?? null)
  }
  const onClick = (ev: Event) => {
    const id = idFor(ev)
    if (id) selection.pick(id)
  }
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    const id = idFor(ev)
    if (!id) return
    ev.preventDefault()
    selection.pick(id)
  }
  const onFocusIn = (ev: Event) => {
    const id = idFor(ev)
    if (!id) return
    // Only keyboard focus previews a point. A click focuses the mark too, and
    // letting that drive the preview would leave a point highlighted after
    // the pointer had moved on.
    if (!isKeyboardFocus(ev.target as Element)) return
    selection.setHover(id)
  }
  const onFocusOut = (ev: Event) => {
    const id = idFor(ev)
    if (!id || selection.get().hi !== id) return
    // Redrawing a figure destroys the focused mark, which fires focusout
    // before the redraw has put focus back on its replacement. Settle first,
    // and only drop the preview if focus really has left the marks.
    queueMicrotask(() => {
      const still = document.activeElement?.closest?.('[data-pt]')
      if (!still && selection.get().hi === id) selection.setHover(null)
    })
  }

  root.addEventListener('mouseover', onOver)
  root.addEventListener('mouseout', onOut)
  root.addEventListener('click', onClick)
  root.addEventListener('keydown', onKey)
  root.addEventListener('focusin', onFocusIn)
  root.addEventListener('focusout', onFocusOut)

  return () => {
    root.removeEventListener('mouseover', onOver)
    root.removeEventListener('mouseout', onOut)
    root.removeEventListener('click', onClick)
    root.removeEventListener('keydown', onKey)
    root.removeEventListener('focusin', onFocusIn)
    root.removeEventListener('focusout', onFocusOut)
  }
}
