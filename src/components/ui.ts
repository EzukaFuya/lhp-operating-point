/**
 * The page chrome around the figures: the verdict cards, the state-point
 * table, the selection bar and the legend. Plain DOM against the classes in
 * `style.css`.
 */

import { COL } from './model/constants.js'
import { pointList, type Solution } from './model/solve.js'
import type { Verdict } from './verdict.js'

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag)
  if (className) n.className = className
  if (text !== undefined) n.textContent = text
  return n
}

/** Markup-bearing helper for the few labels that need sub/superscripts. */
const html = (tag: keyof HTMLElementTagNameMap, className: string, markup: string): HTMLElement => {
  const n = document.createElement(tag)
  n.className = className
  n.innerHTML = markup
  return n
}

/* ------------------------------------------------------------------ cards */

function marginCard(
  title: string,
  value: string,
  color: string,
  barWidth: string,
  tag: string,
  formula: string,
): HTMLElement {
  const card = el('div', 'card')
  card.style.setProperty('--card-accent', color)

  const head = el('div', 'card-head')
  head.append(el('span', 'card-label', title), el('span', 'card-tag', tag))

  const bar = el('div', 'card-bar')
  const fill = el('div', 'card-bar-fill')
  fill.style.width = barWidth
  bar.append(fill)

  card.append(head, el('div', 'card-value', value), bar, html('div', 'card-formula', formula))
  return card
}

export function resultCards(r: Solution, v: Verdict): HTMLElement {
  const wrap = el('div', 'cards')

  wrap.append(
    marginCard(
      'Capillary margin',
      v.capMarginS,
      v.capColor,
      v.capBarW,
      v.binding === 'cap' ? 'binding' : '',
      `1 − ΔP<sub>cap</sub>/ΔP<sub>cap,max</sub> = 1 − ${r.dpCap.toFixed(4)}/${r.dpMax.toFixed(4)}`,
    ),
  )
  wrap.append(
    marginCard(
      'Subcooling margin',
      v.subMarginS,
      v.subColor,
      v.subBarW,
      v.binding === 'sub' ? 'binding' : '',
      `1 − ΔT<sub>sub,req</sub>/ΔT<sub>sub,av</sub> = 1 − ${r.subReq.toFixed(4)}/${r.subAv.toFixed(4)}`,
    ),
  )

  const regime = el('div', 'card card-regime')
  regime.append(
    el('div', 'card-label', 'Regime'),
    el('div', 'card-title', v.regimeName),
    el('div', 'card-formula', v.regimeNote),
  )
  wrap.append(regime)

  const status = el('div', 'card')
  status.style.setProperty('--card-accent', v.statusColor)
  const statusTitle = el('div', 'card-title', v.statusTitle)
  statusTitle.style.color = v.statusColor
  status.append(el('div', 'card-label', 'Status'), statusTitle, el('div', 'card-body', v.statusBody))
  wrap.append(status)

  return wrap
}

/* ------------------------------------------------------------------ table */

export function statePointTable(r: Solution, active: string | null, pinned: string | null): HTMLElement {
  const P = pointList(r)
  const table = el('table', 'states')

  const thead = el('thead')
  const hrow = el('tr')
  ;[
    ['#', 'col-id'],
    ['STATE', ''],
    ['T r', 'num'],
    ['P r', 'num'],
    ['s *', 'num'],
  ].forEach(([label, cls]) => hrow.append(el('th', cls, label)))
  thead.append(hrow)

  const tbody = el('tbody')
  P.forEach((p) => {
    // 2′ is a construction point, so it is set in muted ink rather than the
    // colour of a branch it does not belong to.
    const construction = p.id === '2′'
    const row = el('tr')
    row.dataset.pt = p.id
    row.tabIndex = 0
    if (pinned === p.id) row.classList.add('is-pinned')
    else if (active === p.id) row.classList.add('is-active')

    const id = el('td', 'col-id', p.id)
    id.style.color = construction ? COL.faint : COL[p.br]
    if (!construction) id.style.fontWeight = '600'

    const name = el('td')
    if (construction) name.innerHTML = 'Saturation state at P<sub>2</sub>'
    else name.textContent = p.name

    // Point 9 has no physical pressure once ΔP_WICK exceeds the CC pressure.
    const press = p.id === '9' && r.nonphys ? 'n/a' : p.p.toFixed(4)

    row.append(
      id,
      name,
      el('td', 'num', p.t.toFixed(3)),
      el('td', 'num', press),
      el('td', 'num', p.s.toFixed(2)),
    )
    tbody.append(row)
  })

  table.append(thead, tbody)
  return table
}

/* ---------------------------------------------------------- selection bar */

export function selectionBar(
  r: Solution,
  active: string | null,
  pinned: string | null,
  hovered: string | null,
  onClear: () => void,
): HTMLElement {
  const pt = pointList(r).find((p) => p.id === active) ?? null
  const bar = el('div', 'selbar')
  if (pt) bar.classList.add('is-active')

  bar.append(el('span', 'selbar-id', pt ? pt.id : '—'))
  bar.append(el('span', 'selbar-name', pt ? pt.name : 'Hover a state point or a table row'))
  bar.append(
    el(
      'span',
      'selbar-vals',
      pt ? `T r ${pt.t.toFixed(3)}   P r ${pt.p.toFixed(4)}   s * ${pt.s.toFixed(2)}` : '',
    ),
  )

  const tag = pinned
    ? hovered && hovered !== pinned
      ? 'previewing · ' + pinned + ' pinned'
      : 'pinned'
    : pt
      ? 'click to pin'
      : ''
  bar.append(el('span', 'selbar-tag', tag))

  if (pinned) {
    const btn = el('button', 'btn btn-clear', 'Clear selection')
    btn.type = 'button'
    btn.addEventListener('click', onClear)
    bar.append(btn)
  }

  bar.append(el('span', 'selbar-note', pt ? pt.note : ''))
  return bar
}

/* ----------------------------------------------------------------- legend */

/**
 * Colour, line style and marker shape all carry the same three-way coding, so
 * the figures stay readable without relying on hue alone.
 */
export function legend(): HTMLElement {
  const wrap = el('div', 'legend')
  const items: Array<[string, string]> = [
    [
      `<line x1="0" y1="5" x2="30" y2="5" stroke="${COL.wick}" stroke-width="2.4" stroke-dasharray="9 3 2 3"/><polygon points="15,0.6 19.4,5 15,9.4 10.6,5" fill="${COL.node}" stroke="${COL.nodeEdge}"/>`,
      'liquid through the wick 8→9',
    ],
    [
      `<line x1="0" y1="5" x2="30" y2="5" stroke="${COL.vap}" stroke-width="2.4"/><circle cx="15" cy="5" r="3.6" fill="${COL.node}" stroke="${COL.nodeEdge}"/>`,
      'meniscus 9→1, then vapour 1→4',
    ],
    [
      `<line x1="0" y1="5" x2="30" y2="5" stroke="${COL.liq}" stroke-width="2.4" stroke-dasharray="7 4"/><rect x="11.5" y="1.5" width="7" height="7" fill="${COL.node}" stroke="${COL.nodeEdge}"/>`,
      'condensate and liquid line 4→8',
    ],
    [`<line x1="0" y1="5" x2="30" y2="5" stroke="${COL.sat}" stroke-width="3"/>`, 'saturation'],
  ]

  items.forEach(([swatch, label]) => {
    const item = el('span', 'legend-item')
    item.innerHTML = `<svg width="30" height="10" aria-hidden="true">${swatch}</svg>`
    item.append(label)
    wrap.append(item)
  })
  return wrap
}
